import asyncio
import json
import os
from typing import Any, Dict, List

import aiohttp
from common.otlp.trace.langfuse import langfuse_observation_attributes
from common.otlp.trace.span import Span
from openai import BaseModel
from pydantic import Field

from agent.exceptions.plugin_exc import KnowledgeQueryExc, PluginExc
from agent.service.plugin.base import BasePlugin


class KnowledgePlugin(BasePlugin):
    pass


class KnowledgePluginFactory(BaseModel):
    query: str
    top_k: int
    repo_ids: List[str]
    doc_ids: List[str]
    dataset_ids: List[str] = Field(default_factory=list)
    score_threshold: float
    rag_type: str

    def gen(self) -> KnowledgePlugin:
        return KnowledgePlugin(
            name="knowledge",
            description="knowledge plugin",
            schema_template="",
            typ="knowledge",
            run=self.retrieve,
        )

    def _retrieval_attributes(self, output_value: Any = None) -> Dict[str, Any]:
        """Build privacy-gated attributes for the actual retrieval boundary."""

        metadata: Dict[str, Any] = {
            "dataset_count": len(self.dataset_ids),
            "doc_count": len(self.doc_ids),
            "rag_type": self.rag_type,
            "repo_count": len(self.repo_ids),
            "top_k": self.top_k,
        }
        if isinstance(output_value, dict):
            response_data = output_value.get("data")
            results = (
                response_data.get("results")
                if isinstance(response_data, dict)
                else None
            )
            metadata["result_count"] = len(results) if isinstance(results, list) else 0
        attributes = langfuse_observation_attributes(
            "retriever",
            input_value={"query": self.query},
            output_value=output_value,
            metadata=metadata,
        )
        if not attributes:
            return {}
        attributes["gen_ai.operation.name"] = "retrieval"
        return attributes

    async def retrieve(self, span: Span) -> Dict[str, Any]:
        with span.start("retrieve", attributes=self._retrieval_attributes()) as sp:
            retrieval_span = sp.get_otlp_span()
            data: Dict[str, Any] = {
                "query": self.query,
                "topN": str(self.top_k),
                "match": {"repoId": self.repo_ids, "threshold": self.score_threshold},
                "ragType": self.rag_type,
            }
            if self.rag_type == "CBG-RAG":
                if "match" not in data:
                    data["match"] = {}
                data["match"]["docIds"] = self.doc_ids
            if self.rag_type == "Ragflow-RAG" and self.dataset_ids:
                data["match"]["datasetId"] = self.dataset_ids

            sp.add_info_events({"request-data": json.dumps(data, ensure_ascii=False)})

            if not self.repo_ids:
                empty_resp: Dict[str, Any] = {}
                sp.add_info_events(
                    {"response-data": json.dumps(empty_resp, ensure_ascii=False)}
                )
                retrieval_span.set_attributes(
                    self._retrieval_attributes(output_value=empty_resp)
                )
                return empty_resp

            try:
                query_url = os.getenv("CHUNK_QUERY_URL")
                if not query_url:
                    raise PluginExc(-1, "CHUNK_QUERY_URL is not set")
                async with aiohttp.ClientSession() as session:
                    timeout = aiohttp.ClientTimeout(
                        total=int(os.getenv("KNOWLEDGE_CALL_TIMEOUT", "90"))
                    )
                    headers = self._headers()
                    async with session.post(
                        query_url, headers=headers, json=data, timeout=timeout
                    ) as response:

                        sp.add_info_events(
                            {"response-data": str(await response.read())}
                        )

                        response.raise_for_status()
                        if response.status == 200:
                            resp: Dict[str, Any] = await response.json()
                            sp.add_info_events(
                                {"response-data": json.dumps(resp, ensure_ascii=False)}
                            )
                            retrieval_span.set_attributes(
                                self._retrieval_attributes(output_value=resp)
                            )
                            return resp

                        raise KnowledgeQueryExc
            except asyncio.TimeoutError as e:
                raise KnowledgeQueryExc from e

    def _headers(self) -> Dict[str, str]:
        return {"Content-Type": "application/json"}
