import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyRerankId,
  clearRerankIdForNonRagflow,
} from '../src/components/workflow/modal/knowledge-rerank.js';

test('applyRerankId trims and stores a configured model ID', () => {
  const nodeParam = {};

  applyRerankId(nodeParam, 'Ragflow-RAG', '  bge-reranker-v2-m3  ');

  assert.equal(nodeParam.rerankId, 'bge-reranker-v2-m3');
});

test('applyRerankId removes an empty model ID from the workflow DSL', () => {
  const nodeParam = {
    rerankId: 'old-reranker',
  };

  applyRerankId(nodeParam, 'Ragflow-RAG', '   ');

  assert.equal('rerankId' in nodeParam, false);
});

test('applyRerankId removes stale configuration for another RAG strategy', () => {
  const nodeParam = {
    rerankId: 'old-reranker',
  };

  applyRerankId(nodeParam, 'CBG-RAG', 'old-reranker');

  assert.equal('rerankId' in nodeParam, false);
});

test('RAGFlow knowledge changes preserve the configured rerank model', () => {
  const nodeParam = {
    rerankId: 'bge-reranker-v2-m3',
  };

  clearRerankIdForNonRagflow(nodeParam, 'Ragflow-RAG');

  assert.equal(nodeParam.rerankId, 'bge-reranker-v2-m3');
});
