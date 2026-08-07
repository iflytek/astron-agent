"""
Tests for audit system components
"""

from typing import Any, List
from unittest.mock import Mock

import pytest

from common.audit_system.audit_api.base import (
    AuditAPI,
    ContentType,
    ContextList,
    ResourceList,
    Stage,
)
from common.audit_system.base import (
    AuditContext,
    BaseFrameAudit,
    FrameAuditResult,
    InputFrameAudit,
    OutputFrameAudit,
)
from common.audit_system.enums import Status


class TestStatus:
    """Test Status enum"""

    def test_status_values(self) -> None:
        """Test Status enum values"""
        assert Status.NONE == "none"
        assert Status.STOP == "stop"

    def test_status_inheritance(self) -> None:
        """Test Status inherits from str and Enum"""
        assert isinstance(Status.NONE, str)
        assert isinstance(Status.NONE, Status)

    def test_status_comparison(self) -> None:
        """Test Status comparison with strings"""
        assert Status.NONE == "none"
        assert Status.STOP == "stop"
        assert Status.NONE != "stop"


class TestContentType:
    """Test ContentType enum"""

    def test_content_type_values(self) -> None:
        """Test ContentType enum values"""
        assert ContentType.TEXT == "text"
        assert ContentType.IMAGE == "image"
        assert ContentType.VIDEO == "video"
        assert ContentType.AUDIO == "audio"

    def test_content_type_inheritance(self) -> None:
        """Test ContentType inherits from str and Enum"""
        assert isinstance(ContentType.TEXT, str)
        assert isinstance(ContentType.TEXT, ContentType)


class TestStage:
    """Test Stage enum"""

    def test_stage_values(self) -> None:
        """Test Stage enum values"""
        assert Stage.REASONING == "reasoning"
        assert Stage.ANSWER == "answer"

    def test_stage_inheritance(self) -> None:
        """Test Stage inherits from str and Enum"""
        assert isinstance(Stage.REASONING, str)
        assert isinstance(Stage.REASONING, Stage)


class TestResourceList:
    """Test ResourceList model"""

    def test_resource_list_creation(self) -> None:
        """Test ResourceList model creation"""
        resource = ResourceList(
            data_id="test_id",
            content_type=ContentType.TEXT,
            res_desc="Test description",
            ocr_text="Test OCR text",
        )

        assert resource.data_id == "test_id"
        assert resource.content_type == ContentType.TEXT
        assert resource.res_desc == "Test description"
        assert resource.ocr_text == "Test OCR text"

    def test_resource_list_validation(self) -> None:
        """Test ResourceList model validation"""
        # Valid data should work
        resource = ResourceList(
            data_id="test_id",
            content_type=ContentType.IMAGE,
            res_desc="Test description",
            ocr_text="Test OCR text",
        )
        assert resource is not None

    def test_resource_list_serialization(self) -> None:
        """Test ResourceList model serialization"""
        resource = ResourceList(
            data_id="test_id",
            content_type=ContentType.TEXT,
            res_desc="Test description",
            ocr_text="Test OCR text",
        )

        data = resource.model_dump()
        assert data["data_id"] == "test_id"
        assert data["content_type"] == "text"
        assert data["res_desc"] == "Test description"
        assert data["ocr_text"] == "Test OCR text"


class TestContextList:
    """Test ContextList model"""

    def test_context_list_creation(self) -> None:
        """Test ContextList model creation"""
        context = ContextList(role="user", content="Test content")

        assert context.role == "user"
        assert context.content == "Test content"
        assert context.resource_list == []

    def test_context_list_with_resources(self) -> None:
        """Test ContextList with resource list"""
        resource = ResourceList(
            data_id="test_id",
            content_type=ContentType.TEXT,
            res_desc="Test description",
            ocr_text="Test OCR text",
        )

        context = ContextList(
            role="user", content="Test content", resource_list=[resource]
        )

        assert context.role == "user"
        assert context.content == "Test content"
        assert len(context.resource_list) == 1
        assert context.resource_list[0] == resource

    def test_context_list_validation(self) -> None:
        """Test ContextList model validation"""
        # Valid data should work
        context = ContextList(role="assistant", content="Test response")
        assert context is not None

    def test_context_list_serialization(self) -> None:
        """Test ContextList model serialization"""
        context = ContextList(role="user", content="Test content")

        data = context.model_dump()
        assert data["role"] == "user"
        assert data["content"] == "Test content"
        assert data["resource_list"] == []


class TestBaseFrameAudit:
    """Test BaseFrameAudit model"""

    def test_init_basic(self) -> None:
        """Test basic initialization"""
        audit = BaseFrameAudit(content="test content")

        assert audit.content == "test content"
        assert audit.status == Status.STOP

    def test_init_with_status(self) -> None:
        """Test initialization with custom status"""
        audit = BaseFrameAudit(content="test content", status=Status.NONE)

        assert audit.content == "test content"
        assert audit.status == Status.NONE

    def test_validation(self) -> None:
        """Test model validation"""
        # Valid data should work
        audit = BaseFrameAudit(content="test content")
        assert audit is not None

    def test_serialization(self) -> None:
        """Test model serialization"""
        audit = BaseFrameAudit(content="test content", status=Status.NONE)

        data = audit.model_dump()
        assert data["content"] == "test content"
        assert data["status"] == "none"


class TestInputFrameAudit:
    """Test InputFrameAudit model"""

    def test_init_basic(self) -> None:
        """Test basic initialization"""
        audit = InputFrameAudit(content="test input")

        assert audit.content == "test input"
        assert audit.status == Status.STOP
        assert audit.content_type == ContentType.TEXT
        assert audit.context_list == []

    def test_init_with_all_fields(self) -> None:
        """Test initialization with all fields"""
        context = ContextList(content="context", role="user")
        audit = InputFrameAudit(
            content="test input",
            status=Status.NONE,
            content_type=ContentType.TEXT,
            context_list=[context],
        )

        assert audit.content == "test input"
        assert audit.status == Status.NONE
        assert audit.content_type == ContentType.TEXT
        assert len(audit.context_list) == 1
        assert audit.context_list[0] == context

    def test_inheritance(self) -> None:
        """Test InputFrameAudit inherits from BaseFrameAudit"""
        audit = InputFrameAudit(content="test input")
        assert isinstance(audit, BaseFrameAudit)
        assert isinstance(audit, InputFrameAudit)


class TestOutputFrameAudit:
    """Test OutputFrameAudit model"""

    def test_init_basic(self) -> None:
        """Test basic initialization"""
        source_frame = Mock()
        audit = OutputFrameAudit(
            content="test output", stage=Stage.ANSWER, source_frame=source_frame
        )

        assert audit.content == "test output"
        assert audit.status == Status.STOP
        assert audit.frame_id == ""
        assert audit.stage == Stage.ANSWER
        assert audit.source_frame == source_frame
        assert audit.not_need_submit is False
        assert audit.none_need_audit is False

    def test_init_with_all_fields(self) -> None:
        """Test initialization with all fields"""
        source_frame = Mock()
        audit = OutputFrameAudit(
            content="test output",
            status=Status.NONE,
            frame_id="frame123",
            stage=Stage.ANSWER,
            source_frame=source_frame,
            not_need_submit=True,
            none_need_audit=True,
        )

        assert audit.content == "test output"
        assert audit.status == Status.NONE
        assert audit.frame_id == "frame123"
        assert audit.stage == Stage.ANSWER
        assert audit.source_frame == source_frame
        assert audit.not_need_submit is True
        assert audit.none_need_audit is True

    def test_inheritance(self) -> None:
        """Test OutputFrameAudit inherits from BaseFrameAudit"""
        source_frame = Mock()
        audit = OutputFrameAudit(
            content="test output", stage=Stage.ANSWER, source_frame=source_frame
        )
        assert isinstance(audit, BaseFrameAudit)
        assert isinstance(audit, OutputFrameAudit)


class TestFrameAuditResult:
    """Test FrameAuditResult model"""

    def test_init_basic(self) -> None:
        """Test basic initialization"""
        result = FrameAuditResult(content="test content")

        assert result.content == "test content"
        assert result.status == Status.STOP
        assert result.source_frame is None
        assert result.error is None

    def test_init_with_all_fields(self) -> None:
        """Test initialization with all fields"""
        from common.exceptions.errs import BaseExc

        source_frame = Mock()
        error = BaseExc(1001, "test error")
        result = FrameAuditResult(
            content="test content",
            status=Status.NONE,
            source_frame=source_frame,
            error=error,
        )

        assert result.content == "test content"
        assert result.status == Status.NONE
        assert result.source_frame == source_frame
        assert result.error == error

    def test_validation(self) -> None:
        """Test model validation"""
        # Valid data should work
        result = FrameAuditResult(content="test content")
        assert result is not None

    def test_serialization(self) -> None:
        """Test model serialization"""
        result = FrameAuditResult(content="test content", status=Status.NONE)

        data = result.model_dump()
        assert data["content"] == "test content"
        assert data["status"] == "none"

    def test_inheritance(self) -> None:
        """Test FrameAuditResult inherits from BaseFrameAudit"""
        result = FrameAuditResult(content="test content")
        assert isinstance(result, BaseFrameAudit)
        assert isinstance(result, FrameAuditResult)


class TestAuditContext:
    """Test AuditContext model"""

    def test_init_basic(self) -> None:
        """Test basic initialization"""
        context = AuditContext(chat_sid="test_sid")

        assert context.chat_sid == "test_sid"
        assert context.template_id == ""
        assert context.chat_app_id == ""
        assert context.uid == ""
        assert context.error is None
        assert context.pindex == 1
        assert context.first_sentence_audited is False
        assert context.frame_blocked is False
        assert context.remaining_content == ""
        assert context.all_content_frame_ids == []
        assert context.all_source_frames == {}
        assert context.audited_content == ""
        assert context.audited_content_frame_ids == []
        assert context.frame_ids_on_screen == []
        assert context.last_content_stage is None

    def test_init_with_all_fields(self) -> None:
        """Test initialization with all fields"""
        context = AuditContext(
            chat_sid="test_sid",
            template_id="template123",
            chat_app_id="app123",
            uid="user123",
        )

        assert context.chat_sid == "test_sid"
        assert context.template_id == "template123"
        assert context.chat_app_id == "app123"
        assert context.uid == "user123"

    def test_add_source_content(self) -> None:
        """Test add_source_content method"""
        context = AuditContext(chat_sid="test_sid")

        # Create a mock output frame
        output_frame = Mock()
        output_frame.frame_id = "frame123"
        output_frame.content = "test content"

        # Add source content
        context.add_source_content(output_frame)

        assert "frame123" in context.all_content_frame_ids
        assert "frame123" in context.audited_content_frame_ids
        assert "frame123" in context.all_source_frames
        assert context.all_source_frames["frame123"] == output_frame

    def test_add_source_content_duplicate(self) -> None:
        """Test add_source_content with duplicate frame_id"""
        context = AuditContext(chat_sid="test_sid")

        # Create a mock output frame
        output_frame = Mock()
        output_frame.frame_id = "frame123"
        output_frame.content = "test content"

        # Add source content twice
        context.add_source_content(output_frame)
        context.add_source_content(output_frame)

        # Should only be added once
        assert context.all_content_frame_ids.count("frame123") == 1
        assert context.audited_content_frame_ids.count("frame123") == 1

    def test_validation(self) -> None:
        """Test model validation"""
        # Valid data should work
        context = AuditContext(chat_sid="test_sid")
        assert context is not None

    def test_serialization(self) -> None:
        """Test model serialization"""
        context = AuditContext(chat_sid="test_sid")

        data = context.model_dump()
        assert data["chat_sid"] == "test_sid"
        assert data["template_id"] == ""
        assert data["pindex"] == 1


class TestAuditAPI:
    """Test AuditAPI abstract class"""

    def test_audit_api_attributes(self) -> None:
        """Test AuditAPI has required attributes"""

        # Create a concrete implementation for testing
        class TestAuditAPI(AuditAPI):
            async def input_text(
                self,
                content: str,
                chat_sid: str,
                span: Any,
                chat_app_id: str = "",
                uid: str = "",
                template_id: str = "",
                context_list: List[ContextList] = [],
                **kwargs: Any,
            ) -> None:
                pass

            async def output_text(
                self,
                stage: Stage,
                content: str,
                pindex: int,
                span: Any,
                is_pending: int = 0,
                is_stage_end: int = 0,
                is_end: int = 0,
                chat_sid: str = "",
                chat_app_id: str = "",
                uid: str = "",
                **kwargs: Any,
            ) -> None:
                pass

            async def input_media(self, text: str, **kwargs: Any) -> None:
                pass

            async def output_media(self, text: str, **kwargs: Any) -> None:
                pass

            async def know_ref(self, text: str, **kwargs: Any) -> None:
                pass

        api = TestAuditAPI()
        assert hasattr(api, "audit_name")
        assert api.audit_name == "BaseAuditAPI"

    def test_audit_api_abstract_methods(self) -> None:
        """Test AuditAPI abstract methods"""
        # Should not be able to instantiate abstract class
        with pytest.raises(TypeError):
            AuditAPI()

    def test_audit_api_implementation(self) -> None:
        """Test AuditAPI implementation"""

        class TestAuditAPI(AuditAPI):
            async def input_text(
                self,
                content: str,
                chat_sid: str,
                span: Any,
                chat_app_id: str = "",
                uid: str = "",
                template_id: str = "",
                context_list: List[ContextList] = [],
                **kwargs: Any,
            ) -> None:
                pass

            async def output_text(
                self,
                stage: Stage,
                content: str,
                pindex: int,
                span: Any,
                is_pending: int = 0,
                is_stage_end: int = 0,
                is_end: int = 0,
                chat_sid: str = "",
                chat_app_id: str = "",
                uid: str = "",
                **kwargs: Any,
            ) -> None:
                pass

            async def input_media(self, text: str, **kwargs: Any) -> None:
                pass

            async def output_media(self, text: str, **kwargs: Any) -> None:
                pass

            async def know_ref(self, text: str, **kwargs: Any) -> None:
                pass

        api = TestAuditAPI()
        assert isinstance(api, AuditAPI)


class TestAuditSystemIntegration:
    """Test audit system integration scenarios"""

    def test_complete_audit_workflow(self) -> None:
        """Test complete audit workflow"""
        # Create input frame
        input_frame = InputFrameAudit(
            content="user input text", content_type=ContentType.TEXT, context_list=[]
        )

        # Create output frame
        source_frame = Mock()
        output_frame = OutputFrameAudit(
            content="ai response text",
            stage=Stage.ANSWER,
            source_frame=source_frame,
            frame_id="frame123",
        )

        # Create audit context
        context = AuditContext(chat_sid="test_sid")
        context.add_source_content(output_frame)

        # Create audit results
        input_result = FrameAuditResult(content="user input text", status=Status.STOP)

        output_result = FrameAuditResult(
            content="ai response text", status=Status.STOP, source_frame=source_frame
        )

        # Verify the workflow
        assert input_frame.content == "user input text"
        assert output_frame.content == "ai response text"
        assert input_result.content == input_frame.content
        assert output_result.content == output_frame.content
        assert "frame123" in context.all_content_frame_ids

    def test_audit_with_multiple_frames(self) -> None:
        """Test audit with multiple frames"""
        # Create multiple input frames
        input_frames = [
            InputFrameAudit(content="input 1"),
            InputFrameAudit(content="input 2"),
        ]

        # Create multiple output frames
        output_frames = [
            OutputFrameAudit(
                content="output 1", stage=Stage.ANSWER, source_frame=Mock()
            ),
            OutputFrameAudit(
                content="output 2", stage=Stage.REASONING, source_frame=Mock()
            ),
        ]

        # Create audit context and add frames
        context = AuditContext(chat_sid="test_sid")
        for frame in output_frames:
            frame.frame_id = f"frame_{frame.content}"
            context.add_source_content(frame)

        assert len(input_frames) == 2
        assert len(output_frames) == 2
        assert len(context.all_content_frame_ids) == 2

    def test_audit_status_workflow(self) -> None:
        """Test audit status workflow"""
        # Test different status values
        statuses = [Status.NONE, Status.STOP]

        for status in statuses:
            audit = BaseFrameAudit(content="test", status=status)
            assert audit.status == status

            result = FrameAuditResult(content="test", status=status)
            assert result.status == status

    @pytest.mark.asyncio
    async def test_audit_api_async_methods(self) -> None:
        """Test AuditAPI async methods"""

        class TestAuditAPI(AuditAPI):
            async def input_text(
                self,
                content: str,
                chat_sid: str,
                span: Any,
                chat_app_id: str = "",
                uid: str = "",
                template_id: str = "",
                context_list: List[ContextList] = [],
                **kwargs: Any,
            ) -> None:
                self.last_input = content

            async def output_text(
                self,
                stage: Stage,
                content: str,
                pindex: int,
                span: Any,
                is_pending: int = 0,
                is_stage_end: int = 0,
                is_end: int = 0,
                chat_sid: str = "",
                chat_app_id: str = "",
                uid: str = "",
                **kwargs: Any,
            ) -> None:
                self.last_output = content

            async def input_media(self, text: str, **kwargs: Any) -> None:
                pass

            async def output_media(self, text: str, **kwargs: Any) -> None:
                pass

            async def know_ref(self, text: str, **kwargs: Any) -> None:
                pass

        api = TestAuditAPI()

        # Test input_text method
        context_list = [ContextList(role="user", content="test context")]
        await api.input_text(
            "test input", "test_sid", Mock(), context_list=context_list
        )
        assert hasattr(api, "last_input")
        assert api.last_input == "test input"

        # Test output_text method
        await api.output_text(Stage.ANSWER, "test output", 1, Mock())
        assert hasattr(api, "last_output")
        assert api.last_output == "test output"
