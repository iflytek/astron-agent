import http from '@/utils/http';
import { feedbackType } from '@/types/types-services';
import { AvatarType } from '@/types/resource';

export async function getCommonConfig(params: {
  category: string;
  code: string;
}): Promise<unknown> {
  return await http.get('/config-info/get-by-category-and-code', {
    params,
  });
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
}): Promise<unknown> {
  return await http.get('/workflow/version/list', { params });
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
//发布结果
export async function getPublicResult(params: {
  flowId: string;
  name: string;
}): Promise<unknown> {
  return await http.get('/workflow/version/publish-result', {
    params,
  });
}

export async function nextQuestionAdvice(data: {
  question: string;
}): Promise<unknown> {
  return await http.post('/prompt/next-question-advice', data);
}

export async function feedback(params: feedbackType): Promise<unknown> {
  return await http.post('/common/feedback', params);
}

export async function getModelConfigDetail(
  id: string,
  llmSource: string
): Promise<unknown> {
  return await http.get(`/llm/inter1?id=${id}&llmSource=${llmSource}`);
}

export async function getCustomModelConfigDetail(
  id: string,
  llmSource: string
): Promise<unknown> {
  return await http.get(
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
}): Promise<unknown> {
  return await http.get('/workflow/feedback-list', { params });
}
