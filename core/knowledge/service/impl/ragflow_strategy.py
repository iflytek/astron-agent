#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RAGFlow Strategy Implementation Module

Provides document processing and knowledge management strategy based on RAGFlow
"""

import json
import logging
import time
from typing import Any, Dict, List, Optional

from knowledge.consts.error_code import CodeEnum
from knowledge.domain.entity.chunk_dto import RagflowQueryExt
from knowledge.exceptions.exception import CustomException, ThirdPartyException
from knowledge.infra.ragflow import ragflow_client
from knowledge.infra.ragflow.ragflow_utils import RagflowUtils
from knowledge.service.rag_strategy import RAGStrategy
from knowledge.utils.verification import check_not_empty

logger = logging.getLogger(__name__)

_DATASET_ID_KWARG = "datasetId"


class RagflowRAGStrategy(RAGStrategy):
    """RAGFlow RAG strategy implementation."""

    def __init__(self) -> None:
        """
        Initialize RAGFlow strategy
        """

    async def query(
        self,
        query: str,
        doc_ids: Optional[List[str]] = None,
        repo_ids: Optional[List[str]] = None,
        top_k: Optional[int] = None,
        threshold: Optional[float] = 0,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Query RAGFlow using datasetId when provided."""
        try:
            logger.info(
                "Starting RAGFlow query: query=%s, doc_ids=%s, repo_ids=%s",
                query,
                doc_ids,
                repo_ids,
            )
            ext: Optional[RagflowQueryExt] = kwargs.get("ragflow_ext")

            dataset_ids_input = kwargs.get(_DATASET_ID_KWARG)
            dataset_ids = await self._resolve_query_datasets(dataset_ids_input)
            if not dataset_ids:
                return self._empty_query_result(query)

            effective_top_k = (
                ext.top_k if ext and ext.top_k is not None else (top_k or 6)
            )
            payload = self._build_retrieval_payload(
                query=query,
                dataset_ids=dataset_ids,
                doc_ids=doc_ids,
                top_k=effective_top_k,
                threshold=threshold or 0,
                ext=ext,
            )
            return await self._execute_retrieval(
                payload=payload,
                query=query,
                threshold=threshold or 0,
                effective_top_k=effective_top_k,
            )

        except CustomException:
            raise
        except ThirdPartyException:
            raise
        except Exception as e:
            logger.error("RAGFlow query exception: %s", e)
            raise ThirdPartyException(
                msg=f"RAGFlow retrieval failed: {e}",
                e=CodeEnum.RAGFLOW_RAGError,
            ) from e

    async def _resolve_query_datasets(
        self, dataset_ids: Optional[List[str]]
    ) -> List[str]:
        """Return requested dataset ids or the default dataset id."""
        if not dataset_ids:
            default_name = RagflowUtils.get_default_dataset_name()
            ds_id = await RagflowUtils.ensure_dataset(default_name)
            return [ds_id] if ds_id else []
        return list(dataset_ids)

    async def _resolve_dataset_id(
        self,
        dataset_id_input: Optional[str],
        group: Optional[str] = None,
    ) -> Optional[str]:
        """Return requested dataset id or the default dataset id."""
        if dataset_id_input:
            return dataset_id_input
        default_name = group or RagflowUtils.get_default_dataset_name()
        return await RagflowUtils.ensure_dataset(default_name)

    def _build_retrieval_payload(
        self,
        query: str,
        dataset_ids: List[str],
        doc_ids: Optional[List[str]],
        top_k: int,
        threshold: float,
        ext: Optional[RagflowQueryExt],
    ) -> Dict[str, Any]:
        """Build the RAGFlow ``/retrieval`` request body."""
        payload: Dict[str, Any] = {
            "question": query,
            "dataset_ids": dataset_ids,
            "top_k": top_k,
            "similarity_threshold": threshold,
            "vector_similarity_weight": 0.2,
        }
        if doc_ids:
            payload["document_ids"] = doc_ids
        if ext is not None:
            self._apply_ragflow_ext(payload, ext)
        return payload

    def _apply_ragflow_ext(self, payload: Dict[str, Any], ext: RagflowQueryExt) -> None:
        """Apply optional ``RagflowQueryExt`` fields onto the payload."""
        # NB: top_k is intentionally not applied here. query() resolves
        # effective_top_k upstream and writes it into the payload first.
        if ext.vector_similarity_weight is not None:
            payload["vector_similarity_weight"] = ext.vector_similarity_weight
        if ext.keyword is not None:
            payload["keyword"] = ext.keyword
        if ext.rerank_id is not None:
            payload["rerank_id"] = ext.rerank_id
        if ext.use_kg is not None:
            payload["use_kg"] = ext.use_kg
        if ext.highlight is not None:
            # RAGFlow v0.20.5 compares ``highlight`` as a string; passing a
            # Python bool leaves it enabled. v0.24.0 accepts bool directly —
            # drop ``str()`` once the pinned image is >= v0.24.0.
            payload["highlight"] = str(ext.highlight)

    async def _execute_retrieval(
        self,
        payload: Dict[str, Any],
        query: str,
        threshold: float,
        effective_top_k: int,
    ) -> Dict[str, Any]:
        """Call RAGFlow ``/retrieval`` and convert response."""
        # ``ragflow_client.retrieval_with_dataset`` ignores ``dataset_id``
        # (the underlying RAGFlow body uses ``request_data['dataset_ids']``
        # for the actual filter). The first id is passed only to satisfy the
        # current client signature; remove this arg once the client drops it.
        primary_dataset_id = payload["dataset_ids"][0]
        ragflow_response = await ragflow_client.retrieval_with_dataset(
            dataset_id=primary_dataset_id, request_data=payload
        )

        if ragflow_response.get("code") != 0:
            msg = ragflow_response.get("message", "Unknown error")
            logger.error("RAGFlow query failed: %s", ragflow_response)
            raise ThirdPartyException(
                msg=f"RAGFlow retrieval failed: {msg}",
                e=CodeEnum.RAGFLOW_RAGError,
            )

        results = RagflowUtils.convert_ragflow_query_response(
            ragflow_response, threshold
        )
        if effective_top_k and effective_top_k > 0:
            results = results[:effective_top_k]

        logger.info("Query completed, returning %d results", len(results))
        return {"query": query, "count": len(results), "results": results}

    def _empty_query_result(self, query: str) -> Dict[str, Any]:
        """Unified empty-result format for query paths."""
        return {"query": query, "count": 0, "results": []}

    def _validate_split_parameters(
        self, fileUrl: Optional[str], file: Optional[Any]
    ) -> None:
        """Validate split method parameters."""
        if not fileUrl and not file:
            raise ValueError("Either fileUrl or file must be provided")
        if fileUrl and file:
            raise ValueError("Cannot provide both fileUrl and file parameters")

    def _parse_form_data_parameters(
        self,
        lengthRange: Optional[List[int]],
        separator: Optional[List[str]],
        cutOff: Optional[List[str]],
    ) -> tuple[Optional[List[int]], Optional[List[str]], Optional[List[str]]]:
        """Parse form-data parameters from JSON strings."""
        parsed_length_range = lengthRange
        parsed_separator = separator
        parsed_cut_off = cutOff

        if isinstance(lengthRange, str):
            try:
                parsed_length_range = json.loads(lengthRange) if lengthRange else None
            except (json.JSONDecodeError, TypeError):
                parsed_length_range = None

        if isinstance(separator, str):
            try:
                parsed_separator = json.loads(separator) if separator else None
            except (json.JSONDecodeError, TypeError):
                parsed_separator = None

        if isinstance(cutOff, str):
            try:
                parsed_cut_off = json.loads(cutOff) if cutOff else None
            except (json.JSONDecodeError, TypeError):
                parsed_cut_off = None

        return parsed_length_range, parsed_separator, parsed_cut_off

    async def _process_document_upload(self, file_input: Any, dataset_id: str) -> str:
        """Process document upload and return document ID."""
        file_content, filename = await RagflowUtils.process_file(file_input)
        logger.info(
            "File processing completed: %s, size: %d bytes",
            filename,
            len(file_content),
        )

        upload_response = await ragflow_client.upload_document_to_dataset(
            dataset_id=dataset_id, file_content=file_content, filename=filename
        )

        if upload_response and len(upload_response) > 0:
            doc_object = upload_response[0]
            doc_id = doc_object.id
            logger.info("Document uploaded successfully, ID: %s", doc_id)
            return doc_id
        else:
            raise ValueError("File upload failed: no document returned")

    async def _handle_document_parsing(self, dataset_id: str, doc_id: str) -> None:
        """Handle document parsing and wait for completion."""
        logger.info("Triggering document parsing...")
        parse_response = await ragflow_client.parse_documents(dataset_id, [doc_id])

        if parse_response.get("code") == 0:
            logger.info("Document parsing triggered successfully")
            try:
                final_status = await RagflowUtils.wait_for_parsing(
                    dataset_id, doc_id, max_wait_time=300
                )
                logger.info(
                    "Document parsing completed, final status: %s", final_status
                )
            except Exception as parse_error:
                logger.warning("Parsing wait timeout or error: %s", parse_error)
                final_status = "TIMEOUT"

            if final_status != "DONE":
                raise ValueError(
                    "File parsing timeout or error, please check in RAGFlow"
                )
        else:
            logger.warning("File parsing failed: %s", parse_response)
            raise ValueError("File parsing failed, please check in RAGFlow")

    async def split(
        self,
        fileUrl: Optional[str] = None,
        lengthRange: Optional[List[int]] = None,
        overlap: int = 16,
        resourceType: int = 0,
        separator: Optional[List[str]] = None,
        titleSplit: bool = False,
        cutOff: Optional[List[str]] = None,
        document_id: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Dict[str, Any]]:
        """
        Split file into chunks using RAGFlow.

        Complete process:
        1. Resolve target dataset by id
        2. File download/reading and type detection
        3. Upload document to RAGFlow
        4. Trigger parsing
        5. Wait for parsing completion
        6. Get chunk results and convert format

        Args:
            fileUrl: File path or URL
            lengthRange: Chunk length range [min_length, max_length]
            overlap: Overlap length
            resourceType: Resource type
            separator: List of separators
            titleSplit: Whether to split by title
            cutOff: Truncation rules
            **kwargs: Other parameters, including datasetId (RAGFlow dataset.id), file

        Returns:
            List of chunk results in format:
            [
                {
                    "docId": str,
                    "dataIndex": str,
                    "title": str,
                    "content": str,
                    "context": str,
                    "references": dict
                }
            ]
        """
        file = kwargs.get("file")

        # Parameter validation
        self._validate_split_parameters(fileUrl, file)

        # Parse form-data parameters
        lengthRange, separator, cutOff = self._parse_form_data_parameters(
            lengthRange, separator, cutOff
        )

        # Determine which input method is being used
        file_input = file if file else fileUrl
        input_type = "file upload" if file else "URL/path"
        display_name = getattr(file, "filename", fileUrl) if file else fileUrl
        logger.info(
            "Starting split request: %s (%s)",
            display_name,
            input_type,
        )

        try:
            # Step 1: Resolve dataset
            dataset_id = await self._resolve_dataset_id(
                kwargs.get(_DATASET_ID_KWARG), kwargs.get("group")
            )
            if not dataset_id:
                raise CustomException(
                    CodeEnum.RAGFLOW_RAGError,
                    "Unable to resolve RAGFlow dataset",
                )
            logger.info("Using dataset: %s", dataset_id)

            if document_id:
                logger.info("re-slice upsert old_doc_id=%s", document_id)
                doc_id, chunks_data = await self._upsert_document(
                    file_input, dataset_id, document_id
                )
            else:
                doc_id = await self._process_document_upload(file_input, dataset_id)
                await self._handle_document_parsing(dataset_id, doc_id)
                chunks_data = await RagflowUtils.get_document_chunks(dataset_id, doc_id)

            # Step 7: Convert to standard format
            result = RagflowUtils.convert_to_standard_format(doc_id, chunks_data)

            logger.info("Split processing completed, returning %d chunks", len(result))
            return result

        except CustomException:
            raise
        except Exception as e:
            logger.error("Split operation failed: %s", e)
            raise ValueError(f"File chunking processing failed: {str(e)}") from e

    def _create_error_chunk(
        self, error_id: str, dataset_id: str, doc_id: str, content: str
    ) -> Dict[str, Any]:
        """Create error format chunk"""
        return {
            "id": error_id,
            "datasetId": dataset_id,
            "fileId": doc_id,
            "createTime": time.strftime("%Y-%m-%d %H:%M:%S"),
            "updateTime": time.strftime("%Y-%m-%d %H:%M:%S"),
            "chunkType": "RAW",
            "content": content,
            "question": None,
            "answer": None,
            "dataIndex": error_id,
            "imgReference": None,
            "copiedFrom": None,
        }

    async def _validate_chunks_save_config(
        self,
        doc_id: str,
        dataset_id: Optional[str] = None,
    ) -> str:
        """Resolve dataset for chunks_save."""
        resolved = await self._resolve_dataset_id(dataset_id)
        if not resolved:
            logger.error("Unable to resolve RAGFlow dataset for chunks_save")
            raise CustomException(
                CodeEnum.ChunkSaveFailed,
                "Unable to resolve RAGFlow dataset",
            )
        return resolved

    async def _validate_document_exists(self, dataset_id: str, doc_id: str) -> None:
        """Validate that the document exists in RAGFlow.

        Delegates to ``ragflow_client.get_document_info`` which uses RAGFlow's
        server-side ``id`` filter for an O(1) exact lookup (verified against
        v0.20.5 ~ v0.24.0). Raises ``CustomException(ChunkSaveFailed)`` on
        not-found or on any underlying error.

        ``get_document_info`` returns ``None`` only for the server's
        ``DATA_ERROR`` (code=102) "not owned / not found" path, raises
        ``ThirdPartyException`` for other non-zero codes, and lets transport
        errors propagate. The generic ``except Exception`` branch below wraps
        all raised errors into ``CustomException(ChunkSaveFailed)`` so the
        chunk-save caller sees a consistent error code.
        """
        try:
            doc = await ragflow_client.get_document_info(dataset_id, doc_id)
            if doc is None:
                logger.error(f"Document {doc_id} not found in RAGFlow")
                raise CustomException(
                    CodeEnum.ChunkSaveFailed,
                    f"Document {doc_id} not found",
                )
            logger.info(f"Document {doc_id} exists in RAGFlow")
        except CustomException:
            # Preserve the code/message from the None branch.
            raise
        except Exception as e:
            logger.error(f"Error checking document existence: {e}")
            raise CustomException(
                CodeEnum.ChunkSaveFailed,
                f"Error occurred while checking document existence: {str(e)}",
            )

    async def _get_existing_chunks(
        self, dataset_id: str, doc_id: str
    ) -> Dict[str, Dict]:
        """Get mapping of existing chunks for a document.

        Uses ``ragflow_client.fetch_all_document_chunks`` to paginate through
        all chunks via the server-reported ``total`` field, so documents with
        large chunk counts are fully covered.

        **Fail-closed**: errors propagate rather than being swallowed into an
        empty dict — a partial or empty mapping would cause
        ``_process_single_chunk`` to treat existing chunks as missing and
        re-insert them, corrupting the dataset with duplicates. The caller
        ``chunks_save`` converts any ``Exception`` to
        ``CustomException(ChunkSaveFailed)``, so transient RAGFlow failures
        during reconciliation abort the upsert cleanly.
        """
        existing_chunks: Dict[str, Dict] = {}
        try:
            all_chunks = await ragflow_client.fetch_all_document_chunks(
                dataset_id, doc_id
            )
        except Exception:
            # Log doc/dataset context before re-raising — the upstream
            # chunks_save catch-all only sees the exception message, so
            # without this line the doc_id is lost in production triage.
            logger.error(
                f"fetch_all_document_chunks failed for doc={doc_id} "
                f"in dataset={dataset_id}"
            )
            raise

        for chunk in all_chunks:
            data_index = str(chunk.get("dataIndex", ""))
            chunk_id = chunk.get("id") or chunk.get("chunk_id")

            if chunk_id:
                existing_chunks[str(chunk_id)] = chunk
                if data_index:
                    existing_chunks[data_index] = chunk

        logger.info(
            f"Document {doc_id} already has {len(all_chunks)} chunks, "
            f"established {len(existing_chunks)} mappings"
        )
        return existing_chunks

    async def _process_single_chunk(
        self,
        i: int,
        chunk: Dict,
        dataset_id: str,
        doc_id: str,
        existing_chunks: Dict,
        current_time: str,
    ) -> Dict[str, Any]:
        """Process saving of single chunk"""
        try:
            content = chunk.get("content", "")
            if not content:
                logger.warning(f"Chunk {i} content is empty, skipping")
                raise CustomException(
                    CodeEnum.ParameterInvalid, f"Chunk {i} content cannot be empty"
                )

            data_index = str(chunk.get("dataIndex", i))

            # Check if chunk already exists
            if data_index in existing_chunks:
                existing_chunk = existing_chunks[data_index]
                logger.info(
                    f"Chunk dataIndex={data_index} already exists, returning directly: {existing_chunk.get('id')}"
                )

                return {
                    "id": existing_chunk.get("id"),
                    "datasetId": dataset_id,
                    "fileId": doc_id,
                    "createTime": existing_chunk.get("create_time", current_time),
                    "updateTime": existing_chunk.get("update_time", current_time),
                    "chunkType": "RAW",
                    "content": existing_chunk.get(
                        "content_with_weight",
                        existing_chunk.get("content_ltks", content),
                    ),
                    "question": None,
                    "answer": None,
                    "dataIndex": existing_chunk.get("id"),
                    "imgReference": None,
                    "copiedFrom": None,
                }

            # Save new chunk
            important_keywords = []
            if chunk.get("title"):
                important_keywords.append(chunk["title"])

            logger.info(
                f"Saving new chunk {i}: dataIndex={data_index}, content length={len(content)}"
            )

            add_response = await ragflow_client.add_chunk(
                dataset_id=dataset_id,
                document_id=doc_id,
                content=content,
                important_keywords=important_keywords if important_keywords else None,
            )

            logger.info(f"Chunk {i} save response: {add_response}")
            return self._handle_chunk_save_response(
                add_response, chunk, i, dataset_id, doc_id, current_time, content
            )

        except CustomException:
            raise  # Re-raise custom exceptions
        except Exception as e:
            logger.error(f"Chunk {i} save exception: {e}")
            raise CustomException(
                CodeEnum.ChunkSaveFailed,
                f"Exception occurred while saving chunk {i}: {str(e)}",
            )

    def _handle_chunk_save_response(
        self,
        add_response: Dict,
        chunk: Dict,
        i: int,
        dataset_id: str,
        doc_id: str,
        current_time: str,
        content: str,
    ) -> Dict[str, Any]:
        """Handle chunk save response"""
        if add_response.get("code") == 0:
            chunk_data = add_response.get("data", {}).get("chunk", {})
            chunk_id = chunk_data.get("id", f"generated_{int(time.time())}_{i}")

            # Use actual content returned by RAGFlow, fallback to original content if not available
            actual_content = chunk_data.get("content", content)

            saved_chunk = {
                "id": chunk_id,
                "datasetId": dataset_id,
                "fileId": doc_id,
                "createTime": chunk_data.get("create_time", current_time),
                "updateTime": chunk_data.get("create_time", current_time),
                "chunkType": "RAW",
                "content": actual_content,  # Use RAGFlow's actual saved content
                "question": None,
                "answer": None,
                "dataIndex": chunk_id,
                "imgReference": None,
                "copiedFrom": None,
            }

            logger.info(f"Successfully saved new chunk {i}: {saved_chunk['id']}")
            return saved_chunk
        else:
            error_msg = add_response.get("message", "Save failed")
            logger.error(f"Chunk {i} save failed: {error_msg}")
            raise CustomException(
                CodeEnum.ChunkSaveFailed, f"Failed to save chunk {i}: {error_msg}"
            )

    async def _process_chunks_batch(
        self,
        chunks: List[Dict[str, Any]],
        dataset_id: str,
        docId: str,
        existing_chunks: Dict[str, Any],
        current_time: str,
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Process chunks in batch and return results"""
        saved_chunks = []
        failed_chunks = []

        for i, chunk in enumerate(chunks):
            try:
                result = await self._process_single_chunk(
                    i, chunk, dataset_id, docId, existing_chunks, current_time
                )
                if result:  # Successfully processed
                    saved_chunks.append(result)
            except CustomException as e:
                failed_chunks.append(
                    {
                        "index": i,
                        "error": str(e),
                        "chunk": chunk.get("dataIndex", f"chunk_{i}"),
                    }
                )
                logger.error(f"Failed to process chunk {i}: {e}")

        return saved_chunks, failed_chunks

    async def _handle_chunk_results(
        self,
        saved_chunks: List[Dict[str, Any]],
        failed_chunks: List[Dict[str, Any]],
        chunks: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Handle chunk processing results and errors"""
        if not saved_chunks and failed_chunks:
            # All chunks failed
            error_details = "; ".join(
                [f"Chunk {fc['index']}: {fc['error']}" for fc in failed_chunks]
            )
            raise CustomException(
                CodeEnum.ChunkSaveFailed, f"All chunks save failed: {error_details}"
            )
        elif failed_chunks:
            # Some chunks failed
            error_details = "; ".join(
                [f"Chunk {fc['index']}: {fc['error']}" for fc in failed_chunks]
            )
            logger.warning(f"Some chunks save failed: {error_details}")
            # Continue and return successful chunks

        logger.info(
            f"Chunk save completed: total={len(chunks)}, saved={len(saved_chunks)}, failed={len(failed_chunks)}"
        )
        return saved_chunks

    async def chunks_save(
        self,
        docId: str,
        group: Optional[str],
        uid: str,
        chunks: List[object],
        **kwargs: Any,
    ) -> List[Dict[str, Any]]:
        """
        Save knowledge chunks using RAGFlow.

        Args:
            docId: Document ID
            group: Required by the abstract base for cross-strategy
                compatibility; unused here. Ragflow routes by datasetId.
            uid: User ID
            chunks: List of knowledge chunks, each chunk contains:
                   - docId: Document ID
                   - dataIndex: Chunk index
                   - title: Title
                   - content: Text content
                   - context: Context
                   - references: Reference information
            **kwargs: Other parameters, including datasetId (RAGFlow dataset.id)

        Returns:
            List of save results in format:
            [
                {
                    "id": "chunk_id",
                    "datasetId": "dataset_id",
                    "fileId": "doc_id",
                    "createTime": "2025-09-15 14:41:19",
                    "updateTime": "2025-09-15 14:41:19",
                    "chunkType": "RAW",
                    "content": "chunk content",
                    "dataIndex": 0.0,
                    "imgReference": {}
                }
            ]
        """
        if not check_not_empty(chunks):
            logger.error("Chunks list is empty or invalid")
            raise CustomException(
                CodeEnum.MissingParameter, "chunks parameter cannot be empty"
            )

        logger.info(
            f"Starting chunk save request: docId={docId}, chunks_count={len(chunks)}"
        )

        try:
            dataset_id = await self._validate_chunks_save_config(
                docId, dataset_id=kwargs.get(_DATASET_ID_KWARG)
            )
            logger.info(f"Using dataset: {dataset_id}")

            await self._validate_document_exists(dataset_id, docId)

            existing_chunks = await self._get_existing_chunks(dataset_id, docId)

            current_time = time.strftime("%Y-%m-%d %H:%M:%S")
            chunks_typed = [
                chunk if isinstance(chunk, dict) else chunk.__dict__ for chunk in chunks
            ]
            saved_chunks, failed_chunks = await self._process_chunks_batch(
                chunks_typed, dataset_id, docId, existing_chunks, current_time
            )

            # 5. Handle results and return
            return await self._handle_chunk_results(
                saved_chunks, failed_chunks, chunks_typed
            )

        except CustomException:
            raise  # Re-raise custom exceptions to be handled by API layer
        except Exception as e:
            logger.error(f"Chunk save operation failed: {e}")
            raise CustomException(CodeEnum.ChunkSaveFailed, str(e))

    async def _validate_chunks_update_config(
        self, dataset_id: Optional[str] = None
    ) -> str:
        """Resolve dataset for chunks_update."""
        resolved = await self._resolve_dataset_id(dataset_id)
        if not resolved:
            err = "Unable to resolve RAGFlow dataset for chunks_update"
            logger.error(err)
            raise CustomException(CodeEnum.ChunkUpdateFailed, err)
        return resolved

    async def _process_chunk_update(
        self,
        chunk: Dict,
        dataset_id: str,
        doc_id: str,
        failed_chunks: Dict,
        successful_count: int,
    ) -> int:
        """Process update of single chunk"""
        chunk_id = (
            chunk.get("chunkId")
            or chunk.get("dataIndex")
            or chunk.get("chunk_id")
            or chunk.get("id")
        )

        if not chunk_id:
            # Collect error information, use "chunkId" uniformly as key
            if "chunkId" not in failed_chunks:
                failed_chunks["chunkId"] = "missing chunk identifier"
            else:
                failed_chunks["chunkId"] += "; missing chunk identifier"
            return successful_count

        try:
            update_params = self._build_update_params(chunk)

            if not update_params:
                error_msg = f"no fields to update for chunk {chunk_id}"
                if "chunkId" not in failed_chunks:
                    failed_chunks["chunkId"] = error_msg
                else:
                    failed_chunks["chunkId"] += f"; {error_msg}"
                return successful_count

            logger.info(f"Updating chunk ID={chunk_id}: {list(update_params.keys())}")

            update_response = await ragflow_client.update_chunk(
                dataset_id=dataset_id,
                document_id=doc_id,
                chunk_id=str(chunk_id),
                **update_params,
            )

            logger.info(f"Chunk ID={chunk_id} update response: {update_response}")

            if update_response.get("code") == 0:
                successful_count += 1
                logger.info(f"Successfully updated chunk: ID={chunk_id}")
            else:
                error_msg = update_response.get("message", "Update failed")
                full_error = f"Chunk {chunk_id} update failed: {error_msg}"
                if "chunkId" not in failed_chunks:
                    failed_chunks["chunkId"] = full_error
                else:
                    failed_chunks["chunkId"] += f"; {full_error}"
                logger.warning(f"Chunk ID={chunk_id} update failed: {error_msg}")

        except Exception as e:
            error_msg = f"Chunk {chunk_id} update exception: {str(e)}"
            if "chunkId" not in failed_chunks:
                failed_chunks["chunkId"] = error_msg
            else:
                failed_chunks["chunkId"] += f"; {error_msg}"
            logger.error(f"Chunk ID={chunk_id} update exception: {e}")

        return successful_count

    def _build_update_params(self, chunk: Dict) -> Dict[str, Any]:
        """Build update parameters"""
        update_params = {}

        # Only update content if it's provided and not empty (RAGFlow has issues with empty content)
        if "content" in chunk and chunk["content"]:
            update_params["content"] = chunk["content"]

        # Only set important_keywords if title exists
        if "title" in chunk and chunk["title"]:
            update_params["important_keywords"] = [chunk["title"]]

        update_params["available"] = chunk.get("available", True)

        return update_params

    async def chunks_update(
        self,
        docId: str,
        group: Optional[str],
        uid: str,
        chunks: List[Dict[str, Any]],
        **kwargs: Any,
    ) -> Optional[Dict[str, Any]]:
        """
        Update knowledge chunks using RAGFlow.

        Args:
            docId: Document ID
            group: Required by the abstract base for cross-strategy
                compatibility; unused here. Ragflow routes by datasetId.
            uid: User ID
            chunks: List of knowledge chunks, each chunk contains:
                   - docId: Document ID
                   - dataIndex: chunk ID (used as chunkId)
                   - title: Title
                   - content: Text content
                   - context: Context
                   - references: Reference information
                   - docInfo: Document information
            **kwargs: Other parameters, including datasetId (RAGFlow dataset.id)

        Returns:
            Update result data:
            - None if all successful
            - {"failedChunk": {"chunkId": "error info"}} if some failed
        """
        if not check_not_empty(chunks):
            logger.warning("Chunks list is empty, no update needed")
            raise CustomException(
                CodeEnum.MissingParameter, "chunks parameter cannot be empty"
            )

        logger.info(
            f"Processing chunk update request: docId={docId}, chunks_count={len(chunks)}"
        )

        try:
            dataset_id = await self._validate_chunks_update_config(
                kwargs.get(_DATASET_ID_KWARG)
            )
            logger.info(f"Using dataset: {dataset_id}")

            failed_chunks: Dict[str, str] = {}
            successful_count = 0

            for chunk in chunks:
                successful_count = await self._process_chunk_update(
                    chunk, dataset_id, docId, failed_chunks, successful_count
                )

            # 3. Return data part only (API layer will wrap the final response)
            if not failed_chunks:
                # All successful - return None
                logger.info(f"All {successful_count} chunks updated successfully")
                return None
            else:
                # Some failed - return failed chunk info
                logger.warning(
                    f"Update completed: {successful_count} successful, {len(failed_chunks)} failed"
                )
                return {"failedChunk": failed_chunks}

        except CustomException:
            raise  # Re-raise custom exceptions
        except Exception as e:
            logger.error(f"Chunk update operation failed: {e}")
            raise CustomException(CodeEnum.ChunkUpdateFailed, str(e))

    async def chunks_delete(
        self,
        docId: str,
        chunkIds: List[str],
        **kwargs: Any,
    ) -> None:
        """
        Delete knowledge chunks using RAGFlow.

        Args:
            docId: Document ID
            chunkIds: List of chunk IDs to delete
            **kwargs: Additional parameters, including datasetId (RAGFlow
                dataset.id). When omitted/empty, uses the default dataset.

        Returns:
            None if successful

        Raises:
            CustomException: If deletion fails
        """
        # Parameter validation
        if not check_not_empty(chunkIds):
            logger.error("chunkIds parameter cannot be empty")
            raise CustomException(
                CodeEnum.MissingParameter, "chunkIds parameter cannot be empty"
            )

        logger.info(
            f"Processing chunk deletion request: docId={docId}, "
            f"chunks_count={len(chunkIds)}"
        )

        try:
            dataset_id = await self._resolve_dataset_id(kwargs.get(_DATASET_ID_KWARG))
            if not dataset_id:
                logger.info(
                    "Unable to resolve RAGFlow dataset, "
                    "treating delete as no-op (idempotent)"
                )
                return None

            logger.info(f"Using dataset: {dataset_id}")

            # 2. Call RAGFlow deletion API directly
            delete_response = await ragflow_client.delete_chunks(
                dataset_id=dataset_id, document_id=docId, chunk_ids=chunkIds
            )

            logger.info(f"RAGFlow chunk deletion response: {delete_response}")

            # 3. Process response
            if delete_response.get("code") == 0:
                logger.info(f"Successfully deleted {len(chunkIds)} chunks")
                return None  # Success, let API layer handle the response
            else:
                # RAGFlow deletion failed
                error_msg = delete_response.get("message", "Deletion failed")
                logger.error(f"RAGFlow deletion failed: {error_msg}")
                raise CustomException(
                    CodeEnum.ChunkDeleteFailed, f"Deletion failed: {error_msg}"
                )

        except CustomException:
            raise  # Re-raise custom exceptions
        except Exception as e:
            logger.error(f"Chunk deletion operation failed: {e}")
            raise CustomException(
                CodeEnum.ChunkDeleteFailed, f"Deletion operation failed: {str(e)}"
            )

    async def query_doc(self, docId: str, **kwargs: Any) -> List[Dict[str, Any]]:
        """Query all chunk information for a document using RAGFlow."""
        try:
            logger.info(f"Starting document chunk query: docId={docId}")

            dataset_id = await self._resolve_dataset_id(kwargs.get(_DATASET_ID_KWARG))
            if not dataset_id:
                logger.warning(
                    "Unable to resolve RAGFlow dataset for query_doc; returning empty"
                )
                return []

            # Step 1: Get total count
            first_response = await ragflow_client.list_document_chunks(
                dataset_id, docId, page=1, page_size=1
            )

            if first_response.get("code") != 0:
                msg = first_response.get("message", "Unknown error")
                logger.warning(f"Failed to get chunks: {msg}")
                raise ThirdPartyException(
                    msg=f"RAGFlow query_doc doc={docId}: {msg}",
                    e=CodeEnum.RAGFLOW_RAGError,
                )

            total_count = first_response.get("data", {}).get("total", 0)
            if total_count == 0:
                logger.warning("Document has no chunks")
                return []

            logger.info(f"Document has {total_count} total chunks")

            # Step 2: Get all data
            chunks_response = await ragflow_client.list_document_chunks(
                dataset_id, docId, page=1, page_size=total_count
            )

            if chunks_response.get("code") != 0:
                msg = chunks_response.get("message", "Unknown error")
                logger.warning(f"Failed to get all chunks: {msg}")
                raise ThirdPartyException(
                    msg=f"RAGFlow query_doc doc={docId}: {msg}",
                    e=CodeEnum.RAGFLOW_RAGError,
                )

            logger.info(
                f"Successfully retrieved {len(chunks_response.get('data', {}).get('chunks', []))} chunks"
            )

            # Convert to ChunkInfo object list
            chunk_infos = []
            data = chunks_response.get("data", {})
            page_chunks = data.get("chunks", [])

            for i, chunk_data in enumerate(page_chunks):
                content = chunk_data.get("content", "")
                chunk_doc_id = chunk_data.get("document_id", docId)
                chunk_id = chunk_data.get("id", str(i))

                chunk_info = {
                    "docId": chunk_doc_id,
                    "chunkId": chunk_id,
                    "content": content,
                }
                chunk_infos.append(chunk_info)

            logger.info(f"Successfully converted {len(chunk_infos)} ChunkInfo objects")
            return chunk_infos

        except CustomException:
            raise
        except ThirdPartyException:
            raise
        except Exception as e:
            logger.error(f"Failed to query document chunk information: {e}")
            raise ThirdPartyException(
                msg=f"RAGFlow query_doc failed for doc={docId}: {e}",
                e=CodeEnum.RAGFLOW_RAGError,
            ) from e

    async def query_doc_name(
        self, docId: str, **kwargs: Any
    ) -> Optional[Dict[str, Any]]:
        """Query document name and information using RAGFlow."""
        try:
            logger.info(f"Starting document info query: docId={docId}")

            dataset_id = await self._resolve_dataset_id(kwargs.get(_DATASET_ID_KWARG))
            if not dataset_id:
                logger.warning(
                    "Unable to resolve RAGFlow dataset for query_doc_name; returning None"
                )
                return None

            # Get document information
            doc_info = await ragflow_client.get_document_info(dataset_id, docId)
            if not doc_info:
                logger.warning(f"Document {docId} does not exist")
                return None

            # Convert to FileInfo object
            ragflow_status = doc_info.get("run", "")
            file_status = str(ragflow_status) if ragflow_status is not None else ""

            # Prefer chunk_count (chunk count), fallback to token_count (token count) if not available
            file_quantity = doc_info.get("chunk_count", doc_info.get("token_count", 0))

            file_info = {
                "docId": docId,
                "fileName": doc_info.get("name", ""),
                "fileStatus": file_status,
                "fileQuantity": file_quantity,
            }

            logger.info(
                f"Document info query successful: fileName={file_info['fileName']}"
            )
            return file_info

        except CustomException:
            raise
        except ThirdPartyException:
            raise
        except Exception as e:
            logger.error(f"Failed to query document information: {e}")
            raise ThirdPartyException(
                msg=f"RAGFlow query_doc_name failed for doc={docId}: {e}",
                e=CodeEnum.RAGFLOW_RAGError,
            ) from e

    async def _upsert_document(
        self,
        file_input: Any,
        dataset_id: str,
        old_doc_id: str,
    ) -> tuple[str, List[Dict[str, Any]]]:
        """Atomic upsert: upload + parse + fetch chunks + delete old.

        Any failure at any step rolls back the pending new doc and preserves
        old_doc_id. Chunks fetch is intentionally inside the transaction:
        RagflowUtils.get_document_chunks silently returns [] on fetch
        failure, so deleting the old doc before verifying non-empty chunks
        would strand the file as un-retrievable.

        Returns (new_doc_id, chunks_data) with chunks_data non-empty.
        """
        pending_doc_id = await self._process_document_upload(file_input, dataset_id)
        logger.info(
            "upsert pending_doc_id=%s, old_doc_id=%s", pending_doc_id, old_doc_id
        )

        try:
            await self._handle_document_parsing(dataset_id, pending_doc_id)
        except Exception:
            logger.exception("upsert parse failed, rolling back %s", pending_doc_id)
            await self._safe_delete_document(dataset_id, pending_doc_id, log_only=True)
            raise

        try:
            chunks_data = await RagflowUtils.get_document_chunks(
                dataset_id, pending_doc_id
            )
        except Exception:
            logger.exception("upsert fetch failed, rolling back %s", pending_doc_id)
            await self._safe_delete_document(dataset_id, pending_doc_id, log_only=True)
            raise

        if not chunks_data:
            logger.error(
                "upsert new doc %s returned zero chunks, rolling back",
                pending_doc_id,
            )
            await self._safe_delete_document(dataset_id, pending_doc_id, log_only=True)
            raise CustomException(
                CodeEnum.ChunkQueryFailed,
                f"Upsert produced zero chunks for pending doc {pending_doc_id}",
            )

        await self._safe_delete_document(dataset_id, old_doc_id)
        return pending_doc_id, chunks_data

    async def _safe_delete_document(
        self,
        dataset_id: str,
        doc_id: str,
        log_only: bool = False,
    ) -> None:
        """Delete a RAGFlow document. With log_only=True, swallow errors so
        a delete failure doesn't mask a more important exception."""
        try:
            resp = await ragflow_client.delete_documents(dataset_id, [doc_id])
            if resp.get("code") == 0:
                logger.info("deleted RAGFlow doc: %s", doc_id)
                return
            msg = resp.get("message", "unknown")
            logger.warning("delete doc %s non-zero: %s", doc_id, msg)
            if not log_only:
                raise CustomException(
                    CodeEnum.ChunkDeleteFailed,
                    f"Failed to delete document {doc_id}: {msg}",
                )
        except CustomException:
            raise
        except Exception as e:
            logger.warning("delete doc %s raised: %s", doc_id, e)
            if not log_only:
                raise
