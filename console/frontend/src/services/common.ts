import type {
  VersionItem,
  FeedbackItem,
} from '@/components/workflow/types/drawer/chat-debugger';
import type { ConfigResponse } from '@/types/resource';
import type { ModelConfigParam } from '@/types/model';
import http from '@/utils/http';
import { feedbackType } from '@/types/types-services';
import { AvatarType } from '@/types/resource';

export async function getCommonConfig(params: {
  category: string;
  code: string;
}): Promise<ConfigResponse | null> {
  return await http.get<ConfigResponse | null, ConfigResponse | null>(
    '/config-info/get-by-category-and-code',
    { params }
  );
}

export async function avatarImageGenerate(content: string): Promise<unknown> {
  return await http.get(`/image/gen?content=${content}`);
}

export async function getConfigs(
  category: string,
  code = '1'
): Promise<AvatarType[]> {
  return await http.get(
    `/config-info/get-list-by-category?category=${category}&code=${code}`
  );
}

export async function getMessages(
  params: Record<string, string | number | boolean>
): Promise<unknown> {
  return await http.get('/monitor/overview', { params });
}

//获取版本list
export async function getVersionList(params: {
  flowId: string;
  size: number;
  current: number;
}): Promise<{
  records: VersionItem[];
  total: number;
  current: number;
  size: number;
}> {
  return await http.get<
    { records: VersionItem[]; total: number; current: number; size: number },
    { records: VersionItem[]; total: number; current: number; size: number }
  >('/workflow/version/list', { params });
}
//还原版本
export async function restoreVersion(params: {
  flowId: string;
  id: string;
}): Promise<unknown> {
  return await http.post('/workflow/version/restore', params);
}
// 删除版本
export async function delVersion(id: string): Promise<unknown> {
  return await http.delete(`/workflow/version?id=${id}`);
}
export async function nextQuestionAdvice(data: {
  question: string;
}): Promise<string[]> {
  const suggestions = await http.post<unknown, unknown>(
    '/prompt/next-question-advice',
    data
  );
  if (
    !Array.isArray(suggestions) ||
    !suggestions.every(
      (item: unknown): item is string => typeof item === 'string'
    )
  ) {
    throw new Error('Invalid question suggestions');
  }
  return suggestions;
}

export async function feedback(params: feedbackType): Promise<unknown> {
  return await http.post('/common/feedback', params);
}

export async function getModelConfigDetail(
  id: string | number,
  llmSource: string | number
): Promise<ModelConfigParam[]> {
  return await http.get<ModelConfigParam[], ModelConfigParam[]>(
    `/llm/inter1?id=${id}&llmSource=${llmSource}`
  );
}

export async function getCustomModelConfigDetail(
  id: string | number,
  llmSource: string | number
): Promise<ModelConfigParam[]> {
  return await http.get<ModelConfigParam[], ModelConfigParam[]>(
    `/llm/self-model-config?id=${id}&llmSource=${llmSource}`
  );
}

export async function getTags(flag: string): Promise<unknown> {
  return await http.get(`/config-info/tags?flag=${flag}`);
}

// 新增反馈
export async function createFeedback(data: {
  flowId: string | undefined;
  botId: string | undefined;
  sid: string | undefined;
  description: string | undefined;
  picUrl: string | undefined;
}): Promise<unknown> {
  return await http.post('/workflow/feedback', data);
}
// 获取反馈列表
export async function getFeedbackList(params: {
  flowId: string;
}): Promise<FeedbackItem[]> {
  return await http.get<FeedbackItem[], FeedbackItem[]>(
    '/workflow/feedback-list',
    { params }
  );
}
