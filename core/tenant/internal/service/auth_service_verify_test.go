package service

import (
	"database/sql"
	"errors"
	"testing"

	"tenant/internal/dao"
	"tenant/internal/models"
)

type verifyAuthAppDao struct {
	apps []*models.App
	err  error
}

func (m *verifyAuthAppDao) Count(bool, *sql.Tx, ...dao.SqlOption) (int64, error) {
	return 0, nil
}

func (m *verifyAuthAppDao) Select(...dao.SqlOption) ([]*models.App, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.apps, nil
}

func (m *verifyAuthAppDao) WithAppId(appId string) dao.SqlOption {
	return func() (string, []interface{}) {
		return "app_id=?", []interface{}{appId}
	}
}

func (m *verifyAuthAppDao) WithIsDelete(isDelete bool) dao.SqlOption {
	return func() (string, []interface{}) {
		return "is_delete=?", []interface{}{isDelete}
	}
}

type verifyAuthAuthDao struct {
	auths []*models.Auth
	err   error
}

func (m *verifyAuthAuthDao) BeginTx() (*sql.Tx, error) {
	return nil, nil
}

func (m *verifyAuthAuthDao) Count(bool, *sql.Tx, ...dao.SqlOption) (int64, error) {
	return 0, nil
}

func (m *verifyAuthAuthDao) Insert(*models.Auth, *sql.Tx) (int64, error) {
	return 0, nil
}

func (m *verifyAuthAuthDao) Delete(*sql.Tx, ...dao.SqlOption) (int64, error) {
	return 0, nil
}

func (m *verifyAuthAuthDao) Select(...dao.SqlOption) ([]*models.Auth, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.auths, nil
}

func (m *verifyAuthAuthDao) WithAppId(appId string) dao.SqlOption {
	return func() (string, []interface{}) {
		return "app_id=?", []interface{}{appId}
	}
}

func (m *verifyAuthAuthDao) WithIsDelete(isDelete bool) dao.SqlOption {
	return func() (string, []interface{}) {
		return "is_delete=?", []interface{}{isDelete}
	}
}

func (m *verifyAuthAuthDao) WithApiKey(apiKey string) dao.SqlOption {
	return func() (string, []interface{}) {
		return "api_key=?", []interface{}{apiKey}
	}
}

func (m *verifyAuthAuthDao) WithApiSecret(apiSecret string) dao.SqlOption {
	return func() (string, []interface{}) {
		return "api_secret=?", []interface{}{apiSecret}
	}
}

func TestAuthService_VerifyAppByAPIKeySecret_Success(t *testing.T) {
	service := &AuthService{
		authDao: &verifyAuthAuthDao{auths: []*models.Auth{{AppId: "app-123", ApiKey: "key", ApiSecret: "secret"}}},
		appDao:  &verifyAuthAppDao{apps: []*models.App{{AppId: "app-123", AppName: "Test App"}}},
	}

	app, err := service.VerifyAppByAPIKeySecret("key", "secret")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if app.AppId != "app-123" {
		t.Fatalf("Expected app id 'app-123', got %s", app.AppId)
	}
}

func TestAuthService_VerifyAppByAPIKeySecret_InvalidSecret(t *testing.T) {
	service := &AuthService{
		authDao: &verifyAuthAuthDao{auths: []*models.Auth{}},
		appDao:  &verifyAuthAppDao{},
	}

	_, err := service.VerifyAppByAPIKeySecret("key", "wrong-secret")
	if err == nil {
		t.Fatal("Expected error for invalid secret, got nil")
	}
	var bizErr BizErr
	if !errors.As(err, &bizErr) {
		t.Fatalf("Expected BizErr, got %T", err)
	}
	if bizErr.Code() != ApiKeyNotExist {
		t.Fatalf("Expected ApiKeyNotExist, got %d", bizErr.Code())
	}
}
