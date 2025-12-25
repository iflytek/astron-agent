import http from '@/utils/http';
import { message } from 'antd';
import {
  PageData,
  RepoItem,
  CreateKnowledgeParams,
  UpdateRepoParams,
  ListReposParams,
  HitTestParams,
  HitHistoryParams,
  FileItem,
  QueryFileListParams,
  CreateFolderParams,
  UpdateFolderParams,
  UpdateFileParams,
  EnableFileParams,
  FileDirectoryTreeParams,
  FileSummaryParams,
  KnowledgeItem,
  CreateKnowledgeChunkParams,
  UpdateKnowledgeParams,
  EnableKnowledgeParams,
  CreateHtmlFileParams,
  SliceFilesParams,
  ListKnowledgeParams,
  EmbeddingFilesParams,
  FileStatusParams,
  DownloadViolationParams,
  EmbeddingBackParams,
  RetryParams,
  RepoUseStatusParams,
  HitResult,
  FileStatusResponse,
  KnowledgeOperationResponse,
  FileDirectoryTreeResponse,
  FileSummaryResponse,
  ConfigResponse,
  RepoUseStatusResponse,
} from '@/types/resource';

export async function createKnowledgeAPI(
  params: CreateKnowledgeParams
): Promise<RepoItem> {
  const response = await http.post(`/repo/create-repo`, params);
  message.success('操作成功');
  return response as unknown as RepoItem;
}

export async function deleteKnowledgeAPI(
  id: number,
  tag: string
): Promise<KnowledgeOperationResponse> {
  const response = await http.delete(`/repo/delete-repo?id=${id}&tag=${tag}`);
  message.success('操作成功');
  return response as unknown as KnowledgeOperationResponse;
}

export async function updateRepoAPI(
  params: UpdateRepoParams
): Promise<RepoItem> {
  const response = await http.post(`/repo/update-repo`, params);
  message.success('操作成功');
  return response as unknown as RepoItem;
}

export async function listRepos(
  params: ListReposParams
): Promise<PageData<RepoItem>> {
  return await http.get(`/repo/list-repos`, { params });
}

export async function configListRepos(
  params: ListReposParams
): Promise<PageData<RepoItem>> {
  return await http.get(`/repo/list`, { params });
}

export async function hitTest(params: HitTestParams): Promise<HitResult[]> {
  return await http.get(`/repo/hit-test`, { params });
}

export async function hitHistoryByPage(
  params: HitHistoryParams
): Promise<PageData<HitResult>> {
  return await http.get(`/repo/list-hit-test-history-by-page`, {
    params,
  });
}

export async function knowledgeSetTop(
  id: number
): Promise<KnowledgeOperationResponse> {
  return await http.get(`/repo/set-top?id=${id}`);
}

export async function getKnowledgeDetail(
  id: string,
  tag: string
): Promise<RepoItem> {
  return await http.get(`/repo/detail?id=${id}&tag=${tag}`);
}

export async function queryFileList(
  params: QueryFileListParams
): Promise<PageData<FileItem>> {
  return await http.get(`/file/query-file-list`, {
    params,
  });
}

export async function createFolderAPI(
  params: CreateFolderParams
): Promise<KnowledgeOperationResponse> {
  return await http.post(`/file/create-folder`, params);
}

export async function updateFolderAPI(
  params: UpdateFolderParams
): Promise<KnowledgeOperationResponse> {
  return await http.post(`/file/update-folder`, params);
}

export async function updateFileAPI(
  params: UpdateFileParams
): Promise<KnowledgeOperationResponse> {
  return await http.post(`/file/update-file`, params);
}

export async function enableFlieAPI(
  params: EnableFileParams
): Promise<KnowledgeOperationResponse> {
  const response = await http.put(
    `/file/enable-file?id=${params.id}&enabled=${params.enabled}`
  );
  message.success('操作成功');
  return response as unknown as KnowledgeOperationResponse;
}

export async function deleteFileAPI(
  repoId: number,
  id: string | number,
  tag: string | number
): Promise<KnowledgeOperationResponse> {
  const response = await http.delete(
    `/file/delete-file?repoId=${repoId}&id=${id}&tag=${tag}`
  );
  message.success('操作成功');
  return response as unknown as KnowledgeOperationResponse;
}

export async function deleteFolderAPI(
  id: number | string
): Promise<KnowledgeOperationResponse> {
  const response = await http.delete(`/file/delete-folder?id=${id}`);
  message.success('操作成功');
  return response as unknown as KnowledgeOperationResponse;
}

export async function listFileDirectoryTree(
  params: FileDirectoryTreeParams
): Promise<FileDirectoryTreeResponse[]> {
  return await http.get(`/file/list-file-directory-tree`, { params });
}

export async function getFileSummary(
  params: FileSummaryParams
): Promise<FileSummaryResponse> {
  return await http.post(`/file/file-summary`, params);
}

export async function createKnowledge(
  params: CreateKnowledgeChunkParams
): Promise<KnowledgeOperationResponse> {
  return await http.post(`/knowledge/create-knowledge`, params);
}

export async function updateKnowledgeAPI(
  params: UpdateKnowledgeParams
): Promise<KnowledgeOperationResponse> {
  const response = await http.post(`/knowledge/update-knowledge`, params);
  message.success('操作成功');
  return response as unknown as KnowledgeOperationResponse;
}

export async function enableKnowledgeAPI(
  params: EnableKnowledgeParams
): Promise<string> {
  return await http.put(
    `/knowledge/enable-knowledge?enabled=${params.enabled}&id=${params.id}`
  );
}

export async function getFileInfoV2BySourceId(
  sourceId: string
): Promise<FileItem> {
  return await http.get(
    `/file/get-file-info-by-source-id?sourceId=${sourceId}`
  );
}

export async function getFileList(id: string): Promise<FileItem[]> {
  return await http.get(`/repo/file-list?id=${id}`);
}

export async function createHtmlFile(
  params: CreateHtmlFileParams
): Promise<KnowledgeOperationResponse[]> {
  return await http.post(`/file/create-html-file`, params);
}

export async function sliceFilesAPI(
  params: SliceFilesParams
): Promise<KnowledgeOperationResponse> {
  return await http.post(`/file/slice`, params);
}

export async function listKnowledgeByPage(
  params: ListKnowledgeParams
): Promise<PageData<KnowledgeItem>> {
  return await http.post(`/file/list-knowledge-by-page`, params);
}

export async function listPreviewKnowledgeByPage(
  params: ListKnowledgeParams
): Promise<PageData<KnowledgeItem>> {
  return await http.post(`/file/list-preview-knowledge-by-page`, params);
}

export async function embeddingFiles(
  params: EmbeddingFilesParams
): Promise<KnowledgeOperationResponse> {
  return await http.post(`/file/embedding`, params);
}

export async function getStatusAPI(
  params: FileStatusParams
): Promise<FileStatusResponse[]> {
  return await http.post(`/file/file-indexing-status`, params);
}

export async function getConfigs(
  category?: string,
  code: string = '1'
): Promise<ConfigResponse[]> {
  return await http.get(
    `/config-info/get-list-by-category?category=${category}&code=${code}`
  );
}

export async function downloadKnowledgeByViolation(
  params: DownloadViolationParams
): Promise<Blob> {
  try {
    const response = await http.post(
      `/file/download-knowledge-by-violation`,
      params,
      {
        responseType: 'blob',
      }
    );
    return response as unknown as Blob;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    message.error(errorMessage);
    throw error;
  }
}

export async function deleteChunkAPI(
  id: string
): Promise<KnowledgeOperationResponse> {
  try {
    const response = await http.delete(`/knowledge/delete-knowledge?id=${id}`);
    message.success('操作成功');
    return response as unknown as KnowledgeOperationResponse;
  } catch (error: unknown) {
    const errorMessage = (error as Error)?.message;
    message.error(errorMessage);
    throw error;
  }
}

export async function embeddingBack(
  params: EmbeddingBackParams
): Promise<KnowledgeOperationResponse> {
  return await http.post(`/file/embedding-back`, params);
}

export async function retry(
  params: RetryParams
): Promise<KnowledgeOperationResponse> {
  return await http.post(`/file/retry`, params);
}

export async function getRepoUseStatus(
  params: RepoUseStatusParams
): Promise<RepoUseStatusResponse> {
  return await http.get(`/repo/get-repo-use-status`, { params });
}
