import http from '@/utils/http';

// 创建API Key
export async function createKey(params) {
  return http.post(
    `/xingchen-api/create/?name=${params.name}&desc=${params.desc}`
  ); //改成路径参数
}

// 删除API Key
export async function deleteKey(params) {
  return http.post(`/xingchen-api/delete?keyId=${params}`);
}

// 查询Key下的模型使用量
export async function getModelDetail(key) {
  return http.get(`/xingchen-api/getModelDetail?keyId=${key}`);
}

// 查询空间下的所有Key
export async function searchKeys(params) {
  return http.get(
    `/xingchen-api/search?pageSize=${params.pageSize}&page=${params.page}`
  );
}

// 更新API Key
export async function updateKey(params) {
  return http.post('/xingchen-api/update', params);
}

//查询一个key的详情
export async function getKeyDetail(params) {
  return http.get(`/xingchen-api/detailsByKeyId?keyId=${params}`);
}

//发布相关
export async function createBot(params) {
  return http.post('/xingchen-api/bot/api/createV2', params);
}

//查询bot详情
export async function getBotInfo(params) {
  return http.post(`/xingchen-api/bot/api/infoV2?botId=${params}`);
}

//查询token余额
export async function getTokenLeft() {
  return http.get(`/xingchen-api/userAuth/getTokenLeft`);
}

//查询是否存在旧版本api
export async function hasOldApi(params) {
  return http.get(`/xingchen-api/bot/api/hasOldApi?botId=${params}`);
}

//查询key是否绑定bot
export async function searchBotApiInfoByKeyId(params) {
  return http.get(
    `/xingchen-api/bot/api/searchBotApiInfoByKeyId?keyId=${params}`
  );
}

//回去助手详情
export async function getBotInfoByBotId(params) {
  return http.get(`/xingchen-api/u/bot/v2/info?botId=${params}`);
}
