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

type AppDao struct {
	db        *database.Database
	insertSql string
	updateSql string
	selectSql string
	countSql  string
}

func NewAppDao(db *database.Database) (*AppDao, error) {
	if db == nil {
		return nil, errors.New("database is nil")
	}
	sqlField := `app_id,app_name,dev_id,channel_id,source,is_disable,app_desc,is_delete,registration_time,
                    update_time,extend`
	insertSql := fmt.Sprintf(`INSERT INTO tb_app 
                   (%s)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)`, sqlField)
	updateSql := `UPDATE tb_app SET %s `
	selectSql := fmt.Sprintf(`SELECT %s FROM tb_app `, sqlField)
	countSql := `SELECT count(1) from tb_app `

	return &AppDao{
			db:        db,
			insertSql: insertSql,
			updateSql: updateSql,
			selectSql: selectSql,
			countSql:  countSql,
		},
		nil
}

func (dao *AppDao) Insert(data *models.App, tx *sql.Tx) (int64, error) {
	if data == nil {
		return 0, fmt.Errorf("insert app data, data must not been nil")
	}
	log.Printf("insert app sql is %s", dao.insertSql)
	if tx == nil {
		result, err := dao.db.GetMysql().Exec(dao.insertSql,
			data.AppId, data.AppName, data.DevId, data.ChannelId, data.Source, data.IsDisable, data.Desc, data.IsDelete, data.CreateTime, data.UpdateTime, data.Extend)
		if err != nil {
			log.Printf("insert app error: %v", err)
			return 0, err
		}
		return result.LastInsertId()
	}
	result, err := tx.Exec(dao.insertSql,
		data.AppId, data.AppName, data.DevId, data.ChannelId, data.Source, data.IsDisable, data.Desc,
		data.IsDelete, data.CreateTime, data.UpdateTime, data.Extend)
	if err != nil {
		log.Printf("insert app error: %v", err)
		return 0, err
	}
	return result.LastInsertId()
}

func (dao *AppDao) Update(querySql []SqlOption, tx *sql.Tx, setSql ...SqlOption) (int64, error) {
	finalSql, params, err := buildUpdateWithQuery(dao.updateSql, querySql, setSql...)
	if err != nil {
		log.Printf("update app error: %v", err)
		return 0, err
	}

	log.Printf("update app sql is %s", finalSql)
	if tx == nil {
		result, err := dao.db.GetMysql().Exec(finalSql, params...)
		if err != nil {
			log.Printf("update app error: %v", err)
			return 0, err
		}
		return result.RowsAffected()
	}
	result, err := tx.Exec(finalSql, params...)
	if err != nil {
		log.Printf("update app error: %v", err)
		return 0, err
	}
	return result.RowsAffected()
}

func (dao *AppDao) Delete(tx *sql.Tx, querySql ...SqlOption) (int64, error) {
	finalSql, params, err := buildUpdateWithQuery(dao.updateSql, querySql,
		dao.WithIsDelete(true),
		dao.WithUpdateTime(time.Now().Format("2006-01-02 15:04:05")),
	)
	if err != nil {
		log.Printf("delete app error: %v", err)
		return 0, err
	}
	log.Printf("delete app sql is %s", finalSql)
	if tx == nil {
		result, err := dao.db.GetMysql().Exec(finalSql, params...)
		if err != nil {
			log.Printf("delete app error: %v", err)
			return 0, err
		}
		return result.RowsAffected()
	}
	result, err := tx.Exec(finalSql, params...)
	if err != nil {
		log.Printf("delete app error: %v", err)
		return 0, err
	}
	return result.RowsAffected()
}

func (dao *AppDao) Select(options ...SqlOption) ([]*models.App, error) {
	finalSql, params := buildQuery(dao.selectSql, options...)

	log.Printf("select app sql is %s,param is %v", finalSql, params)

	rows, err := dao.db.GetMysql().Query(finalSql, params...)
	if err != nil {
		log.Printf("select app error: %v", err)
		return nil, err
	}
	defer func() {
		if rows != nil {
			if err := rows.Close(); err != nil {
				log.Printf("failed to close rows: %v", err)
			}
		}
	}()
	apps := make([]*models.App, 0, 16)
	for rows.Next() {
		var app models.App
		err = rows.Scan(&app.AppId, &app.AppName, &app.DevId, &app.ChannelId,
			&app.Source, &app.IsDisable, &app.Desc, &app.IsDelete,
			&app.CreateTime, &app.UpdateTime, &app.Extend)
		if err != nil {
			log.Printf("parse app rows error: %v", err)
			return nil, err
		}
		apps = append(apps, &app)
	}

	return apps, nil
}

func (dao *AppDao) Count(isLock bool, tx *sql.Tx, options ...SqlOption) (int64, error) {
	finalSql, params := buildQuery(dao.countSql, options...)
	if isLock {
		finalSql = finalSql + " for update"
	}
	log.Printf("count app sql is %s,param is %v", finalSql, params)
	if tx == nil {
		rows, err := dao.db.GetMysql().Query(finalSql, params...)
		if err != nil {
			log.Printf("count app error: %v", err)
			return 0, err
		}
		return dao.countRows(rows)
	}
	rows, err := tx.Query(finalSql, params...)
	if err != nil {
		log.Printf("count app error: %v", err)
		return 0, err
	}
	return dao.countRows(rows)
}

func (dao *AppDao) BeginTx() (*sql.Tx, error) {
	return dao.db.GetMysql().Begin()
}

func (dao *AppDao) countRows(rows *sql.Rows) (int64, error) {
	defer func() {
		if rows != nil {
			if err := rows.Close(); err != nil {
				log.Printf("failed to close rows: %v", err)
			}
		}
	}()
	var count int64
	for rows.Next() {
		err := rows.Scan(&count)
		if err != nil {
			log.Printf("parse app rows error: %v", err)
			return 0, err
		}
	}
	return count, nil
}

func (dao *AppDao) WithAppId(appId string) SqlOption {
	return func() (string, []interface{}) {
		return "app_id=?", []interface{}{appId}
	}
}

func (dao *AppDao) WithNotAppId(appId string) SqlOption {
	return func() (string, []interface{}) {
		return "app_id!=?", []interface{}{appId}
	}
}

func (dao *AppDao) WithSource(source string) SqlOption {
	return func() (string, []interface{}) {
		return "source=?", []interface{}{source}
	}
}

func (dao *AppDao) WithIsDisable(isDisable bool) SqlOption {
	return func() (string, []interface{}) {
		return "is_disable=?", []interface{}{isDisable}
	}
}

func (dao *AppDao) WithIsDelete(isDelete bool) SqlOption {
	return func() (string, []interface{}) {
		return "is_delete=?", []interface{}{isDelete}
	}
}

func (dao *AppDao) WithUpdateTime(updateTime string) SqlOption {
	return func() (string, []interface{}) {
		return "update_time=?", []interface{}{updateTime}
	}
}

func (dao *AppDao) WithName(name string) SqlOption {
	return func() (string, []interface{}) {
		return "app_name like ?", []interface{}{name}
	}
}

func (dao *AppDao) WithSetName(name string) SqlOption {
	return func() (string, []interface{}) {
		return "app_name=?", []interface{}{name}
	}
}

func (dao *AppDao) WithDesc(desc string) SqlOption {
	return func() (string, []interface{}) {
		return "app_desc=?", []interface{}{desc}
	}
}

func (dao *AppDao) WithDevId(devId int64) SqlOption {
	return func() (string, []interface{}) {
		return "dev_id=?", []interface{}{devId}
	}
}

func (dao *AppDao) WithChannelId(cloudId string) SqlOption {
	return func() (string, []interface{}) {
		return "channel_id=?", []interface{}{cloudId}
	}
}

func (dao *AppDao) WithNoChannelId(cloudId string) SqlOption {
	return func() (string, []interface{}) {
		return "channel_id!=?", []interface{}{cloudId}
	}
}

func (dao *AppDao) WithAppIds(appIds ...string) SqlOption {
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
