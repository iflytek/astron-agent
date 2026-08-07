# RPA Service Test Suite

This directory contains comprehensive tests for the RPA (Robotic Process Automation) service, ensuring code quality, reliability, and maintainability.

## 📁 Test Structure

```
tests/
├── __init__.py                     # Test package initialization
├── conftest.py                     # Shared fixtures and pytest configuration
├── test_runner.py                  # Test execution and coverage utilities
├── README.md                       # This documentation
├── unit/                           # Unit tests (isolated component testing)
│   ├── __init__.py
│   ├── test_main.py               # Main entry point tests
│   ├── api/                       # API layer tests
│   │   ├── test_app.py           # FastAPI application tests
│   │   ├── test_router.py        # Router configuration tests
│   │   ├── v1/                   # V1 API endpoint tests
│   │   │   ├── test_execution.py  # Execution endpoint tests
│   │   │   └── test_health_check.py # Health check endpoint tests
│   │   └── schemas/              # Data model tests
│   │       └── test_execution_schema.py # Request/response schema tests
│   ├── service/                   # Business logic layer tests
│   │   └── xiaowu/
│   │       └── test_process.py    # Task processing logic tests
│   ├── infra/                     # Infrastructure layer tests
│   │   └── xiaowu/
│   │       └── test_tasks.py      # Task creation/querying tests
│   ├── utils/                     # Utility function tests
│   │   ├── log/
│   │   │   └── test_logger.py     # Logging utility tests
│   │   └── urls/
│   │       └── test_url_util.py   # URL validation tests
│   ├── errors/                    # Error handling tests
│   │   └── test_error_code.py     # Error code enum tests
│   ├── exceptions/                # Exception class tests
│   │   └── test_config_exceptions.py # Custom exception tests
│   └── consts/                    # Constants and configuration tests
│       └── test_const.py          # Constants module tests
└── integration/                   # Integration tests (component interaction)
    └── test_api_integration.py   # End-to-end API flow tests
```

## 🧪 Test Categories

### Unit Tests
- **Purpose**: Test individual functions and classes in isolation
- **Coverage**: All modules in `plugin.rpa` package
- **Mocking**: Extensive use of mocks to isolate dependencies
- **Focus**: Logic correctness, edge cases, error handling

### Integration Tests
- **Purpose**: Test component interaction and complete workflows
- **Coverage**: API endpoints, request-response flows, schema validation
- **Environment**: Uses TestClient for FastAPI integration testing
- **Focus**: End-to-end functionality, interface contracts

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
pytest --cov=plugin.rpa --cov-report=html

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

## 📊 Test Coverage

The test suite aims for comprehensive coverage of all functions and modules:

### Current Coverage Targets
- **Overall Coverage**: 90%+ (enforced by test runner)
- **Unit Test Coverage**: 95%+ for individual modules
- **Critical Path Coverage**: 100% for core functionality

### Coverage Reports
- **HTML Report**: `htmlcov/index.html` (generated after running with coverage)
- **Terminal Report**: Shows missing lines during test execution
- **XML Report**: `coverage.xml` (for CI/CD integration)

## 🔧 Test Configuration

### pytest Configuration (pyproject.toml)
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
    "--strict-markers",
    "--disable-warnings",
    "--tb=short"
]
markers = [
    "unit: Unit tests",
    "integration: Integration tests",
    "slow: Slow running tests"
]
```

### Fixtures and Utilities (conftest.py)
- **Environment Variables**: Mocked environment configuration
- **HTTP Clients**: Mocked httpx clients for API testing
- **Sample Data**: Pre-configured request/response objects
- **Temporary Files**: Temporary directories and config files
- **Span/Trace Objects**: Mocked observability components

## 📝 Test Writing Guidelines

### Unit Test Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Mock external dependencies (HTTP calls, file system, environment)
3. **Edge Cases**: Test boundary conditions, error scenarios, and edge cases
4. **Naming**: Use descriptive test names that explain what is being tested
5. **Arrange-Act-Assert**: Structure tests clearly with setup, execution, and verification

Example:
```python
def test_create_task_success(self, mock_getenv, mock_is_valid_url, mock_http_client):
    """Test successful task creation."""
    # Arrange
    mock_getenv.return_value = "https://api.example.com/tasks"
    mock_is_valid_url.return_value = True
    mock_response = MagicMock()
    mock_response.json.return_value = {"code": "0000", "data": {"executionId": "task-123"}}
    mock_http_client.post.return_value = mock_response

    # Act
    result = await create_task("token", "project", "EXECUTOR", {})

    # Assert
    assert result == "task-123"
    mock_http_client.post.assert_called_once()
```

### Integration Test Best Practices

1. **Real Interactions**: Test actual component interactions without excessive mocking
2. **End-to-End Flows**: Verify complete request-response cycles
3. **Schema Validation**: Test data serialization/deserialization
4. **Error Propagation**: Verify error handling across component boundaries

## 🏷️ Test Markers

Tests can be marked with custom markers for selective execution:

- `@pytest.mark.unit`: Unit tests (automatic for tests/unit/)
- `@pytest.mark.integration`: Integration tests (automatic for tests/integration/)
- `@pytest.mark.slow`: Slow-running tests that may be skipped in quick test runs

## 🔍 Debugging Tests

### Running Tests in Debug Mode

```bash
# Run with verbose output
pytest -v

# Run with extra verbosity
pytest -vv

# Stop on first failure
pytest -x

# Drop into debugger on failure
pytest --pdb

# Show local variables in tracebacks
pytest -l
```

### Common Debugging Scenarios

1. **Mock Not Working**: Verify mock patch path matches import path
2. **Async Test Issues**: Ensure proper `@pytest.mark.asyncio` decoration
3. **Import Errors**: Check PYTHONPATH and module structure
4. **Fixture Conflicts**: Verify fixture scopes and dependencies

## 🚦 Continuous Integration

For CI/CD pipelines, use these commands:

```bash
# Quick test run (no coverage, essential tests only)
pytest tests/unit -x --disable-warnings

# Full test run with coverage for merge requests
pytest --cov=plugin.rpa --cov-report=xml --cov-fail-under=90

# Generate JUnit XML for CI reporting
pytest --junit-xml=test-results.xml
```

## 📈 Metrics and Reporting

The test suite provides several metrics:

- **Test Count**: Total number of tests and tests per module
- **Coverage Percentage**: Line and branch coverage
- **Execution Time**: Test execution duration
- **Failure Analysis**: Detailed failure reports with stack traces

## 🤝 Contributing

When adding new functionality:

1. **Write Tests First**: Follow TDD principles where possible
2. **Maintain Coverage**: Ensure new code has appropriate test coverage
3. **Update Documentation**: Update this README if test structure changes
4. **Run Full Suite**: Verify all tests pass before committing

### Adding New Tests

1. Choose appropriate test type (unit vs integration)
2. Place in correct directory structure
3. Follow naming conventions (`test_*.py`, `Test*` classes, `test_*` functions)
4. Add appropriate fixtures to conftest.py if needed
5. Update test runner if new test categories are added

## 🔗 Related Documentation

- [RPA Service Documentation](../README.md)
- [API Documentation](../api/README.md)
- [Configuration Guide](../docs/configuration.md)
- [Development Setup](../docs/development.md)

---

**Test Suite Version**: 1.0.0
**Last Updated**: 2025-01-01
**Maintained By**: RPA Development Team