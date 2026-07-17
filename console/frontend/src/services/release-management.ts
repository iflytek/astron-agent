/** ## release-management module */
import http from '../utils/http';

/** ## get agent detail */
export const getAgentDetail = async (botId: number): Promise<unknown> => {
  return await http.get(`/publish/bots/${botId}`);
};

/** ## get agent publish status */
export const getAgentPublishStatus = async (
  botId: number
): Promise<unknown> => {
  return await http.get(`/publish/bots/${botId}/status`);
};

/** ## 发布类型枚举 */
export type PublishType = 'MARKET' | 'API' | 'MCP' | 'WECHAT' | 'FEISHU';

/** ## 发布动作枚举 */
export type PublishAction = 'PUBLISH' | 'OFFLINE';

/** ## 市场发布数据 */
export interface MarketPublishData {
  category?: string;
  tags?: string[];
  visibility?: 'PUBLIC' | 'PRIVATE';
  reason?: string;
}

/** ## MCP发布数据 */
export interface MCPPublishData {
  serverName?: string;
  description?: string;
  content?: string;
  icon?: string;
  args?: string;
  reason?: string;
}

/** ## 微信发布数据 */
export interface WechatPublishData {
  appId: string;
  redirectUrl?: string;
  menuConfig?: string;
  reason?: string;
}

/** ## 飞书发布数据 */
export interface FeishuPublishData {
  appId: string;
  appSecret?: string;
  reason?: string;
}

/** ## API发布数据 */
export interface APIPublishData {
  apiName?: string;
  description?: string;
  rateLimitPerMinute?: number;
  enableAuth?: boolean;
  authType?: string;
  allowedOrigins?: string[];
  reason?: string;
}

/** ## 发布数据联合类型 */
export type PublishData =
  | MarketPublishData
  | MCPPublishData
  | WechatPublishData
  | FeishuPublishData
  | APIPublishData;

/** ## 发布请求参数 */
export interface PublishRequest {
  publishType: PublishType;
  action: PublishAction;
  publishData: PublishData;
}

export interface PublishApprovalDecision {
  approvalRequired?: boolean;
  approvalId?: number;
  status?: string;
}

export const isPublishApprovalDecision = (
  result: unknown
): result is PublishApprovalDecision => {
  return Boolean(
    result &&
      typeof result === 'object' &&
      'approvalRequired' in result &&
      (result as PublishApprovalDecision).approvalRequired
  );
};

/** ## Release agents to different platform
 * @param botId Agent ID -- url use
 * @param params 发布请求参数
 * @returns Release agent response
 */
export const handleAgentStatus = async (
  botId: number,
  params: PublishRequest
): Promise<unknown> => {
  return await http.post(`/publish/bots/${botId}`, params);
};

export interface PublishApproval {
  id: number;
  spaceId: number;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  publishType: string;
  publishAction: string;
  targetId?: string;
  approvalStatus: string;
  requesterUid: string;
  reviewerUid?: string;
  appOwnerUid?: string;
  requestReason?: string;
  reviewComment?: string;
  publishSnapshot?: string;
  executionResult?: string;
  canReview?: boolean;
  canCancel?: boolean;
  createdTime?: string;
  reviewedTime?: string;
  executedTime?: string;
  updatedTime?: string;
}

export interface PublishApprovalQuery {
  page?: number;
  size?: number;
  approvalStatus?: string;
  resourceType?: string;
  publishType?: string;
  publishAction?: string;
  resourceId?: string;
  requesterUid?: string;
}

export interface PageResponse<T> {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  records: T[];
  hasNext: boolean;
  hasPrevious: boolean;
}

export const getPublishApprovals = async (
  params: PublishApprovalQuery
): Promise<PageResponse<PublishApproval>> => {
  return await http.get('/publish/approvals', { params });
};

export const getPublishApprovalDetail = async (
  approvalId: number
): Promise<PublishApproval> => {
  return await http.get(`/publish/approvals/${approvalId}`);
};

export const approvePublishApproval = async (
  approvalId: number,
  reviewComment?: string
): Promise<PublishApprovalDecision> => {
  return await http.post(`/publish/approvals/${approvalId}/approve`, {
    reviewComment,
  });
};

export const rejectPublishApproval = async (
  approvalId: number,
  reviewComment?: string
): Promise<PublishApprovalDecision> => {
  return await http.post(`/publish/approvals/${approvalId}/reject`, {
    reviewComment,
  });
};

export const cancelPublishApproval = async (
  approvalId: number
): Promise<PublishApprovalDecision> => {
  return await http.post(`/publish/approvals/${approvalId}/cancel`);
};

/** ## Agent input parameter type */
export interface AgentInputParam {
  name: string;
  schema: {
    type: string;
    default?: string;
  };
  fileType?: string;
  allowedFileType?: string[];
}

/** ## get Agent input parameters */
// export const getAgentInputParams = async (
//   botId: number
// ): Promise<AgentInputParam[]> => {
//   return (await http.get<AgentInputParam[]>(
//     `/publish/mcp/${botId}/inputs`
//   )) as unknown as AgentInputParam[];
// };

/** ## get Agent time series data */
export const getAgentTimeSeriesData = async (botId: number): Promise<void> => {
  return await http.get(`/publish/bots/${botId}/timeseries`);
};

/** ## get Agent summary data */
export const getAgentSummaryData = async (botId: number): Promise<void> => {
  return await http.get(`/publish/bots/${botId}/summary`);
};

/** ## get Agent preparation data
 * @param botId Agent ID -- url use
 * @param type Publish type -- 'MARKET', 'API', 'MCP', 'WECHAT', 'FEISHU'
 * @returns Agent preparation data
 */
export const getPreparationData = async (
  botId: number,
  type = 'MARKET'
): Promise<void> => {
  return await http.get(`/publish/bots/${botId}/prepare?type=${type}`);
};

/** ## bind Wechat */
export const bindWechat = async (
  botId: number,
  appid: string
): Promise<void> => {
  return await http.post(`/publish/bots/${botId}/bind-wechat`, { appid });
};
