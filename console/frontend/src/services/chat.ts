import { VcnItem } from '@/components/speaker-modal';
import {
  BotInfoType,
  PostChatItem,
  CreateChatResponse,
  ChatHistoryResponse,
  RtasrTokenResponse,
  WebBotInfo,
  S3PresignResponse,
} from '@/types/chat';
import http from '@/utils/http';
import { TtsSignResponse } from '@/utils/tts';
import axios, { type AxiosResponse } from 'axios';

/**
 * 获取智能体
 * @param botId 必传 智能体Id
 * @param workflowVersion 非必传 智能体版本
 * @returns
 */
export async function getBotInfoApi(
  botId: number,
  workflowVersion?: string
): Promise<BotInfoType> {
  return http.get('/chat-list/v1/get-bot-info', {
    params: {
      botId,
      ...(workflowVersion ? { workflowVersion } : {}),
    },
  });
}

/**
 * 获取工作流智能体信息
 * @param botId 必传 智能体Id
 * @returns
 */
export async function getWorkflowBotInfoApi(
  botId: number
): Promise<WebBotInfo> {
  return http.get(`/workflow/web/info?botId=${botId}`);
}

/**
 * 获取会话历史
 * @param chatId 聊天Id
 * @returns
 */
export async function getChatHistory(
  chatId: number
): Promise<ChatHistoryResponse[]> {
  return http.get(`/chat-history/all/${chatId}`);
}

/**
 * 获取全部聊天列表
 * @returns
 */
export async function postChatList(): Promise<PostChatItem[]> {
  return http.post('/chat-list/all-chat-list');
}

/**
 * 全新对话
 * @param chatId 聊天Id
 * @returns
 */
export async function postNewChat(chatId: number): Promise<AxiosResponse> {
  return http.post(`/chat-restart/restart?chatId=${chatId}`);
}

/**
 * 中止生成
 * @param streamId 对话流Id
 * @returns
 */
export async function postStopChat(streamId: string): Promise<AxiosResponse> {
  return http.post(`/chat-message/stop?streamId=${streamId}`);
}

/**
 * 清除对话历史
 * @param chatId 聊天Id
 * @param botId 智能体Id
 * @returns
 */
export async function clearChatList(
  chatId: number,
  botId: number
): Promise<{ id: number }> {
  return http.get(`/chat-message/clear?chatId=${chatId}&botId=${botId}`);
}

/**
 * 创建对话
 * @param botId 智能体Id
 * @returns
 */
export async function postCreateChat(
  botId: number
): Promise<CreateChatResponse> {
  return http.post('/chat-list/v1/create-chat-list', { botId });
}

/**
 * 删除聊天记录
 * @param chatListId 聊天列表Id
 * @returns
 */
export const deleteChatList = (params: { chatListId: number }) => {
  return http.post(`/chat-list/v1/del-chat-list`, params);
};

/**
 * 获取语音识别token
 * @returns
 */
export async function getRtasrToken(): Promise<RtasrTokenResponse> {
  return http.post('/rtasr/rtasr-sign');
}

/**
 * 获取分享key
 * @param params
 * @returns
 */
export const getShareAgentKey = (params: {
  relateType: number;
  relateId: number;
}): Promise<{ shareAgentKey: string }> => {
  return http.post('/share/get-share-key', params);
};

/**根据分享key  创建会话 */
export const createChatByShareKey = (params: {
  shareAgentKey: string;
}): Promise<{ id: number }> => {
  return http.post('/share/add-shared-agent', params);
};

/**
 * 获取S3预签名上传URL
 * @param objectKey 对象Key
 * @returns S3预签名响应
 */
export const getS3PresignUrl = (
  objectKey: string,
  fileType: string
): Promise<S3PresignResponse> => {
  return http.get('/api/s3/presign', {
    params: {
      objectKey: objectKey,
      fileType: fileType,
    },
  });
};

/**
 * 上传文件到S3 - 使用ArrayBuffer确保文件数据正确发送
 * @param url 预签名URL
 * @param data ArrayBuffer数据
 * @param contentType 文件MIME类型
 * @param onProgress 进度回调
 * @param abortController 取消控制器
 * @returns Promise
 */
export const uploadFileToS3 = async (
  url: string,
  data: ArrayBuffer,
  contentType: string,
  onProgress?: (progress: number) => void,
  abortController?: AbortController
): Promise<Response> => {
  try {
    const config: any = {
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
      },
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent: any) => {
        if (progressEvent.lengthComputable) {
          const progress = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          );
          onProgress(progress);
        }
      };
    }

    // 设置取消令牌
    if (abortController) {
      config.signal = abortController.signal;
    }
    // 使用axios发送PUT请求，ArrayBuffer作为data参数
    const axiosResponse = await axios.create().put(url, data, config);

    // 将axios响应转换为Response对象以保持接口一致性
    return new Response(null, {
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
    });
  } catch (error: any) {
    const status = error.response?.status || 500;
    const statusText = error.response?.statusText || error.message;
    throw new Error(`上传失败: ${status} ${statusText}`);
  }
};

/**
 * 上传文件绑定对话
 * @param params
 * @param signal 可选的 AbortSignal，用于取消请求
 * @returns
 */
export const uploadFileBindChat = (
  params: {
    chatId: number;
    fileSize: number;
    fileName: string;
    fileUrl: string;
    fileBusinessKey: string;
    paramName?: string;
  },
  signal?: AbortSignal
): Promise<string> => {
  const defaultParams = {
    ...params,
    businessType: 16,
  };
  return http.post('/chat-enhance/save-file', defaultParams, {
    signal,
  });
};

/**
 * 绑定对话的文件解绑
 * @param params 解绑参数
 * @returns
 */
export const unBindChatFile = (params: {
  chatId: number;
  fileId: string;
}): Promise<{ id: number }> => {
  return http.post('/chat-enhance/unbind-file', params);
};

/**
 * 获取合成websocket签名
 * @returns
 */
export const getTtsSign = (params: {
  code?: string;
}): Promise<TtsSignResponse> => {
  return http.get(`/voice/tts-sign?code=${params.code}`);
};

/**
 * 获取发音人
 * @returns
 */
export const getVcnList = (): Promise<VcnItem[]> => {
  return http.get(`/voice/get-pronunciation-person`);
};
