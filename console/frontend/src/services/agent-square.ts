/*
 * @Author: snoopyYang
 * @Date: 2025-09-23 10:07:54
 * @LastEditors: snoopyYang
 * @LastEditTime: 2025-09-23 10:08:05
 * @Description: 智能体广场相关接口
 */
import http from '../utils/http';
import {
  BotListPage,
  BotType,
  SearchBotParam,
  BotMarketParam,
  BotMarketPage,
} from '@/types/agent-square';
import { FavoriteListResponse } from '@/types/chat';

//获取智能体类型
export const getAgentType = (): Promise<BotType[]> => {
  return http.get('/home-page/agent-square/get-bot-type-list');
};

//获取智能体列表
export const getAgentList = (params: SearchBotParam): Promise<BotListPage> => {
  return http.get(`/home-page/agent-square/get-bot-page-by-type`, {
    params,
  });
};

// 收藏bot
export const collectBot = (params: {
  botId: number;
}): Promise<{ [key: string]: boolean | number | string }> => {
  return http({
    url: `/bot/favorite/create`,
    method: 'POST',
    data: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
};

// 取消收藏bot
export const cancelFavorite = (params: {
  botId: number;
}): Promise<{ [key: string]: boolean | number | string }> => {
  return http({
    url: `/bot/favorite/delete`,
    method: 'POST',
    data: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
};

/* 获得待分享的智能体的key */
export const getAgentShareKey = (params: {
  relateId: string | number;
  relateType: string | number;
}): Promise<{
  [key: string]: string | number;
}> => {
  return http.post('/agent/getShareKey', params);
};

// 获取收藏列表
export const getFavoriteList = (params: any): Promise<FavoriteListResponse> => {
  return http.post('/bot/favorite/list', params);
};

/* 获取助手市场 */
export const getBotMarketList = (
  params: BotMarketParam
): Promise<BotMarketPage> => {
  return http.post(`/bot/page`, params);
};

// 根据botId获取智能体详情
export interface BotDetailResponse {
  agentAvatar?: string;
  avatar?: string;
  agentName?: string;
  bot_name?: string;
  creatorName?: string;
  creator_nickname?: string;
  agentDesc?: string;
  bot_desc?: string;
  isDelete?: number;
}

export const getBotInfoByBotId = (
  botId: number
): Promise<BotDetailResponse> => {
  return http.get(`/bot/detail/${botId}`);
};

export const getTalkAgentConfig = (
  type: string,
  botId: number,
  version?: string
): Promise<any> => {
  return http.get('/workflow/get-talk-agent-config', {
    params: {
      botId,
      version,
      type,
    },
  });
};
