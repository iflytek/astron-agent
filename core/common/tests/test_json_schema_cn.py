"""
Chinese JSON Schema validators unit tests.

This module contains comprehensive unit tests for Chinese JSON Schema validators
including custom validators, error message translation, and CNValidator class.
"""

from unittest.mock import Mock

from jsonschema import ValidationError  # type: ignore

from common.utils.json_schema.json_schema_cn import (
    CNValidator,
    cn_all_of_validator,
    cn_any_of_validator,
    cn_contains_validator,
    cn_enum_validator,
    cn_format_validator,
    cn_items_validator,
    cn_max_items_validator,
    cn_max_length_validator,
    cn_maximum_validator,
    cn_min_items_validator,
    cn_min_length_validator,
    cn_minimum_validator,
    cn_not_validator,
    cn_one_of_validator,
    cn_pattern_validator,
    cn_properties_validator,
    cn_required_validator,
    cn_type_validator,
    translate_error,
)


class TestCNTypeValidator:
    """Test cases for cn_type_validator function."""

    def test_cn_type_validator_correct_type(self) -> None:
        """Test validation of correct type."""
        validator = Mock()
        validator.is_type = Mock(return_value=True)

        errors = list(cn_type_validator(validator, "string", "test", {}))
        assert len(errors) == 0

    def test_cn_type_validator_incorrect_type(self) -> None:
        """Test validation of incorrect type."""
        validator = Mock()
        validator.is_type = Mock(return_value=False)

        errors = list(cn_type_validator(validator, "string", 123, {}))
        assert len(errors) == 1
        assert "字段类型应为" in errors[0].message
        assert "但实际为" in errors[0].message

    def test_cn_type_validator_multiple_types(self) -> None:
        """Test validation of multiple types."""
        validator = Mock()
        validator.is_type = Mock(return_value=False)

        errors = list(cn_type_validator(validator, ["string", "number"], 123, {}))
        assert len(errors) == 1
        assert "字段类型应为" in errors[0].message

    def test_cn_type_validator_none_value(self) -> None:
        """Test type validation of None value."""
        validator = Mock()
        validator.is_type = Mock(return_value=False)

        errors = list(cn_type_validator(validator, "string", None, {}))
        assert len(errors) == 1
        assert "字段类型应为" in errors[0].message


class TestCNRequiredValidator:
    """Test cases for cn_required_validator function."""

    def test_cn_required_validator_all_fields_present(self) -> None:
        """Test case where all required fields are present."""
        validator = Mock()
        instance = {"name": "test", "age": 25}
        required = ["name", "age"]

        errors = list(cn_required_validator(validator, required, instance, {}))
        assert len(errors) == 0

    def test_cn_required_validator_missing_field(self) -> None:
        """Test case where required fields are missing."""
        validator = Mock()
        instance = {"name": "test"}
        required = ["name", "age"]

        errors = list(cn_required_validator(validator, required, instance, {}))
        assert len(errors) == 1
        assert "缺少必填字段" in errors[0].message
        assert "age" in errors[0].message

    def test_cn_required_validator_multiple_missing_fields(self) -> None:
        """Test case where multiple required fields are missing."""
        validator = Mock()
        instance = {"name": "test"}
        required = ["name", "age", "email"]

        errors = list(cn_required_validator(validator, required, instance, {}))
        assert len(errors) == 2
        assert all("缺少必填字段" in error.message for error in errors)

    def test_cn_required_validator_empty_instance(self) -> None:
        """Test case with empty instance."""
        validator = Mock()
        instance: dict = {}
        required = ["name", "age"]

        errors = list(cn_required_validator(validator, required, instance, {}))
        assert len(errors) == 2
        assert all("缺少必填字段" in error.message for error in errors)


class TestCNAllOfValidator:
    """Test cases for cn_all_of_validator function."""

    def test_cn_all_of_validator_all_satisfied(self) -> None:
        """Test case where all conditions are satisfied."""
        validator = Mock()
        validator.descend = Mock(return_value=[])
        all_of = [{"type": "string"}, {"minLength": 1}]
        instance = "test"

        errors = list(cn_all_of_validator(validator, all_of, instance, {}))
        assert len(errors) == 0

    def test_cn_all_of_validator_some_not_satisfied(self) -> None:
        """Test case where some conditions are not satisfied."""
        validator = Mock()
        validator.descend = Mock(side_effect=[[], [ValidationError("test error")]])
        all_of = [{"type": "string"}, {"minLength": 10}]
        instance = "test"

        errors = list(cn_all_of_validator(validator, all_of, instance, {}))
        assert len(errors) == 1
        assert "必须同时满足 allOf 中的所有条件" in errors[0].message

    def test_cn_all_of_validator_multiple_errors(self) -> None:
        """Test case where multiple conditions are not satisfied."""
        validator = Mock()
        validator.descend = Mock(
            side_effect=[[ValidationError("error1")], [ValidationError("error2")]]
        )
        all_of = [{"type": "number"}, {"minimum": 10}]
        instance = "test"

        errors = list(cn_all_of_validator(validator, all_of, instance, {}))
        assert len(errors) == 2


class TestCNAnyOfValidator:
    """Test cases for cn_any_of_validator function."""

    def test_cn_any_of_validator_at_least_one_satisfied(self) -> None:
        """Test case where at least one condition is satisfied."""
        validator = Mock()
        validator.is_valid = Mock(side_effect=[True, False])
        any_of = [{"type": "string"}, {"type": "number"}]
        instance = "test"

        errors = list(cn_any_of_validator(validator, any_of, instance, {}))
        assert len(errors) == 0

    def test_cn_any_of_validator_none_satisfied(self) -> None:
        """Test case where no conditions are satisfied."""
        validator = Mock()
        validator.is_valid = Mock(return_value=False)
        any_of = [{"type": "string"}, {"type": "number"}]
        instance = True

        errors = list(cn_any_of_validator(validator, any_of, instance, {}))
        assert len(errors) == 1
        assert "必须至少满足 anyOf 中的一个条件" in errors[0].message


class TestCNOneOfValidator:
    """Test cases for cn_one_of_validator function."""

    def test_cn_one_of_validator_exactly_one_satisfied(self) -> None:
        """Test case where exactly one condition is satisfied."""
        validator = Mock()
        validator.is_valid = Mock(side_effect=[True, False])
        one_of = [{"type": "string"}, {"type": "number"}]
        instance = "test"

        errors = list(cn_one_of_validator(validator, one_of, instance, {}))
        assert len(errors) == 0

    def test_cn_one_of_validator_multiple_satisfied(self) -> None:
        """Test case where multiple conditions are satisfied."""
        validator = Mock()
        validator.is_valid = Mock(return_value=True)
        one_of = [{"type": "string"}, {"type": "number"}]
        instance = "test"

        errors = list(cn_one_of_validator(validator, one_of, instance, {}))
        assert len(errors) == 1
        assert "必须且仅满足 oneOf 中的一个条件" in errors[0].message

    def test_cn_one_of_validator_none_satisfied(self) -> None:
        """Test case where no conditions are satisfied."""
        validator = Mock()
        validator.is_valid = Mock(return_value=False)
        one_of = [{"type": "string"}, {"type": "number"}]
        instance = True

        errors = list(cn_one_of_validator(validator, one_of, instance, {}))
        assert len(errors) == 1
        assert "必须且仅满足 oneOf 中的一个条件" in errors[0].message


class TestCNNotValidator:
    """Test cases for cn_not_validator function."""

    def test_cn_not_validator_condition_not_satisfied(self) -> None:
        """Test case where condition is not satisfied."""
        validator = Mock()
        validator.is_valid = Mock(return_value=False)
        not_schema = {"type": "string"}
        instance = 123

        errors = list(cn_not_validator(validator, not_schema, instance, {}))
        assert len(errors) == 0

    def test_cn_not_validator_condition_satisfied(self) -> None:
        """Test case where condition is satisfied."""
        validator = Mock()
        validator.is_valid = Mock(return_value=True)
        not_schema = {"type": "string"}
        instance = "test"

        errors = list(cn_not_validator(validator, not_schema, instance, {}))
        assert len(errors) == 1
        assert "不允许匹配 not 中定义的模式" in errors[0].message


class TestCNEnumValidator:
    """Test cases for cn_enum_validator function."""

    def test_cn_enum_validator_valid_value(self) -> None:
        """Test case with valid enum value."""
        validator = Mock()
        enums = ["red", "green", "blue"]
        instance = "red"

        errors = list(cn_enum_validator(validator, enums, instance, {}))
        assert len(errors) == 0

    def test_cn_enum_validator_invalid_value(self) -> None:
        """Test case with invalid enum value."""
        validator = Mock()
        enums = ["red", "green", "blue"]
        instance = "yellow"

        errors = list(cn_enum_validator(validator, enums, instance, {}))
        assert len(errors) == 1
        assert "值必须是以下枚举值之一" in errors[0].message
        assert "red" in errors[0].message


class TestCNFormatValidator:
    """Test cases for cn_format_validator function."""

    def test_cn_format_validator_valid_format(self) -> None:
        """Test case with valid format."""
        validator = Mock()
        validator.FORMAT_CHECKER = Mock()
        validator.FORMAT_CHECKER.check = Mock(return_value=True)
        format_str = "email"
        instance = "test@example.com"

        errors = list(cn_format_validator(validator, format_str, instance, {}))
        assert len(errors) == 0

    def test_cn_format_validator_invalid_format(self) -> None:
        """Test case with invalid format."""
        validator = Mock()
        validator.FORMAT_CHECKER = Mock()
        validator.FORMAT_CHECKER.check = Mock(return_value=False)
        format_str = "email"
        instance = "invalid-email"

        errors = list(cn_format_validator(validator, format_str, instance, {}))
        assert len(errors) == 1
        assert "字段格式不符合要求" in errors[0].message


class TestCNItemsValidator:
    """Test cases for cn_items_validator function."""

    def test_cn_items_validator_valid_items(self) -> None:
        """Test case with valid array items."""
        validator = Mock()
        validator.descend = Mock(return_value=[])
        items = {"type": "string"}
        instance = ["test1", "test2"]

        errors = list(cn_items_validator(validator, items, instance, {}))
        assert len(errors) == 0

    def test_cn_items_validator_invalid_items(self) -> None:
        """Test case with invalid array items."""
        validator = Mock()
        validator.descend = Mock(
            side_effect=[[ValidationError("error1")], [ValidationError("error2")]]
        )
        items = {"type": "string"}
        instance = [123, 456]

        errors = list(cn_items_validator(validator, items, instance, {}))
        assert len(errors) == 2

    def test_cn_items_validator_non_list_instance(self) -> None:
        """Test case with non-list instance."""
        validator = Mock()
        items = {"type": "string"}
        instance = "not a list"

        errors = list(cn_items_validator(validator, items, instance, {}))
        assert len(errors) == 0


class TestCNMaxItemsValidator:
    """Test cases for cn_max_items_validator function."""

    def test_cn_max_items_validator_valid_count(self) -> None:
        """Test case with valid item count."""
        validator = Mock()
        max_items = 5
        instance = [1, 2, 3]

        errors = list(cn_max_items_validator(validator, max_items, instance, {}))
        assert len(errors) == 0

    def test_cn_max_items_validator_exceeded_count(self) -> None:
        """Test case where maximum item count is exceeded."""
        validator = Mock()
        max_items = 3
        instance = [1, 2, 3, 4, 5]

        errors = list(cn_max_items_validator(validator, max_items, instance, {}))
        assert len(errors) == 1
        assert "数组元素数量不能超过" in errors[0].message
        assert "当前为 5" in errors[0].message

    def test_cn_max_items_validator_non_list_instance(self) -> None:
        """Test case with non-list instance."""
        validator = Mock()
        max_items = 3
        instance = "not a list"

        errors = list(cn_max_items_validator(validator, max_items, instance, {}))
        assert len(errors) == 0


class TestCNMinItemsValidator:
    """Test cases for cn_min_items_validator function."""

    def test_cn_min_items_validator_valid_count(self) -> None:
        """Test case with valid item count."""
        validator = Mock()
        min_items = 2
        instance = [1, 2, 3]

        errors = list(cn_min_items_validator(validator, min_items, instance, {}))
        assert len(errors) == 0

    def test_cn_min_items_validator_insufficient_count(self) -> None:
        """Test case where item count is insufficient."""
        validator = Mock()
        min_items = 5
        instance = [1, 2, 3]

        errors = list(cn_min_items_validator(validator, min_items, instance, {}))
        assert len(errors) == 1
        assert "数组元素数量不能少于" in errors[0].message
        assert "当前为 3" in errors[0].message

    def test_cn_min_items_validator_non_list_instance(self) -> None:
        """Test case with non-list instance."""
        validator = Mock()
        min_items = 2
        instance = "not a list"

        errors = list(cn_min_items_validator(validator, min_items, instance, {}))
        assert len(errors) == 0


class TestCNMaxLengthValidator:
    """Test cases for cn_max_length_validator function."""

    def test_cn_max_length_validator_valid_length(self) -> None:
        """Test case with valid length."""
        validator = Mock()
        max_length = 10
        instance = "test"

        errors = list(cn_max_length_validator(validator, max_length, instance, {}))
        assert len(errors) == 0

    def test_cn_max_length_validator_exceeded_length(self) -> None:
        """Test case where maximum length is exceeded."""
        validator = Mock()
        max_length = 5
        instance = "very long string"

        errors = list(cn_max_length_validator(validator, max_length, instance, {}))
        assert len(errors) == 1
        assert "字符串长度不能超过" in errors[0].message
        assert "当前为 16" in errors[0].message

    def test_cn_max_length_validator_non_string_instance(self) -> None:
        """Test case with non-string instance."""
        validator = Mock()
        max_length = 5
        instance = 123

        errors = list(cn_max_length_validator(validator, max_length, instance, {}))
        assert len(errors) == 0


class TestCNMinLengthValidator:
    """Test cases for cn_min_length_validator function."""

    def test_cn_min_length_validator_valid_length(self) -> None:
        """Test case with valid length."""
        validator = Mock()
        min_length = 2
        instance = "test"

        errors = list(cn_min_length_validator(validator, min_length, instance, {}))
        assert len(errors) == 0

    def test_cn_min_length_validator_insufficient_length(self) -> None:
        """Test case where length is insufficient."""
        validator = Mock()
        min_length = 10
        instance = "short"

        errors = list(cn_min_length_validator(validator, min_length, instance, {}))
        assert len(errors) == 1
        assert "字符串长度不能少于" in errors[0].message
        assert "当前为 5" in errors[0].message

    def test_cn_min_length_validator_non_string_instance(self) -> None:
        """Test case with non-string instance."""
        validator = Mock()
        min_length = 2
        instance = 123

        errors = list(cn_min_length_validator(validator, min_length, instance, {}))
        assert len(errors) == 0


class TestCNMaximumValidator:
    """Test cases for cn_maximum_validator function."""

    def test_cn_maximum_validator_valid_value(self) -> None:
        """Test case with valid value."""
        validator = Mock()
        maximum = 10
        instance = 5

        errors = list(cn_maximum_validator(validator, maximum, instance, {}))
        assert len(errors) == 0

    def test_cn_maximum_validator_exceeded_value(self) -> None:
        """Test case where maximum value is exceeded."""
        validator = Mock()
        maximum = 5
        instance = 10

        errors = list(cn_maximum_validator(validator, maximum, instance, {}))
        assert len(errors) == 1
        assert "数值不能大于" in errors[0].message
        assert "当前为 10" in errors[0].message

    def test_cn_maximum_validator_non_numeric_instance(self) -> None:
        """Test case with non-numeric instance."""
        validator = Mock()
        maximum = 5
        instance = "not a number"

        errors = list(cn_maximum_validator(validator, maximum, instance, {}))
        assert len(errors) == 0


class TestCNMinimumValidator:
    """Test cases for cn_minimum_validator function."""

    def test_cn_minimum_validator_valid_value(self) -> None:
        """Test case with valid value."""
        validator = Mock()
        minimum = 5
        instance = 10

        errors = list(cn_minimum_validator(validator, minimum, instance, {}))
        assert len(errors) == 0

    def test_cn_minimum_validator_insufficient_value(self) -> None:
        """Test case where value is insufficient."""
        validator = Mock()
        minimum = 10
        instance = 5

        errors = list(cn_minimum_validator(validator, minimum, instance, {}))
        assert len(errors) == 1
        assert "数值不能小于" in errors[0].message
        assert "当前为 5" in errors[0].message

    def test_cn_minimum_validator_non_numeric_instance(self) -> None:
        """Test case with non-numeric instance."""
        validator = Mock()
        minimum = 5
        instance = "not a number"

        errors = list(cn_minimum_validator(validator, minimum, instance, {}))
        assert len(errors) == 0


class TestCNPatternValidator:
    """Test cases for cn_pattern_validator function."""

    def test_cn_pattern_validator_matching_pattern(self) -> None:
        """Test case with matching pattern."""
        validator = Mock()
        pattern = r"^\d+$"
        instance = "123"

        errors = list(cn_pattern_validator(validator, pattern, instance, {}))
        assert len(errors) == 0

    def test_cn_pattern_validator_non_matching_pattern(self) -> None:
        """Test case with non-matching pattern."""
        validator = Mock()
        pattern = r"^\d+$"
        instance = "abc"

        errors = list(cn_pattern_validator(validator, pattern, instance, {}))
        assert len(errors) == 1
        assert "字符串不匹配正则表达式" in errors[0].message

    def test_cn_pattern_validator_non_string_instance(self) -> None:
        """Test case with non-string instance."""
        validator = Mock()
        pattern = r"^\d+$"
        instance = 123

        errors = list(cn_pattern_validator(validator, pattern, instance, {}))
        assert len(errors) == 0


class TestCNPropertiesValidator:
    """Test cases for cn_properties_validator function."""

    def test_cn_properties_validator_valid_properties(self) -> None:
        """Test case with valid properties."""
        validator = Mock()
        validator.descend = Mock(return_value=[])
        properties = {"name": {"type": "string"}, "age": {"type": "number"}}
        instance = {"name": "test", "age": 25}

        errors = list(cn_properties_validator(validator, properties, instance, {}))
        assert len(errors) == 0

    def test_cn_properties_validator_invalid_properties(self) -> None:
        """Test case with invalid properties."""
        validator = Mock()
        validator.descend = Mock(
            side_effect=[[ValidationError("error1")], [ValidationError("error2")]]
        )
        properties = {"name": {"type": "string"}, "age": {"type": "number"}}
        instance = {"name": 123, "age": "not a number"}

        errors = list(cn_properties_validator(validator, properties, instance, {}))
        assert len(errors) == 2

    def test_cn_properties_validator_non_dict_instance(self) -> None:
        """Test case with non-dictionary instance."""
        validator = Mock()
        properties = {"name": {"type": "string"}}
        instance = "not a dict"

        errors = list(cn_properties_validator(validator, properties, instance, {}))
        assert len(errors) == 0


class TestCNContainsValidator:
    """Test cases for cn_contains_validator function."""

    def test_cn_contains_validator_contains_valid_item(self) -> None:
        """Test case with valid items."""
        validator = Mock()
        validator.is_valid = Mock(return_value=True)
        subschema = {"type": "string"}
        instance = ["test", 123]

        errors = list(cn_contains_validator(validator, subschema, instance, {}))
        assert len(errors) == 0

    def test_cn_contains_validator_no_valid_item(self) -> None:
        """Test case with no valid items."""
        validator = Mock()
        validator.is_valid = Mock(return_value=False)
        subschema = {"type": "string"}
        instance = [123, 456]

        errors = list(cn_contains_validator(validator, subschema, instance, {}))
        assert len(errors) == 1
        assert "数组中必须至少包含一个符合条件的元素" in errors[0].message

    def test_cn_contains_validator_non_list_instance(self) -> None:
        """Test case with non-list instance."""
        validator = Mock()
        subschema = {"type": "string"}
        instance = "not a list"

        errors = list(cn_contains_validator(validator, subschema, instance, {}))
        assert len(errors) == 0


class TestTranslateError:
    """Test cases for translate_error function."""

    def test_translate_error_type(self) -> None:
        """Test type error translation."""
        error = ValidationError("type error")
        error.validator = "type"
        error.validator_value = "string"
        error.instance = 123

        result = translate_error(error)
        assert "字段类型应为" in result
        assert "但实际为" in result

    def test_translate_error_required(self) -> None:
        """Test required field error translation."""
        error = ValidationError("required field missing")
        error.validator = "required"
        error.message = "name is required"

        result = translate_error(error)
        assert "缺少必填字段" in result

    def test_translate_error_maximum(self) -> None:
        """Test maximum value error translation."""
        error = ValidationError("maximum exceeded")
        error.validator = "maximum"
        error.validator_value = 10
        error.instance = 15

        result = translate_error(error)
        assert "数值不能大于" in result
        assert "当前为 15" in result

    def test_translate_error_minimum(self) -> None:
        """Test minimum value error translation."""
        error = ValidationError("minimum not met")
        error.validator = "minimum"
        error.validator_value = 5
        error.instance = 3

        result = translate_error(error)
        assert "数值不能小于" in result
        assert "当前为 3" in result

    def test_translate_error_max_length(self) -> None:
        """Test maximum length error translation."""
        error = ValidationError("max length exceeded")
        error.validator = "maxLength"
        error.validator_value = 10
        error.instance = "very long string"

        result = translate_error(error)
        assert "字符串长度不能超过" in result
        assert "当前为 16" in result

    def test_translate_error_min_length(self) -> None:
        """Test minimum length error translation."""
        error = ValidationError("min length not met")
        error.validator = "minLength"
        error.validator_value = 5
        error.instance = "hi"

        result = translate_error(error)
        assert "字符串长度不能少于" in result
        assert "当前为 2" in result

    def test_translate_error_pattern(self) -> None:
        """Test pattern error translation."""
        error = ValidationError("pattern mismatch")
        error.validator = "pattern"
        error.validator_value = r"^\d+$"

        result = translate_error(error)
        assert "字符串不匹配正则表达式" in result

    def test_translate_error_enum(self) -> None:
        """Test enum error translation."""
        error = ValidationError("enum mismatch")
        error.validator = "enum"
        error.validator_value = ["red", "green", "blue"]
        error.instance = "yellow"

        result = translate_error(error)
        assert "值必须是以下枚举值之一" in result
        assert "当前为 yellow" in result

    def test_translate_error_max_items(self) -> None:
        """Test maximum items error translation."""
        error = ValidationError("max items exceeded")
        error.validator = "maxItems"
        error.validator_value = 3
        error.instance = [1, 2, 3, 4, 5]

        result = translate_error(error)
        assert "数组元素数量不能超过" in result
        assert "当前为 5" in result

    def test_translate_error_min_items(self) -> None:
        """Test minimum items error translation."""
        error = ValidationError("min items not met")
        error.validator = "minItems"
        error.validator_value = 5
        error.instance = [1, 2, 3]

        result = translate_error(error)
        assert "数组元素数量不能少于" in result
        assert "当前为 3" in result

    def test_translate_error_any_of(self) -> None:
        """Test anyOf error translation."""
        error = ValidationError("anyOf not satisfied")
        error.validator = "anyOf"

        result = translate_error(error)
        assert "必须至少满足 anyOf 中的一个条件" in result

    def test_translate_error_all_of(self) -> None:
        """Test allOf error translation."""
        error = ValidationError("allOf not satisfied")
        error.validator = "allOf"

        result = translate_error(error)
        assert "必须满足 allOf 中的所有条件" in result

    def test_translate_error_one_of(self) -> None:
        """Test oneOf error translation."""
        error = ValidationError("oneOf not satisfied")
        error.validator = "oneOf"

        result = translate_error(error)
        assert "必须且仅满足 oneOf 中的一个条件" in result

    def test_translate_error_not(self) -> None:
        """Test not error translation."""
        error = ValidationError("not condition satisfied")
        error.validator = "not"

        result = translate_error(error)
        assert "不允许匹配 not 中定义的模式" in result

    def test_translate_error_contains(self) -> None:
        """Test contains error translation."""
        error = ValidationError("contains not satisfied")
        error.validator = "contains"

        result = translate_error(error)
        assert "数组中必须至少包含一个符合条件的元素" in result

    def test_translate_error_exclusive_maximum(self) -> None:
        """Test exclusiveMaximum error translation."""
        error = ValidationError("exclusive maximum exceeded")
        error.validator = "exclusiveMaximum"
        error.validator_value = 10
        error.instance = 10

        result = translate_error(error)
        assert "大于或等于设定的最大值" in result

    def test_translate_error_exclusive_minimum(self) -> None:
        """Test exclusiveMinimum error translation."""
        error = ValidationError("exclusive minimum not met")
        error.validator = "exclusiveMinimum"
        error.validator_value = 5
        error.instance = 5

        result = translate_error(error)
        assert "小于或等于设定的最小值" in result

    def test_translate_error_unknown_validator(self) -> None:
        """Test unknown validator translation."""
        error = ValidationError("unknown error")
        error.validator = "unknown"

        result = translate_error(error)
        assert result == "unknown error"  # Should return original message


class TestCNValidator:
    """Test cases for CNValidator class."""

    def test_cn_validator_init(self) -> None:
        """Test CNValidator initialization."""
        schema = {"type": "object", "properties": {"name": {"type": "string"}}}
        validator = CNValidator(schema)

        assert validator.schema == schema
        assert validator.validator is not None

    def test_cn_validator_validate_valid_data(self) -> None:
        """Test validation of valid data."""
        schema = {"type": "object", "properties": {"name": {"type": "string"}}}
        validator = CNValidator(schema)
        data = {"name": "test"}

        errors = validator.validate(data)
        assert len(errors) == 0

    def test_cn_validator_validate_invalid_data(self) -> None:
        """Test validation of invalid data."""
        schema = {"type": "object", "properties": {"name": {"type": "string"}}}
        validator = CNValidator(schema)
        data = {"name": 123}

        errors = validator.validate(data)
        assert len(errors) > 0

    def test_cn_validator_iter_errors(self) -> None:
        """Test error iteration functionality."""
        schema = {"type": "object", "properties": {"name": {"type": "string"}}}
        validator = CNValidator(schema)
        data = {"name": 123}

        errors = list(validator.iter_errors(data))
        assert len(errors) > 0

        for error in errors:
            assert "path" in error
            assert "schema_path" in error
            assert "message" in error

    def test_cn_validator_complex_schema(self) -> None:
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
        validator = CNValidator(schema)

        # Valid data
        valid_data = {"name": "test", "age": 25, "email": "test@example.com"}
        errors = validator.validate(valid_data)
        assert len(errors) == 0

        # Invalid data
        invalid_data = {"name": "", "age": -1, "email": "invalid-email"}
        errors = validator.validate(invalid_data)
        assert len(errors) > 0

    def test_cn_validator_array_schema(self) -> None:
        """Test validation of array schema."""
        schema = {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 5,
        }
        validator = CNValidator(schema)

        # Valid data
        valid_data = ["item1", "item2", "item3"]
        errors = validator.validate(valid_data)
        assert len(errors) == 0

        # Invalid data
        invalid_data = [123, 456, 789]  # Type error
        errors = validator.validate(invalid_data)
        assert len(errors) > 0

    def test_cn_validator_enum_schema(self) -> None:
        """Test validation of enum schema."""
        schema = {"type": "string", "enum": ["red", "green", "blue"]}
        validator = CNValidator(schema)

        # Valid data
        valid_data = "red"
        errors = validator.validate(valid_data)
        assert len(errors) == 0

        # Invalid data
        invalid_data = "yellow"
        errors = validator.validate(invalid_data)
        assert len(errors) > 0

    def test_cn_validator_pattern_schema(self) -> None:
        """Test validation of pattern matching."""
        schema = {"type": "string", "pattern": r"^\d+$"}
        validator = CNValidator(schema)

        # Valid data
        valid_data = "123"
        errors = validator.validate(valid_data)
        assert len(errors) == 0

        # Invalid data
        invalid_data = "abc"
        errors = validator.validate(invalid_data)
        assert len(errors) > 0

    def test_cn_validator_all_of_schema(self) -> None:
        """Test validation of allOf schema."""
        schema = {"allOf": [{"type": "string"}, {"minLength": 5}]}
        validator = CNValidator(schema)

        # Valid data
        valid_data = "hello"
        errors = validator.validate(valid_data)
        assert len(errors) == 0

        # Invalid data
        invalid_data = "hi"  # Insufficient length
        errors = validator.validate(invalid_data)
        assert len(errors) > 0

    def test_cn_validator_any_of_schema(self) -> None:
        """Test validation of anyOf schema."""
        schema = {"anyOf": [{"type": "string"}, {"type": "number"}]}
        validator = CNValidator(schema)

        # Valid data
        valid_data_str = "hello"
        errors = validator.validate(valid_data_str)
        assert len(errors) == 0

        valid_data_int: int = 123
        errors = validator.validate(valid_data_int)
        assert len(errors) == 0

        # Invalid data
        invalid_data = True  # Neither string nor number
        errors = validator.validate(invalid_data)
        assert len(errors) > 0

    def test_cn_validator_one_of_schema(self) -> None:
        """Test validation of oneOf schema."""
        schema = {"oneOf": [{"type": "string"}, {"type": "number"}]}
        validator = CNValidator(schema)

        # Valid data
        valid_data = "hello"
        errors = validator.validate(valid_data)
        assert len(errors) == 0

        # Invalid data
        invalid_data = True  # Neither string nor number
        errors = validator.validate(invalid_data)
        assert len(errors) > 0

    def test_cn_validator_not_schema(self) -> None:
        """Test validation of not schema."""
        schema = {"not": {"type": "string"}}
        validator = CNValidator(schema)

        # Valid data
        valid_data = 123
        errors = validator.validate(valid_data)
        assert len(errors) == 0

        # Invalid data
        invalid_data = "hello"  # Is string, should be rejected
        errors = validator.validate(invalid_data)
        assert len(errors) > 0

    def test_cn_validator_contains_schema(self) -> None:
        """Test validation of contains schema."""
        schema = {"type": "array", "contains": {"type": "string"}}
        validator = CNValidator(schema)

        # Valid data
        valid_data = [123, "hello", 456]
        errors = validator.validate(valid_data)
        assert len(errors) == 0

        # Invalid data
        invalid_data = [123, 456, 789]  # No strings
        errors = validator.validate(invalid_data)
        assert len(errors) > 0
