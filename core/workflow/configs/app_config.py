import re
from typing import Any, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic_settings import BaseSettings

from workflow.consts.database import PGSQL_INVALID_KEY
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum


class FileCategory(BaseModel):
    """
    File category model.

    This model represents a file category with its name, extensions, and size.
    :param category: The name of the file category
    :param extensions: The extensions of the file category
    :param size: The size of the file category
    """

    category: str
    extensions: List[str]
    size: int

    @field_validator("size", mode="before")
    @classmethod
    def parse_size(cls, v: Any) -> int:
        """
        Parse the size of the file category.

        :param v: The size of the file category
        :return: The size of the file category
        :raises ValueError: If the size of the file category is invalid
        """
        if isinstance(v, str):
            if "*" in v:
                try:
                    parts = [int(x) for x in v.split("*")]
                    result = 1
                    for p in parts:
                        result *= p
                    return result
                except ValueError:
                    raise ValueError(f"Invalid size expression: {v}")
            if v.isdigit():
                return int(v)
        if isinstance(v, (int, float)):
            return int(v)
        raise ValueError(f"Cannot convert size: {v!r}")


class FileConfig(BaseSettings):
    """
    File configuration model.

    This model represents the file configuration with its categories.
    :param categories: The categories of the file configuration
    """

    model_config = {"env_prefix": "", "case_sensitive": False}
    categories: List[FileCategory] = Field(default_factory=list, alias="FILE_POLICY")

    def _get_category(self, category: str) -> Optional[FileCategory]:
        """
        Get the category by its name.

        :param category: The name of the category
        :return: The category
        """
        return next((c for c in self.categories if c.category == category), None)

    def _find_category_by_ext(self, extension: str) -> Optional[FileCategory]:
        """
        Find the category by its extension.

        :param extension: The extension of the category
        :return: The category
        """
        return next((c for c in self.categories if extension in c.extensions), None)

    def is_valid(
        self,
        extension: str,
        file_size: int,
        category: Optional[str] = None,
    ) -> None:
        """
        Validate if the file is valid.

        :param extension: The extension of the file
        :param file_size: The size of the file
        :param category: The category of the file
        :raises CustomException: If the file is not valid
        """
        if category is None:
            cat = self._find_category_by_ext(extension)
        else:
            cat = self._get_category(category)

        if cat is None:
            raise CustomException(
                err_code=CodeEnum.FILE_INVALID_ERROR,
                err_msg="Unsupported file category",
                cause_error="File type does not meet requirements",
            )

        if extension not in cat.extensions:
            raise CustomException(
                err_code=CodeEnum.FILE_INVALID_ERROR,
                err_msg="Error: Unsupported file extension",
                cause_error=f"File type does not meet requirements. User uploaded file type: {extension}, allowed file types: {cat.extensions}",
            )

        if file_size > cat.size:
            raise CustomException(
                err_code=CodeEnum.FILE_INVALID_ERROR,
                err_msg="Error: File size exceeds limit",
                cause_error=f"File size: {file_size}, exceeds {cat.size} bytes",
            )

        return

    def get_extensions_pattern(self) -> str:
        """
        Get the extensions pattern.

        :return: The extensions pattern
        """
        seen = set()
        exts: List[str] = []
        for cat in self.categories:
            for e in cat.extensions:
                e = e.lower()
                if e not in seen:
                    seen.add(e)
                    exts.append(e)

        escaped = [re.escape(e) for e in exts]
        pattern = r"\/([^\/]+)\.(" + "|".join(escaped) + ")"
        return pattern


class PgsqlConfig(BaseSettings):
    """
    PostgreSQL configuration model.

    This model represents the PostgreSQL configuration with its keyword list.
    """

    model_config = {"env_prefix": "", "case_sensitive": False}
    keyword_list: List[str] = Field(default=PGSQL_INVALID_KEY, alias="KEYWORD_LIST")

    def is_valid(self, key: str, field_type: str) -> None:
        """
        Validate if the key is valid.

        :param key: The key to validate
        :param field_type: The type of the field
        :raises CustomException: If the key is not valid
        """
        key_lower = key.lower()
        if key_lower in PGSQL_INVALID_KEY:
            raise CustomException(
                err_code=CodeEnum.PG_SQL_PARAM_ERROR,
                err_msg=f"Invalid {field_type}: {key} is a reserved keyword in PostgreSQL",
                cause_error=f"Invalid {field_type}: {key} is a reserved keyword in PostgreSQL",
            )


class CodeExecutorConfig(BaseSettings):
    """
    Code executor configuration model.
    """

    model_config = {"env_prefix": "", "case_sensitive": False}

    exec_type: str = Field(default="local", alias="CODE_EXEC_TYPE")
    url: str = Field(default="", alias="CODE_EXEC_URL")
    timeout: int = Field(default=10, alias="CODE_EXEC_TIMEOUT_SEC")
    api_key: str = Field(default="", alias="CODE_EXEC_API_KEY")
    api_secret: str = Field(default="", alias="CODE_EXEC_API_SECRET")

    @model_validator(mode="after")
    def validator_url(self) -> "CodeExecutorConfig":
        """
        Validate the URL.

        :return: The validated URL
        """
        if self.exec_type in ["ifly", "ifly-v2"]:
            if not self.url:
                raise ValueError("URL is required for ifly or ifly-v2")
            if bool(self.api_key) != bool(self.api_secret):
                raise ValueError(
                    "Both API key and secret must be provided for ifly authentication, or neither."
                )
        return self


class DatabaseConfig(BaseSettings):
    """
    Database connection configuration.

    Loads MySQL connection parameters from environment variables
    (MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB).
    """

    model_config = {"env_prefix": "", "case_sensitive": False}

    host: str = Field(default="", alias="MYSQL_HOST")
    port: str = Field(default="", alias="MYSQL_PORT")
    user: str = Field(default="", alias="MYSQL_USER")
    password: str = Field(default="", alias="MYSQL_PASSWORD")
    database: str = Field(default="", alias="MYSQL_DB")


class WorkflowConfig(BaseModel):
    """
    Workflow configuration model.
    """

    file_config: FileConfig = Field(default_factory=FileConfig)
    pgsql_config: PgsqlConfig = Field(default_factory=PgsqlConfig)
    code_executor_config: CodeExecutorConfig = Field(default_factory=CodeExecutorConfig)
    database_config: DatabaseConfig = Field(default_factory=DatabaseConfig)
