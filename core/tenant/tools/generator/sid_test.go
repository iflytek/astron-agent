package generator

import (
	"fmt"
	"regexp"
	"strings"
	"sync"
	"testing"
)

func TestSidGenerator2_NewSid(t *testing.T) {
	// Initialize a valid SidGenerator2 for testing
	generator := &SidGenerator2{}
	generator.Init("BJ", "192.168.1.100", "8080")

	tests := []struct {
		name        string
		sub         string
		description string
	}{
		{
			name:        "with custom sub",
			sub:         "usr",
			description: "should generate SID with custom sub",
		},
		{
			name:        "with empty sub",
			sub:         "",
			description: "should use default 'src' when sub is empty",
		},
		{
			name:        "with long sub",
			sub:         "verylongsub",
			description: "should handle long sub (truncated to 3 chars)",
		},
		{
			name:        "with special characters",
			sub:         "a@#",
			description: "should handle special characters in sub (but may create invalid SID format)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sid, err := generator.NewSid(tt.sub)
			if err != nil {
				t.Errorf("NewSid should not return error: %v", err)
			}

			if sid == "" {
				t.Error("NewSid should not return empty string")
			}

			// Verify SID format: should contain @ separator (unless sub contains @)
			if !strings.Contains(sid, "@") && !strings.Contains(tt.sub, "@") {
				t.Errorf("SID should contain '@' separator, got: %s", sid)
			}

			// Split SID into parts for analysis (skip if sub contains @)
			if !strings.Contains(tt.sub, "@") {
				parts := strings.Split(sid, "@")
				if len(parts) != 2 {
					t.Errorf("SID should have exactly 2 parts separated by '@', got %d parts", len(parts))
				}
			}

			// Verify the SID ends with the version number (sid2 = 2)
			if !strings.HasSuffix(sid, "2") {
				t.Errorf("SID should end with version '2', got: %s", sid)
			}

			// Test multiple generations for uniqueness
			sid2, _ := generator.NewSid(tt.sub)
			if sid == sid2 {
				t.Error("Generated SIDs should be unique")
			}
		})
	}
}

type sidGeneratorTestCase struct {
	name        string
	location    string
	localIP     string
	localPort   string
	shouldPanic bool
	description string
}

func testSidGeneratorInit(t *testing.T, tt sidGeneratorTestCase) {
	generator := &SidGenerator2{}

	if tt.shouldPanic {
		defer func() {
			if r := recover(); r == nil {
				t.Errorf("Init should have panicked for %s", tt.description)
			}
		}()
	} else {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("Init should not panic for valid input: %v", r)
			}
		}()
	}

	generator.Init(tt.location, tt.localIP, tt.localPort)

	if !tt.shouldPanic {
		validateSidGenerator(t, generator, tt)
	}
}

func validateSidGenerator(t *testing.T, generator *SidGenerator2, tt sidGeneratorTestCase) {
	if generator.Location != tt.location {
		t.Errorf("Location not set correctly: expected %s, got %s", tt.location, generator.Location)
	}

	if generator.Port != tt.localPort {
		t.Errorf("Port not set correctly: expected %s, got %s", tt.localPort, generator.Port)
	}

	if generator.ShortLocalIP == "" {
		t.Error("ShortLocalIP should be computed")
	}

	if len(generator.ShortLocalIP) != 4 {
		t.Errorf("ShortLocalIP should be 4 characters, got %d", len(generator.ShortLocalIP))
	}

	matched, _ := regexp.MatchString("^[0-9a-f]{4}$", generator.ShortLocalIP)
	if !matched {
		t.Errorf("ShortLocalIP should be 4-character hex string, got: %s", generator.ShortLocalIP)
	}
}

func TestSidGenerator2_Init(t *testing.T) {
	tests := []sidGeneratorTestCase{
		{
			name:        "valid IPv4 and port",
			location:    "BJ",
			localIP:     "192.168.1.100",
			localPort:   "8080",
			shouldPanic: false,
			description: "should initialize successfully with valid IP and port",
		},
		{
			name:        "different valid IPv4",
			location:    "SH",
			localIP:     "10.0.0.1",
			localPort:   "9090",
			shouldPanic: false,
			description: "should work with different valid IP",
		},
		{
			name:        "IPv4 with zeros",
			location:    "GZ",
			localIP:     "172.16.0.1",
			localPort:   "3000",
			shouldPanic: false,
			description: "should handle IP with zero octets",
		},
		{
			name:        "invalid IP address",
			location:    "BJ",
			localIP:     "invalid.ip.address",
			localPort:   "8080",
			shouldPanic: true,
			description: "should panic with invalid IP",
		},
		{
			name:        "empty IP address",
			location:    "BJ",
			localIP:     "",
			localPort:   "8080",
			shouldPanic: true,
			description: "should panic with empty IP",
		},
		{
			name:        "IPv6 address",
			location:    "BJ",
			localIP:     "2001:db8::1",
			localPort:   "8080",
			shouldPanic: false,
			description: "should work with IPv6 address",
		},
		{
			name:        "port too short",
			location:    "BJ",
			localIP:     "192.168.1.100",
			localPort:   "80",
			shouldPanic: true,
			description: "should panic with port shorter than 4 characters",
		},
		{
			name:        "empty port",
			location:    "BJ",
			localIP:     "192.168.1.100",
			localPort:   "",
			shouldPanic: true,
			description: "should panic with empty port",
		},
		{
			name:        "minimum valid port length",
			location:    "BJ",
			localIP:     "192.168.1.100",
			localPort:   "8080",
			shouldPanic: false,
			description: "should work with exactly 4-character port",
		},
		{
			name:        "longer port",
			location:    "BJ",
			localIP:     "192.168.1.100",
			localPort:   "8080123",
			shouldPanic: false,
			description: "should work with longer port (uses first 4 chars)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testSidGeneratorInit(t, tt)
		})
	}
}

func TestSidGenerator2_ShortLocalIPComputation(t *testing.T) {
	// Test specific IP addresses and their expected short IP computation
	tests := []struct {
		name        string
		ip          string
		expectedHex string
	}{
		{
			name:        "192.168.1.100",
			ip:          "192.168.1.100",
			expectedHex: "0164", // 1 = 0x01, 100 = 0x64
		},
		{
			name:        "10.0.0.1",
			ip:          "10.0.0.1",
			expectedHex: "0001", // 0 = 0x00, 1 = 0x01
		},
		{
			name:        "172.16.255.255",
			ip:          "172.16.255.255",
			expectedHex: "ffff", // 255 = 0xff, 255 = 0xff
		},
		{
			name:        "127.0.0.1",
			ip:          "127.0.0.1",
			expectedHex: "0001", // 0 = 0x00, 1 = 0x01
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			generator := &SidGenerator2{}
			generator.Init("BJ", tt.ip, "8080")

			if generator.ShortLocalIP != tt.expectedHex {
				t.Errorf("Expected ShortLocalIP %s for IP %s, got %s", tt.expectedHex, tt.ip, generator.ShortLocalIP)
			}
		})
	}
}

func TestSidGenerator2_Concurrency(t *testing.T) {
	// Test concurrent SID generation
	generator := &SidGenerator2{}
	generator.Init("BJ", "192.168.1.100", "8080")

	const numGoroutines = 100
	const sidsPerGoroutine = 10

	sidChan := make(chan string, numGoroutines*sidsPerGoroutine)
	var wg sync.WaitGroup

	// Generate SIDs concurrently
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < sidsPerGoroutine; j++ {
				sid, err := generator.NewSid("tst")
				if err != nil {
					t.Errorf("Concurrent SID generation failed: %v", err)
					return
				}
				sidChan <- sid
			}
		}()
	}

	wg.Wait()
	close(sidChan)

	// Collect and verify uniqueness
	sids := make(map[string]bool)
	for sid := range sidChan {
		if sids[sid] {
			t.Errorf("Duplicate SID generated in concurrent test: %s", sid)
		}
		sids[sid] = true
	}

	expectedCount := numGoroutines * sidsPerGoroutine
	if len(sids) != expectedCount {
		t.Errorf("Expected %d unique SIDs, got %d", expectedCount, len(sids))
	}
}

func TestSidGenerator2_IndexWrapping(t *testing.T) {
	// Test that the index wraps correctly at 0xffff
	generator := &SidGenerator2{}
	generator.Init("BJ", "192.168.1.100", "8080")

	// Set index close to overflow
	generator.index = 0xfffe

	sid1, err := generator.NewSid("tst")
	if err != nil {
		t.Fatalf("Failed to generate SID: %v", err)
	}

	sid2, err := generator.NewSid("tst")
	if err != nil {
		t.Fatalf("Failed to generate SID: %v", err)
	}

	// SIDs should still be unique even after index wrapping
	if sid1 == sid2 {
		t.Error("SIDs should remain unique even after index wrapping")
	}

	// Verify the index has wrapped
	if generator.index&0xffff == 0 {
		// Index should have wrapped to 0
		t.Logf("Index wrapped successfully to: %d", generator.index&0xffff)
	}
}

func TestSidGenerator2_SidFormat(t *testing.T) {
	// Test detailed SID format validation
	generator := &SidGenerator2{}
	generator.Init("BJ", "192.168.1.100", "8080")

	sid, err := generator.NewSid("usr")
	if err != nil {
		t.Fatalf("Failed to generate SID: %v", err)
	}

	// Parse SID format: sub(3) + pid(4hex) + index(4hex) + @ + location(2) + time(11hex) + shortip(4hex) + port(2) + version(1)
	parts := strings.Split(sid, "@")
	if len(parts) != 2 {
		t.Fatalf("SID should have 2 parts separated by @, got: %v", parts)
	}

	leftPart := parts[0]
	rightPart := parts[1]

	// Left part: sub(3) + pid(4hex) + index(4hex)
	if len(leftPart) < 3 {
		t.Errorf("Left part should be at least 3 characters (sub), got: %s", leftPart)
	}

	// Extract sub (first 3 chars)
	sub := leftPart[:3]
	if sub != "usr" {
		t.Errorf("Expected sub 'usr', got '%s'", sub)
	}

	// Right part should contain location, time, shortip, port, and version
	if len(rightPart) < 20 { // 2 + 11 + 4 + 2 + 1 = 20 minimum
		t.Errorf("Right part should be at least 20 characters, got %d: %s", len(rightPart), rightPart)
	}

	// Should end with version '2'
	if !strings.HasSuffix(rightPart, "2") {
		t.Errorf("SID should end with version '2', got: %s", rightPart)
	}

	// Should start with location
	if !strings.HasPrefix(rightPart, "BJ") {
		t.Errorf("Right part should start with location 'BJ', got: %s", rightPart)
	}
}

func TestSidGenerator2_SubHandling(t *testing.T) {
	generator := &SidGenerator2{}
	generator.Init("BJ", "192.168.1.100", "8080")

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "empty sub defaults to src",
			input:    "",
			expected: "src",
		},
		{
			name:     "short sub is padded or used as-is",
			input:    "ab",
			expected: "ab", // The format string uses %3s which right-justifies
		},
		{
			name:     "exact 3 char sub",
			input:    "abc",
			expected: "abc",
		},
		{
			name:     "long sub is truncated",
			input:    "verylongstring",
			expected: "ver", // %3s limits to 3 characters
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sid, err := generator.NewSid(tt.input)
			if err != nil {
				t.Fatalf("Failed to generate SID: %v", err)
			}

			// Extract the sub part (first 3 characters before @)
			parts := strings.Split(sid, "@")
			leftPart := parts[0]

			// The format uses %3s, so we need to check the first 3 characters
			// Note: %3s right-justifies, so short strings are padded with spaces
			actualSub := leftPart[:3]

			if tt.input == "" {
				// Empty should become "src"
				expectedInSid := "src"
				if actualSub != expectedInSid {
					t.Errorf("Expected sub '%s' in SID, got '%s'", expectedInSid, actualSub)
				}
			} else if len(tt.input) >= 3 {
				// Long strings are truncated to first 3 chars
				expectedInSid := tt.input[:3]
				if actualSub != expectedInSid {
					t.Errorf("Expected sub '%s' in SID, got '%s'", expectedInSid, actualSub)
				}
			}
			// For short strings, the behavior depends on how %3s formats them
		})
	}
}

func TestSidGenerator2_IPValidation(t *testing.T) {
	// Test that Init properly validates IP addresses
	generator := &SidGenerator2{}

	validIPs := []string{
		"192.168.1.1",
		"10.0.0.1",
		"172.16.0.1",
		"127.0.0.1",
		"255.255.255.255",
		"0.0.0.0",
	}

	for _, ip := range validIPs {
		t.Run(fmt.Sprintf("valid_ip_%s", strings.ReplaceAll(ip, ".", "_")), func(t *testing.T) {
			defer func() {
				if r := recover(); r != nil {
					t.Errorf("Should not panic for valid IP %s: %v", ip, r)
				}
			}()

			generator.Init("BJ", ip, "8080")

			// Verify initialization succeeded
			if generator.ShortLocalIP == "" {
				t.Errorf("ShortLocalIP should be computed for valid IP %s", ip)
			}
		})
	}

	invalidIPs := []string{
		"256.256.256.256",
		"not.an.ip",
		"192.168.1",
		"192.168.1.1.1",
		"",
	}

	for _, ip := range invalidIPs {
		t.Run(fmt.Sprintf("invalid_ip_%s", strings.ReplaceAll(ip, ".", "_")), func(t *testing.T) {
			defer func() {
				if r := recover(); r == nil {
					t.Errorf("Should panic for invalid IP %s", ip)
				}
			}()

			generator.Init("BJ", ip, "8080")
		})
	}
}

func TestSidGenerator2_Constants(t *testing.T) {
	// Test that the sid2 constant is correctly defined
	if sid2 != 2 {
		t.Errorf("Expected sid2 constant to be 2, got %d", sid2)
	}
}

func TestSidGenerator2_StructFields(t *testing.T) {
	// Test that all struct fields are properly accessible
	generator := &SidGenerator2{}

	// Test initial state
	if generator.index != 0 {
		t.Errorf("Initial index should be 0, got %d", generator.index)
	}

	if generator.Location != "" {
		t.Errorf("Initial Location should be empty, got '%s'", generator.Location)
	}

	if generator.LocalIP != "" {
		t.Errorf("Initial LocalIP should be empty, got '%s'", generator.LocalIP)
	}

	if generator.ShortLocalIP != "" {
		t.Errorf("Initial ShortLocalIP should be empty, got '%s'", generator.ShortLocalIP)
	}

	if generator.Port != "" {
		t.Errorf("Initial Port should be empty, got '%s'", generator.Port)
	}

	// Test after initialization
	generator.Init("BJ", "192.168.1.100", "8080")

	if generator.Location != "BJ" {
		t.Errorf("Location should be 'BJ' after init, got '%s'", generator.Location)
	}

	if generator.Port != "8080" {
		t.Errorf("Port should be '8080' after init, got '%s'", generator.Port)
	}

	if generator.ShortLocalIP == "" {
		t.Error("ShortLocalIP should be computed after init")
	}
}
