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

        if isinstance(error, ValidationError):
            errors = error.errors(
                include_input=False,
                include_url=False,
                include_context=False,
            )
        else:
            # FastAPI's RequestValidationError.errors() does not accept Pydantic's
            # redaction flags, so remove the same potentially sensitive fields.
            errors = [
                {
                    key: value
                    for key, value in item.items()
                    if key not in {"input", "url", "ctx"}
                }
                for item in error.errors()
            ]

        errors_list = [
            (
                f"Parameter: {'->'.join(map(str, error['loc']))}, "
                f"Error: {error['msg']} ({error['type']})"
            )
            for error in errors
        ]
        return "\n".join(errors_list)
