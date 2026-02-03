import re
from typing import Tuple

from pydantic import BaseModel

from workflow.configs import workflow_config
from workflow.engine.entities.node_entities import NodeType
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.trace.span import Span


class FileVarInfo:
    """
    Information about a file variable in the workflow.
    """

    file_var_name: str
    file_var_type: str
    allowed_file_type: str
    is_required: bool

    def __init__(
        self,
        file_var_name: str,
        file_var_type: str,
        allowed_file_type: str,
        is_required: bool,
    ):
        """
        Initialize file variable information.

        :param file_var_name: Name of the file variable
        :param file_var_type: Type of the file variable
        :param allowed_file_type: Allowed file type for this variable
        :param is_required: Whether this file variable is required
        """
        self.file_var_name = file_var_name
        self.file_var_type = file_var_type
        self.allowed_file_type = allowed_file_type
        self.is_required = is_required


class File(BaseModel):
    """
    File handling utilities for workflow file variables.
    """

    @classmethod
    async def has_file_in_dsl(
        cls, spark_dsl: dict, span: Span
    ) -> Tuple[list[FileVarInfo], bool]:
        """
        Check if the workflow DSL contains file type data in the start node inputs.
        Returns file variable information and a boolean indicating if files are present.

        :param spark_dsl: Workflow protocol/DSL
        :param span: Tracing span for logging
        :return: Tuple containing:
                - List of FileVarInfo objects with file variable details
                - Boolean indicating if the protocol contains file types
        """
        has_file = False
        file_infos = []
        try:
            nodes = spark_dsl.get("data", {}).get("nodes", {})
            for node in nodes:
                node_id = node.get("id")
                if node_id.split(":")[0] == NodeType.START.value:
                    node_outputs = node.get("data").get("outputs")
                    for output in node_outputs:
                        file_flag = output.get("fileType")
                        if file_flag is None:
                            continue
                        await span.add_info_event_async(f"fileType: {file_flag}")
                        if file_flag == "file":
                            has_file = True
                            var_name = output.get("name")
                            var_type = output.get("schema", {}).get("type", "")
                            allowed_file_type = output.get("allowedFileType")[0]
                            is_required = output.get("required", False)
                            file_infos.append(
                                FileVarInfo(
                                    var_name, var_type, allowed_file_type, is_required
                                )
                            )
                        else:
                            raise CustomException(
                                err_code=CodeEnum.FILE_VARIABLE_PROTOCOL_ERROR,
                                err_msg="Error: fileType field is incorrect",
                            )
        except CustomException as err:
            raise err
        except Exception as e:
            span.add_error_event(
                "Failed to get file variable information from protocol"
            )
            span.record_exception(e)
            raise e

        return file_infos, has_file

    def get_file_url(self, file_id: str) -> str:
        """
        Get file information from OSS based on file_id and return the file access URL.

        :param file_id: Unique identifier of the file in the database
        :return: File access URL
        """
        # TODO: Implement
        raise NotImplementedError

    @classmethod
    def get_file_size(cls, input_file_url: str) -> str:
        """
        Get the size of a file from its URL.

        :param input_file_url: URL of the file to check
        :return: File size in bytes as string
        """
        try:
            # Send HEAD request
            import requests  # type: ignore

            response = requests.head(input_file_url)
            # Get file metadata from response headers
            content_length = response.headers.get(
                "Content-Length"
            )  # File size in bytes
            if not content_length:
                raise CustomException(
                    err_code=CodeEnum.FILE_INVALID_TYPE_ERROR,
                    cause_error="File content is empty",
                )
            return content_length
        except CustomException as err:
            raise err
        except Exception as e:
            raise CustomException(
                err_code=CodeEnum.FILE_INVALID_TYPE_ERROR, cause_error=str(e)
            ) from e

    @classmethod
    async def check_file_var_isvalid(
        cls, input_file_url: str, allowed_file_type: str, span_context: Span
    ) -> None:
        """
        Validate if the uploaded file meets type and size requirements.

        :param input_file_url: File URL to validate
        :param allowed_file_type: Allowed file type for validation
        :param span_context: Tracing span for logging
        """
        try:
            await span_context.add_info_event_async(f"input file url: {input_file_url}")
            await span_context.add_info_event_async(
                f"allowed file type: {allowed_file_type}"
            )
            file_size = int(cls.get_file_size(input_file_url))
            pattern = workflow_config.file_config.get_extensions_pattern()

            file_extension = ""
            # Find file extension
            match = re.search(pattern, input_file_url)
            if match:
                file_extension = match.group(2).lower()
            else:
                span_context.add_error_event("Failed to match file type")
                raise CustomException(err_code=CodeEnum.FILE_INVALID_ERROR)
            workflow_config.file_config.is_valid(
                category=allowed_file_type,
                extension=file_extension,
                file_size=file_size,
            )

        except Exception as e:
            span_context.record_exception(e)
            raise e
