import http from '@/utils/http';
import type { McpServerTool } from '@/types/workflow-api';
import type { PageData, ToolItem } from '@/types/resource';
import type { MCPToolDetail } from '@/types/plugin-store';

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

export async function listToolSquare(params: {
  page: number;
  pageSize: number;
  orderFlag: number;
  content?: string;
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
  return await http.get('/workflow/get-server-tool-detail-locally', {
    params: { serverId },
  });
}

export async function debugServerToolAPI(params: {
  mcpServerId: string | null;
  toolName: string;
  toolArgs: Record<string, unknown>;
}): Promise<{
  content?: Record<string, unknown>[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
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
