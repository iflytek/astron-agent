import http from '@/utils/http';
import { CanceledError } from 'axios';
import type {
  ModelListData,
  ModelInfo,
  CategoryNode,
  ModelFilterParams,
  ModelCreateParams,
  ModelDetailParams,
  ModelToggleOption,
  LocalModelFile,
  LocalModelParams,
} from '@/types/model';

export async function modelCreate(params: ModelCreateParams): Promise<void> {
  return await http.post('/api/model', params);
}

export async function getModelList(
  params: ModelFilterParams,
  signal?: AbortSignal
): Promise<ModelListData> {
  return await http.post('/api/model/list', params, { signal });
}

// Card lists need every matching model, while the API caps each page at 100.
// Publish only a complete result: request and pagination errors reject the load.
export async function getAllModels(
  params: Omit<ModelFilterParams, 'page' | 'pageSize'>,
  signal?: AbortSignal
): Promise<ModelInfo[]> {
  const filters = { ...params };
  const records: ModelInfo[] = [];
  for (let page = 1; ; page++) {
    if (signal?.aborted) throw new CanceledError();
    const data = await getModelList(
      { ...filters, page, pageSize: 100 },
      signal
    );
    if (signal?.aborted) throw new CanceledError();
    if (
      !data ||
      !Array.isArray(data.records) ||
      !Number.isInteger(data.total) ||
      data.total < 0 ||
      data.current !== page ||
      data.size !== 100 ||
      data.records.length !==
        Math.min(100, Math.max(0, data.total - (page - 1) * 100))
    ) {
      throw new Error('模型列表分页响应不完整，请重试');
    }
    records.push(...data.records);
    if (page * 100 >= data.total) return records;
  }
}

export async function getModelDetail(
  params: ModelDetailParams
): Promise<ModelInfo> {
  return await http.get('/api/model/detail', { params });
}

// 自定义模型删除
export async function deleteModelAPI(modelId: string | number): Promise<void> {
  return await http.delete(`/api/model/delete?modelId=${modelId}`);
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  return await http.get('/api/model/category-tree');
}

// 启用禁用模型 --- 针对自定义模型和微调模型
export async function enabledModelAPI(
  modelId: string | number,
  llmSource: string | number,
  option: ModelToggleOption
): Promise<void> {
  return await http.put(
    `/api/model/${option}?modelId=${modelId}&llmSource=${llmSource}`
  );
}

// 获取本地模型文件列表
export async function getLocalModelList(): Promise<LocalModelFile[]> {
  const response: LocalModelFile[] = await http.get(
    '/api/model/local-model/list'
  );
  return response || [];
}

// 新增/编辑本地模型
export async function createOrUpdateLocalModel(
  params: LocalModelParams
): Promise<boolean> {
  return await http.post('/api/model/local-model', params);
}
