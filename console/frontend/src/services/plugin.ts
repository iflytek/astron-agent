import { shouldShowRequestError } from '@/utils/http-error';
import type { ToolImportData } from '@/types/tool-import';
export type { ToolImportData } from '@/types/tool-import';
import type { McpServerTool } from '@/types/workflow-api';
import http from '@/utils/http';
import { PageData, ToolItem } from '@/types/resource';
import {
  DebugToolParams,
  DebugInput,
  MCPToolDetail,
} from '@/types/plugin-store';
import { message } from 'antd';

export async function createTool(params: ToolItem): Promise<unknown> {
  try {
    const response = await http.post(`/tool/create-tool`, params);
    message.success('操作成功');
    return response as unknown as ToolItem;
  } catch (error: unknown) {
    const errorMessage = (error as Error)?.message;
    shouldShowRequestError(error) && message.error(errorMessage);
    throw error;
  }
}
// 暂存
export async function temporaryTool(params: ToolItem): Promise<ToolItem> {
  try {
    const response = await http.post(`/tool/temporary-tool`, params);
    message.success('操作成功');
    return response as unknown as ToolItem;
  } catch (error: unknown) {
    const errorMessage = (error as Error)?.message;
    shouldShowRequestError(error) && message.error(errorMessage);
    throw error;
  }
}

export async function updateTool(params: ToolItem): Promise<unknown> {
  try {
    const response = await http.put(`/tool/update-tool`, params);
    message.success('操作成功');
    return response as unknown;
  } catch (error: unknown) {
    const errorMessage = (error as Error)?.message;
    shouldShowRequestError(error) && message.error(errorMessage);
    throw error;
  }
}

export async function deleteTool(id: string | number): Promise<unknown> {
  return await http.delete(`/resources/tools/${id}`);
}

export async function getToolDetail(params: {
  id: string;
  temporary?: boolean;
}): Promise<ToolItem> {
  return await http.get('/tool/detail', { params });
}

export async function debugTool(params: DebugToolParams): Promise<{
  code: number;
  data: Record<string, string | number | boolean>;
  message: string;
}> {
  const definition = JSON.parse(params.webSchema) as {
    toolRequestInput?: DebugInput[];
  };
  const value = (item: DebugInput): unknown => {
    if (item.type === 'object' && item.children?.length)
      return Object.fromEntries(
        item.children.map(child => [child.name, value(child)])
      );
    if (
      (item.type === 'object' || item.type === 'array') &&
      typeof item.default === 'string'
    )
      return JSON.parse(item.default || (item.type === 'array' ? '[]' : '{}'));
    return item.default;
  };
  const payload: Record<string, Record<string, unknown>> = {
    path: {},
    query: {},
    header: {},
    body: {},
  };
  for (const item of definition.toolRequestInput || []) {
    const location = ['path', 'query', 'header'].includes(item.location)
      ? item.location
      : 'body';
    payload[location]![item.name] = value(item);
  }
  return await http.post(`/resources/tools/${params.id}/debug`, payload, {
    timeout: 300000,
  });
}

export async function listTools(params: {
  content?: string;
  status?: number;
  pageNo: number;
  pageSize: number;
}): Promise<PageData<ToolItem>> {
  return await http.get(`/workflow/tools`, {
    params: { ...params, name: params.content },
    responseType: 'json',
  });
}

export async function getToolDefaultIcon(): Promise<unknown> {
  return await http.get(`/tool/get-tool-default-icon`);
}

export async function listToolSquare(params: {
  page: number;
  pageSize: number;
  orderFlag: number;
}): Promise<PageData<ToolItem>> {
  return await http.get('/workflow/tools', {
    params: { ...params, market: true },
  });
}

export async function getMcpServerList(): Promise<McpServerTool[]> {
  return await http.get<McpServerTool[], McpServerTool[]>(
    '/workflow/get-mcp-server-list-locally'
  );
}

export async function getServerToolDetailAPI(
  serverId: string
): Promise<MCPToolDetail> {
  return await http.get(
    `/workflow/get-server-tool-detail-locally?serverId=${serverId}`
  );
}

export async function debugServerToolAPI(params: {
  mcpServerId: string | null;
  mcpServerUrl: string;
  toolName: string;
  toolId: string;
  toolArgs: Record<string, unknown>;
}): Promise<{ content: { text: string }[] }> {
  return await http.post('/workflow/debug-server-tool', params);
}

//获取插件版本列表
export async function getToolVersionList(toolId: string): Promise<ToolItem[]> {
  return await http.get<ToolItem[], ToolItem[]>(
    `/workflow/tools/versions?toolId=${toolId}`
  );
}

//获取插件最新版本信息
export async function getToolLatestVersion(
  toolIds: string[]
): Promise<Record<string, string>> {
  return await http.get<Record<string, string>, Record<string, string>>(
    '/workflow/tools/versions',
    { params: { toolIds: toolIds.join(',') } }
  );
}

export async function toolFeedback(params: {
  remark: string;
  toolId?: string;
  name?: string;
}): Promise<unknown> {
  try {
    const response = await http.post('/tool/feedback', params);
    message.success('操作成功');
    return response as unknown;
  } catch (error: unknown) {
    const errorMessage = (error as Error)?.message;
    shouldShowRequestError(error) && message.error(errorMessage);
    throw error;
  }
}

// 用户安装插件（如果是OAuth会触发授权）
export const installPlugin = (
  infoId: number,
  redirectUri: string
): Promise<string> => {
  return http.post(
    `/iflygpt/plugin/user/install?infoId=${infoId}&redirectUri=${redirectUri}`
  );
};

// 导出数据
export async function exportPlugin(params: {
  id: string;
  type: string;
}): Promise<unknown> {
  return await http.get(`/tool/export`, { params, responseType: 'blob' });
}

// 导入数据
export async function importPlugin(params: {
  file: File;
}): Promise<ToolImportData> {
  return await http.post<ToolImportData, ToolImportData>(
    `/tool/import`,
    params,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
}

//mcp列表
export function mcpServerList(type: string): Promise<unknown> {
  return http.get(`/workflow/getMcpServerList?type=${type}`);
}
