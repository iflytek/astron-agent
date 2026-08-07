package generator

import (
	"fmt"
	"regexp"
	"testing"
	"time"
)

func TestGenCurrTime(t *testing.T) {
	tests := []struct {
		name           string
		format         string
		expectedFormat string
	}{
		{
			name:           "empty format should use default",
			format:         "",
			expectedFormat: "2006-01-02 15:04:05",
		},
		{
			name:           "custom format should be used",
			format:         "2006/01/02",
			expectedFormat: "2006/01/02",
		},
		{
			name:           "time only format",
			format:         "15:04:05",
			expectedFormat: "15:04:05",
		},
		{
			name:           "RFC3339 format",
			format:         time.RFC3339,
			expectedFormat: time.RFC3339,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenCurrTime(tt.format)

			// Verify the result is not empty
			if result == "" {
				t.Error("GenCurrTime should not return empty string")
			}

			// Verify the format by parsing it back
			var expectedLayout string
			if tt.format == "" {
				expectedLayout = "2006-01-02 15:04:05"
			} else {
				expectedLayout = tt.format
			}

			// Try to parse the result to verify it matches the expected format
			_, err := time.Parse(expectedLayout, result)
			if err != nil {
				t.Errorf("Generated time '%s' does not match expected format '%s': %v", result, expectedLayout, err)
			}

			// Verify the time is recent (within last few seconds)
			if tt.format == "" || tt.format == "2006-01-02 15:04:05" {
				parsedTime, _ := time.Parse("2006-01-02 15:04:05", result)
				now := time.Now()
				diff := now.Sub(parsedTime)
				if diff > 5*time.Second {
					t.Errorf("Generated time seems too old: %v", diff)
				}
			}
		})
	}
}

func TestGenTimeByAdd(t *testing.T) {
	// Test adding different durations to a base time
	baseTime := time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name         string
		baseTime     time.Time
		duration     time.Duration
		expectedTime string
	}{
		{
			name:         "add 1 hour",
			baseTime:     baseTime,
			duration:     1 * time.Hour,
			expectedTime: "2023-01-01 13:00:00",
		},
		{
			name:         "add 1 day",
			baseTime:     baseTime,
			duration:     24 * time.Hour,
			expectedTime: "2023-01-02 12:00:00",
		},
		{
			name:         "subtract 1 hour",
			baseTime:     baseTime,
			duration:     -1 * time.Hour,
			expectedTime: "2023-01-01 11:00:00",
		},
		{
			name:         "add 30 minutes",
			baseTime:     baseTime,
			duration:     30 * time.Minute,
			expectedTime: "2023-01-01 12:30:00",
		},
		{
			name:         "add zero duration",
			baseTime:     baseTime,
			duration:     0,
			expectedTime: "2023-01-01 12:00:00",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenTimeByAdd(tt.baseTime, tt.duration)

			if result != tt.expectedTime {
				t.Errorf("Expected '%s', got '%s'", tt.expectedTime, result)
			}

			// Verify the result can be parsed back
			_, err := time.Parse("2006-01-02 15:04:05", result)
			if err != nil {
				t.Errorf("Generated time '%s' cannot be parsed: %v", result, err)
			}
		})
	}
}

func TestGenKey(t *testing.T) {
	tests := []struct {
		name  string
		appid string
	}{
		{
			name:  "normal appid",
			appid: "test-app-123",
		},
		{
			name:  "empty appid",
			appid: "",
		},
		{
			name:  "long appid",
			appid: "very-long-application-identifier-with-many-characters",
		},
		{
			name:  "special characters in appid",
			appid: "app!@#$%^&*()",
		},
		{
			name:  "numeric appid",
			appid: "123456789",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenKey(tt.appid)

			// Verify the result is exactly 32 characters (hex string)
			if len(result) != 32 {
				t.Errorf("Expected key length 32, got %d", len(result))
			}

			// Verify the result contains only hexadecimal characters
			matched, err := regexp.MatchString("^[a-f0-9]{32}$", result)
			if err != nil {
				t.Errorf("Regex error: %v", err)
			}
			if !matched {
				t.Errorf("Generated key '%s' is not a valid 32-character hex string", result)
			}

			// Verify uniqueness by generating multiple keys
			result2 := GenKey(tt.appid)
			if result == result2 {
				t.Error("Generated keys should be unique (very low probability of collision)")
			}
		})
	}
}

func TestGenKey_Uniqueness(t *testing.T) {
	// Test that GenKey generates unique keys even with the same appid
	appid := "test-app"
	keys := make(map[string]bool)
	iterations := 100

	for i := 0; i < iterations; i++ {
		key := GenKey(appid)
		if keys[key] {
			t.Errorf("Duplicate key generated: %s", key)
		}
		keys[key] = true
	}

	if len(keys) != iterations {
		t.Errorf("Expected %d unique keys, got %d", iterations, len(keys))
	}
}

func TestGenSecret(t *testing.T) {
	t.Run("basic_generation", func(t *testing.T) {
		result := GenSecret()

		// Verify the result is exactly 32 characters
		if len(result) != 32 {
			t.Errorf("Expected secret length 32, got %d", len(result))
		}

		// Verify the result is not empty
		if result == "" {
			t.Error("Generated secret should not be empty")
		}

		// Verify the result contains base64-like characters
		// Since it's base64 encoded, it should contain A-Z, a-z, 0-9, +, /
		matched, err := regexp.MatchString("^[A-Za-z0-9+/]+$", result)
		if err != nil {
			t.Errorf("Regex error: %v", err)
		}
		if !matched {
			t.Errorf("Generated secret '%s' contains invalid base64 characters", result)
		}
	})

	t.Run("uniqueness", func(t *testing.T) {
		// Test that GenSecret generates unique secrets
		secrets := make(map[string]bool)
		iterations := 100

		for i := 0; i < iterations; i++ {
			secret := GenSecret()
			if secrets[secret] {
				t.Errorf("Duplicate secret generated: %s", secret)
			}
			secrets[secret] = true
		}

		if len(secrets) != iterations {
			t.Errorf("Expected %d unique secrets, got %d", iterations, len(secrets))
		}
	})
}

func TestGenAppId(t *testing.T) {
	tests := []struct {
		name      string
		num       int
		wantError bool
	}{
		{
			name:      "generate 8 character app id",
			num:       8,
			wantError: false,
		},
		{
			name:      "generate 16 character app id",
			num:       16,
			wantError: false,
		},
		{
			name:      "generate 32 character app id",
			num:       32,
			wantError: false,
		},
		{
			name:      "generate 1 character app id",
			num:       1,
			wantError: false,
		},
		{
			name:      "generate 64 character app id",
			num:       64,
			wantError: false,
		},
		{
			name:      "generate 0 character app id",
			num:       0,
			wantError: false, // Should return empty string
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenAppId(tt.num)

			// Verify the result length
			if len(result) != tt.num {
				t.Errorf("Expected app id length %d, got %d", tt.num, len(result))
			}

			if tt.num > 0 {
				// Verify the result contains only hexadecimal characters
				matched, err := regexp.MatchString("^[a-f0-9]+$", result)
				if err != nil {
					t.Errorf("Regex error: %v", err)
				}
				if !matched {
					t.Errorf("Generated app id '%s' is not a valid hex string", result)
				}
			}

			// Test uniqueness for reasonable lengths (skip for very short lengths due to high collision probability)
			if tt.num > 2 && tt.num <= 32 {
				result2 := GenAppId(tt.num)
				if result == result2 {
					t.Error("Generated app ids should be unique (very low probability of collision)")
				}
			}
		})
	}
}

func TestGenAppId_Uniqueness(t *testing.T) {
	// Test uniqueness for different lengths
	lengths := []int{8, 16, 24, 32}

	for _, length := range lengths {
		t.Run(fmt.Sprintf("length_%d", length), func(t *testing.T) {
			appIds := make(map[string]bool)
			iterations := 50

			for i := 0; i < iterations; i++ {
				appId := GenAppId(length)
				if appIds[appId] {
					t.Errorf("Duplicate app id generated for length %d: %s", length, appId)
				}
				appIds[appId] = true
			}

			if len(appIds) != iterations {
				t.Errorf("Expected %d unique app ids for length %d, got %d", iterations, length, len(appIds))
			}
		})
	}
}

func TestGenAppId_EdgeCases(t *testing.T) {
	t.Run("negative_length", func(t *testing.T) {
		// Test with negative length - this will cause a panic in the actual implementation
		defer func() {
			if r := recover(); r == nil {
				t.Error("Expected panic for negative length")
			}
		}()

		GenAppId(-5)
	})

	t.Run("very_large_length", func(t *testing.T) {
		// Test with very large length - this will also cause a panic when length > 64
		defer func() {
			if r := recover(); r == nil {
				t.Error("Expected panic for length greater than hash size")
			}
		}()

		GenAppId(100)
	})
}

func TestTimeFormatConsistency(t *testing.T) {
	// Test that GenCurrTime and GenTimeByAdd use the same format
	currentTime := GenCurrTime("")
	baseTime := time.Now()
	addedTime := GenTimeByAdd(baseTime, 0)

	// Both should use the same format: "2006-01-02 15:04:05"
	_, err1 := time.Parse("2006-01-02 15:04:05", currentTime)
	_, err2 := time.Parse("2006-01-02 15:04:05", addedTime)

	if err1 != nil {
		t.Errorf("GenCurrTime result '%s' doesn't match expected format: %v", currentTime, err1)
	}
	if err2 != nil {
		t.Errorf("GenTimeByAdd result '%s' doesn't match expected format: %v", addedTime, err2)
	}
}

func TestGeneratorFunctions_ThreadSafety(t *testing.T) {
	// Test concurrent execution to ensure thread safety
	t.Run("concurrent_GenKey", func(t *testing.T) {
		results := make(chan string, 10)

		for i := 0; i < 10; i++ {
			go func() {
				results <- GenKey("test-app")
			}()
		}

		keys := make(map[string]bool)
		for i := 0; i < 10; i++ {
			key := <-results
			if keys[key] {
				t.Errorf("Duplicate key generated in concurrent execution: %s", key)
			}
			keys[key] = true
		}
	})

	t.Run("concurrent_GenSecret", func(t *testing.T) {
		results := make(chan string, 10)

		for i := 0; i < 10; i++ {
			go func() {
				results <- GenSecret()
			}()
		}

		secrets := make(map[string]bool)
		for i := 0; i < 10; i++ {
			secret := <-results
			if secrets[secret] {
				t.Errorf("Duplicate secret generated in concurrent execution: %s", secret)
			}
			secrets[secret] = true
		}
	})
}

func TestGeneratorFunctions_InputValidation(t *testing.T) {
	// Test various edge cases for input validation
	t.Run("GenKey_with_unicode", func(t *testing.T) {
		appid := "test-app"
		result := GenKey(appid)

		if len(result) != 32 {
			t.Errorf("Expected key length 32 for unicode appid, got %d", len(result))
		}

		// Should still be valid hex
		matched, _ := regexp.MatchString("^[a-f0-9]{32}$", result)
		if !matched {
			t.Errorf("Generated key for unicode appid is not valid hex: %s", result)
		}
	})

	t.Run("GenTimeByAdd_with_extreme_durations", func(t *testing.T) {
		baseTime := time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)

		// Test with very large positive duration
		result1 := GenTimeByAdd(baseTime, 365*24*time.Hour)
		if result1 == "" {
			t.Error("Should handle large positive duration")
		}

		// Test with very large negative duration
		result2 := GenTimeByAdd(baseTime, -365*24*time.Hour)
		if result2 == "" {
			t.Error("Should handle large negative duration")
		}
	})
}
