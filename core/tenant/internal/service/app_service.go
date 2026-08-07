package service

import (
	"database/sql"
	"errors"
	"fmt"
	"log"

	"tenant/internal/dao"
	"tenant/internal/models"
	"tenant/tools/generator"
)

type AppService struct {
	appDao  *dao.AppDao
	authDao *dao.AuthDao
}

func NewAppService(appDao *dao.AppDao, authDao *dao.AuthDao) (*AppService, error) {
	if appDao == nil || authDao == nil {
		return nil, errors.New("appDao or authDao is nil")
	}
	return &AppService{
		appDao:  appDao,
		authDao: authDao,
	}, nil
}

func (biz *AppService) SaveApp(app *models.App, auth *models.Auth) (result *AddAppResult, err error) {
	tx, err := biz.appDao.BeginTx()
	if err != nil {
		return result, err
	}
	defer func() {
		biz.rollback(tx, err)
	}()
	nameCount, err := biz.appDao.Count(true, tx,
		biz.appDao.WithDevId(app.DevId),
		biz.appDao.WithName(app.AppName),
		biz.appDao.WithSource(app.Source),
		biz.appDao.WithChannelId(app.ChannelId),
		biz.appDao.WithIsDelete(false))
	if err != nil {
		log.Printf("call appDao.count error： %v", err)
		return result, err
	}
	if nameCount > 0 {
		log.Printf("app name[%v] has been exist", app.AppName)
		err = NewBizErr(APPNameHasExist, fmt.Sprintf("app name[%v] has been exist", app.AppName))
		return result, err
	}
	if app.ChannelId == app.Source {
		app.ChannelId = "0"
	}
	_, err = biz.appDao.Insert(app, tx)
	if err != nil {
		return result, err
	}
	if auth == nil {
		auth = &models.Auth{
			AppId:      app.AppId,
			ApiKey:     generator.GenKey(app.AppId),
			ApiSecret:  generator.GenSecret(),
			IsDelete:   false,
			CreateTime: generator.GenCurrTime(""),
			UpdateTime: generator.GenCurrTime(""),
		}
	}
	_, err = biz.authDao.Insert(auth, tx)
	if err != nil {
		log.Printf("call authDao.Insert error: %v", err)
		return result, err
	}
	result = &AddAppResult{
		AppId:     app.AppId,
		ApiKey:    auth.ApiKey,
		ApiSecret: auth.ApiSecret,
	}
	return result, err
}

func (biz *AppService) ModifyApp(app *models.App) (err error) {
	tx, err := biz.appDao.BeginTx()
	if err != nil {
		return err
	}

	defer func() {
		biz.rollback(tx, err)
	}()

	apps, err := biz.appDao.Select(biz.appDao.WithAppId(app.AppId), biz.appDao.WithIsDelete(false))
	if err != nil {
		log.Printf("call appDao.count error: %v", err)
		return err
	}

	if len(apps) <= 0 {
		err = NewBizErr(AppIdNotExist, fmt.Sprintf("request app id(%s) not found", app.AppId))
		return err
	}
	nameCount := int64(0)
	sqlOptions := make([]dao.SqlOption, 0, 4)
	sqlOptions = append(sqlOptions, biz.appDao.WithUpdateTime(generator.GenCurrTime("")))
	if len(app.AppName) > 0 {
		nameCount, err = biz.appDao.Count(true, tx,
			biz.appDao.WithNotAppId(app.AppId),
			biz.appDao.WithDevId(apps[0].DevId),
			biz.appDao.WithChannelId(apps[0].ChannelId),
			biz.appDao.WithName(app.AppName),
			biz.appDao.WithSource(app.Source),
			biz.appDao.WithIsDelete(false))
		if err != nil {
			log.Printf("call appDao.count error: %v", err)
			return err
		}

		if nameCount > 0 {
			log.Printf("app name[%v] has been exist", app.AppName)
			err = NewBizErr(APPNameHasExist, "app name has been exist")
			return err
		}

		sqlOptions = append(sqlOptions, biz.appDao.WithSetName(app.AppName))
	}

	if len(app.Desc) > 0 {
		sqlOptions = append(sqlOptions, biz.appDao.WithDesc(app.Desc))
	}
	if len(app.Source) > 0 {
		sqlOptions = append(sqlOptions, biz.appDao.WithSource(app.Source))
	}
	_, err = biz.appDao.Update([]dao.SqlOption{biz.appDao.WithAppId(app.AppId)}, tx, sqlOptions...)
	if err != nil {
		log.Printf("call appDao.Update error: %v", err)
	}
	return err
}

func (biz *AppService) DisableOrEnable(appId string, disable bool) (err error) {
	tx, err := biz.appDao.BeginTx()
	if err != nil {
		return err
	}
	defer func() {
		biz.rollback(tx, err)
	}()

	appCount, err := biz.appDao.Count(true, tx,
		biz.appDao.WithAppId(appId),
		biz.appDao.WithIsDelete(false))
	if err != nil {
		log.Printf("call appDao.count error: %v", err)
		return err
	}
	if appCount <= 0 {
		err = NewBizErr(AppIdNotExist, fmt.Sprintf("request app id(%s) not found", appId))
		return err
	}

	rowNum, err := biz.appDao.Update(
		[]dao.SqlOption{biz.appDao.WithAppId(appId), biz.appDao.WithIsDisable(!disable)},
		tx,
		biz.appDao.WithIsDisable(disable),
	)
	if err != nil {
		log.Printf("call appDao.update error: %v", err)
	}

	if rowNum <= 0 {
		log.Printf("appid[%v] has been %v", appId, disable)
		return err
	}
	return err
}

func (biz *AppService) Delete(appId string) (err error) {
	tx, err := biz.appDao.BeginTx()
	if err != nil {
		return err
	}
	defer func() {
		biz.rollback(tx, err)
	}()

	appCount, err := biz.appDao.Count(true, tx, biz.appDao.WithAppId(appId), //
		biz.appDao.WithIsDelete(false))
	if err != nil {
		log.Printf("call appDao.count error: %v", err)
		return err
	}
	if appCount <= 0 {
		err = NewBizErr(AppIdNotExist, "request app_id not found")
		return err
	}
	_, err = biz.appDao.Delete(tx, biz.appDao.WithAppId(appId))
	if err != nil {
		log.Printf("call appDao.AppDelete error: %v", err)
		return err
	}
	_, err = biz.authDao.Delete(tx, biz.authDao.WithAppId(appId))
	if err != nil {
		log.Printf("call authDao.AppDelete error: %v", err)
		return err
	}
	return err
}

func (biz *AppService) Query(query *AppQuery) ([]*models.App, error) {
	options := make([]dao.SqlOption, 0, 3)
	if len(query.AppIds) > 0 {
		options = append(options, biz.appDao.WithAppIds(query.AppIds...))
	}

	if len(query.Name) > 0 {
		options = append(options, biz.appDao.WithName("%"+query.Name+"%"))
	}

	if len(query.CloudId) > 0 {
		options = append(options, biz.appDao.WithChannelId(query.CloudId))
	}

	if query.DevId > 0 {
		options = append(options, biz.appDao.WithDevId(int64(query.DevId)))
	}

	options = append(options, biz.appDao.WithIsDelete(false))
	data, err := biz.appDao.Select(options...)
	if err != nil {
		log.Printf("query app biz info error: %v", err)
		return nil, NewBizErr(ErrCodeSystem, err.Error())
	}
	return data, nil
}

func (biz *AppService) QueryDetails(query *AppQuery) ([]*AppDetailsData, error) {
	apps, err := biz.Query(query)
	if err != nil {
		return nil, err
	}
	if len(apps) == 0 {
		return make([]*AppDetailsData, 0), nil
	}
	appIds := make([]string, 0, len(apps))
	dataMap := make(map[string]*AppDetailsData)
	for _, item := range apps {
		appIds = append(appIds, item.AppId)
		dataMap[item.AppId] = &AppDetailsData{
			Appid:     item.AppId,
			Name:      item.AppName,
			IsDisable: item.IsDisable,
			Desc:      item.Desc,
		}
	}
	authList, err := biz.authDao.Select(biz.authDao.WithAppIds(appIds...))
	if err != nil {
		log.Printf("query auth info error: %v", err)
		return nil, NewBizErr(ErrCodeSystem, err.Error())
	}
	for _, item := range authList {
		data, ok := dataMap[item.AppId]
		if data == nil || !ok {
			continue
		}
		if data.AuthList == nil {
			data.AuthList = make([]*AuthData, 0, 16)
		}
		data.AuthList = append(data.AuthList, &AuthData{
			ApiKey:    item.ApiKey,
			ApiSecret: item.ApiSecret,
		})
	}
	dataList := make([]*AppDetailsData, 0, len(dataMap))
	for _, val := range dataMap {
		dataList = append(dataList, val)
	}
	return dataList, nil
}

func (biz *AppService) rollback(tx *sql.Tx, err error) {
	if r := recover(); r != nil {
		fmt.Println("app service rollback is panic", r)
		if err := tx.Rollback(); err != nil {
			log.Printf("failed to rollback tx: %v", err)
		}
		return
	}
	if err != nil {
		if err := tx.Rollback(); err != nil {
			log.Printf("failed to rollback tx: %v", err)
		}
		return
	}
	if err := tx.Commit(); err != nil {
		log.Printf("failed to commit tx: %v", err)
	}
}
