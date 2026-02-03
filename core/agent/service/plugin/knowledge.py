import asyncio
import json
import os
from typing import Any, Dict, List

import aiohttp
from common.otlp.trace.span import Span
from openai import BaseModel

from agent.exceptions.plugin_exc import KnowledgeQueryExc, PluginExc
from agent.service.plugin.base import BasePlugin


class KnowledgePlugin(BasePlugin):
    pass


class KnowledgePluginFactory(BaseModel):
    query: str
    top_k: int
    repo_ids: List[str]
    doc_ids: List[str]
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

    async def retrieve(self, span: Span) -> Dict[str, Any]:
        with span.start("retrieve") as sp:
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

            sp.add_info_events({"request-data": json.dumps(data, ensure_ascii=False)})

            if not self.repo_ids:
                empty_resp: Dict[str, Any] = {}
                sp.add_info_events(
                    {"response-data": json.dumps(empty_resp, ensure_ascii=False)}
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
                    async with session.post(
                        query_url, json=data, timeout=timeout
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
                            return resp

                        raise KnowledgeQueryExc
            except asyncio.TimeoutError as e:
                raise KnowledgeQueryExc from e
