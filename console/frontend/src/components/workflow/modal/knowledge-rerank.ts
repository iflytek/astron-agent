export const RAGFLOW_RAG_TYPE = 'Ragflow-RAG';

export const clearRerankIdForNonRagflow = (
  nodeParam: Record<string, unknown>,
  ragType: unknown
): void => {
  if (ragType !== RAGFLOW_RAG_TYPE) {
    delete nodeParam.rerankId;
  }
};

export const applyRerankId = (
  nodeParam: Record<string, unknown>,
  ragType: unknown,
  rerankId?: string
): void => {
  clearRerankIdForNonRagflow(nodeParam, ragType);
  if (ragType !== RAGFLOW_RAG_TYPE) return;

  const normalizedRerankId = rerankId?.trim();
  if (normalizedRerankId) {
    nodeParam.rerankId = normalizedRerankId;
    return;
  }
  delete nodeParam.rerankId;
};
