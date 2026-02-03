from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError


class ValidationParse:
    """
    Validation utility class.
    """

    @staticmethod
    def validation_error(error: ValidationError | RequestValidationError) -> str:
        """
        Parse validation error into a human-readable string.
        :param error: Validation error object
        :return: Human-readable string
        """

        errors_list = [
            (
                f"Parameter: {'->'.join(map(str, error['loc']))}, "
                f"Input: {error.get('input')}, "
                f"Error: {error['msg']} ({error['type']})"
            )
            for error in error.errors()
        ]
        return "\n".join(errors_list)
