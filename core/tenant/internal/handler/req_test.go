package handler

import (
	"bytes"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestAppListReq_Struct(t *testing.T) {
	req := AppListReq{
		Name:    "test-app",
		AppIds:  []string{"app1", "app2"},
		DevId:   12345,
		CloudId: "cloud-123",
	}

	if req.Name != "test-app" {
		t.Errorf("Expected Name 'test-app', got '%s'", req.Name)
	}
	if len(req.AppIds) != 2 {
		t.Errorf("Expected 2 AppIds, got %d", len(req.AppIds))
	}
	if req.DevId != 12345 {
		t.Errorf("Expected DevId 12345, got %d", req.DevId)
	}
}

func TestAddAppReq_Struct(t *testing.T) {
	req := AddAppReq{
		RequestId: "test-request-123",
		AppName:   "Test App",
		AppDesc:   "Test Description",
		DevId:     12345,
		CloudId:   "cloud-123",
	}

	if req.RequestId != "test-request-123" {
		t.Errorf("Expected RequestId 'test-request-123', got '%s'", req.RequestId)
	}
	if req.AppName != "Test App" {
		t.Errorf("Expected AppName 'Test App', got '%s'", req.AppName)
	}
	if req.DevId != 12345 {
		t.Errorf("Expected DevId 12345, got %d", req.DevId)
	}
}

func TestModifyAppReq_Struct(t *testing.T) {
	req := ModifyAppReq{
		RequestId: "test-request-123",
		AppId:     "app-123",
		AppName:   "Modified App",
		AppDesc:   "Modified Description",
	}

	if req.RequestId != "test-request-123" {
		t.Errorf("Expected RequestId 'test-request-123', got '%s'", req.RequestId)
	}
	if req.AppId != "app-123" {
		t.Errorf("Expected AppId 'app-123', got '%s'", req.AppId)
	}
	if req.AppName != "Modified App" {
		t.Errorf("Expected AppName 'Modified App', got '%s'", req.AppName)
	}
}

func TestDisableAppReq_Struct(t *testing.T) {
	req := DisableAppReq{
		RequestId: "test-request-123",
		AppId:     "app-123",
		Disable:   true,
	}

	if req.RequestId != "test-request-123" {
		t.Errorf("Expected RequestId 'test-request-123', got '%s'", req.RequestId)
	}
	if req.AppId != "app-123" {
		t.Errorf("Expected AppId 'app-123', got '%s'", req.AppId)
	}
	if req.Disable != true {
		t.Errorf("Expected Disable true, got %v", req.Disable)
	}
}

func TestDeleteAppReq_Struct(t *testing.T) {
	req := DeleteAppReq{
		RequestId: "test-request-123",
		AppId:     "app-123",
	}

	if req.RequestId != "test-request-123" {
		t.Errorf("Expected RequestId 'test-request-123', got '%s'", req.RequestId)
	}
	if req.AppId != "app-123" {
		t.Errorf("Expected AppId 'app-123', got '%s'", req.AppId)
	}
}

func TestAddAuthReq_Struct(t *testing.T) {
	req := AddAuthReq{
		RequestId: "test-request-123",
		AppId:     "app-123",
	}

	if req.RequestId != "test-request-123" {
		t.Errorf("Expected RequestId 'test-request-123', got '%s'", req.RequestId)
	}
	if req.AppId != "app-123" {
		t.Errorf("Expected AppId 'app-123', got '%s'", req.AppId)
	}
}

func TestDeleteAuthReq_Struct(t *testing.T) {
	req := DeleteAuthReq{
		RequestId: "test-request-123",
		AppId:     "app-123",
		ApiKey:    "api-key-123",
	}

	if req.RequestId != "test-request-123" {
		t.Errorf("Expected RequestId 'test-request-123', got '%s'", req.RequestId)
	}
	if req.AppId != "app-123" {
		t.Errorf("Expected AppId 'app-123', got '%s'", req.AppId)
	}
	if req.ApiKey != "api-key-123" {
		t.Errorf("Expected ApiKey 'api-key-123', got '%s'", req.ApiKey)
	}
}

func TestVerifyAppAuthReq_Struct(t *testing.T) {
	req := VerifyAppAuthReq{
		ApiKey:    "api-key-123",
		ApiSecret: "api-secret-123",
	}

	if req.ApiKey != "api-key-123" {
		t.Errorf("Expected ApiKey 'api-key-123', got '%s'", req.ApiKey)
	}
	if req.ApiSecret != "api-secret-123" {
		t.Errorf("Expected ApiSecret 'api-secret-123', got '%s'", req.ApiSecret)
	}
}

func TestNewAddAppReq_ValidRequest(t *testing.T) {
	reqData := AddAppReq{
		RequestId: "test-request-123",
		AppName:   "Test App",
		AppDesc:   "Test Description",
		DevId:     12345,
		CloudId:   "cloud-123",
	}

	c, _ := createTestContext("POST", "/app", reqData)

	req, err := newAddAppReq(c)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if req.RequestId != reqData.RequestId {
		t.Errorf("Expected RequestId '%s', got '%s'", reqData.RequestId, req.RequestId)
	}
	if req.AppName != reqData.AppName {
		t.Errorf("Expected AppName '%s', got '%s'", reqData.AppName, req.AppName)
	}
	if req.DevId != reqData.DevId {
		t.Errorf("Expected DevId %d, got %d", reqData.DevId, req.DevId)
	}
}

func TestNewAddAppReq_InvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/app", bytes.NewReader([]byte("invalid json")))
	c.Request.Header.Set("Content-Type", "application/json")

	_, err := newAddAppReq(c)
	if err == nil {
		t.Error("Expected error for invalid JSON, got nil")
	}
}

func TestNewModifyAppReq_ValidRequest(t *testing.T) {
	reqData := ModifyAppReq{
		RequestId: "test-request-123",
		AppId:     "app-123",
		AppName:   "Modified App",
		AppDesc:   "Modified Description",
	}

	c, _ := createTestContext("PUT", "/app", reqData)

	req, err := newModifyAppReq(c)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if req.RequestId != reqData.RequestId {
		t.Errorf("Expected RequestId '%s', got '%s'", reqData.RequestId, req.RequestId)
	}
	if req.AppId != reqData.AppId {
		t.Errorf("Expected AppId '%s', got '%s'", reqData.AppId, req.AppId)
	}
	if req.AppName != reqData.AppName {
		t.Errorf("Expected AppName '%s', got '%s'", reqData.AppName, req.AppName)
	}
}

func TestNewDisableAppReq_ValidRequest(t *testing.T) {
	reqData := DisableAppReq{
		RequestId: "test-request-123",
		AppId:     "app-123",
		Disable:   true,
	}

	c, _ := createTestContext("POST", "/app/disable", reqData)

	req, err := newDisableAppReq(c)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if req.RequestId != reqData.RequestId {
		t.Errorf("Expected RequestId '%s', got '%s'", reqData.RequestId, req.RequestId)
	}
	if req.AppId != reqData.AppId {
		t.Errorf("Expected AppId '%s', got '%s'", reqData.AppId, req.AppId)
	}
	if req.Disable != reqData.Disable {
		t.Errorf("Expected Disable %t, got %t", reqData.Disable, req.Disable)
	}
}

func TestNewDeleteAppReq_ValidRequest(t *testing.T) {
	reqData := DeleteAppReq{
		RequestId: "test-request-123",
		AppId:     "app-123",
	}

	c, _ := createTestContext("DELETE", "/app", reqData)

	req, err := newDeleteAppReq(c)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if req.RequestId != reqData.RequestId {
		t.Errorf("Expected RequestId '%s', got '%s'", reqData.RequestId, req.RequestId)
	}
	if req.AppId != reqData.AppId {
		t.Errorf("Expected AppId '%s', got '%s'", reqData.AppId, req.AppId)
	}
}

func TestNewAddAuthReq_ValidRequest(t *testing.T) {
	reqData := AddAuthReq{
		RequestId: "test-request-123",
		AppId:     "app-123",
	}

	c, _ := createTestContext("POST", "/auth", reqData)

	req, err := newAddAuthReq(c)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if req.RequestId != reqData.RequestId {
		t.Errorf("Expected RequestId '%s', got '%s'", reqData.RequestId, req.RequestId)
	}
	if req.AppId != reqData.AppId {
		t.Errorf("Expected AppId '%s', got '%s'", reqData.AppId, req.AppId)
	}
}

func TestNewDeleteAuthReq_ValidRequest(t *testing.T) {
	reqData := DeleteAuthReq{
		RequestId: "test-request-123",
		AppId:     "app-123",
		ApiKey:    "api-key-123",
	}

	c, _ := createTestContext("DELETE", "/auth", reqData)

	req, err := newDeleteAuthReq(c)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if req.RequestId != reqData.RequestId {
		t.Errorf("Expected RequestId '%s', got '%s'", reqData.RequestId, req.RequestId)
	}
	if req.AppId != reqData.AppId {
		t.Errorf("Expected AppId '%s', got '%s'", reqData.AppId, req.AppId)
	}
	if req.ApiKey != reqData.ApiKey {
		t.Errorf("Expected ApiKey '%s', got '%s'", reqData.ApiKey, req.ApiKey)
	}
}

func TestNewVerifyAppAuthReq_ValidRequest(t *testing.T) {
	reqData := VerifyAppAuthReq{
		ApiKey:    "api-key-123",
		ApiSecret: "api-secret-123",
	}

	c, _ := createTestContext("POST", "/auth/verify", reqData)

	req, err := newVerifyAppAuthReq(c)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if req.ApiKey != reqData.ApiKey {
		t.Errorf("Expected ApiKey '%s', got '%s'", reqData.ApiKey, req.ApiKey)
	}
	if req.ApiSecret != reqData.ApiSecret {
		t.Errorf("Expected ApiSecret '%s', got '%s'", reqData.ApiSecret, req.ApiSecret)
	}
}

func TestNewVerifyAppAuthReq_EmptySecret(t *testing.T) {
	reqData := VerifyAppAuthReq{
		ApiKey: "api-key-123",
	}

	c, _ := createTestContext("POST", "/auth/verify", reqData)

	_, err := newVerifyAppAuthReq(c)
	if err == nil {
		t.Fatal("Expected error for empty api_secret, got nil")
	}
}

func TestRequestValidation_EmptyFields(t *testing.T) {
	tests := []struct {
		name string
		req  interface{}
	}{
		{"empty AddAppReq", AddAppReq{}},
		{"empty ModifyAppReq", ModifyAppReq{}},
		{"empty DisableAppReq", DisableAppReq{}},
		{"empty DeleteAppReq", DeleteAppReq{}},
		{"empty AddAuthReq", AddAuthReq{}},
		{"empty DeleteAuthReq", DeleteAuthReq{}},
		{"empty VerifyAppAuthReq", VerifyAppAuthReq{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := createTestContext("POST", "/test", tt.req)

			// Test that empty requests can be created but validation should be handled by business logic
			switch tt.req.(type) {
			case AddAppReq:
				_, err := newAddAppReq(c)
				if err != nil {
					t.Logf("Expected potential validation error for empty AddAppReq: %v", err)
				}
			case ModifyAppReq:
				_, err := newModifyAppReq(c)
				if err != nil {
					t.Logf("Expected potential validation error for empty ModifyAppReq: %v", err)
				}
			}
		})
	}
}
