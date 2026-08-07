package handler

import (
	"testing"
)

func TestErrorConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant int
		expected int
	}{
		{"Success constant", Success, 0},
		{"ParamErr constant", ParamErr, 14001},
		{"SidErr constant", SidErr, 14002},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("Expected %d, got %d", tt.expected, tt.constant)
			}
		})
	}
}

func TestNewHandlerErr(t *testing.T) {
	tests := []struct {
		name string
		code int
		msg  string
	}{
		{
			name: "create success handler error",
			code: Success,
			msg:  "success",
		},
		{
			name: "create param error",
			code: ParamErr,
			msg:  "invalid parameter",
		},
		{
			name: "create sid error",
			code: SidErr,
			msg:  "sid generation failed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := NewHandlerErr(tt.code, tt.msg)

			if err.Code() != tt.code {
				t.Errorf("Expected code %d, got %d", tt.code, err.Code())
			}

			if err.Msg() != tt.msg {
				t.Errorf("Expected message '%s', got '%s'", tt.msg, err.Msg())
			}

			if err.Error() == "" {
				t.Error("Error() should return non-empty string")
			}
		})
	}
}

func TestHandlerErr_Code(t *testing.T) {
	tests := []struct {
		name string
		code int
	}{
		{"zero code", 0},
		{"positive code", 14001},
		{"negative code", -1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := &HandlerErr{code: tt.code}
			if err.Code() != tt.code {
				t.Errorf("Expected code %d, got %d", tt.code, err.Code())
			}
		})
	}
}

func TestHandlerErr_Msg(t *testing.T) {
	tests := []struct {
		name string
		msg  string
	}{
		{"empty message", ""},
		{"normal message", "test message"},
		{"long message", "this is a very long error message for testing purposes"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := &HandlerErr{msg: tt.msg}
			if err.Msg() != tt.msg {
				t.Errorf("Expected message '%s', got '%s'", tt.msg, err.Msg())
			}
		})
	}
}

func TestHandlerErr_Error(t *testing.T) {
	tests := []struct {
		name       string
		fullErrMsg string
		expected   string
	}{
		{"empty error message", "", "code:0msg:"},
		{"normal error message", "test error", "test error"},
		{"detailed error message", "detailed error message with context", "detailed error message with context"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := &HandlerErr{fullErrMsg: tt.fullErrMsg}
			if err.Error() != tt.expected {
				t.Errorf("Expected error '%s', got '%s'", tt.expected, err.Error())
			}
		})
	}
}

func TestHandlerErr_InterfaceCompliance(t *testing.T) {
	// Test that HandlerErr implements error interface
	var _ error = &HandlerErr{}

	err := NewHandlerErr(ParamErr, "test error")

	// Test that it can be used as error interface
	errorStr := err.Error()
	if errorStr == "" {
		t.Error("Error() should return non-empty string")
	}
}

func TestHandlerErr_AllFields(t *testing.T) {
	code := 12345
	msg := "test message"

	err := NewHandlerErr(code, msg)

	if err.Code() != code {
		t.Errorf("Expected code %d, got %d", code, err.Code())
	}

	if err.Msg() != msg {
		t.Errorf("Expected message '%s', got '%s'", msg, err.Msg())
	}

	if err.Error() == "" {
		t.Error("Error() should return non-empty string")
	}
}

func TestHandlerErr_ZeroValues(t *testing.T) {
	err := &HandlerErr{}

	if err.Code() != 0 {
		t.Errorf("Expected zero code, got %d", err.Code())
	}

	if err.Msg() != "" {
		t.Errorf("Expected empty message, got '%s'", err.Msg())
	}

	if err.Error() != "code:0msg:" {
		t.Errorf("Expected 'code:0msg:', got '%s'", err.Error())
	}
}
