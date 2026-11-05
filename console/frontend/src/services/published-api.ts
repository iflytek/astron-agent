import http from '@/utils/http';
import type { UserApp } from '@/types/common';
import type { PublishApprovalDecision } from '@/services/release-management';

export interface CreateApplication {
  appName: string;
  appDescribe?: string;
  requestId: string;
}

export interface PublishedApiInfo {
  botId: number;
  botName: string;
  appId: string;
  appName: string;
  appKey: string;
  appSecret: string;
  serviceUrl: string;
  flowId: string;
  versionId: number;
}

export const listApplications = (): Promise<UserApp[]> =>
  http.get('/publish-api/app-list');

export const createApplication = (
  values: CreateApplication
): Promise<{ appId: string; appName: string }> =>
  http.post('/publish-api/create-user-app', values);

export const publishedApiInfo = (
  botId: string
): Promise<PublishedApiInfo | null> =>
  http.get('/publish-api/get-bot-api-info', { params: { botId } });

export const bindPublishedApi = (
  botId: string,
  appId: string
): Promise<PublishApprovalDecision> =>
  http.post('/publish-api/create-bot-api', { botId, appId });
