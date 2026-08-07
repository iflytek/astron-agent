package service

import (
	"reflect"
	"testing"
)

func TestAppQuery_Structure(t *testing.T) {
	// Test basic functionality of AppQuery struct
	query := AppQuery{
		AppIds:  []string{"app1", "app2"},
		Name:    "test-app",
		DevId:   123,
		CloudId: "cloud-456",
	}

	if len(query.AppIds) != 2 {
		t.Errorf("Expected 2 AppIds, got %d", len(query.AppIds))
	}
	if query.Name != "test-app" {
		t.Errorf("Expected Name 'test-app', got '%s'", query.Name)
	}
	if query.DevId != 123 {
		t.Errorf("Expected DevId 123, got %d", query.DevId)
	}
	if query.CloudId != "cloud-456" {
		t.Errorf("Expected CloudId 'cloud-456', got '%s'", query.CloudId)
	}
}

func TestAddAppResult_Structure(t *testing.T) {
	result := AddAppResult{
		AppId:     "app-123",
		ApiKey:    "key-456",
		ApiSecret: "secret-789",
	}

	if result.AppId != "app-123" {
		t.Errorf("Expected AppId 'app-123', got '%s'", result.AppId)
	}
	if result.ApiKey != "key-456" {
		t.Errorf("Expected ApiKey 'key-456', got '%s'", result.ApiKey)
	}
	if result.ApiSecret != "secret-789" {
		t.Errorf("Expected ApiSecret 'secret-789', got '%s'", result.ApiSecret)
	}
}

func TestAddAuthResult_Structure(t *testing.T) {
	result := AddAuthResult{
		ApiKey:    "key-123",
		ApiSecret: "secret-456",
	}

	if result.ApiKey != "key-123" {
		t.Errorf("Expected ApiKey 'key-123', got '%s'", result.ApiKey)
	}
	if result.ApiSecret != "secret-456" {
		t.Errorf("Expected ApiSecret 'secret-456', got '%s'", result.ApiSecret)
	}
}

func TestAppDetailsData_Structure(t *testing.T) {
	authList := []*AuthData{
		{ApiKey: "key1", ApiSecret: "secret1"},
		{ApiKey: "key2", ApiSecret: "secret2"},
	}

	details := AppDetailsData{
		Appid:     "app-123",
		Name:      "Test App",
		IsDisable: false,
		AuthList:  authList,
		Desc:      "Test Description",
	}

	if details.Appid != "app-123" {
		t.Errorf("Expected Appid 'app-123', got '%s'", details.Appid)
	}
	if details.Name != "Test App" {
		t.Errorf("Expected Name 'Test App', got '%s'", details.Name)
	}
	if details.IsDisable != false {
		t.Errorf("Expected IsDisable false, got %t", details.IsDisable)
	}
	if len(details.AuthList) != 2 {
		t.Errorf("Expected 2 AuthList items, got %d", len(details.AuthList))
	}
	if details.Desc != "Test Description" {
		t.Errorf("Expected Desc 'Test Description', got '%s'", details.Desc)
	}
}

func TestAuthData_Structure(t *testing.T) {
	auth := AuthData{
		ApiKey:    "test-key",
		ApiSecret: "test-secret",
	}

	if auth.ApiKey != "test-key" {
		t.Errorf("Expected ApiKey 'test-key', got '%s'", auth.ApiKey)
	}
	if auth.ApiSecret != "test-secret" {
		t.Errorf("Expected ApiSecret 'test-secret', got '%s'", auth.ApiSecret)
	}
}

func TestErrorConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant int
		expected int
	}{
		{"ErrCodeBYD", ErrCodeBYD, 3001},
		{"ErrCodeSystem", ErrCodeSystem, 3002},
		{"AppIdNotExist", AppIdNotExist, 3003},
		{"ApiKeyHasExist", ApiKeyHasExist, 3004},
		{"ApiKeyNotExist", ApiKeyNotExist, 3006},
		{"APPNameHasExist", APPNameHasExist, 3007},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("Expected %s = %d, got %d", tt.name, tt.expected, tt.constant)
			}
		})
	}
}

func TestNewBizErr(t *testing.T) {
	tests := []struct {
		name string
		code int
		msg  string
	}{
		{"system error", ErrCodeSystem, "system failed"},
		{"app not exist", AppIdNotExist, "app not found"},
		{"api key exists", ApiKeyHasExist, "api key already exists"},
		{"empty message", ErrCodeBYD, ""},
		{"zero code", 0, "zero code error"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := NewBizErr(tt.code, tt.msg)

			if err.Code() != tt.code {
				t.Errorf("Expected code %d, got %d", tt.code, err.Code())
			}
			if err.Msg() != tt.msg {
				t.Errorf("Expected message '%s', got '%s'", tt.msg, err.Msg())
			}
		})
	}
}

func TestBizErr_Code(t *testing.T) {
	tests := []struct {
		name string
		code int
	}{
		{"positive code", 3001},
		{"zero code", 0},
		{"negative code", -1},
		{"large code", 999999},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := BizErr{code: tt.code}
			if err.Code() != tt.code {
				t.Errorf("Expected code %d, got %d", tt.code, err.Code())
			}
		})
	}
}

func TestBizErr_Msg(t *testing.T) {
	tests := []struct {
		name string
		msg  string
	}{
		{"normal message", "test error message"},
		{"empty message", ""},
		{"long message", "this is a very long error message for testing purposes"},
		{"special chars", "error with special chars: !@#$%^&*()"},
		{"unicode message", "error message test"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := BizErr{msg: tt.msg}
			if err.Msg() != tt.msg {
				t.Errorf("Expected message '%s', got '%s'", tt.msg, err.Msg())
			}
		})
	}
}

func TestBizErr_Error(t *testing.T) {
	tests := []struct {
		name       string
		code       int
		msg        string
		fullErrMsg string
		expected   string
	}{
		{
			name:       "with fullErrMsg",
			code:       3001,
			msg:        "test msg",
			fullErrMsg: "full error message",
			expected:   "full error message",
		},
		{
			name:     "without fullErrMsg - normal case",
			code:     3002,
			msg:      "system error",
			expected: "code:3002msg:system error",
		},
		{
			name:     "without fullErrMsg - empty msg",
			code:     3003,
			msg:      "",
			expected: "code:3003msg:",
		},
		{
			name:     "without fullErrMsg - zero code",
			code:     0,
			msg:      "zero code",
			expected: "code:0msg:zero code",
		},
		{
			name:     "without fullErrMsg - negative code",
			code:     -1,
			msg:      "negative",
			expected: "code:-1msg:negative",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := BizErr{
				code:       tt.code,
				msg:        tt.msg,
				fullErrMsg: tt.fullErrMsg,
			}

			result := err.Error()
			if result != tt.expected {
				t.Errorf("Expected error '%s', got '%s'", tt.expected, result)
			}

			// Test that calling Error() again returns the same result (caching)
			result2 := err.Error()
			if result2 != result {
				t.Errorf("Error() should return consistent results: first='%s', second='%s'", result, result2)
			}
		})
	}
}

func TestBizErr_ErrorCaching(t *testing.T) {
	err := &BizErr{
		code: 3001,
		msg:  "test error",
	}

	// First call should generate the error message
	firstCall := err.Error()
	expectedMsg := "code:3001msg:test error"
	if firstCall != expectedMsg {
		t.Errorf("Expected first call to return '%s', got '%s'", expectedMsg, firstCall)
	}

	// Second call should return the same message
	secondCall := err.Error()
	if secondCall != firstCall {
		t.Errorf("Expected cached result '%s', got '%s'", firstCall, secondCall)
	}

	// Note: Since Error() method has a value receiver, fullErrMsg won't be modified
	// This is expected behavior in Go - value receivers work on copies
}

func TestBizErr_InterfaceCompliance(t *testing.T) {
	// Test that BizErr implements error interface
	var _ error = BizErr{}
	var _ error = &BizErr{}

	err := NewBizErr(AppIdNotExist, "test error")
	errorInterface := error(err)

	errorStr := errorInterface.Error()
	if errorStr == "" {
		t.Error("Error() should return non-empty string")
	}
}

func TestBizErr_ZeroValues(t *testing.T) {
	err := BizErr{}

	if err.Code() != 0 {
		t.Errorf("Expected zero code, got %d", err.Code())
	}

	if err.Msg() != "" {
		t.Errorf("Expected empty message, got '%s'", err.Msg())
	}

	expectedError := "code:0msg:"
	if err.Error() != expectedError {
		t.Errorf("Expected error message '%s', got '%s'", expectedError, err.Error())
	}
}

func TestBizErr_EdgeCases(t *testing.T) {
	t.Run("very large code", func(t *testing.T) {
		err := NewBizErr(2147483647, "max int32")
		if err.Code() != 2147483647 {
			t.Error("Should handle large codes")
		}
		expectedError := "code:2147483647msg:max int32"
		if err.Error() != expectedError {
			t.Errorf("Expected '%s', got '%s'", expectedError, err.Error())
		}
	})

	t.Run("very long message", func(t *testing.T) {
		longMsg := string(make([]byte, 10000)) // 10KB message
		for i := range longMsg {
			longMsg = longMsg[:i] + "a" + longMsg[i+1:]
		}
		err := NewBizErr(3001, longMsg)
		if err.Msg() != longMsg {
			t.Error("Should handle very long messages")
		}
	})
}

func TestStructJSONTags(t *testing.T) {
	// Test that JSON tags are properly defined for API serialization
	t.Run("AddAppResult JSON tags", func(t *testing.T) {
		result := AddAppResult{
			AppId:     "test-app",
			ApiKey:    "test-key",
			ApiSecret: "test-secret",
		}

		// Use reflection to check field tags
		resultType := reflect.TypeOf(result)

		appIdField, _ := resultType.FieldByName("AppId")
		if appIdField.Tag.Get("json") != "app_id" {
			t.Error("AppId should have json tag 'app_id'")
		}

		apiKeyField, _ := resultType.FieldByName("ApiKey")
		if apiKeyField.Tag.Get("json") != "api_key" {
			t.Error("ApiKey should have json tag 'api_key'")
		}

		apiSecretField, _ := resultType.FieldByName("ApiSecret")
		if apiSecretField.Tag.Get("json") != "api_secret" {
			t.Error("ApiSecret should have json tag 'api_secret'")
		}
	})

	t.Run("AddAuthResult JSON tags", func(t *testing.T) {
		resultType := reflect.TypeOf(AddAuthResult{})

		apiKeyField, _ := resultType.FieldByName("ApiKey")
		if apiKeyField.Tag.Get("json") != "api_key" {
			t.Error("ApiKey should have json tag 'api_key'")
		}

		apiSecretField, _ := resultType.FieldByName("ApiSecret")
		if apiSecretField.Tag.Get("json") != "api_secret" {
			t.Error("ApiSecret should have json tag 'api_secret'")
		}
	})

	t.Run("AppDetailsData JSON tags", func(t *testing.T) {
		detailsType := reflect.TypeOf(AppDetailsData{})

		appIdField, _ := detailsType.FieldByName("Appid")
		if appIdField.Tag.Get("json") != "appid" {
			t.Error("Appid should have json tag 'appid'")
		}

		authListField, _ := detailsType.FieldByName("AuthList")
		if authListField.Tag.Get("json") != "auth_list,omitempty" {
			t.Error("AuthList should have json tag 'auth_list,omitempty'")
		}
	})
}

func TestErrorCodeUniqueness(t *testing.T) {
	// Verify that all error codes are unique
	codes := map[int]string{
		ErrCodeBYD:      "ErrCodeBYD",
		ErrCodeSystem:   "ErrCodeSystem",
		AppIdNotExist:   "AppIdNotExist",
		ApiKeyHasExist:  "ApiKeyHasExist",
		ApiKeyNotExist:  "ApiKeyNotExist",
		APPNameHasExist: "APPNameHasExist",
	}

	if len(codes) != 6 {
		t.Errorf("Expected 6 unique error codes, got %d", len(codes))
	}

	// Verify specific code values for regression prevention
	expectedCodes := map[int]string{
		3001: "ErrCodeBYD",
		3002: "ErrCodeSystem",
		3003: "AppIdNotExist",
		3004: "ApiKeyHasExist",
		3006: "ApiKeyNotExist",
		3007: "APPNameHasExist",
	}

	for code, name := range expectedCodes {
		if actualName, exists := codes[code]; !exists {
			t.Errorf("Error code %d should exist", code)
		} else if actualName != name {
			t.Errorf("Error code %d should be %s, got %s", code, name, actualName)
		}
	}
}
