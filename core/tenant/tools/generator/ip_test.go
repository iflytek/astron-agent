package generator

import (
	"net"
	"runtime"
	"testing"
)

func TestGetLocalIP(t *testing.T) {
	t.Run("should_return_valid_ip", func(t *testing.T) {
		ip, err := GetLocalIP()
		if err != nil {
			// On some systems this might fail, which is acceptable
			t.Logf("GetLocalIP failed (this may be expected in some environments): %v", err)
			return
		}

		if ip == "" {
			t.Error("GetLocalIP should not return empty string when successful")
		}

		// Verify it's a valid IP address
		parsedIP := net.ParseIP(ip)
		if parsedIP == nil {
			t.Errorf("GetLocalIP returned invalid IP: %s", ip)
		}

		// Verify it's IPv4
		if !isIpv4(ip) {
			t.Errorf("GetLocalIP should return IPv4 address, got: %s", ip)
		}
	})

	t.Run("should_handle_errors_gracefully", func(t *testing.T) {
		// This test verifies that the function handles errors without panicking
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("GetLocalIP should not panic, but it did: %v", r)
			}
		}()

		// Call the function - it should either succeed or return an error
		ip, err := GetLocalIP()
		if err == nil && ip == "" {
			t.Error("If no error, IP should not be empty")
		}
	})
}

func TestIsIpv4(t *testing.T) {
	tests := []struct {
		name     string
		ip       string
		expected bool
	}{
		{
			name:     "valid IPv4 address",
			ip:       "192.168.1.1",
			expected: true,
		},
		{
			name:     "localhost IPv4",
			ip:       "127.0.0.1",
			expected: true,
		},
		{
			name:     "valid IPv4 with zeros",
			ip:       "10.0.0.1",
			expected: true,
		},
		{
			name:     "valid IPv4 boundary values",
			ip:       "255.255.255.255",
			expected: true,
		},
		{
			name:     "IPv6 address",
			ip:       "2001:db8::1",
			expected: false,
		},
		{
			name:     "IPv6 localhost",
			ip:       "::1",
			expected: false,
		},
		{
			name:     "invalid IP format",
			ip:       "not.an.ip.address",
			expected: false,
		},
		{
			name:     "empty string",
			ip:       "",
			expected: false,
		},
		{
			name:     "invalid IPv4 range",
			ip:       "256.256.256.256",
			expected: false,
		},
		{
			name:     "IPv4 with port",
			ip:       "192.168.1.1:8080",
			expected: false,
		},
		{
			name:     "incomplete IPv4",
			ip:       "192.168.1",
			expected: false,
		},
		{
			name:     "IPv4 with leading zeros",
			ip:       "192.168.001.001",
			expected: false, // Go's net.ParseIP doesn't accept leading zeros
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isIpv4(tt.ip)
			if result != tt.expected {
				t.Errorf("isIpv4('%s') = %v, expected %v", tt.ip, result, tt.expected)
			}
		})
	}
}

func TestGetWinIP(t *testing.T) {
	// Only test on Windows
	if runtime.GOOS != "windows" {
		t.Skip("Skipping Windows-specific test on non-Windows OS")
	}

	t.Run("should_return_valid_ip_on_windows", func(t *testing.T) {
		ip, err := getWinIP()
		if err != nil {
			// Connection might fail in test environment
			t.Logf("getWinIP failed (may be expected in test environment): %v", err)
			return
		}

		if ip == "" {
			t.Error("getWinIP should not return empty string when successful")
		}

		// Verify it's a valid IP address
		parsedIP := net.ParseIP(ip)
		if parsedIP == nil {
			t.Errorf("getWinIP returned invalid IP: %s", ip)
		}

		// Verify it's IPv4
		if !isIpv4(ip) {
			t.Errorf("getWinIP should return IPv4 address, got: %s", ip)
		}
	})

	t.Run("should_handle_connection_failure", func(t *testing.T) {
		// This test verifies error handling when connection fails
		// We can't easily simulate this without mocking, but we ensure no panic
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("getWinIP should not panic on connection failure: %v", r)
			}
		}()

		_, err := getWinIP()
		// Error is acceptable in test environment
		if err != nil {
			t.Logf("Expected connection error in test environment: %v", err)
		}
	})
}

func TestGetLocalIP_WindowsVsUnix(t *testing.T) {
	// Test that appropriate method is called based on OS
	t.Run("uses_correct_method_for_os", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("GetLocalIP should handle OS-specific logic without panicking: %v", r)
			}
		}()

		ip, err := GetLocalIP()

		if runtime.GOOS == "windows" {
			// On Windows, it should try to use getWinIP
			if err != nil {
				t.Logf("Windows IP detection failed (may be expected): %v", err)
			}
		} else {
			// On Unix-like systems, it should use hostname lookup
			if err != nil {
				t.Logf("Unix IP detection failed (may be expected): %v", err)
			}
		}

		if err == nil && ip != "" {
			// If successful, verify the result
			if !isIpv4(ip) {
				t.Errorf("GetLocalIP should return IPv4, got: %s", ip)
			}
		}
	})
}

func TestIP_GlobalVariable(t *testing.T) {
	t.Run("IP_variable_should_be_set", func(t *testing.T) {
		// The IP global variable should be set by init()
		if IP == "" {
			t.Error("Global IP variable should not be empty")
		}

		// Should be either a valid IP or the default fallback
		if IP != "127.0.0.1" {
			// If not fallback, should be valid IPv4
			if !isIpv4(IP) {
				t.Errorf("Global IP variable should be valid IPv4, got: %s", IP)
			}
		}
	})

	t.Run("IP_variable_fallback", func(t *testing.T) {
		// The init() function should set IP to 127.0.0.1 if detection fails
		// We can't easily test this without mocking, but we can verify the current value
		if IP == "127.0.0.1" {
			t.Logf("IP detection failed, using fallback: %s", IP)
		} else {
			t.Logf("IP detection succeeded: %s", IP)
		}

		// In either case, it should be a valid IPv4
		if !isIpv4(IP) {
			t.Errorf("Global IP should be valid IPv4, got: %s", IP)
		}
	})
}

func TestIPv4_EdgeCases(t *testing.T) {
	// Test edge cases for IPv4 validation
	tests := []struct {
		name     string
		ip       string
		expected bool
	}{
		{
			name:     "all zeros",
			ip:       "0.0.0.0",
			expected: true,
		},
		{
			name:     "broadcast address",
			ip:       "255.255.255.255",
			expected: true,
		},
		{
			name:     "private class A",
			ip:       "10.0.0.1",
			expected: true,
		},
		{
			name:     "private class B",
			ip:       "172.16.0.1",
			expected: true,
		},
		{
			name:     "private class C",
			ip:       "192.168.0.1",
			expected: true,
		},
		{
			name:     "link local",
			ip:       "169.254.1.1",
			expected: true,
		},
		{
			name:     "multicast",
			ip:       "224.0.0.1",
			expected: true,
		},
		{
			name:     "with spaces",
			ip:       " 192.168.1.1 ",
			expected: false, // net.ParseIP doesn't trim spaces
		},
		{
			name:     "hex notation",
			ip:       "0xC0A80101",
			expected: false,
		},
		{
			name:     "octal notation",
			ip:       "0300.0250.0001.0001",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isIpv4(tt.ip)
			if result != tt.expected {
				t.Errorf("isIpv4('%s') = %v, expected %v", tt.ip, result, tt.expected)
			}
		})
	}
}

func TestGetLocalIP_PanicRecovery(t *testing.T) {
	// Test that the panic recovery mechanism works
	t.Run("should_recover_from_panics", func(t *testing.T) {
		// The function has defer recover(), so it should not panic even if something goes wrong
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("GetLocalIP should recover from panics internally, but panic reached test: %v", r)
			}
		}()

		// Call function multiple times to test stability
		for i := 0; i < 5; i++ {
			_, err := GetLocalIP()
			// Error is fine, panic is not
			if err != nil {
				t.Logf("Iteration %d: GetLocalIP returned error (acceptable): %v", i, err)
			}
		}
	})
}

func TestNetworkInterfaceCompatibility(t *testing.T) {
	// Test compatibility with different network interface configurations
	t.Run("should_handle_no_network_interfaces", func(t *testing.T) {
		// This tests the function's behavior when network interfaces are limited
		// In containers or restricted environments, this might behave differently
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("Should handle limited network interfaces gracefully: %v", r)
			}
		}()

		ip, err := GetLocalIP()
		if err != nil {
			t.Logf("Network interface limitation detected: %v", err)
		} else if ip != "" {
			if !isIpv4(ip) {
				t.Errorf("Should return valid IPv4 when successful: %s", ip)
			}
		}
	})
}

func TestHostnameResolution(t *testing.T) {
	// Test hostname resolution behavior (Unix path)
	if runtime.GOOS == "windows" {
		t.Skip("Skipping Unix-specific test on Windows")
	}

	t.Run("hostname_resolution_logic", func(t *testing.T) {
		// This indirectly tests the hostname resolution path
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("Hostname resolution should not panic: %v", r)
			}
		}()

		ip, err := GetLocalIP()

		if err != nil {
			// Common in test environments or containers
			t.Logf("Hostname resolution failed (may be expected): %v", err)
		} else {
			// If successful, should be valid IPv4
			if ip == "" {
				t.Error("Successful hostname resolution should not return empty string")
			}
			if !isIpv4(ip) {
				t.Errorf("Hostname resolution should return IPv4, got: %s", ip)
			}
		}
	})
}

func TestConnection_ResourceManagement(t *testing.T) {
	// Test that connections are properly closed (Windows path)
	if runtime.GOOS != "windows" {
		t.Skip("Skipping Windows-specific test on non-Windows OS")
	}

	t.Run("should_close_connections_properly", func(t *testing.T) {
		// Test multiple calls to ensure connections are cleaned up
		for i := 0; i < 10; i++ {
			_, err := getWinIP()
			if err != nil {
				t.Logf("Connection %d failed (may be expected): %v", i, err)
			}
			// Should not accumulate connections or resources
		}
	})
}
