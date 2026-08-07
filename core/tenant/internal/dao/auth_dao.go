package dao

import (
	"bytes"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"

	"tenant/internal/models"
	"tenant/tools/database"
)

type AuthDao struct {
	db        *database.Database
	insertSql string
	updateSql string
	selectSql string
	countSql  string
}

func NewAuthDao(db *database.Database) (*AuthDao, error) {
	if db == nil {
		return nil, errors.New("database is nil")
	}
	sqlField := `app_id,api_key,api_secret,source,is_delete,registration_time,update_time,extend`
	insertSql := fmt.Sprintf(`INSERT INTO tb_auth
					(%s)
				VALUES (?,?,?,?,?,?,?,?)`, sqlField)
	updateSql := `UPDATE tb_auth  SET  %s `
	selectSql := fmt.Sprintf(`SELECT %s FROM tb_auth `, sqlField)
	countSql := `SELECT count(1) from tb_auth `
	return &AuthDao{
		db:        db,
		insertSql: insertSql,
		updateSql: updateSql,
		selectSql: selectSql,
		countSql:  countSql,
	}, nil
}

func (dao *AuthDao) BeginTx() (*sql.Tx, error) {
	return dao.db.GetMysql().Begin()
}

func (dao *AuthDao) Insert(data *models.Auth, tx *sql.Tx) (int64, error) {
	if data == nil {
		return 0, fmt.Errorf("insert auth data,data must not been nil")
	}
	log.Printf("insert auth sql is %s", dao.insertSql)
	if tx == nil {
		result, err := dao.db.GetMysql().Exec(dao.insertSql, //
			data.AppId, data.ApiKey, data.ApiSecret, data.Source, data.IsDelete,
			data.CreateTime, data.UpdateTime, data.Extend)
		if err != nil {
			log.Printf("insert auth error: %v", err)
			return 0, err
		}
		return result.RowsAffected()
	}
	result, err := tx.Exec(dao.insertSql, //
		data.AppId, data.ApiKey, data.ApiSecret, data.Source, data.IsDelete,
		data.CreateTime, data.UpdateTime, data.Extend)
	if err != nil {
		log.Printf("insert auth error: %v", err)
		return 0, err
	}
	return result.RowsAffected()
}

func (dao *AuthDao) Update(querySql []SqlOption, tx *sql.Tx, setSql ...SqlOption) (int64, error) {
	finalSql, params, err := buildUpdateWithQuery(dao.updateSql, querySql, setSql...)
	if err != nil {
		log.Printf("update auth error: %v", err)
		return 0, err
	}
	log.Printf("update auth sql is %s", finalSql)
	if tx == nil {
		result, err := dao.db.GetMysql().Exec(finalSql, params...)
		if err != nil {
			log.Printf("update auth error: %v", err)
			return 0, err
		}
		return result.RowsAffected()
	}
	result, err := tx.Exec(finalSql, params...)
	if err != nil {
		log.Printf("update auth error: %v", err)
		return 0, err
	}
	return result.RowsAffected()
}

func (dao *AuthDao) Delete(tx *sql.Tx, querySql ...SqlOption) (int64, error) {
	finalSql, params, err := buildUpdateWithQuery(dao.updateSql, querySql,
		dao.WithIsDelete(true),
		dao.WithUpdateTime(time.Now().Format("2006-01-02 15:04:05")))
	if err != nil {
		log.Printf("delete auth error: %v", err)
		return 0, err
	}
	log.Printf("delete auth sql is %s", finalSql)
	if tx == nil {
		result, err := dao.db.GetMysql().Exec(finalSql, params...)
		if err != nil {
			log.Printf("delete auth error: %v", err)
			return 0, err
		}
		return result.RowsAffected()
	}
	result, err := tx.Exec(finalSql, params...)
	if err != nil {
		log.Printf("delete auth error: %v", err)
		return 0, err
	}
	return result.RowsAffected()
}

func (dao *AuthDao) Select(options ...SqlOption) ([]*models.Auth, error) {
	finalSql, params := buildQuery(dao.selectSql, options...)
	log.Printf("select auth sql is %s,param is %v", finalSql, params)
	rows, err := dao.db.GetMysql().Query(finalSql, params...)
	if err != nil {
		log.Printf("select auth error: %v", err)
		return nil, err
	}
	defer func() {
		if rows != nil {
			if err := rows.Close(); err != nil {
				log.Printf("close auth rows error: %v", err)
			}
		}
	}()
	auths := make([]*models.Auth, 0, 16)
	for rows.Next() {
		var auth models.Auth
		err := rows.Scan(&auth.AppId, &auth.ApiKey, &auth.ApiSecret, &auth.Source, //
			&auth.IsDelete, &auth.CreateTime, &auth.UpdateTime, &auth.Extend)
		if err != nil {
			log.Printf("parse auth rows error: %v", err)
			return nil, err
		}
		auths = append(auths, &auth)
	}
	return auths, nil
}

func (dao *AuthDao) Count(isLock bool, tx *sql.Tx, options ...SqlOption) (int64, error) {
	finalSql, params := buildQuery(dao.countSql, options...)
	if isLock {
		finalSql = finalSql + " for update"
	}
	log.Printf("count auth sql is %s,param is %v", finalSql, params)
	if tx == nil {
		rows, err := dao.db.GetMysql().Query(finalSql, params...)
		if err != nil {
			log.Printf("count auth error: %v", err)
			return 0, err
		}
		return dao.countRows(rows)
	}
	rows, err := tx.Query(finalSql, params...)
	if err != nil {
		log.Printf("count auth error: %v", err)
		return 0, err
	}
	return dao.countRows(rows)
}

func (dao *AuthDao) countRows(rows *sql.Rows) (int64, error) {
	defer func() {
		if rows != nil {
			if err := rows.Close(); err != nil {
				log.Printf("close auth rows error: %v", err)
			}
		}
	}()
	var count int64
	for rows.Next() {
		err := rows.Scan(&count)
		if err != nil {
			log.Printf("parse auth rows error: %v", err)
			return 0, err
		}
	}
	return count, nil
}

func (dao *AuthDao) WithAppId(appId string) SqlOption {
	return func() (string, []interface{}) {
		return "app_id=?", []interface{}{appId}
	}
}

func (dao *AuthDao) WithAppIds(appIds ...string) SqlOption {
	if len(appIds) == 0 {
		return nil
	}
	return func() (string, []interface{}) {
		var buffer bytes.Buffer
		params := make([]interface{}, 0, len(appIds))
		buffer.WriteString("app_id IN(")
		for i, uploadId := range appIds {
			params = append(params, uploadId)
			if i == 0 {
				buffer.WriteString("?")
				continue
			}
			buffer.WriteString(",?")
		}
		buffer.WriteString(")")
		return buffer.String(), params
	}
}

func (dao *AuthDao) WithIsDelete(isDelete bool) SqlOption {
	return func() (string, []interface{}) {
		return "is_delete=?", []interface{}{isDelete}
	}
}

func (dao *AuthDao) WithApiKey(apiKey string) SqlOption {
	return func() (string, []interface{}) {
		return "api_key=?", []interface{}{apiKey}
	}
}

func (dao *AuthDao) WithApiSecret(apiSecret string) SqlOption {
	return func() (string, []interface{}) {
		return "api_secret=?", []interface{}{apiSecret}
	}
}

func (dao *AuthDao) WithUpdateTime(updateTime string) SqlOption {
	return func() (string, []interface{}) {
		return "update_time=?", []interface{}{updateTime}
	}
}

func (dao *AuthDao) WithSource(source int64) SqlOption {
	return func() (string, []interface{}) {
		return "source=?", []interface{}{source}
	}
}
