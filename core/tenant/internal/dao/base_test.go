package dao

import (
	"reflect"
	"strings"
	"testing"
)

func TestBuildQuery(t *testing.T) {
	tests := []struct {
		name           string
		querySql       string
		options        []SqlOption
		expectedSql    string
		expectedParams []interface{}
	}{
		{
			name:           "no options",
			querySql:       "SELECT * FROM test",
			options:        nil,
			expectedSql:    "SELECT * FROM test",
			expectedParams: nil,
		},
		{
			name:     "single option",
			querySql: "SELECT * FROM test",
			options: []SqlOption{
				func() (string, []interface{}) {
					return "id=?", []interface{}{123}
				},
			},
			expectedSql:    "SELECT * FROM test where id=?",
			expectedParams: []interface{}{123},
		},
		{
			name:     "multiple options",
			querySql: "SELECT * FROM test",
			options: []SqlOption{
				func() (string, []interface{}) {
					return "id=?", []interface{}{123}
				},
				func() (string, []interface{}) {
					return "name=?", []interface{}{"test"}
				},
			},
			expectedSql:    "SELECT * FROM test where id=? and name=?",
			expectedParams: []interface{}{123, "test"},
		},
		{
			name:     "option with multiple parameters",
			querySql: "SELECT * FROM test",
			options: []SqlOption{
				func() (string, []interface{}) {
					return "id IN(?,?)", []interface{}{1, 2}
				},
			},
			expectedSql:    "SELECT * FROM test where id IN(?,?)",
			expectedParams: []interface{}{1, 2},
		},
		{
			name:     "three options",
			querySql: "SELECT * FROM users",
			options: []SqlOption{
				func() (string, []interface{}) {
					return "age>=?", []interface{}{18}
				},
				func() (string, []interface{}) {
					return "status=?", []interface{}{"active"}
				},
				func() (string, []interface{}) {
					return "city=?", []interface{}{"Shanghai"}
				},
			},
			expectedSql:    "SELECT * FROM users where age>=? and status=? and city=?",
			expectedParams: []interface{}{18, "active", "Shanghai"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sql, params := buildQuery(tt.querySql, tt.options...)

			if sql != tt.expectedSql {
				t.Errorf("buildQuery() sql = %s, want %s", sql, tt.expectedSql)
			}

			if !reflect.DeepEqual(params, tt.expectedParams) {
				t.Errorf("buildQuery() params = %v, want %v", params, tt.expectedParams)
			}
		})
	}
}

func TestBuildUpdate(t *testing.T) {
	tests := []struct {
		name           string
		updateSql      string
		options        []SqlOption
		wantErr        bool
		expectedSql    string
		expectedParams []interface{}
	}{
		{
			name:      "no options should return error",
			updateSql: "UPDATE test SET %s",
			options:   nil,
			wantErr:   true,
		},
		{
			name:      "single option",
			updateSql: "UPDATE test SET %s",
			options: []SqlOption{
				func() (string, []interface{}) {
					return "name=?", []interface{}{"test"}
				},
			},
			wantErr:        false,
			expectedSql:    "UPDATE test SET name=?",
			expectedParams: []interface{}{"test"},
		},
		{
			name:      "multiple options",
			updateSql: "UPDATE test SET %s",
			options: []SqlOption{
				func() (string, []interface{}) {
					return "name=?", []interface{}{"test"}
				},
				func() (string, []interface{}) {
					return "age=?", []interface{}{25}
				},
			},
			wantErr:        false,
			expectedSql:    "UPDATE test SET name=?,\nage=?",
			expectedParams: []interface{}{"test", 25},
		},
		{
			name:      "three options",
			updateSql: "UPDATE users SET %s",
			options: []SqlOption{
				func() (string, []interface{}) {
					return "name=?", []interface{}{"John"}
				},
				func() (string, []interface{}) {
					return "email=?", []interface{}{"john@example.com"}
				},
				func() (string, []interface{}) {
					return "updated_at=?", []interface{}{"2023-01-01"}
				},
			},
			wantErr:        false,
			expectedSql:    "UPDATE users SET name=?,\nemail=?,\nupdated_at=?",
			expectedParams: []interface{}{"John", "john@example.com", "2023-01-01"},
		},
		{
			name:      "option with multiple parameters",
			updateSql: "UPDATE test SET %s",
			options: []SqlOption{
				func() (string, []interface{}) {
					return "data=JSON_OBJECT(?,?)", []interface{}{"key", "value"}
				},
			},
			wantErr:        false,
			expectedSql:    "UPDATE test SET data=JSON_OBJECT(?,?)",
			expectedParams: []interface{}{"key", "value"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sql, params, err := buildUpdate(tt.updateSql, tt.options...)

			if (err != nil) != tt.wantErr {
				t.Errorf("buildUpdate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr {
				if err == nil {
					t.Errorf("buildUpdate() expected error but got none")
				}
				return
			}

			if sql != tt.expectedSql {
				t.Errorf("buildUpdate() sql = %s, want %s", sql, tt.expectedSql)
			}

			if !reflect.DeepEqual(params, tt.expectedParams) {
				t.Errorf("buildUpdate() params = %v, want %v", params, tt.expectedParams)
			}
		})
	}
}

func TestBuildUpdateWithQuery(t *testing.T) {
	tests := []struct {
		name                string
		updateSql           string
		whereSql            []SqlOption
		setSql              []SqlOption
		wantErr             bool
		expectedSqlContains []string
		expectedParamCount  int
	}{
		{
			name:      "no set options should return error",
			updateSql: "UPDATE test SET %s",
			whereSql:  nil,
			setSql:    nil,
			wantErr:   true,
		},
		{
			name:      "with set and where options",
			updateSql: "UPDATE test SET %s",
			whereSql: []SqlOption{
				func() (string, []interface{}) {
					return "id=?", []interface{}{123}
				},
			},
			setSql: []SqlOption{
				func() (string, []interface{}) {
					return "name=?", []interface{}{"test"}
				},
			},
			wantErr:             false,
			expectedSqlContains: []string{"UPDATE test SET name=?", "where id=?"},
			expectedParamCount:  2,
		},
		{
			name:      "with only set options",
			updateSql: "UPDATE test SET %s",
			whereSql:  nil,
			setSql: []SqlOption{
				func() (string, []interface{}) {
					return "name=?", []interface{}{"test"}
				},
			},
			wantErr:             false,
			expectedSqlContains: []string{"UPDATE test SET name=?"},
			expectedParamCount:  1,
		},
		{
			name:      "multiple set and where options",
			updateSql: "UPDATE users SET %s",
			whereSql: []SqlOption{
				func() (string, []interface{}) {
					return "id=?", []interface{}{1}
				},
				func() (string, []interface{}) {
					return "status=?", []interface{}{"active"}
				},
			},
			setSql: []SqlOption{
				func() (string, []interface{}) {
					return "name=?", []interface{}{"John"}
				},
				func() (string, []interface{}) {
					return "email=?", []interface{}{"john@example.com"}
				},
			},
			wantErr:             false,
			expectedSqlContains: []string{"UPDATE users SET name=?", "email=?", "where id=?", "and status=?"},
			expectedParamCount:  4,
		},
		{
			name:      "empty where options",
			updateSql: "UPDATE test SET %s",
			whereSql:  []SqlOption{},
			setSql: []SqlOption{
				func() (string, []interface{}) {
					return "name=?", []interface{}{"test"}
				},
			},
			wantErr:             false,
			expectedSqlContains: []string{"UPDATE test SET name=?"},
			expectedParamCount:  1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sql, params, err := buildUpdateWithQuery(tt.updateSql, tt.whereSql, tt.setSql...)

			if (err != nil) != tt.wantErr {
				t.Errorf("buildUpdateWithQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr {
				return
			}

			for _, expectedContain := range tt.expectedSqlContains {
				if !strings.Contains(sql, expectedContain) {
					t.Errorf("buildUpdateWithQuery() sql should contain %s, got %s", expectedContain, sql)
				}
			}

			if len(params) != tt.expectedParamCount {
				t.Errorf("buildUpdateWithQuery() params length = %d, want %d", len(params), tt.expectedParamCount)
			}
		})
	}
}

func TestSqlOption(t *testing.T) {
	// Test SqlOption function type
	t.Run("basic SqlOption", func(t *testing.T) {
		option := func() (string, []interface{}) {
			return "test=?", []interface{}{"value"}
		}

		sql, params := option()

		if sql != "test=?" {
			t.Errorf("SqlOption sql = %s, want %s", sql, "test=?")
		}

		if len(params) != 1 {
			t.Errorf("SqlOption params length = %d, want %d", len(params), 1)
		}

		if params[0] != "value" {
			t.Errorf("SqlOption params[0] = %v, want %v", params[0], "value")
		}
	})

	t.Run("SqlOption with multiple params", func(t *testing.T) {
		option := func() (string, []interface{}) {
			return "id IN(?,?,?)", []interface{}{1, 2, 3}
		}

		sql, params := option()

		if sql != "id IN(?,?,?)" {
			t.Errorf("SqlOption sql = %s, want %s", sql, "id IN(?,?,?)")
		}

		if len(params) != 3 {
			t.Errorf("SqlOption params length = %d, want %d", len(params), 3)
		}

		expectedParams := []interface{}{1, 2, 3}
		if !reflect.DeepEqual(params, expectedParams) {
			t.Errorf("SqlOption params = %v, want %v", params, expectedParams)
		}
	})

	t.Run("SqlOption with no params", func(t *testing.T) {
		option := func() (string, []interface{}) {
			return "is_active=TRUE", []interface{}{}
		}

		sql, params := option()

		if sql != "is_active=TRUE" {
			t.Errorf("SqlOption sql = %s, want %s", sql, "is_active=TRUE")
		}

		if len(params) != 0 {
			t.Errorf("SqlOption params length = %d, want %d", len(params), 0)
		}
	})
}

func TestBuildQuery_EdgeCases(t *testing.T) {
	t.Run("empty query string", func(t *testing.T) {
		options := []SqlOption{
			func() (string, []interface{}) {
				return "id=?", []interface{}{1}
			},
		}

		sql, params := buildQuery("", options...)

		if sql != " where id=?" {
			t.Errorf("buildQuery() with empty base sql = %s, want %s", sql, " where id=?")
		}

		if len(params) != 1 {
			t.Errorf("buildQuery() params length = %d, want 1", len(params))
		}
	})

	t.Run("nil option in slice", func(t *testing.T) {
		defer func() {
			if r := recover(); r == nil {
				t.Errorf("buildQuery() with nil option should panic")
			}
		}()

		options := []SqlOption{nil}
		buildQuery("SELECT * FROM test", options...)
	})
}

func TestBuildUpdate_EdgeCases(t *testing.T) {
	t.Run("empty update template", func(t *testing.T) {
		options := []SqlOption{
			func() (string, []interface{}) {
				return "name=?", []interface{}{"test"}
			},
		}

		sql, params, err := buildUpdate("", options...)
		if err != nil {
			t.Errorf("buildUpdate() with empty template should not error: %v", err)
		}

		// With empty template, fmt.Sprintf("", "name=?") produces a formatting error string
		// The actual behavior is that it returns a string with format verb error
		expectedSql := "%!(EXTRA string=name=?)"
		if sql != expectedSql {
			t.Errorf("buildUpdate() with empty template = %s, want %s", sql, expectedSql)
		}

		if len(params) != 1 {
			t.Errorf("buildUpdate() params length = %d, want 1", len(params))
		}
	})

	t.Run("template without placeholder", func(t *testing.T) {
		options := []SqlOption{
			func() (string, []interface{}) {
				return "name=?", []interface{}{"test"}
			},
		}

		sql, params, err := buildUpdate("UPDATE test SET", options...)
		if err != nil {
			t.Errorf("buildUpdate() should not error: %v", err)
		}

		// This would result in malformed SQL, but the function doesn't validate this
		if !strings.Contains(sql, "name=?") {
			t.Errorf("buildUpdate() should contain the set clause")
		}

		if len(params) != 1 {
			t.Errorf("buildUpdate() params length = %d, want 1", len(params))
		}
	})
}
