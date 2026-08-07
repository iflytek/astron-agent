#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RAGFlow Utility Class Module

Provides helper methods for RAGFlow document processing, including file handling, configuration building, format conversion, etc.
"""

import asyncio
import logging
import os
import urllib.parse
from typing import Any, Dict, List, Optional, Union

import aiohttp
from fastapi import UploadFile

from knowledge.domain.platform_account_config import get_managed_config_value
from knowledge.infra.ragflow.ragflow_client import (
    create_dataset,
    fetch_all_document_chunks,
    get_document_info,
    list_datasets,
    update_dataset,
)
from knowledge.infra.ragflow.ragflow_client import (
    wait_for_parsing as wait_for_document_parsing,
)

logger = logging.getLogger(__name__)

# Fallback dataset name when ``RAGFLOW_DEFAULT_GROUP`` is unset or empty.
DEFAULT_RAGFLOW_DATASET_NAME = "Stellar Knowledge Base"

# Module-level locks for dataset creation to prevent race conditions
_dataset_locks: Dict[str, asyncio.Lock] = {}
_locks_lock = asyncio.Lock()


class RagflowUtils:
    """RAGFlow utility class providing document processing helper methods"""

    @staticmethod
    def get_default_dataset_name() -> str:
        """Return ``RAGFLOW_DEFAULT_GROUP`` or ``DEFAULT_RAGFLOW_DATASET_NAME`` (unset/empty fall back)."""
        return (
            get_managed_config_value("ragflow", "default_group")
            or os.getenv("RAGFLOW_DEFAULT_GROUP")
            or DEFAULT_RAGFLOW_DATASET_NAME
        )

    @staticmethod
    def convert_ragflow_query_response(
        ragflow_response: Dict[str, Any], threshold: float
    ) -> List[Dict[str, Any]]:
        """
        Convert RAGFlow query response to abstract interface format
        Based on format conversion logic in format_converter.py
        """
        results = []
        try:
            # RAGFlow response format: {"code": 0, "data": {"chunks": [...]}}
            if ragflow_response.get("code") == 0 and "data" in ragflow_response:
                chunks_data = ragflow_response["data"].get("chunks", [])

                for chunk in chunks_data:
                    # Get similarity score
                    score = chunk.get("similarity", 0.0)
                    if score >= threshold:

                        title = chunk.get(
                            "document_keyword", chunk.get("document_name", "")
                        )

                        results.append(
                            {
                                "score": score,
                                "docId": chunk.get("document_id", ""),
                                "title": title,
                                "content": chunk.get("content", ""),
                                "context": chunk.get("content", ""),
                                "references": chunk.get("references", {}),
                            }
                        )
        except Exception as e:
            logger.error(f"Failed to convert RAGFlow response: {e}")
        return results

    @staticmethod
    async def ensure_dataset(group: str, description: Optional[str] = None) -> str:
        """Ensure dataset exists, create if missing; return dataset_id.

        ``description`` is written at creation time and best-effort synced when
        an existing dataset's description differs. Sync failures are swallowed
        — a friendly label must never block document writes.
        """
        async with _locks_lock:
            if group not in _dataset_locks:
                _dataset_locks[group] = asyncio.Lock()

        async with _dataset_locks[group]:
            try:
                logger.info(f"Checking if dataset exists: {group}")
                datasets_response = await list_datasets(name=group)

                if datasets_response.get("code") == 0:
                    datasets = datasets_response.get("data", [])
                    for dataset in datasets:
                        if dataset.get("name") == group:
                            dataset_id = dataset.get("id")
                            logger.info(
                                f"Found existing dataset: {group}, ID: {dataset_id}"
                            )
                            await RagflowUtils._sync_description_if_stale(
                                dataset_id,
                                current=dataset.get("description"),
                                desired=description,
                            )
                            return dataset_id

                logger.info(f"Dataset doesn't exist, creating new dataset: {group}")
                create_response = await create_dataset(
                    name=group,
                    description=description
                    or f"Automatically created dataset: {group}",
                    chunk_method="naive",
                )

                if create_response.get("code") == 0:
                    dataset_id = create_response.get("data", {}).get("id")
                    logger.info(
                        f"Dataset created successfully: {group}, ID: {dataset_id}"
                    )
                    return dataset_id
                else:
                    raise Exception(f"Dataset creation failed: {create_response}")

            except Exception as e:
                logger.error(f"Dataset management failed: {e}")
                raise Exception(f"Unable to ensure dataset exists: {str(e)}")

    @staticmethod
    async def _sync_description_if_stale(
        dataset_id: str, current: Optional[str], desired: Optional[str]
    ) -> None:
        """Best-effort lazy sync of a dataset's description.

        Skips when ``desired`` is empty (caller did not supply a label) or
        when ``current`` already matches. Exceptions are swallowed and logged
        — a UI-friendly description must never block document writes.
        """
        if not desired or current == desired:
            return
        try:
            resp = await update_dataset(dataset_id, description=desired)
            if resp.get("code") != 0:
                logger.warning(
                    "Best-effort description sync rejected by RAGFlow for "
                    "dataset %s: code=%s message=%s",
                    dataset_id,
                    resp.get("code"),
                    resp.get("message", "Unknown error"),
                )
                return
            logger.info(
                "Updated dataset %s description: %r -> %r",
                dataset_id,
                current,
                desired,
            )
        except Exception as e:
            logger.warning(
                "Best-effort description sync failed for dataset %s: %s",
                dataset_id,
                e,
            )

    @staticmethod
    async def _download_url_file(file: str) -> tuple[bytes, str]:
        """
        Download file from URL

        Args:
            file: File URL

        Returns:
            (file content, filename)
        """
        logger.info(f"Downloading file from URL: {file}")

        async with aiohttp.ClientSession() as session:
            async with session.get(file) as response:
                if response.status != 200:
                    raise Exception(f"File download failed: HTTP {response.status}")

                file_content = await response.read()
                logger.info(f"Download completed: {len(file_content)} bytes")

                # Get filename
                filename = RagflowUtils._extract_filename_from_url(file, response)

                # Validate downloaded content
                if len(file_content) == 0:
                    raise Exception("Downloaded file is empty")

                return file_content, filename

    @staticmethod
    def _extract_filename_from_url(file: str, response: Any) -> str:
        """
        Extract filename from URL or response

        Args:
            file: Original URL
            response: HTTP response object

        Returns:
            Extracted filename
        """
        filename = None

        # First try to get filename from HTTP response headers
        if response.url:
            filename = response.url.name

        # If no filename in response headers, extract from URL
        if not filename:
            raw_filename = file.split("/")[-1]
            # Remove URL parameters (content after ?)
            if "?" in raw_filename:
                raw_filename = raw_filename.split("?")[0]
            filename = urllib.parse.unquote(raw_filename, encoding="utf-8")

        return filename

    @staticmethod
    def _read_local_file(file: str) -> tuple[bytes, str]:
        """
        Read local file

        Args:
            file: Local file path

        Returns:
            (file content, filename)
        """
        logger.info(f"Reading local file: {file}")

        if not os.path.exists(file):
            raise Exception(f"Local file does not exist: {file}")

        with open(file, "rb") as f:
            file_content = f.read()
        filename = os.path.basename(file)

        logger.info(
            f"Local file reading completed: {filename}, size: {len(file_content)} bytes"
        )
        return file_content, filename

    @staticmethod
    async def process_file(file_input: Union[str, UploadFile]) -> tuple[bytes, str]:
        """
        Process file (download, read local file, or handle upload file)

        Args:
            file_input: File path/URL (str) or UploadFile object

        Returns:
            (file content, filename)
        """
        if isinstance(file_input, str):
            # URL logic: only support HTTP/HTTPS URLs
            if file_input.startswith(("http://", "https://")):
                return await RagflowUtils._download_url_file(file_input)
            else:
                raise ValueError(
                    f"Unsupported file input: {file_input}. "
                    "Only HTTP/HTTPS URLs are supported for string input."
                )
        else:
            # Handle UploadFile objects
            file_content = await file_input.read()
            filename = file_input.filename or "uploaded_file"

            logger.info(
                "Processing uploaded file: %s, size: %d bytes",
                filename,
                len(file_content),
            )

            if len(file_content) == 0:
                raise Exception("Uploaded file is empty")

            # Reset file pointer for potential future reads
            await file_input.seek(0)

            return file_content, filename

    @staticmethod
    def _normalize_expected_chunk_count(raw_count: Any) -> Optional[int]:
        """Return a usable non-negative metadata count when one is available."""
        try:
            expected_count = int(raw_count) if raw_count is not None else None
        except (TypeError, ValueError):
            return None
        if expected_count is not None and expected_count < 0:
            return None
        return expected_count

    @staticmethod
    def _finalize_chunk_retrieval(
        dataset_id: str,
        doc_id: str,
        *,
        expected_count: Optional[int],
        last_visible_count: int,
        max_retries: int,
    ) -> List[Dict[str, Any]]:
        """Return an empty snapshot or raise the final incomplete-state error."""
        if expected_count is not None and expected_count > last_visible_count:
            raise RuntimeError(
                "RAGFlow chunk snapshot remained incomplete after retries: "
                f"doc={doc_id}, visible={last_visible_count}, "
                f"expected={expected_count}"
            )

        if last_visible_count > 0:
            raise RuntimeError(
                "RAGFlow chunk snapshot did not stabilize after retries: "
                f"doc={doc_id}, visible={last_visible_count}, "
                f"expected={expected_count}"
            )

        logger.warning(
            "RAGFlow document returned zero chunks after retries: "
            "dataset=%s doc=%s attempts=%d",
            dataset_id,
            doc_id,
            max_retries + 1,
        )
        return []

    @staticmethod
    async def get_document_chunks(
        dataset_id: str, doc_id: str, max_retries: int = 15, retry_delay: float = 3.0
    ) -> List[Dict[str, Any]]:
        """
        Get all chunks after parsing, retrying incomplete search snapshots.

        Each attempt delegates to the canonical fail-closed paginator. RAGFlow
        API errors and incomplete pagination therefore propagate instead of
        being misreported as a valid empty document.

        Args:
            dataset_id: Dataset ID
            doc_id: Document ID
            max_retries: Maximum incomplete-snapshot retries (default: 15)
            retry_delay: Delay between retries in seconds (default: 3.0)

        Returns:
            Complete chunk list, or an empty list after all empty retries.
        """
        if max_retries < 0:
            raise ValueError("max_retries must be non-negative")
        if retry_delay < 0:
            raise ValueError("retry_delay must be non-negative")

        doc_info = await get_document_info(dataset_id, doc_id)
        if doc_info is None:
            raise RuntimeError(
                f"RAGFlow document disappeared before chunk retrieval: doc={doc_id}"
            )

        expected_count = RagflowUtils._normalize_expected_chunk_count(
            doc_info.get("chunk_count")
        )

        last_visible_count = 0
        last_chunk_ids: Optional[tuple[str, ...]] = None
        stable_partial_reads = 0
        for attempt in range(max_retries + 1):
            chunks = await fetch_all_document_chunks(dataset_id, doc_id, page_size=100)
            last_visible_count = len(chunks)
            has_complete_snapshot = (
                expected_count is not None and last_visible_count >= expected_count
            )
            if has_complete_snapshot:
                logger.info(
                    "Retrieved complete RAGFlow chunk snapshot: "
                    "dataset=%s doc=%s visible=%d expected=%s",
                    dataset_id,
                    doc_id,
                    last_visible_count,
                    expected_count,
                )
                return chunks

            chunk_ids = tuple(sorted(str(chunk.get("id", "")) for chunk in chunks))
            if chunks and chunk_ids == last_chunk_ids:
                stable_partial_reads += 1
            else:
                stable_partial_reads = 0
            last_chunk_ids = chunk_ids

            # RAGFlow may over-count document chunks when identical content in
            # separate tasks produces the same content-addressed chunk ID.
            # Treat metadata count as a visibility target, but accept a
            # non-empty ID set after two additional unchanged observations.
            if chunks and stable_partial_reads >= 2:
                logger.warning(
                    "RAGFlow chunk snapshot stabilized below metadata count: "
                    "dataset=%s doc=%s visible=%d expected=%s",
                    dataset_id,
                    doc_id,
                    last_visible_count,
                    expected_count,
                )
                return chunks

            if attempt == max_retries:
                break

            logger.info(
                "RAGFlow chunks are not fully visible yet: "
                "dataset=%s doc=%s visible=%d expected=%s retry=%d/%d",
                dataset_id,
                doc_id,
                last_visible_count,
                expected_count,
                attempt + 1,
                max_retries,
            )
            await asyncio.sleep(retry_delay)

        return RagflowUtils._finalize_chunk_retrieval(
            dataset_id,
            doc_id,
            expected_count=expected_count,
            last_visible_count=last_visible_count,
            max_retries=max_retries,
        )

    @staticmethod
    def convert_to_standard_format(
        doc_id: str, chunks_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Convert RAGFlow format to standard format

        Args:
            doc_id: Document ID
            chunks_data: Chunk data

        Returns:
            Standard format chunk list
        """
        result = []

        if chunks_data:
            # If there is actual chunk data, use real data
            for i, chunk in enumerate(chunks_data):
                result.append(
                    {
                        "docId": doc_id,
                        "dataIndex": chunk.get("id", str(i)),
                        "title": "",
                        "content": chunk.get("content", ""),
                        "context": chunk.get("content", ""),
                        "references": None,
                    }
                )

        return result

    @staticmethod
    async def wait_for_parsing(
        dataset_id: str, doc_id: str, max_wait_time: int = 300
    ) -> str:
        """Backward-compatible wrapper around the canonical client poller."""
        return await wait_for_document_parsing(
            dataset_id=dataset_id,
            doc_id=doc_id,
            max_wait_time=max_wait_time,
        )

    @staticmethod
    def build_parser_config(
        lengthRange: Optional[List[int]],
        overlap: int,
        separator: Optional[List[str]],
        titleSplit: bool,
    ) -> Dict[str, Any]:
        """
        Build parser configuration

        Args:
            lengthRange: Chunk length range
            overlap: Overlap length
            separator: Separator list
            titleSplit: Whether to split by title

        Returns:
            Parser configuration dictionary
        """
        # RAGFlow's parser uses the configured maximum as its target chunk
        # size. ``overlap`` and ``titleSplit`` are intentionally not forwarded:
        # v0.20.5 has no overlap field, and title splitting is not equivalent
        # to changing PDF layout recognition/OCR mode.
        _ = overlap, titleSplit
        if lengthRange is None:
            chunk_token_num = 256
        else:
            if len(lengthRange) not in (1, 2) or any(
                isinstance(value, bool) or not isinstance(value, int)
                for value in lengthRange
            ):
                raise ValueError("lengthRange must contain one or two integers")
            if any(value <= 0 for value in lengthRange):
                raise ValueError("lengthRange values must be greater than zero")
            if len(lengthRange) == 2 and lengthRange[0] > lengthRange[1]:
                raise ValueError("lengthRange minimum cannot exceed maximum")
            chunk_token_num = lengthRange[-1]

        # The Astron UI can send either a literal ``\\n`` or an actual newline.
        # In RAGFlow v0.20.5, unquoted delimiter characters are independent;
        # a multi-character delimiter must be wrapped in backticks.
        normalized_separators = []
        for value in separator or []:
            normalized = value.replace("\\n", "\n")
            if not normalized:
                continue
            normalized_separators.append(
                normalized if len(normalized) == 1 else f"`{normalized}`"
            )
        if not any("\n" in value for value in normalized_separators):
            normalized_separators.append("\n")
        delimiter = "".join(normalized_separators)

        parser_config = {
            "chunk_token_num": min(chunk_token_num, 2048),
            "delimiter": delimiter,
        }

        logger.info(
            "Built RAGFlow parser config: chunk_token_num=%d, delimiter=%r",
            parser_config["chunk_token_num"],
            delimiter,
        )
        return parser_config

    @staticmethod
    def detect_file_type(file_content: bytes, filename: str) -> tuple[str, str]:
        """
        Detect file type

        Args:
            file_content: File content
            filename: Filename

        Returns:
            (content_type, file_type)
        """
        # Type detection based on file content (more reliable)
        if file_content.startswith(b"%PDF"):
            return "application/pdf", "pdf"
        elif filename.lower().endswith((".txt", ".md")):
            return "text/plain", "text"
        elif filename.lower().endswith((".doc", ".docx")) or file_content.startswith(
            b"PK"
        ):
            return (
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "docx",
            )
        else:
            return "application/octet-stream", "unknown"

    @staticmethod
    def correct_filename(filename: str, file_type: str) -> str:
        """
        Correct filename extension

        Args:
            filename: Original filename
            file_type: Detected file type

        Returns:
            Corrected filename
        """
        # Ensure filename has correct extension
        if file_type == "pdf" and not filename.lower().endswith(".pdf"):
            if "." in filename:
                filename = filename.rsplit(".", 1)[0] + ".pdf"
            else:
                filename = filename + ".pdf"
            logger.info(f"Corrected filename to: {filename}")

        return filename
