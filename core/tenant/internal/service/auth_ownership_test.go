package service

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"slices"
	"testing"

	"tenant/internal/dao"
	"tenant/internal/models"
)

// noopTxConnector opens real *sql.Tx values, because the services commit or
// roll back the transaction they begin and cannot run against a nil one.
type noopTxConnector struct{}

func (noopTxConnector) Connect(context.Context) (driver.Conn, error) { return noopTxConn{}, nil }
func (noopTxConnector) Driver() driver.Driver                        { return nil }

type noopTxConn struct{}

func (noopTxConn) Prepare(string) (driver.Stmt, error) { return nil, errors.New("not supported") }
func (noopTxConn) Close() error                        { return nil }
func (noopTxConn) Begin() (driver.Tx, error)           { return noopTx{}, nil }

type noopTx struct{}

func (noopTx) Commit() error   { return nil }
func (noopTx) Rollback() error { return nil }

// authMatches applies the WHERE clauses produced by the auth SqlOptions to a row.
func authMatches(t *testing.T, auth *models.Auth, options []dao.SqlOption) bool {
	t.Helper()
	for _, option := range options {
		clause, params := option()
		var matched bool
		switch clause {
		case "app_id=?":
			matched = auth.AppId == params[0]
		case "app_id IN (?)":
			matched = slices.Contains(params, any(auth.AppId))
		case "api_key=?":
			matched = auth.ApiKey == params[0]
		case "is_delete=?":
			matched = auth.IsDelete == params[0]
		default:
			t.Fatalf("unexpected auth query clause %q", clause)
		}
		if !matched {
			return false
		}
	}
	return true
}

// inMemoryAuthDao evaluates query options against rows, so tests observe which
// credentials a service call really reaches rather than which options it built.
type inMemoryAuthDao struct {
	MockAuthDao
	t    *testing.T
	rows []*models.Auth
}

func (m *inMemoryAuthDao) BeginTx() (*sql.Tx, error) {
	return sql.OpenDB(noopTxConnector{}).Begin()
}

func (m *inMemoryAuthDao) Delete(_ *sql.Tx, options ...dao.SqlOption) (int64, error) {
	var deleted int64
	for _, row := range m.rows {
		if authMatches(m.t, row, options) {
			row.IsDelete = true
			deleted++
		}
	}
	return deleted, nil
}

func (m *inMemoryAuthDao) Select(options ...dao.SqlOption) ([]*models.Auth, error) {
	matched := make([]*models.Auth, 0, len(m.rows))
	for _, row := range m.rows {
		if authMatches(m.t, row, options) {
			matched = append(matched, row)
		}
	}
	return matched, nil
}

func (m *inMemoryAuthDao) WithApiSecret(apiSecret string) dao.SqlOption {
	return func() (string, []interface{}) { return "api_secret=?", []interface{}{apiSecret} }
}

type existingAppDao struct {
	verifyAuthAppDao
}

func (*existingAppDao) Count(bool, *sql.Tx, ...dao.SqlOption) (int64, error) {
	return 1, nil
}

func TestAuthService_DeleteApiKey_RejectsKeyOfAnotherApp(t *testing.T) {
	victim := &models.Auth{AppId: "app-b", ApiKey: "key-b"}
	service := &AuthService{
		appDao:  &existingAppDao{},
		authDao: &inMemoryAuthDao{t: t, rows: []*models.Auth{{AppId: "app-a", ApiKey: "key-a"}, victim}},
	}

	err := service.DeleteApiKey("app-a", "key-b")

	var bizErr BizErr
	if !errors.As(err, &bizErr) || bizErr.Code() != ApiKeyNotExist {
		t.Fatalf("Expected ApiKeyNotExist, got %v", err)
	}
	if victim.IsDelete {
		t.Fatal("Expected the key owned by another app to stay active")
	}
}

func TestAuthService_DeleteApiKey_DeletesOwnKey(t *testing.T) {
	own := &models.Auth{AppId: "app-a", ApiKey: "key-a"}
	other := &models.Auth{AppId: "app-b", ApiKey: "key-b"}
	service := &AuthService{
		appDao:  &existingAppDao{},
		authDao: &inMemoryAuthDao{t: t, rows: []*models.Auth{own, other}},
	}

	if err := service.DeleteApiKey("app-a", "key-a"); err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if !own.IsDelete {
		t.Fatal("Expected the app's own key to be deleted")
	}
	if other.IsDelete {
		t.Fatal("Expected other apps' keys to stay active")
	}
}

func TestAppService_QueryDetails_OmitsDeletedKeys(t *testing.T) {
	service := &AppService{
		appDao: &MockAppDao{apps: []*models.App{{AppId: "app-a"}, {AppId: "app-b"}}},
		authDao: &inMemoryAuthDao{t: t, rows: []*models.Auth{
			{AppId: "app-a", ApiKey: "revoked", ApiSecret: "revoked-secret", IsDelete: true},
			{AppId: "app-a", ApiKey: "active", ApiSecret: "active-secret"},
			{AppId: "app-b", ApiKey: "revoked-only", ApiSecret: "revoked-only-secret", IsDelete: true},
			{AppId: "app-c", ApiKey: "unrelated", ApiSecret: "unrelated-secret"},
		}},
	}

	details, err := service.QueryDetails(&AppQuery{AppIds: []string{"app-a", "app-b"}})
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	authLists := make(map[string][]*AuthData, len(details))
	for _, detail := range details {
		authLists[detail.Appid] = detail.AuthList
	}
	if len(authLists) != 2 {
		t.Fatalf("Expected details for 2 apps, got %d", len(authLists))
	}
	active := authLists["app-a"]
	if len(active) != 1 || active[0].ApiKey != "active" {
		t.Fatalf("Expected only the active key for app-a, got %+v", active)
	}
	if revokedOnly := authLists["app-b"]; len(revokedOnly) != 0 {
		t.Fatalf("Expected no keys for app-b, got %+v", revokedOnly)
	}
}
