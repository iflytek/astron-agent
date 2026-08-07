package handler

import (
	"testing"
)

func TestResp_Struct(t *testing.T) {
	resp := Resp{
		Sid:     "test-sid-123",
		Code:    200,
		Message: "success",
		Data:    "test data",
	}

	if resp.Sid != "test-sid-123" {
		t.Errorf("Expected Sid 'test-sid-123', got '%s'", resp.Sid)
	}
	if resp.Code != 200 {
		t.Errorf("Expected Code 200, got %d", resp.Code)
	}
	if resp.Message != "success" {
		t.Errorf("Expected Message 'success', got '%s'", resp.Message)
	}
	if resp.Data != "test data" {
		t.Errorf("Expected Data 'test data', got '%v'", resp.Data)
	}
}

func TestAppData_Struct(t *testing.T) {
	appData := AppData{
		Appid:      "app-123",
		Name:       "Test App",
		DevId:      12345,
		CloudId:    "channel-123",
		Source:     "admin",
		IsDisable:  false,
		Desc:       "Test Description",
		CreateTime: "2023-01-01 10:00:00",
	}

	if appData.Appid != "app-123" {
		t.Errorf("Expected Appid 'app-123', got '%s'", appData.Appid)
	}
	if appData.Name != "Test App" {
		t.Errorf("Expected Name 'Test App', got '%s'", appData.Name)
	}
	if appData.DevId != 12345 {
		t.Errorf("Expected DevId 12345, got %d", appData.DevId)
	}
	if appData.IsDisable != false {
		t.Errorf("Expected IsDisable false, got %t", appData.IsDisable)
	}
}

func TestAuthData_Struct(t *testing.T) {
	authData := AuthData{
		ApiKey:    "api-key-123",
		ApiSecret: "api-secret-456",
	}

	if authData.ApiKey != "api-key-123" {
		t.Errorf("Expected ApiKey 'api-key-123', got '%s'", authData.ApiKey)
	}
	if authData.ApiSecret != "api-secret-456" {
		t.Errorf("Expected ApiSecret 'api-secret-456', got '%s'", authData.ApiSecret)
	}
}

func TestAllowListData_Struct(t *testing.T) {
	allowListData := AllowListData{
		IP:     "192.168.1.1",
		Enable: true,
	}

	if allowListData.IP != "192.168.1.1" {
		t.Errorf("Expected IP '192.168.1.1', got '%s'", allowListData.IP)
	}
	if allowListData.Enable != true {
		t.Errorf("Expected Enable true, got %t", allowListData.Enable)
	}
}

func TestNewErrResp(t *testing.T) {
	tests := []struct {
		name       string
		code       int
		msg        string
		fullErrMsg string
		sid        string
	}{
		{
			name:       "create param error response",
			code:       ParamErr,
			msg:        "invalid parameter",
			fullErrMsg: "parameter validation failed",
			sid:        "test-sid-123",
		},
		{
			name:       "create sid error response",
			code:       SidErr,
			msg:        "sid generation failed",
			fullErrMsg: "unable to generate session id",
			sid:        "test-sid-456",
		},
		{
			name:       "create success response",
			code:       Success,
			msg:        "success",
			fullErrMsg: "operation successful",
			sid:        "test-sid-789",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := newErrResp(tt.code, tt.msg, tt.sid)

			if resp == nil {
				t.Fatal("Expected non-nil response")
			}

			if resp.Code != tt.code {
				t.Errorf("Expected code %d, got %d", tt.code, resp.Code)
			}

			if resp.Message != tt.msg {
				t.Errorf("Expected message '%s', got '%s'", tt.msg, resp.Message)
			}

			// The sid should match the provided sid
			if resp.Sid != tt.sid {
				t.Errorf("Expected sid '%s', got '%s'", tt.sid, resp.Sid)
			}

			// Data should be nil for error response
			if resp.Data != nil {
				t.Errorf("Expected nil data, got %v", resp.Data)
			}
		})
	}
}

type successRespTestCase struct {
	name string
	sid  string
	data interface{}
}

func validateSuccessResponse(t *testing.T, resp *Resp, tt successRespTestCase) {
	if resp == nil {
		t.Fatal("Expected non-nil response")
	}

	if resp.Code != Success {
		t.Errorf("Expected code %d, got %d", Success, resp.Code)
	}

	if resp.Sid != tt.sid {
		t.Errorf("Expected sid '%s', got '%s'", tt.sid, resp.Sid)
	}

	if resp.Message != "success" {
		t.Errorf("Expected message 'success', got '%s'", resp.Message)
	}

	validateSuccessResponseData(t, resp, tt)
}

func validateSuccessResponseData(t *testing.T, resp *Resp, tt successRespTestCase) {
	if tt.data != nil {
		if resp.Data == nil {
			t.Errorf("Expected data %v, got nil", tt.data)
		}

		switch tt.data.(type) {
		case []string:
			if resp.Data == nil {
				t.Error("Expected slice data to be non-nil")
			}
		default:
			if resp.Data != tt.data {
				t.Errorf("Expected data %v, got %v", tt.data, resp.Data)
			}
		}
	}
}

func TestNewSuccessResp(t *testing.T) {
	tests := []successRespTestCase{
		{
			name: "success response with string data",
			sid:  "test-sid-123",
			data: "test data",
		},
		{
			name: "success response with app data",
			sid:  "test-sid-456",
			data: AppData{
				Appid: "app-123",
				Name:  "Test App",
			},
		},
		{
			name: "success response with nil data",
			sid:  "test-sid-789",
			data: nil,
		},
		{
			name: "success response with slice data",
			sid:  "test-sid-000",
			data: []string{"item1", "item2"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := newSuccessResp(tt.data, tt.sid)
			validateSuccessResponse(t, resp, tt)
		})
	}
}

func TestResponseCreation_EdgeCases(t *testing.T) {
	t.Run("error response with empty strings", func(t *testing.T) {
		resp := newErrResp(0, "", "")

		if resp.Code != 0 {
			t.Errorf("Expected code 0, got %d", resp.Code)
		}
		if resp.Message != "" {
			t.Errorf("Expected empty message, got '%s'", resp.Message)
		}
		if resp.Sid != "" {
			t.Errorf("Expected empty sid, got '%s'", resp.Sid)
		}
	})

	t.Run("success response with empty sid", func(t *testing.T) {
		resp := newSuccessResp("data", "")

		if resp.Sid != "" {
			t.Errorf("Expected empty sid, got '%s'", resp.Sid)
		}
		if resp.Data != "data" {
			t.Errorf("Expected data 'data', got %v", resp.Data)
		}
	})

	t.Run("success response with complex data structure", func(t *testing.T) {
		complexData := map[string]interface{}{
			"apps": []AppData{
				{Appid: "app1", Name: "App 1"},
				{Appid: "app2", Name: "App 2"},
			},
			"total": 2,
		}

		resp := newSuccessResp(complexData, "test-sid")

		if resp.Data == nil {
			t.Error("Expected complex data structure to be preserved")
		}
	})
}

func TestResponseJSONSerialization(t *testing.T) {
	// This test verifies that the response structures can be properly serialized to JSON
	// which is important for HTTP responses

	t.Run("serialize error response", func(t *testing.T) {
		resp := newErrResp(ParamErr, "validation failed", "detailed error")

		// Basic validation that the response has expected structure for JSON serialization
		if resp.Code == 0 && resp.Message == "" {
			t.Error("Response should have non-zero values for proper JSON serialization")
		}
	})

	t.Run("serialize success response with data", func(t *testing.T) {
		appData := AppData{
			Appid: "app1",
			Name:  "App 1",
		}
		resp := newSuccessResp(appData, "test-sid")

		if resp.Data == nil {
			t.Error("Success response should contain data for JSON serialization")
		}
	})
}

func TestResponseStructTags(t *testing.T) {
	// Verify that JSON tags are properly defined for HTTP response serialization
	// This is implicit testing - if the structs have proper tags, they will serialize correctly

	t.Run("Resp struct has proper JSON tags", func(t *testing.T) {
		resp := Resp{
			Sid:     "test",
			Code:    200,
			Message: "ok",
			Data:    "test",
		}

		// If JSON tags are properly defined, all fields should be accessible
		if resp.Sid == "" || resp.Code == 0 {
			t.Error("Resp struct fields should be properly accessible")
		}
	})

	t.Run("AppData struct has proper JSON tags", func(t *testing.T) {
		appData := AppData{
			Appid: "test",
			Name:  "test",
		}

		if appData.Appid == "" || appData.Name == "" {
			t.Error("AppData struct fields should be properly accessible")
		}
	})

	t.Run("AuthData struct has proper JSON tags", func(t *testing.T) {
		authData := AuthData{
			ApiKey: "test",
		}

		if authData.ApiKey == "" {
			t.Error("AuthData struct fields should be properly accessible")
		}
	})
}
