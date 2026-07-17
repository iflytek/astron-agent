package database

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"tenant/config"

	mysql "github.com/go-sql-driver/mysql"
)

type DBType string

const (
	MYSQL DBType = "mysql"
)

type Database struct {
	mysql *sql.DB
}

func NewDatabase(conf *config.Config) (*Database, error) {
	if conf == nil || len(conf.DataBase.DBType) == 0 {
		return nil, errors.New("database config is nil or dbType is empty")
	}
	dbType := DBType(conf.DataBase.DBType)
	db := &Database{}
	switch dbType {
	case MYSQL:
		err := db.buildMysql(conf)
		if err != nil {
			return nil, err
		}
		return db, nil
	default:
		return nil, fmt.Errorf("unsupported dbType: %s", conf.DataBase.DBType)
	}
}

func (db *Database) buildMysql(conf *config.Config) error {
	if len(conf.DataBase.UserName) == 0 {
		return errors.New("mysql username is empty")
	}

	if len(conf.DataBase.Password) == 0 {
		return errors.New("mysql password is empty")
	}

	if len(conf.DataBase.Url) == 0 {
		return errors.New("mysql url is empty")
	}

	dsn := fmt.Sprintf("%s:%s@tcp%s", conf.DataBase.UserName, conf.DataBase.Password, conf.DataBase.Url)
	parsedDsn, err := mysql.ParseDSN(dsn)
	if err != nil {
		return err
	}

	if err := ensureMySQLDatabase(parsedDsn); err != nil {
		return err
	}

	client, err := sql.Open("mysql", dsn)
	if err != nil {
		return err
	}
	client.SetMaxOpenConns(conf.DataBase.MaxOpenConns)
	client.SetMaxIdleConns(conf.DataBase.MaxIdleConns)
	err = client.Ping()
	if err != nil {
		return err
	}

	if err := runMigrations(client); err != nil {
		_ = client.Close()
		return err
	}

	db.mysql = client
	return nil
}

func (db *Database) GetMysql() *sql.DB {
	return db.mysql
}

func ensureMySQLDatabase(parsedDsn *mysql.Config) error {
	if parsedDsn == nil {
		return errors.New("mysql dsn is nil")
	}
	if parsedDsn.DBName == "" {
		return errors.New("mysql database name is empty")
	}

	adminDsn := parsedDsn.Clone()
	dbName := adminDsn.DBName
	adminDsn.DBName = ""

	client, err := sql.Open("mysql", adminDsn.FormatDSN())
	if err != nil {
		return err
	}
	defer func() {
		_ = client.Close()
	}()

	if err := client.Ping(); err != nil {
		return err
	}

	_, err = client.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s`", strings.ReplaceAll(dbName, "`", "``")))
	return err
}
