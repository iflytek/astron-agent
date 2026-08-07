import http from '@/utils/http';
import type {
  ModelListData,
  ModelInfo,
  CategoryNode,
  ModelFilterParams,
  ModelCreateParams,
  ModelDetailParams,
  ModelToggleOption,
  RsaPublicKeyResponse,
  LocalModelFile,
  LocalModelParams,
} from '@/types/model';

export async function modelCreate(params: ModelCreateParams): Promise<void> {
  return await http.post('/api/model', params);
}

export async function modelRsaPublicKey(): Promise<RsaPublicKeyResponse> {
  return await http.get('/api/model/rsa/public-key');
}

export async function getModelList(
  params: ModelFilterParams
): Promise<ModelListData> {
  return await http.post('/api/model/list', params);
}

export async function getModelDetail(
  params: ModelDetailParams
): Promise<ModelInfo> {
  return await http.get('/api/model/detail', { params });
}

// 自定义模型删除
export async function deleteModelAPI(modelId: string | number): Promise<void> {
  return await http.get(`/api/model/delete?modelId=${modelId}`);
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
  return await http.get(
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
