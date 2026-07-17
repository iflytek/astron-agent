# -*- coding: utf-8 -*-
"""
Chunk DTO test module.

This module contains comprehensive unit tests for all Pydantic data models
defined in chunk_dto.py, including validation tests for field constraints
and custom validators.
"""

import pytest
from pydantic import ValidationError

from knowledge.domain.entity.chunk_dto import (
    ChunkDeleteReq,
    ChunkQueryReq,
    ChunkSaveReq,
    ChunkUpdateReq,
    FileSplitReq,
    QueryDocReq,
    QueryMatch,
    RagflowQueryExt,
    RAGType,
)


class TestFileSplitReq:
    """Test FileSplitReq model."""

    def test_required_fields_valid(self) -> None:
        """Test valid creation with required fields only."""
        req = FileSplitReq(file="test content", ragType=RAGType.AIUI_RAG2)
        assert req.file == "test content"
        assert req.ragType == RAGType.AIUI_RAG2
        assert req.resourceType == 0  # default value
        assert req.titleSplit is False  # default value

    def test_all_fields_valid(self) -> None:
        """Test valid creation with all fields."""
        req = FileSplitReq(
            file="test file content",
            resourceType=1,
            ragType=RAGType.SparkDesk_RAG,
            lengthRange=[100, 500],
            overlap=50,
            separator=["\n", "\r\n"],
            cutOff=["EOF"],
            titleSplit=True,
        )
        assert req.file == "test file content"
        assert req.resourceType == 1
        assert req.ragType == RAGType.SparkDesk_RAG
        assert req.lengthRange == [100, 500]
        assert req.overlap == 50
        assert req.separator == ["\n", "\r\n"]
        assert req.cutOff == ["EOF"]
        assert req.titleSplit is True

    def test_file_empty_validation(self) -> None:
        """Test file field empty validation."""
        with pytest.raises(ValidationError) as exc_info:
            FileSplitReq(file="", ragType=RAGType.AIUI_RAG2)

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["type"] == "string_too_short"
        assert "file" in str(errors[0]["loc"])

    def test_missing_required_fields(self) -> None:
        """Test missing required fields validation."""
        with pytest.raises(ValidationError) as exc_info:
            FileSplitReq()  # type: ignore

        errors = exc_info.value.errors()
        assert len(errors) == 2
        field_names = [error["loc"][0] for error in errors]
        assert "file" in field_names
        assert "ragType" in field_names

    def test_document_id_default_none(self) -> None:
        """Test documentId defaults to None for first-time slicing."""
        req = FileSplitReq(file="test content", ragType=RAGType.RagFlow_RAG)
        assert req.documentId is None

    def test_document_id_accepts_string(self) -> None:
        """Test documentId accepts existing RAGFlow doc id for re-slice upsert."""
        req = FileSplitReq(
            file="test content",
            ragType=RAGType.RagFlow_RAG,
            documentId="doc-abc-123",
        )
        assert req.documentId == "doc-abc-123"

    def test_dataset_id_default_none(self) -> None:
        """FileSplitReq.datasetId is Optional, default None."""
        req = FileSplitReq(file="test content", ragType=RAGType.RagFlow_RAG)
        assert req.datasetId is None

    def test_dataset_id_accepts_string(self) -> None:
        """FileSplitReq.datasetId accepts an explicit RAGFlow dataset.id."""
        req = FileSplitReq(
            file="test content",
            ragType=RAGType.RagFlow_RAG,
            datasetId="ds-abc-uuid",
        )
        assert req.datasetId == "ds-abc-uuid"

    def test_group_default_none(self) -> None:
        """FileSplitReq.group is Optional, default None."""
        req = FileSplitReq(file="test content", ragType=RAGType.AIUI_RAG2)
        assert req.group is None

    def test_group_accepts_string(self) -> None:
        """FileSplitReq.group accepts a knowledge base group name."""
        req = FileSplitReq(
            file="test content",
            ragType=RAGType.AIUI_RAG2,
            group="legacy-name",
        )
        assert req.group == "legacy-name"


class TestChunkSaveReq:
    """Test ChunkSaveReq model."""

    def test_required_fields_valid(self) -> None:
        """Test valid creation with required fields."""
        req = ChunkSaveReq(
            docId="doc123",
            group="group1",
            chunks=[{"content": "test chunk"}],
            ragType=RAGType.AIUI_RAG2,
        )
        assert req.docId == "doc123"
        assert req.chunks == [{"content": "test chunk"}]
        assert req.ragType == RAGType.AIUI_RAG2
        assert req.uid is None  # default value
        assert req.datasetId is None  # default value

    def test_with_uid(self) -> None:
        """Test creation with optional uid field."""
        req = ChunkSaveReq(
            docId="doc123",
            group="group1",
            uid="user456",
            chunks=[{"content": "test chunk"}],
            ragType=RAGType.AIUI_RAG2,
        )
        assert req.uid == "user456"

    def test_with_dataset_id(self) -> None:
        """Test creation with explicit datasetId for direct routing."""
        req = ChunkSaveReq(
            docId="doc123",
            chunks=[{"content": "test chunk"}],
            ragType=RAGType.RagFlow_RAG,
            datasetId="ds-abc-123",
        )
        assert req.datasetId == "ds-abc-123"

    def test_group_required_for_non_ragflow(self) -> None:
        """ChunkSaveReq requires group for non-Ragflow strategies."""
        with pytest.raises(ValidationError) as exc_info:
            ChunkSaveReq(
                docId="doc123",
                chunks=[{"content": "test"}],
                ragType=RAGType.AIUI_RAG2,
            )

        assert "group is required when ragType is not Ragflow-RAG" in str(
            exc_info.value
        )

    def test_group_accepts_string(self) -> None:
        """ChunkSaveReq.group accepts a knowledge base group name."""
        req = ChunkSaveReq(
            docId="doc123",
            group="legacy-name",
            chunks=[{"content": "test"}],
            ragType=RAGType.AIUI_RAG2,
        )
        assert req.group == "legacy-name"

    def test_empty_chunks_validation(self) -> None:
        """Test chunks list empty validation."""
        with pytest.raises(ValidationError) as exc_info:
            ChunkSaveReq(docId="doc123", chunks=[], ragType=RAGType.AIUI_RAG2)

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["type"] == "too_short"
        assert "chunks" in str(errors[0]["loc"])

    def test_multiple_chunks(self) -> None:
        """Test with multiple chunks."""
        chunks = [
            {"content": "chunk 1"},
            {"content": "chunk 2"},
            {"content": "chunk 3"},
        ]
        req = ChunkSaveReq(
            docId="doc123",
            group="group1",
            chunks=chunks,
            ragType=RAGType.AIUI_RAG2,
        )
        assert req.chunks == chunks

    def test_empty_string_validation(self) -> None:
        """Test empty string validation for required fields."""
        with pytest.raises(ValidationError) as exc_info:
            ChunkSaveReq(
                docId="",
                chunks=[{"content": "test"}],
                ragType=RAGType.AIUI_RAG2,
            )

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["type"] == "string_too_short"
        assert "docId" in str(errors[0]["loc"])


class TestChunkUpdateReq:
    """Test ChunkUpdateReq model."""

    def test_valid_creation(self) -> None:
        """Test valid creation."""
        req = ChunkUpdateReq(
            docId="doc123",
            group="group1",
            chunks=[{"id": "chunk1", "content": "updated content"}],
            ragType=RAGType.AIUI_RAG2,
        )
        assert req.docId == "doc123"
        assert req.chunks == [{"id": "chunk1", "content": "updated content"}]
        assert req.ragType == RAGType.AIUI_RAG2
        assert req.datasetId is None

    def test_chunks_must_be_dict(self) -> None:
        """Test chunks must be dictionary objects."""
        req = ChunkUpdateReq(
            docId="doc123",
            group="group1",
            chunks=[{"id": "chunk1"}, {"id": "chunk2"}],
            ragType=RAGType.AIUI_RAG2,
        )
        assert len(req.chunks) == 2
        assert all(isinstance(chunk, dict) for chunk in req.chunks)

    def test_with_dataset_id(self) -> None:
        """Test creation with explicit datasetId for direct routing."""
        req = ChunkUpdateReq(
            docId="doc123",
            chunks=[{"id": "chunk1", "content": "x"}],
            ragType=RAGType.RagFlow_RAG,
            datasetId="ds-abc-123",
        )
        assert req.datasetId == "ds-abc-123"

    def test_group_required_for_non_ragflow(self) -> None:
        """ChunkUpdateReq requires group for non-Ragflow strategies."""
        with pytest.raises(ValidationError) as exc_info:
            ChunkUpdateReq(
                docId="doc123",
                chunks=[{"id": "c1"}],
                ragType=RAGType.AIUI_RAG2,
            )

        assert "group is required when ragType is not Ragflow-RAG" in str(
            exc_info.value
        )

    def test_group_accepts_string(self) -> None:
        """ChunkUpdateReq.group accepts a knowledge base group name."""
        req = ChunkUpdateReq(
            docId="doc123",
            group="legacy-name",
            chunks=[{"id": "c1"}],
            ragType=RAGType.AIUI_RAG2,
        )
        assert req.group == "legacy-name"


class TestChunkDeleteReq:
    """Test ChunkDeleteReq model."""

    def test_required_fields_only(self) -> None:
        """Test creation with required fields only."""
        req = ChunkDeleteReq(docId="doc123", ragType=RAGType.AIUI_RAG2)
        assert req.docId == "doc123"
        assert req.ragType == RAGType.AIUI_RAG2
        assert req.chunkIds is None

    def test_with_chunk_ids(self) -> None:
        """Test creation with chunk IDs."""
        req = ChunkDeleteReq(
            docId="doc123",
            chunkIds=["chunk1", "chunk2", "chunk3"],
            ragType=RAGType.AIUI_RAG2,
        )
        assert req.chunkIds == ["chunk1", "chunk2", "chunk3"]

    def test_empty_chunk_ids_list(self) -> None:
        """Test with empty chunk IDs list."""
        req = ChunkDeleteReq(docId="doc123", chunkIds=[], ragType=RAGType.AIUI_RAG2)
        assert req.chunkIds == []

    def test_dataset_id_default_none(self) -> None:
        """ChunkDeleteReq.datasetId is Optional, default None."""
        req = ChunkDeleteReq(docId="doc123", ragType=RAGType.RagFlow_RAG)
        assert req.datasetId is None

    def test_dataset_id_accepts_string(self) -> None:
        """ChunkDeleteReq.datasetId accepts an explicit RAGFlow dataset.id."""
        req = ChunkDeleteReq(
            docId="doc123",
            chunkIds=["c1"],
            ragType=RAGType.RagFlow_RAG,
            datasetId="ds-abc-123",
        )
        assert req.datasetId == "ds-abc-123"

    def test_group_default_none(self) -> None:
        """ChunkDeleteReq.group is Optional, default None."""
        req = ChunkDeleteReq(docId="doc123", ragType=RAGType.AIUI_RAG2)
        assert req.group is None

    def test_group_accepts_string(self) -> None:
        """ChunkDeleteReq.group accepts a knowledge base group name."""
        req = ChunkDeleteReq(
            docId="doc123",
            chunkIds=["c1"],
            ragType=RAGType.AIUI_RAG2,
            group="legacy-name",
        )
        assert req.group == "legacy-name"


class TestQueryMatch:
    """Test QueryMatch model."""

    def test_required_fields_only(self) -> None:
        """Test creation with required fields only."""
        match = QueryMatch(repoId=["repo1"])
        assert match.repoId == ["repo1"]
        assert match.threshold == 0  # default value
        assert match.docIds is None
        assert match.flowId is None

    def test_all_fields(self) -> None:
        """Test creation with all fields."""
        match = QueryMatch(
            docIds=["doc1", "doc2"],
            repoId=["repo1", "repo2"],
            threshold=0.8,
            flowId="flow123",
        )
        assert match.docIds == ["doc1", "doc2"]
        assert match.repoId == ["repo1", "repo2"]
        assert match.threshold == 0.8
        assert match.flowId == "flow123"

    def test_empty_repo_id_validation(self) -> None:
        """Test empty repoId list validation."""
        with pytest.raises(ValidationError) as exc_info:
            QueryMatch(repoId=[])

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["type"] == "too_short"
        assert "repoId" in str(errors[0]["loc"])

    def test_threshold_range_validation(self) -> None:
        """Test threshold range validation."""
        # Test valid threshold values
        match = QueryMatch(repoId=["repo1"], threshold=0.0)
        assert match.threshold == 0.0

        match = QueryMatch(repoId=["repo1"], threshold=1.0)
        assert match.threshold == 1.0

        match = QueryMatch(repoId=["repo1"], threshold=0.5)
        assert match.threshold == 0.5

        # Test invalid threshold values
        with pytest.raises(ValidationError) as exc_info:
            QueryMatch(repoId=["repo1"], threshold=-0.1)

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["type"] == "greater_than_equal"

        with pytest.raises(ValidationError) as exc_info:
            QueryMatch(repoId=["repo1"], threshold=1.1)

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["type"] == "less_than_equal"

    def test_none_doc_ids_validation(self) -> None:
        """Test None docIds does not trigger unique validation."""
        match = QueryMatch(docIds=None, repoId=["repo1"])
        assert match.docIds is None
        assert match.repoId == ["repo1"]


class TestChunkQueryReq:
    """Test ChunkQueryReq model."""

    def test_valid_creation(self) -> None:
        """Test valid creation."""
        match = QueryMatch(repoId=["repo1"])
        req = ChunkQueryReq(
            query="test query", topN=3, match=match, ragType=RAGType.AIUI_RAG2
        )
        assert req.query == "test query"
        assert req.topN == 3
        assert req.match == match
        assert req.ragType == RAGType.AIUI_RAG2

    def test_query_empty_validation(self) -> None:
        """Test query field empty validation."""
        match = QueryMatch(repoId=["repo1"])
        with pytest.raises(ValidationError) as exc_info:
            ChunkQueryReq(query="", topN=3, match=match, ragType=RAGType.AIUI_RAG2)

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["type"] == "string_too_short"
        assert "query" in str(errors[0]["loc"])

    def test_top_n_range_validation(self) -> None:
        """Test topN range validation."""
        match = QueryMatch(repoId=["repo1"])

        # Valid range values
        for valid_n in [1, 2, 3, 4, 5]:
            req = ChunkQueryReq(
                query="test", topN=valid_n, match=match, ragType=RAGType.AIUI_RAG2
            )
            assert req.topN == valid_n

        # Invalid range values
        for invalid_n in [0, 6, -1, 10]:
            with pytest.raises(ValidationError) as exc_info:
                ChunkQueryReq(
                    query="test", topN=invalid_n, match=match, ragType=RAGType.AIUI_RAG2
                )

            errors = exc_info.value.errors()
            assert len(errors) == 1
            assert "topN" in str(errors[0]["loc"])

    def test_nested_match_validation(self) -> None:
        """Test nested QueryMatch validation."""
        # Test that invalid match object raises validation error
        with pytest.raises(ValidationError) as exc_info:
            ChunkQueryReq(
                query="test query",
                topN=3,
                match=QueryMatch(repoId=[]),  # Invalid empty repoId
                ragType=RAGType.AIUI_RAG2,
            )

        errors = exc_info.value.errors()
        assert len(errors) == 1
        # Check that the error is about repoId being too short
        assert "repoId" in str(errors[0]["loc"])


class TestQueryDocReq:
    """Test QueryDocReq model."""

    def test_valid_creation(self) -> None:
        """Test valid creation."""
        req = QueryDocReq(docId="doc123", ragType=RAGType.AIUI_RAG2)
        assert req.docId == "doc123"
        assert req.ragType == RAGType.AIUI_RAG2

    def test_doc_id_empty_validation(self) -> None:
        """Test docId field empty validation."""
        with pytest.raises(ValidationError) as exc_info:
            QueryDocReq(docId="", ragType=RAGType.AIUI_RAG2)

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["type"] == "string_too_short"
        assert "docId" in str(errors[0]["loc"])

    def test_missing_required_fields(self) -> None:
        """Test missing required fields validation."""
        with pytest.raises(ValidationError) as exc_info:
            QueryDocReq()  # type: ignore

        errors = exc_info.value.errors()
        assert len(errors) == 2
        field_names = [error["loc"][0] for error in errors]
        assert "docId" in field_names
        assert "ragType" in field_names

    def test_dataset_id_default_none(self) -> None:
        """QueryDocReq.datasetId is Optional, default None."""
        req = QueryDocReq(docId="doc123", ragType=RAGType.RagFlow_RAG)
        assert req.datasetId is None

    def test_dataset_id_accepts_string(self) -> None:
        """QueryDocReq.datasetId accepts an explicit RAGFlow dataset.id."""
        req = QueryDocReq(
            docId="doc123", ragType=RAGType.RagFlow_RAG, datasetId="ds-abc-123"
        )
        assert req.datasetId == "ds-abc-123"

    def test_group_default_none(self) -> None:
        """QueryDocReq.group is Optional, default None."""
        req = QueryDocReq(docId="doc123", ragType=RAGType.AIUI_RAG2)
        assert req.group is None

    def test_group_accepts_string(self) -> None:
        """QueryDocReq.group accepts a knowledge base group name."""
        req = QueryDocReq(
            docId="doc123", ragType=RAGType.AIUI_RAG2, group="legacy-name"
        )
        assert req.group == "legacy-name"


class TestIntegrationCases:
    """Test integration scenarios with multiple models."""

    def test_chunk_query_with_complex_match(self) -> None:
        """Test ChunkQueryReq with complex QueryMatch."""
        match = QueryMatch(
            docIds=["doc1", "doc2", "doc3"],
            repoId=["repo1", "repo2"],
            threshold=0.75,
            flowId="complex-flow",
        )
        req = ChunkQueryReq(
            query="complex integration test query",
            topN=5,
            match=match,
            ragType=RAGType.SparkDesk_RAG,
        )

        assert req.query == "complex integration test query"
        assert req.topN == 5
        assert req.match.docIds == ["doc1", "doc2", "doc3"]
        assert req.match.repoId == ["repo1", "repo2"]
        assert req.match.threshold == 0.75
        assert req.match.flowId == "complex-flow"
        assert req.ragType == RAGType.SparkDesk_RAG

    def test_model_serialization(self) -> None:
        """Test model serialization to dict."""
        req = FileSplitReq(
            file="test content", ragType=RAGType.AIUI_RAG2, lengthRange=[100, 500]
        )

        data = req.model_dump()
        assert isinstance(data, dict)
        assert data["file"] == "test content"
        assert data["ragType"] == "AIUI-RAG2"
        assert data["lengthRange"] == [100, 500]
        assert data["resourceType"] == 0
        assert data["titleSplit"] is False

    def test_model_validation_error_details(self) -> None:
        """Test detailed validation error information."""
        # First test: single model validation
        try:
            QueryMatch(repoId=[])  # Invalid empty repoId
        except ValidationError as e:
            errors = e.errors()
            assert len(errors) == 1
            assert "repoId" in str(errors[0]["loc"])

        # Second test: multiple validation errors
        try:
            # Create valid match first, then test ChunkQueryReq
            valid_match = QueryMatch(repoId=["repo1"])
            ChunkQueryReq(
                query="",  # Invalid empty query
                topN=0,  # Invalid topN range
                match=valid_match,
                ragType=RAGType.AIUI_RAG2,
            )
        except ValidationError as e:
            errors = e.errors()
            # Should have 2 validation errors (query and topN)
            assert len(errors) == 2

            # Check error types and locations
            error_locations = [str(error["loc"]) for error in errors]
            has_query_error = any("query" in loc for loc in error_locations)
            has_topn_error = any("topN" in loc for loc in error_locations)

            # Should have both query and topN errors
            assert has_query_error
            assert has_topn_error


class TestRagflowQueryExt:
    """Test RagflowQueryExt DTO field constraints."""

    def test_all_fields_optional_empty_instance_is_valid(self) -> None:
        ext = RagflowQueryExt()
        assert ext.top_k is None
        assert ext.vector_similarity_weight is None
        assert ext.keyword is None
        assert ext.rerank_id is None
        assert ext.highlight is None
        assert ext.use_kg is None

    def test_top_k_accepts_boundary_values(self) -> None:
        RagflowQueryExt(top_k=1)
        RagflowQueryExt(top_k=200)

    def test_top_k_rejects_zero(self) -> None:
        with pytest.raises(ValidationError):
            RagflowQueryExt(top_k=0)

    def test_top_k_rejects_above_200(self) -> None:
        with pytest.raises(ValidationError):
            RagflowQueryExt(top_k=201)

    def test_vsw_accepts_boundary_values(self) -> None:
        RagflowQueryExt(vector_similarity_weight=0)
        RagflowQueryExt(vector_similarity_weight=1)

    def test_vsw_rejects_negative(self) -> None:
        with pytest.raises(ValidationError):
            RagflowQueryExt(vector_similarity_weight=-0.1)

    def test_vsw_rejects_above_1(self) -> None:
        with pytest.raises(ValidationError):
            RagflowQueryExt(vector_similarity_weight=1.1)

    def test_rerank_id_rejects_empty_string(self) -> None:
        with pytest.raises(ValidationError):
            RagflowQueryExt(rerank_id="")

    def test_rerank_id_accepts_non_empty(self) -> None:
        ext = RagflowQueryExt(rerank_id="bge-reranker-v2-m3")
        assert ext.rerank_id == "bge-reranker-v2-m3"

    def test_bool_fields_accept_true_and_false(self) -> None:
        ext = RagflowQueryExt(keyword=True, highlight=False, use_kg=True)
        assert ext.keyword is True
        assert ext.highlight is False
        assert ext.use_kg is True


class TestChunkQueryReqDefaults:
    """Test new default fields on ChunkQueryReq."""

    def _base_kwargs(self) -> dict:
        return {
            "query": "test",
            "topN": 3,
            "match": QueryMatch(repoId=["repo_1"]),
            "ragType": RAGType.RagFlow_RAG,
        }

    def test_rewrite_defaults_to_true(self) -> None:
        req = ChunkQueryReq(**self._base_kwargs())
        assert req.rewrite is True

    def test_rewrite_can_be_set_false(self) -> None:
        req = ChunkQueryReq(**self._base_kwargs(), rewrite=False)
        assert req.rewrite is False

    def test_ragflow_ext_defaults_to_none(self) -> None:
        req = ChunkQueryReq(**self._base_kwargs())
        assert req.ragflow_ext is None

    def test_ragflow_ext_accepts_partial_object(self) -> None:
        req = ChunkQueryReq(
            **self._base_kwargs(),
            ragflow_ext=RagflowQueryExt(top_k=50),
        )
        assert req.ragflow_ext is not None
        assert req.ragflow_ext.top_k == 50
        assert req.ragflow_ext.highlight is None


class TestChunkQueryReqScopeValidator:
    """Test cross-field validator: ragflow_ext requires ragType=Ragflow-RAG."""

    def _kwargs_for(self, rag_type: RAGType) -> dict:
        return {
            "query": "test",
            "topN": 3,
            "match": QueryMatch(repoId=["repo_1"]),
            "ragType": rag_type,
        }

    def test_ragflow_ext_allowed_with_ragflow_rag(self) -> None:
        req = ChunkQueryReq(
            **self._kwargs_for(RAGType.RagFlow_RAG),
            ragflow_ext=RagflowQueryExt(top_k=50),
        )
        assert req.ragflow_ext is not None
        assert req.ragflow_ext.top_k == 50

    def test_ragflow_ext_rejected_with_aiui(self) -> None:
        with pytest.raises(ValidationError) as exc_info:
            ChunkQueryReq(
                **self._kwargs_for(RAGType.AIUI_RAG2),
                ragflow_ext=RagflowQueryExt(top_k=50),
            )
        assert "ragflow_ext is only allowed when ragType='Ragflow-RAG'" in str(
            exc_info.value
        )

    def test_ragflow_ext_rejected_with_cbg(self) -> None:
        with pytest.raises(ValidationError):
            ChunkQueryReq(
                **self._kwargs_for(RAGType.CBG_RAG),
                ragflow_ext=RagflowQueryExt(top_k=50),
            )

    def test_ragflow_ext_rejected_with_sparkdesk(self) -> None:
        with pytest.raises(ValidationError):
            ChunkQueryReq(
                **self._kwargs_for(RAGType.SparkDesk_RAG),
                ragflow_ext=RagflowQueryExt(top_k=50),
            )

    def test_none_ragflow_ext_allowed_with_any_ragtype(self) -> None:
        for rag_type in (
            RAGType.AIUI_RAG2,
            RAGType.CBG_RAG,
            RAGType.SparkDesk_RAG,
            RAGType.RagFlow_RAG,
        ):
            req = ChunkQueryReq(**self._kwargs_for(rag_type))
            assert req.ragflow_ext is None


class TestMatchDatasetId:
    """Tests for QueryMatch.datasetId (by-id routing field)."""

    def test_dataset_id_default_none(self) -> None:
        from knowledge.domain.entity.chunk_dto import ChunkQueryReq

        req = ChunkQueryReq(
            query="q",
            topN=3,
            match={"repoId": ["r1"], "threshold": 0.5},
            ragType="Ragflow-RAG",
        )
        assert req.match.datasetId is None

    def test_dataset_id_accepts_list(self) -> None:
        from knowledge.domain.entity.chunk_dto import ChunkQueryReq

        req = ChunkQueryReq(
            query="q",
            topN=3,
            match={
                "repoId": ["r1"],
                "datasetId": ["ds-1", "ds-2"],
                "threshold": 0.5,
            },
            ragType="Ragflow-RAG",
        )
        assert req.match.datasetId == ["ds-1", "ds-2"]
