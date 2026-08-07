# Spark Link Test Suite

Comprehensive test suite for the Spark Link plugin providing complete coverage of all modules and functions.

## 🧪 Test Categories

### Unit Tests
- **Purpose**: Test individual functions and classes in isolation
- **Coverage**: All modules in `plugin.link` package
- **Mocking**: Extensive use of mocks to isolate dependencies
- **Focus**: Logic correctness, edge cases, error handling

### Integration Tests
- **Purpose**: Test component interaction and complete workflows
- **Coverage**: API endpoints, request-response flows, schema validation
- **Environment**: Uses TestClient for FastAPI integration testing
- **Focus**: End-to-end functionality, interface contracts

## 📁 Test Structure

```
tests/
├── __init__.py                 # Test package initialization
├── conftest.py                 # Shared fixtures and configuration
├── test_runner.py              # Test runner with coverage reports
├── unit/                       # Unit tests
│   ├── __init__.py
│   ├── test_main.py           # Tests for main.py module
│   ├── test_domain_models.py  # Tests for domain models and utils
│   ├── test_utils.py          # Tests for utility functions
│   ├── test_services.py       # Tests for service layer functions
│   ├── test_schemas.py        # Tests for API schemas
│   └── test_infra.py          # Tests for infrastructure layer
└── integration/                # Integration tests
    ├── __init__.py
    ├── test_api_endpoints.py   # API endpoint integration tests
    └── test_database_operations.py # Database workflow tests
```

## 🚀 Running Tests

### Using the Test Runner

The test runner provides convenient commands for different testing scenarios:

```bash
# Run all tests with coverage
python tests/test_runner.py all

# Run only unit tests
python tests/test_runner.py unit

# Run only integration tests
python tests/test_runner.py integration

# Check test coverage
python tests/test_runner.py coverage

# Generate test report
python tests/test_runner.py report

# Run specific test
python tests/test_runner.py specific --test-path tests/unit/test_main.py

# Run tests without coverage (faster)
python tests/test_runner.py all --no-coverage

# Run tests in quiet mode
python tests/test_runner.py all --quiet
```

### Using pytest Directly

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=plugin.link --cov-report=html

# Run specific test file
pytest tests/unit/test_main.py

# Run specific test function
pytest tests/unit/test_main.py::TestMain::test_main_function

# Run tests with specific marker
pytest -m unit  # Only unit tests
pytest -m integration  # Only integration tests

# Run tests matching pattern
pytest -k "test_error"  # All tests with "error" in name
```

## 🏷️ Test Markers

Tests are marked with pytest markers for easy filtering:

- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.slow` - Tests that take longer to execute
- `@pytest.mark.database` - Tests requiring database connectivity
- `@pytest.mark.redis` - Tests requiring Redis connectivity
- `@pytest.mark.network` - Tests requiring network connectivity

## 📊 Coverage Requirements

- **Minimum Coverage**: 80%
- **Target Coverage**: 90%+
- **Reports Generated**:
  - HTML report: `htmlcov/index.html`
  - Terminal output with missing lines
  - XML report: `coverage.xml`

## 🧩 Test Components Covered

### Core Modules
- ✅ `main.py` - Application entry point and initialization
- ✅ `domain/models/manager.py` - Database and Redis managers
- ✅ `domain/models/utils.py` - Database and Redis service classes

### Utility Modules
- ✅ `utils/errors/code.py` - Error code definitions
- ✅ `utils/log/logger.py` - Logging configuration
- ✅ `utils/json_schemas/` - JSON schema validation
- ✅ `utils/open_api_schema/` - OpenAPI schema processing

### Service Layer
- ✅ `service/community/tools/http/management_server.py` - HTTP tool management
- ✅ `service/community/tools/http/execution_server.py` - HTTP tool execution
- ✅ `service/community/tools/mcp/mcp_server.py` - MCP tool services

### Infrastructure Layer
- ✅ `infra/tool_crud/process.py` - CRUD operations
- ✅ `infra/tool_exector/process.py` - Tool execution
- ✅ `infra/tool_exector/http_auth.py` - HTTP authentication

### API Layer
- ✅ `api/schemas/` - Request/response schemas
- ✅ `api/v1/` - API endpoint handlers

## 🔧 Configuration

### Pytest Configuration (`pytest.ini`)
- Test discovery paths
- Coverage settings
- Marker definitions
- Warning filters

### Test Fixtures (`conftest.py`)
- Database mocking
- Redis mocking
- Sample data fixtures
- FastAPI test client
- Environment setup

## 🧪 Writing New Tests

### Unit Test Example
```python
@pytest.mark.unit
class TestNewModule:
    def test_function_success(self):
        # Arrange
        input_data = "test_input"

        # Act
        result = function_under_test(input_data)

        # Assert
        assert result == expected_output
```

### Integration Test Example
```python
@pytest.mark.integration
class TestNewAPI:
    def test_endpoint_success(self, client):
        # Act
        response = client.post("/api/endpoint", json=test_data)

        # Assert
        assert response.status_code == 200
        assert response.json()["status"] == "success"
```

## 🐛 Debugging Tests

### Running with Debug Output
```bash
# Verbose output with print statements
pytest -v -s

# Show local variables on failure
pytest --tb=long

# Drop into debugger on failure
pytest --pdb
```

### Common Debugging Techniques
1. Use `print()` statements in tests
2. Use `assert False, variable_value` to inspect values
3. Use `pytest.set_trace()` for breakpoints
4. Check mock call arguments with `mock.assert_called_with()`

## 📈 Continuous Integration

The test suite is designed to run in CI/CD environments:

### Requirements
- Python 3.11+
- All dependencies from `pyproject.toml`
- Isolated test environment

### CI Configuration
```yaml
- name: Run tests
  run: |
    python tests/test_runner.py all
    python tests/test_runner.py coverage
```

## 🔍 Test Quality Guidelines

### Best Practices
1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should describe what is being tested
3. **Coverage**: Aim for high code coverage with meaningful tests
4. **Speed**: Unit tests should be fast, integration tests can be slower
5. **Mocking**: Mock external dependencies appropriately

### Test Naming Convention
- Test files: `test_*.py`
- Test classes: `Test*`
- Test methods: `test_*_*` (descriptive)

### Example Naming
```python
def test_create_tool_with_valid_data_returns_success()
def test_create_tool_with_missing_name_raises_validation_error()
def test_database_connection_failure_handles_gracefully()
```

## 📝 Reporting Issues

When tests fail:
1. Check the test output for specific error messages
2. Verify that all dependencies are installed
3. Ensure test environment is properly configured
4. Check for any missing mock configurations
5. Review recent code changes that might affect the tested functionality

For persistent issues, provide:
- Test command used
- Full error output
- Environment details
- Expected vs actual behavior