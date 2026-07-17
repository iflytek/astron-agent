import http from '@/utils/http';

export async function listFlows(params): Promise<unknown> {
  return http.get('/workflow/list', { params });
}

export async function getFlowInputsInfo(flowId: string): Promise<unknown> {
  return http.get('/workflow/get-inputs-info', { params: { flowId } });
}

export async function createFlowAPI(params): Promise<unknown> {
  return http.post('/workflow', params);
}

export async function deleteFlowAPI(id: number): Promise<unknown> {
  return http.delete(`/workflow?id=${id}`);
}

export async function getFlowDetailAPI(id: string): Promise<unknown> {
  return http.get(`/workflow?id=${id}`);
}

export async function getFlowModelList(appId, nodeType): Promise<unknown> {
  return http.get(
    `/llm/auth-list?appId=${appId}&nodeType=${nodeType}&scene=workflow`
  );
}

export async function copyFlowAPI(id): Promise<unknown> {
  return http.get(`/workflow/clone?id=${id}`);
}

export async function saveFlowAPI(params): Promise<unknown> {
  return http.put('/workflow', params);
}

export async function buildFlowAPI(params): Promise<unknown> {
  return http.post('/workflow/build', params);
}

export async function addComparisons(params): Promise<unknown> {
  return http.post('/workflow/add-comparisons', params);
}

export async function saveDialogueAPI(params): Promise<unknown> {
  return http.post('/workflow/dialog', params);
}

export async function getDialogueAPI(id, type): Promise<unknown> {
  return http.get(`/workflow/dialog/list?workflowId=${id}&type=${type}`);
}

export async function publishFlowAPI(params): Promise<unknown> {
  return http.post('/workflow/publish', params);
}

export async function isCanPublish(id): Promise<unknown> {
  return http.get(`/workflow/can-publish?id=${id}`);
}

export async function canPublishSetNotAPI(id): Promise<unknown> {
  return http.get(`/workflow/can-publish-set-not?id=${id}`);
}

export async function codeRun(params): Promise<unknown> {
  return http.post('/workflow/code/run', params);
}

export async function squareListFlows(params): Promise<unknown> {
  return http.get('/workflow/square', { params });
}

export async function copyPublicFlowAPI(params): Promise<unknown> {
  return http.post('/workflow/public-copy', params);
}

export async function addChatToSet(data): Promise<unknown> {
  return http.post('/eval/set/ver/data/change', data);
}

export async function flowsNodeTemplate(): Promise<unknown> {
  return http.get('/workflow/node-template');
}

//获取文本节点分割符列表
export async function textNodeConfigList(): Promise<unknown> {
  return http.get('/textNode/config/list');
}

//添加文本节点分割符
export async function textNodeConfigSave(params): Promise<unknown> {
  return http.post('/textNode/config/save', params);
}

//清空文本节点分割符
export async function textNodeConfigClear(id): Promise<unknown> {
  return http.get(`/textNode/config/delete?id=${id}`);
}

export async function workflowDialogClear(id, type): Promise<unknown> {
  return http.get(`/workflow/dialog/clear?workflowId=${id}&type=${type}`);
}

export async function workflowReleaseStatusList(flowId): Promise<unknown> {
  return http.get(`/workflow/release/status-list?flowId=${flowId}`);
}

export async function getAiuiAgents(searchKey): Promise<unknown> {
  return http.get(`/workflow/release/aiui/agent-all?searchKey=${searchKey}`);
}

//渠道发布
export async function channelPublish(params): Promise<unknown> {
  return http.post('/workflow/release', params);
}

export async function getReleaseBulletin(flowId): Promise<unknown> {
  return http.get(`/workflow/release/bulletin?flowId=${flowId}`);
}

export async function getReleaseChannelInfo(flowId, channel): Promise<unknown> {
  return http.get(
    `/workflow/release/channel-info?flowId=${flowId}&channel=${channel}`
  );
}

export async function regenAksk(params): Promise<unknown> {
  return http.post('/common/regen-aksk', params);
}

export async function getReleaseChannelStatus(
  flowId,
  channel
): Promise<unknown> {
  return http.get(
    `/workflow/release/status?flowId=${flowId}&channel=${channel}`
  );
}

export async function getAgentStrategyAPI(): Promise<unknown> {
  return http.get('/workflow/get-agent-strategy');
}

export async function getKnowledgeProStrategyAPI(): Promise<unknown> {
  return http.get('/workflow/get-knowledge-pro-strategy');
}

export async function getBotStatisticsInfoByBotld(botId): Promise<unknown> {
  return http.get(`/bot/get-bot-statistics-info-by-bot-id?botId=${botId}`);
}

// 编辑已上架bot
export async function getBotUsage(params): Promise<unknown> {
  return http.post('/bot/get-use-count', params);
}

// 错误数据看板
export async function getErrorNodeList(params): Promise<unknown> {
  return http.post('/u/bot/v2/data-analysis/error-node-list', params);
}

//获取bot详情
export async function getBotInfo(params): Promise<unknown> {
  return http.post('/bot/bot-detail', params);
}

//同步flow数据到开放平台
export async function getInputsType(params): Promise<unknown> {
  return http.post('/workflow/bot/get-inputs-type', params);
}

//工作流导入
export async function workflowImport(params): Promise<unknown> {
  return http.post('/workflow/import', params, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

//工作流临时版本删除
export async function workflowDeleteComparisons(params): Promise<unknown> {
  return http.post('/workflow/delete-comparisons', params);
}

// 获取测评任务状态
export async function getEvaluateStatus(params): Promise<unknown> {
  return http.get('/eval/task/get-status', { params });
}

// 工作流一键更新
export async function getLatestWorkflow(params): Promise<unknown> {
  return http.get('/workflow/get-max-version', { params });
}

//workflow上传流式图片接口
export async function commonUploadUserIcon(params): Promise<unknown> {
  return http.post('/common/upload/user-icon', params, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

//Workflow导出
export async function workflowExport(id): Promise<unknown> {
  return http.get(`/workflow/export/${id}`);
}
