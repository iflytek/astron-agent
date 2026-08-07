import http from '../utils/http';
import qs from 'qs';
import { Base64 } from 'js-base64';
import { VCNTrainingText } from '@/components/speaker-modal/voice-training';
import { MyVCNItem } from '@/components/speaker-modal';

/**
 * 更新用户个人资料
 * @param formData 表单数据，昵称必填*
 * @returns
 */
export const uploadUserProfile = (formData: FormData): Promise<any> =>
  http.put(`/user/profile/update`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 20000,
  });

export const updateUserInfo = ({
  nickname,
  avatar,
}: {
  nickname: string;
  avatar: string;
}): Promise<any> => {
  return http.post(`/user-info/update`, { nickname, avatar });
};

// 拒绝邀请
export const refuseInvite = (params: any): Promise<any> => {
  return http.post(`/invite-record/refuse-invite?inviteId=${params.inviteId}`);
};

// 接受邀请
export const acceptInvite = (params: any): Promise<any> => {
  return http.post(`/invite-record/accept-invite?inviteId=${params.inviteId}`);
};

// 邀请记录信息
export const getInviteByParam = (params: any): Promise<any> => {
  return http.get(`/invite-record/get-invite-by-param?param=${params}`);
};

// b编辑个人中心用户名
export const modifyNickname = (params: any): Promise<any> => {
  return http.post(`/modifyNickname`, params);
};

// ai生成助手封面图
export const aiGenerateCover = (params: any): Promise<any> => {
  return http.post(`/bot/ai-avatar-gen `, params);
};

export interface ModelListData {
  isCustom: boolean;
  modelDomain: string;
  modelName: string;
  modelId: string;
  modelIcon: string;
  model?: string;
}
// 获取模型列表
export const getModelList = (): Promise<ModelListData[]> => {
  return http.get(`/bot/bot-model`);
};

// 上传图片
export const uploadBotImg = (formData: FormData): Promise<any> => {
  return http.post(`/personality/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// 检查用户信息
export const checkUserInfo = () => {
  let referOrigin = '';
  try {
    referOrigin = Base64.encode(window.location.href);
  } catch (e) {
    referOrigin = '';
  }
  // register_from
  const register_from = localStorage.getItem('registerFrom') || '';
  return http.get(
    `/checkUser${register_from ? `?register_from=${register_from}` : ''}`,
    {
      headers: {
        Referorigin: referOrigin,
      },
    }
  );
};

export const getCaptcha = () => {
  return http.get(`/chat/gee-captcha`);
};

// 清除助手对话历史
export const clearBotChatHistory = (chatId: any, botId: any) => {
  return http.get(`/u/bot/v2/restart?botId=${botId}&chatId=${chatId}`);
};

// bot
export const getBotDetailInfo = (params: any) => {
  return http.get(`/bot/getBotInfo?chatId=${params.chatId}`);
};

export const clearParameter = (params: any) => {
  return http.request({
    url: '/u/bot/v2/clear-parameter',
    method: 'post',
    data: params,
  });
};

/** 点赞智能体 */
export const likeAgent = (botId: any) => {
  return http.post(`/bot/like/create?botId=${botId}`);
};

/** 取消点赞智能体 */
export const cancelLikeAgent = (botId: any) => {
  return http.post(`/bot/like/cancel?botId=${botId}`);
};

export const errorFeedback = (params: any) => {
  return http.request({
    url: '/u/bot/v2/errorFeedback',
    method: 'post',
    data: params,
  });
};

// 绘本key值
export const getStoryKey = (params: any): Promise<any> => {
  return http.get(`/u/bot/story/share_key?bookId=${params}`);
};

//创作中心申请历史
export const getMyApplyHistory = (params: any) => {
  return http.request({
    url: '/bot/check-list',
    method: 'POST',
    data: params,
  });
};

//助手创作中心获取我创建的助手
export const getMyCreateBotList = (params: any) => {
  return http.request({
    url: '/bot/created-list',
    method: 'POST',
    data: params,
  });
};

//删除申请上架记录
export const removeBotApplyRecord = (params: any) => {
  return http.post(`/bot/remove-bot`, params);
};

//提交助手审核
export const sendApplyBot = (params: any): Promise<{ botId: number }> => {
  return http.request({
    url: '/bot/send-approval',
    method: 'POST',
    data: params,
  });
};

//获取bot详情
export const getBotInfo = (params: any) => {
  return http.post(`/my-bot/bot-detail?botId=${params.botId}`);
};

//创作中心申请历史
export const releasedBotWithChannel = (params: any) => {
  return http.request({
    url: '/bot/releasedBotWithChannel',
    method: 'POST',
    data: params,
  });
};

// 获取bot类型
export const getBotType = () => {
  return http.post(`/bot/type-list`);
};

// WorkFlow智能体创建 (助手2.0的基本信息保存)
export const submitBotBaseInfo = (params: any): Promise<any> => {
  // return http.post(`/u/bot/v2/base-save`, params);
  return http.post(`/workflow/base-save`, params);
};

export const cancelBindWx = (params: any) => {
  return http.post('/bot/offiaccount/unbind', params);
};

// 从星辰来的发布
export const publish = (params: any) => {
  return http.post(`/u/bot/v2/publish`, params);
};

// 根据botId获取助手2.0的chain信息
export const getChainInfo = (params: any): Promise<any> => {
  return http.get(`/u/bot/v2/info?botId=${params}`);
};

// 获取微信授权链接
export const getWechatAuthUrl = (
  botId: any,
  appid: string,
  redirectUrl: string
) => {
  return http.get(
    `/bot/offiaccount/auth-url/get?botId=${botId}&appid=${appid}&redirectUrl=${redirectUrl}`
  );
};

// 点击调试前
export const getInputsType = (params: any) => {
  return http.post(`/xingchen-api/u/bot/v2/getInputsType`, params);
};

// mcp发布
export const publishMCP = (params: any) => {
  return http.post(`/publishMCP`, params);
};

// mcp概览
export const getMcpContent = (params: any) => {
  return http.post(`/getMcpContent`, params);
};

// 助手api
// 是否实名认证
export const getApiCertInfo = (): Promise<boolean> => {
  return http.get(`/bot/api/cert/info`);
};

// 获取api列表
export const getApiList = (): Promise<any[]> => {
  return http.get(`/publish-api/app-list`);
};

// 获取订单列表
export const getOrderList = (): Promise<any[]> => {
  return http.get(`/userAuth/getBindableOrderId`);
};

// api详情
export const getApiInfo = (botId: string) => {
  return http.get(`/publish-api/get-bot-api-info?botId=${botId}`);
};

// 获取api 实时用量
export const getApiUsage = (botId: any) => {
  return http.post(`/publish-api/usage-real-time?botId=${botId}`);
};

// 创建助手api
export const createApi = (params: { botId: string; appId: string }) => {
  return http.post(`/publish-api/create-bot-api`, params);
};

// create app of user
export const createApp = (params: any) => {
  return http.post(`/publish-api/create-user-app`, params);
};

// 获取api 历史用量
export const getApiHistory = (botId: any, type: number): Promise<any> => {
  return http.get(`/bot/api/usage/history?botId=${botId}&type=${type}`);
};

// web应用
// 获取信息
export const getWebAppInfo = (
  botId: any
): Promise<{ url: string; botwebStatus: number }> => {
  return http.get(`/bot/web/info?botId=${botId}`);
};

// swicth app
export const switchWebApp = (botId: any, status: number) => {
  return http.post(`/bot/web/switch?botId=${botId}&status=${status}`);
};

// 用量监控
export const getWebAppUsage = (botId: any) => {
  return http.get(`/bot/web/usage?botId=${botId}&type=1`);
};

// 用量监控chart
export const getWebAppUsageChart = (
  type: 'message' | 'new' | 'pv' | 'active',
  botId: any,
  daytype: number
): Promise<any> => {
  return http.get(`/bot/web/usage/${type}?botId=${botId}&type=${daytype}`);
};

// 用量监控
export const aiGenPrologue = (name: any) => {
  return http.post(`/bot/ai-prologue-gen`, name);
};

// 一句话创建助手
export const quickCreateBot = (str: string) => {
  const formData = new FormData();
  formData.append('sentence', str);
  return http({
    url: `/bot/ai-sentence-gen`,
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// 模板创建
export const createFromTemplate = (params: any) => {
  return http.post(`/workflow/bot/createFromTemplate`, params);
};

// 获取星辰模版
export const exportWorkflowTemplate = (params: {
  workflowId: number | string;
}): Promise<any> => {
  return http.post(`/workflow/bot/exportTemplate`, params);
};

export const exportWorkflowSkill = (params: {
  botId: number | string;
  workflowId: number | string;
  workflowName: string;
  workflowDescription: string;
}): Promise<{
  fileName: string;
  content: string;
  aiGeneratedMetadata: boolean;
}> => {
  return http.post(`/workflow/bot/exportSkill`, params);
};

export const deleteWorkflowTemplate = (
  templateId: number | string
): Promise<any> => {
  return http.delete(`/workflow/bot/template/${templateId}`);
};

export const getStarTemplate = (params: any): Promise<any> => {
  return http.post(`/workflow/bot/templateList`, params);
};
// 获取星辰模版分类
export const getStarTemplateGroup = (): Promise<any> => {
  return http.get(`/workflow/bot/templateGroup`);
};

// 获取知识库信息源
export const getDataSource = () => {
  return http.get('/dataset/getDataset');
};

// 生成输入示例
export const generateInputExample = (params: any) => {
  return http({
    url: `/bot/generate-input-example`,
    method: 'POST',
    data: params,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// 新增bot
export const insertBot = (params: any) => {
  return http.post(`/bot/create`, params);
};

// 编辑bot
export const updateBot = (params: any) => {
  return http.post(`/bot/update`, params);
};

// 知识库
export const listRepos = () => {
  return http.get(
    `/repo/list?pageNo=1&pageSize=999&content=&orderBy=create_time`
  );
};

// 获取模版数据
export const getBotTemplate = (botId?: any) => {
  return http.get(`/bot/template${botId ? `?botId=${botId}` : ''}`);
};

// 生成开场白
export const generatePrologue = (params: { name: string; botDesc: string }) => {
  return http.post(`/bot/ai-prologue-gen`, params);
};

// 编辑已上架bot
export const updateDoneBot = (params: any) => {
  return http.post(`/bot/update-market-bot`, params);
};

// promptL列表
export const promptList = (params: any) => {
  return http({
    url: `/prompt/manage/list`,
    method: 'POST',
    data: params,
    // headers: {
    //   "Content-Type": "multipart/form-data"
    // },
  });
};

// 创建默认prompt
export const createPrompt = (params: any) => {
  return http({
    url: `/prompt/manage/create`,
    method: 'POST',
    data: params,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// 删除prompt
export const deletePrompt = (params: any) => {
  return http({
    url: `/prompt/manage/delete`,
    method: 'POST',
    data: params,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// export const getInter = (params: any): Promise<any> => {
//   return http.post(`/llm/inter1?id=${params.id}&llmSource=${params.llmSource}`);
// };
//获取分析页数据 -- unused
export const getAnalysisData = (params: any) => {
  return http.get(
    `/dashboard/details?botId=${params.botId}&overviewDays=${params.overviewDays}&channelDays=${params.channelDays}`
  );
};

/** 获取分析页数据01  */
export const getAnalysisData01 = (params: any) => {
  return http.get(
    `/publish/bots/${params.botId}/timeseries?days=${params.overviewDays}`
  );
};

/** 获取分析页数据02  */
export const getAnalysisData02 = (params: any) => {
  return http.get(`/publish/bots/${params.botId}/summary`);
};

// prompt详情
export const promptDetail = (params: any) => {
  return http({
    url: `/prompt/manage/detail`,
    method: 'POST',
    data: params,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// prompt保存
export const promptSave = (params: any) => {
  return http.post(`/prompt/manage/save`, params);
};

// prompt发布
export const promptCommit = (params: any) => {
  return http.post(`/prompt/manage/commit`, params);
};

// prompt历史列表
export const listVersion = (params: any) => {
  return http({
    url: `/prompt/manage/listVersion`,
    method: 'POST',
    data: params,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// 还原prompt为此版本
export const promptBack = (params: any) => {
  return http({
    url: `/prompt/manage/revert`,
    method: 'POST',
    data: params,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/** ## 工作流发布版本列表 */
export const getVersionList = (params: any) => {
  return http.get(
    `/publish/bots/${params.botId}/versions?size=${params.size}&page=${params.current}`
  );
};

///是否有权限在api页面进行修改
export const getHasEditor = () => {
  return http.get(`/bot/api/hasEditor`);
};

export const getSceneList = () => {
  return http.post(`/talkAgent/getSceneList`);
};

export const getSignedUrl = () => {
  return http.get(`/talkAgent/signature`);
};

//
export const getVCNList = () => {
  return http.post(`/talkAgent/getVCNList`);
};
//
export const createTalkAgent = (params: any) => {
  return http.post(`/talkAgent/create`, params);
};

//
export const updateTalkAgent = (params: any) => {
  return http.post(`/talkAgent/updateConfig`, params);
};
//
export const upgradeWorkflow = (params: any) => {
  return http.post(`/talkAgent/upgradeWorkflow`, params);
};

/**
 * @description 创建一句话复刻任务
 */
export const createOnceTrainTask = (params: {
  language?: string;
  sex: number;
  segId: number;
  formData: FormData;
}): Promise<{ id: string }> => {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined)
  );
  return http({
    url: `/speaker/train/create?${qs.stringify(filteredParams)}`,
    method: 'POST',
    data: params.formData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
};

/**
 * @description get my vcn list
 */
export const getMySpeakerList = (): Promise<MyVCNItem[]> => {
  return http.get(`/speaker/train/train-speaker`);
};

/**
 * @description delete my speaker
 */
export const deleteMySpeaker = ({ id }: { id: number }): Promise<{}> => {
  return http.post(`/speaker/train/delete-speaker?id=${id}`);
};

/**
 * @description update my speaker name
 */
export const updateMySpeaker = (params: {
  id: number;
  name: string;
}): Promise<{}> => {
  return http.post(
    `/speaker/train/update-speaker?id=${params.id}&name=${params.name}`
  );
};

/**
 * @description 获取发音人训练文本
 */
export const getVCNTrainingText = (): Promise<{
  textSegs: VCNTrainingText[];
}> => {
  return http.get(`/speaker/train/get-text`);
};
