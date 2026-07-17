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

type AuthService struct {
	appDao  authAppDao
	authDao authAuthDao
}

type authAppDao interface {
	Count(bool, *sql.Tx, ...dao.SqlOption) (int64, error)
	Select(...dao.SqlOption) ([]*models.App, error)
	WithAppId(string) dao.SqlOption
	WithIsDelete(bool) dao.SqlOption
}

type authAuthDao interface {
	BeginTx() (*sql.Tx, error)
	Count(bool, *sql.Tx, ...dao.SqlOption) (int64, error)
	Insert(*models.Auth, *sql.Tx) (int64, error)
	Delete(*sql.Tx, ...dao.SqlOption) (int64, error)
	Select(...dao.SqlOption) ([]*models.Auth, error)
	WithAppId(string) dao.SqlOption
	WithIsDelete(bool) dao.SqlOption
	WithApiKey(string) dao.SqlOption
	WithApiSecret(string) dao.SqlOption
}

func NewAuthService(appDao *dao.AppDao, authDao *dao.AuthDao) (*AuthService, error) {
	if appDao == nil || authDao == nil {
		return nil, errors.New("appDao or authDao is nil")
	}
	return &AuthService{
		appDao:  appDao,
		authDao: authDao,
	}, nil
}

func (biz *AuthService) AddAuth(auth *models.Auth) (result *AddAuthResult, err error) {
	tx, err := biz.authDao.BeginTx()
	if err != nil {
		return result, err
	}
	defer func() {
		biz.rollback(tx, err)
	}()
	appCount, err := biz.appDao.Count(true, tx, biz.appDao.WithAppId(auth.AppId), biz.appDao.WithIsDelete(false))
	if err != nil {
		log.Printf("call appDao.count error: %v", err)
		return result, err
	}
	if appCount <= 0 {
		err = NewBizErr(AppIdNotExist, "request app_id not found")
		return result, err
	}
	if len(auth.ApiKey) == 0 {
		auth.ApiKey = generator.GenKey(auth.AppId)
	}
	if len(auth.ApiSecret) == 0 {
		auth.ApiSecret = generator.GenSecret()
	}

	authCount, err := biz.authDao.Count(true, tx, //
		biz.authDao.WithApiKey(auth.ApiKey), biz.authDao.WithIsDelete(false))
	if err != nil {
		log.Printf("call authDao.count error: %v", err)
		return result, err
	}
	if authCount > 0 {
		err = NewBizErr(ApiKeyHasExist, "api key has been exist")
		return result, err
	}
	_, err = biz.authDao.Insert(auth, tx)
	if err != nil {
		return result, err
	}
	result = &AddAuthResult{
		ApiKey:    auth.ApiKey,
		ApiSecret: auth.ApiSecret,
	}
	return result, err
}

func (biz *AuthService) DeleteApiKey(appId string, apiKey string) (err error) {
	tx, err := biz.authDao.BeginTx()
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
	rowNum, err := biz.authDao.Delete(tx, biz.authDao.WithApiKey(apiKey), biz.authDao.WithIsDelete(false))
	if err != nil {
		return err
	}
	if rowNum == 0 {
		err = NewBizErr(ApiKeyNotExist, "api key not exist")
		return err
	}
	return err
}

func (biz *AuthService) Query(appId string) ([]*models.Auth, error) {
	data, err := biz.authDao.Select(biz.authDao.WithAppId(appId), biz.authDao.WithIsDelete(false))
	if err != nil {
		log.Printf("query auth biz info error: %v", err)
		return nil, NewBizErr(ErrCodeSystem, err.Error())
	}
	return data, nil
}

func (biz *AuthService) QueryAppByAPIKey(apiKey string) (*models.App, error) {
	data, err := biz.authDao.Select(biz.authDao.WithApiKey(apiKey), biz.authDao.WithIsDelete(false))
	if err != nil {
		log.Printf("query auth biz info error: %v", err)
		return nil, NewBizErr(ErrCodeSystem, err.Error())
	}
	return biz.queryAppByAuth(data)
}

func (biz *AuthService) VerifyAppByAPIKeySecret(apiKey string, apiSecret string) (*models.App, error) {
	data, err := biz.authDao.Select(
		biz.authDao.WithApiKey(apiKey),
		biz.authDao.WithApiSecret(apiSecret),
		biz.authDao.WithIsDelete(false),
	)
	if err != nil {
		log.Printf("verify auth biz info error: %v", err)
		return nil, NewBizErr(ErrCodeSystem, err.Error())
	}
	if len(data) == 0 {
		return nil, NewBizErr(ApiKeyNotExist, "api key or secret not exist")
	}
	return biz.queryAppByAuth(data)
}

func (biz *AuthService) queryAppByAuth(data []*models.Auth) (*models.App, error) {
	if len(data) == 0 {
		return nil, NewBizErr(AppIdNotExist, "app id not exist")
	}
	if len(data[0].AppId) == 0 {
		return nil, NewBizErr(AppIdNotExist, "app id not exist")
	}
	appList, err := biz.appDao.Select(biz.appDao.WithAppId(data[0].AppId), biz.appDao.WithIsDelete(false))
	if err != nil {
		log.Printf("query app  info by app id %s error: %v", data[0].AppId, err)
		return nil, NewBizErr(ErrCodeSystem, err.Error())
	}
	if len(appList) == 0 || appList[0] == nil {
		return nil, NewBizErr(AppIdNotExist, "app id not exist")
	}
	return appList[0], nil
}

func (biz *AuthService) rollback(tx *sql.Tx, err error) {
	if r := recover(); r != nil {
		if err := tx.Rollback(); err != nil {
			fmt.Println("auth service rollback is panic", r)
			if err := tx.Rollback(); err != nil {
				log.Printf("failed to rollback tx: %v", err)
			}
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
