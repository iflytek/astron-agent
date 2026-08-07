"""
JSON Schema validator utility unit tests.

This module contains comprehensive unit tests for the JsonSchemaValidator class
including validation, data preprocessing, and type fixing functionality.
"""

from typing import Any, Dict, List

from common.utils.json_schema.json_schema_validator import JsonSchemaValidator


class TestJsonSchemaValidator:
    """Test cases for JsonSchemaValidator class."""

    def test_init(self) -> None:
        """Test JsonSchemaValidator initialization."""
        schema = {"type": "object", "properties": {"name": {"type": "string"}}}
        validator = JsonSchemaValidator(schema)

        assert validator.schema == schema

    def test_validate_valid_data(self) -> None:
        """Test validation of valid data."""
        schema = {"type": "object", "properties": {"name": {"type": "string"}}}
        validator = JsonSchemaValidator(schema)
        data = {"name": "test"}

        result = validator.validate(data)
        assert result is True

    def test_validate_invalid_data(self) -> None:
        """Test validation of invalid data."""
        schema = {"type": "object", "properties": {"name": {"type": "string"}}}
        validator = JsonSchemaValidator(schema)
        data = {"name": 123}

        result = validator.validate(data)
        assert result is False

    def test_validate_complex_schema(self) -> None:
        """Test validation of complex schema."""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string", "minLength": 1},
                "age": {"type": "number", "minimum": 0},
                "email": {"type": "string", "format": "email"},
            },
            "required": ["name", "age"],
        }
        validator = JsonSchemaValidator(schema)

        # Valid data
        valid_data = {"name": "test", "age": 25, "email": "test@example.com"}
        result = validator.validate(valid_data)
        assert result is True

        # Invalid data
        invalid_data = {"name": "", "age": -1, "email": "invalid-email"}
        result = validator.validate(invalid_data)
        assert result is False

    def test_validate_array_schema(self) -> None:
        """Test validation of array schema."""
        schema = {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 5,
        }
        validator = JsonSchemaValidator(schema)

        # Valid data
        valid_data = ["item1", "item2", "item3"]
        result = validator.validate(valid_data)
        assert result is True

        # Invalid data
        invalid_data = [123, 456, 789]  # Type error
        result = validator.validate(invalid_data)
        assert result is False

    def test_validate_enum_schema(self) -> None:
        """Test validation of enum schema."""
        schema = {"type": "string", "enum": ["red", "green", "blue"]}
        validator = JsonSchemaValidator(schema)

        # Valid data
        valid_data = "red"
        result = validator.validate(valid_data)
        assert result is True

        # Invalid data
        invalid_data = "yellow"
        result = validator.validate(invalid_data)
        assert result is False

    def test_validate_pattern_schema(self) -> None:
        """Test validation of pattern schema."""
        schema = {"type": "string", "pattern": r"^\d+$"}
        validator = JsonSchemaValidator(schema)

        # Valid data
        valid_data = "123"
        result = validator.validate(valid_data)
        assert result is True

        # Invalid data
        invalid_data = "abc"
        result = validator.validate(invalid_data)
        assert result is False

    def test_validate_all_of_schema(self) -> None:
        """Test validation of allOf schema."""
        schema = {"allOf": [{"type": "string"}, {"minLength": 5}]}
        validator = JsonSchemaValidator(schema)

        # Valid data
        valid_data = "hello"
        result = validator.validate(valid_data)
        assert result is True

        # Invalid data
        invalid_data = "hi"  # Length not enough
        result = validator.validate(invalid_data)
        assert result is False

    def test_validate_any_of_schema(self) -> None:
        """Test validation of anyOf schema."""
        schema = {"anyOf": [{"type": "string"}, {"type": "number"}]}
        validator = JsonSchemaValidator(schema)

        # Valid data
        valid_data_str = "hello"
        result = validator.validate(valid_data_str)
        assert result is True

        valid_data_int = 123
        result = validator.validate(valid_data_int)
        assert result is True

        # Invalid data
        invalid_data = True  # Neither string nor number
        result = validator.validate(invalid_data)
        assert result is False

    def test_validate_one_of_schema(self) -> None:
        """Test validation of oneOf schema."""
        schema = {"oneOf": [{"type": "string"}, {"type": "number"}]}
        validator = JsonSchemaValidator(schema)

        # Valid data
        valid_data = "hello"
        result = validator.validate(valid_data)
        assert result is True

        # Invalid data
        invalid_data = True  # Neither string nor number
        result = validator.validate(invalid_data)
        assert result is False

    def test_validate_not_schema(self) -> None:
        """Test validation of not schema."""
        schema = {"not": {"type": "string"}}
        validator = JsonSchemaValidator(schema)

        # Valid data
        valid_data = 123
        result = validator.validate(valid_data)
        assert result is True

        # Invalid data
        invalid_data = "hello"  # Is string, should be rejected
        result = validator.validate(invalid_data)
        assert result is False

    def test_validate_contains_schema(self) -> None:
        """Test validation of contains schema."""
        schema = {"type": "array", "contains": {"type": "string"}}
        validator = JsonSchemaValidator(schema)

        # Valid data
        valid_data = [123, "hello", 456]
        result = validator.validate(valid_data)
        assert result is True

        # Invalid data
        invalid_data = [123, 456, 789]  # No strings
        result = validator.validate(invalid_data)
        assert result is False

    def test_preprocess_data_add_missing_required_fields(self) -> None:
        """Test adding default values for missing required fields."""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "number"},
                "email": {"type": "string"},
            },
            "required": ["name", "age", "email"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"name": "test"}
        processed_data = validator.preprocess_data(data)

        assert "name" in processed_data
        assert "age" in processed_data
        assert "email" in processed_data
        assert processed_data["name"] == "test"
        assert processed_data["age"] == 0  # Default value
        assert processed_data["email"] == ""  # Default value

    def test_preprocess_data_fix_type_integer(self) -> None:
        """Test fixing integer type."""
        schema = {
            "type": "object",
            "properties": {"age": {"type": "integer"}},
            "required": ["age"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"age": "25"}  # String formatted number
        processed_data = validator.preprocess_data(data)

        assert processed_data["age"] == 25
        assert isinstance(processed_data["age"], int)

    def test_preprocess_data_fix_type_number(self) -> None:
        """Test fixing number type."""
        schema = {
            "type": "object",
            "properties": {"price": {"type": "number"}},
            "required": ["price"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"price": "25.5"}  # String formatted number
        processed_data = validator.preprocess_data(data)

        assert processed_data["price"] == 25.5
        assert isinstance(processed_data["price"], float)

    def test_preprocess_data_fix_type_string(self) -> None:
        """Test fixing string type."""
        schema = {
            "type": "object",
            "properties": {"name": {"type": "string"}},
            "required": ["name"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"name": 123}  # Number type
        processed_data = validator.preprocess_data(data)

        assert processed_data["name"] == "123"
        assert isinstance(processed_data["name"], str)

    def test_preprocess_data_fix_type_boolean(self) -> None:
        """Test fixing boolean type."""
        schema = {
            "type": "object",
            "properties": {"active": {"type": "boolean"}},
            "required": ["active"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"active": "true"}  # String type
        processed_data = validator.preprocess_data(data)

        assert processed_data["active"] is False  # Default value
        assert isinstance(processed_data["active"], bool)

    def test_preprocess_data_fix_type_array(self) -> None:
        """Test fixing array type."""
        schema = {
            "type": "object",
            "properties": {"items": {"type": "array", "items": {"type": "string"}}},
            "required": ["items"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"items": "single_item"}  # String type
        processed_data = validator.preprocess_data(data)

        assert processed_data["items"] == ["single_item"]
        assert isinstance(processed_data["items"], list)

    def test_preprocess_data_fix_type_object(self) -> None:
        """Test fixing object type."""
        schema = {
            "type": "object",
            "properties": {"config": {"type": "object"}},
            "required": ["config"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"config": "not_an_object"}  # String type
        processed_data = validator.preprocess_data(data)

        assert processed_data["config"] == {}
        assert isinstance(processed_data["config"], dict)

    def test_preprocess_data_nested_arrays(self) -> None:
        """Test fixing nested arrays."""
        schema = {
            "type": "object",
            "properties": {
                "matrix": {
                    "type": "array",
                    "items": {"type": "array", "items": {"type": "string"}},
                }
            },
            "required": ["matrix"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"matrix": [["item1", "item2"], ["item3", "item4"]]}
        processed_data = validator.preprocess_data(data)

        assert processed_data["matrix"] == [["item1", "item2"], ["item3", "item4"]]
        assert isinstance(processed_data["matrix"], list)
        assert all(isinstance(row, list) for row in processed_data["matrix"])

    def test_preprocess_data_invalid_type_conversion(self) -> None:
        """Test invalid type conversion."""
        schema = {
            "type": "object",
            "properties": {"age": {"type": "integer"}},
            "required": ["age"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"age": "not_a_number"}  # Cannot be converted to integer
        processed_data = validator.preprocess_data(data)

        assert processed_data["age"] == 0  # Default value
        assert isinstance(processed_data["age"], int)

    def test_preprocess_data_no_required_fields(self) -> None:
        """Test case where there are no required fields."""
        schema = {
            "type": "object",
            "properties": {"name": {"type": "string"}, "age": {"type": "number"}},
        }
        validator = JsonSchemaValidator(schema)

        data = {"name": "test"}
        processed_data = validator.preprocess_data(data)

        assert processed_data == data  # Should remain unchanged

    def test_preprocess_data_empty_schema(self) -> None:
        """Test empty schema."""
        schema: dict = {}
        validator = JsonSchemaValidator(schema)

        data = {"name": "test"}
        processed_data = validator.preprocess_data(data)

        assert processed_data == data  # Should remain unchanged

    def test_preprocess_data_no_properties(self) -> None:
        """Test case where there are no properties defined."""
        schema = {"type": "object", "required": ["name"]}
        validator = JsonSchemaValidator(schema)

        data = {"name": "test"}
        processed_data = validator.preprocess_data(data)

        assert processed_data == data  # Should remain unchanged

    def test_validate_and_fix_valid_data(self) -> None:
        """Test validation and fixing of valid data."""
        schema = {
            "type": "object",
            "properties": {"name": {"type": "string"}, "age": {"type": "number"}},
            "required": ["name", "age"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"name": "test", "age": 25}
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True
        assert fixed_data == data

    def test_validate_and_fix_invalid_data(self) -> None:
        """Test validation and fixing of invalid data."""
        schema = {
            "type": "object",
            "properties": {"name": {"type": "string"}, "age": {"type": "number"}},
            "required": ["name", "age"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"name": "test"}  # Missing age field
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True  # Should be valid after fixing
        assert "name" in fixed_data
        assert "age" in fixed_data
        assert fixed_data["name"] == "test"
        assert fixed_data["age"] == 0  # Default value

    def test_validate_and_fix_type_conversion(self) -> None:
        """Test validation and fixing of type conversion."""
        schema = {
            "type": "object",
            "properties": {"age": {"type": "integer"}},
            "required": ["age"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"age": "25"}  # String formatted number
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True
        assert fixed_data["age"] == 25
        assert isinstance(fixed_data["age"], int)

    def test_validate_and_fix_complex_schema(self) -> None:
        """Test validation and fixing of complex schema."""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"},
                "email": {"type": "string"},
                "active": {"type": "boolean"},
                "tags": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["name", "age", "email", "active", "tags"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"name": "test", "age": "25", "email": "test@example.com"}
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True
        assert fixed_data["name"] == "test"
        assert fixed_data["age"] == 25
        assert fixed_data["email"] == "test@example.com"
        assert fixed_data["active"] is False  # Default value
        assert fixed_data["tags"] == []  # Default value

    def test_validate_and_fix_arrays(self) -> None:
        """Test validation and fixing of arrays."""
        schema = {
            "type": "object",
            "properties": {"items": {"type": "array", "items": {"type": "string"}}},
            "required": ["items"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"items": "single_item"}  # String type
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True
        assert fixed_data["items"] == ["single_item"]
        assert isinstance(fixed_data["items"], list)

    def test_validate_and_fix_mixed_types(self) -> None:
        """Test validation and fixing of mixed types."""
        schema = {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "name": {"type": "string"},
                "price": {"type": "number"},
                "active": {"type": "boolean"},
                "tags": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["id", "name", "price", "active", "tags"],
        }
        validator = JsonSchemaValidator(schema)

        data = {
            "id": "123",
            "name": 456,
            "price": "25.5",
            "active": "true",
            "tags": "tag1,tag2",
        }
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True
        assert fixed_data["id"] == 123
        assert fixed_data["name"] == "456"
        assert fixed_data["price"] == 25.5
        assert fixed_data["active"] is False  # Default value
        assert fixed_data["tags"] == ["tag1,tag2"]

    def test_validate_and_fix_error_handling(self) -> None:
        """Test error handling."""
        schema = {
            "type": "object",
            "properties": {"age": {"type": "integer"}},
            "required": ["age"],
        }
        validator = JsonSchemaValidator(schema)

        # Test type that cannot be converted
        data = {"age": "not_a_number"}
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True  # Should be valid after fixing
        assert fixed_data["age"] == 0  # Default value

    def test_validate_and_fix_empty_data(self) -> None:
        """Test validation and fixing of empty data."""
        schema = {
            "type": "object",
            "properties": {"name": {"type": "string"}, "age": {"type": "integer"}},
            "required": ["name", "age"],
        }
        validator = JsonSchemaValidator(schema)

        data: dict = {}
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True
        assert "name" in fixed_data
        assert "age" in fixed_data
        assert fixed_data["name"] == ""  # Default value
        assert fixed_data["age"] == 0  # Default value

    def test_validate_and_fix_partial_data(self) -> None:
        """Test validation and fixing of partial data."""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"},
                "email": {"type": "string"},
            },
            "required": ["name", "age", "email"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"name": "test", "age": 25}  # Missing email field
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True
        assert fixed_data["name"] == "test"
        assert fixed_data["age"] == 25
        assert fixed_data["email"] == ""  # Default value

    def test_validate_and_fix_type_mismatch(self) -> None:
        """Test validation and fixing of type mismatch."""
        schema = {
            "type": "object",
            "properties": {"age": {"type": "integer"}},
            "required": ["age"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"age": "25.5"}  # Float string
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True
        assert fixed_data["age"] == 25  # Converted to integer
        assert isinstance(fixed_data["age"], int)

    def test_validate_and_fix_boolean_conversion(self) -> None:
        """Test validation and fixing of boolean conversion."""
        schema = {
            "type": "object",
            "properties": {"active": {"type": "boolean"}},
            "required": ["active"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"active": "true"}  # String type
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True
        assert fixed_data["active"] is False  # Default value
        assert isinstance(fixed_data["active"], bool)

    def test_validate_and_fix_array_conversion(self) -> None:
        """Test validation and fixing of array conversion."""
        schema = {
            "type": "object",
            "properties": {"items": {"type": "array", "items": {"type": "string"}}},
            "required": ["items"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"items": "single_item"}  # String type
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True
        assert fixed_data["items"] == ["single_item"]
        assert isinstance(fixed_data["items"], list)

    def test_validate_and_fix_object_conversion(self) -> None:
        """Test validation and fixing of object conversion."""
        schema = {
            "type": "object",
            "properties": {"config": {"type": "object"}},
            "required": ["config"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"config": "not_an_object"}  # String type
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True
        assert fixed_data["config"] == {}
        assert isinstance(fixed_data["config"], dict)

    def test_validate_and_fix_nested_validation(self) -> None:
        """Test validation and fixing of nested validation."""
        schema = {
            "type": "object",
            "properties": {
                "user": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "age": {"type": "integer"},
                    },
                    "required": ["name", "age"],
                }
            },
            "required": ["user"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"user": {"name": "test", "age": "25"}}  # age is string type
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True
        assert fixed_data["user"]["name"] == "test"
        assert fixed_data["user"]["age"] == 25
        assert isinstance(fixed_data["user"]["age"], int)

    def test_validate_and_fix_complex_nested_structure(self) -> None:
        """Test validation and fixing of complex nested structure."""
        schema = {
            "type": "object",
            "properties": {
                "users": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "age": {"type": "integer"},
                            "active": {"type": "boolean"},
                        },
                        "required": ["name", "age", "active"],
                    },
                }
            },
            "required": ["users"],
        }
        validator = JsonSchemaValidator(schema)

        data = {"users": [{"name": "test", "age": "25", "active": "true"}]}
        is_valid, fixed_data = validator.validate_and_fix(data)

        assert is_valid is True
        assert len(fixed_data["users"]) == 1
        assert fixed_data["users"][0]["name"] == "test"
        assert fixed_data["users"][0]["age"] == 25
        assert fixed_data["users"][0]["active"] is False  # Default value

    def test_validate_and_fix_error_recovery(self) -> None:
        """Test validation and fixing of error recovery."""
        schema = {
            "type": "object",
            "properties": {"age": {"type": "integer"}},
            "required": ["age"],
        }
        validator = JsonSchemaValidator(schema)

        # Test various invalid inputs
        test_cases: List[Dict[str, Any]] = [
            {"age": "not_a_number"},
            {"age": "25.5"},
            {"age": "abc"},
            {"age": None},
            {"age": []},
            {"age": {}},
        ]

        for data in test_cases:
            is_valid, fixed_data = validator.validate_and_fix(data)
            assert is_valid is True
            assert fixed_data["age"] in [0, 25]  # Default value
            assert isinstance(fixed_data["age"], int)

    def test_validate_and_fix_performance(self) -> None:
        """Test performance."""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"},
                "email": {"type": "string"},
            },
            "required": ["name", "age", "email"],
        }
        validator = JsonSchemaValidator(schema)

        # Test large data processing
        data = {"name": "test", "age": "25", "email": "test@example.com"}

        for _ in range(1000):
            is_valid, fixed_data = validator.validate_and_fix(data)
            assert is_valid is True
            assert fixed_data["age"] == 25
            assert isinstance(fixed_data["age"], int)
