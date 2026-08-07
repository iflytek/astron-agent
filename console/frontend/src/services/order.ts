import http from '../utils/http';
import qs from 'qs';

/** ## 获取用户权益 -- NOTE: 提供给免费用户权益*/
export const getUserAuth = (): Promise<any> => {
  return http.post(`/userAuth/addDefault`);
};

type orderListParams = {
  page: string;
  pageSize: string;
};

/** ## 获取订单列表 */
export const getOrderList = ({
  page,
  pageSize,
}: orderListParams): Promise<any> => {
  return http.get(`/userAuth/getOrder?page=${page}&pageSize=${pageSize}`);
};

/** ## 获取非模型资源的使用情况 -- NOTE: orderManagement 页使用，已废弃 */
export const getResourceUsage = (): Promise<any> => {
  return http.get(`/userAuth/getDetail`);
};

/** ## 获取模型资源的使用情况 -- NOTE: orderManagement 页使用，已废弃 */
export const getModelResourceUsage = (): Promise<any> => {
  return http.get(`/userAuth/getModelDetail`);
};

// 获取用户当前使用的权益
export const getUserMeta = (): Promise<any> => {
  return http.get('/userAuth/getOrderMeta');
};

/** ## 获取用户当前团队的权益/套餐 */
export const getTeamMeta = (): Promise<any> => {
  return http.get('/userAuth/getTeamOrderMeta');
};

type ModelUsageParams = {
  page: number;
  pageSize: number;
  appId?: string;
};

/** ## 个人空间 获取大模型统计用量 */
export const getModelUsage = ({
  page,
  pageSize,
  appId,
}: ModelUsageParams): Promise<any> => {
  return http.get(
    `/userAuth/getModelDetailByUid?page=${page}&pageSize=${pageSize}&appId=${appId}`
  );
};

/** ## 团队空间 获取大模型统计用量 */
export const getTeamModelUsage = ({
  page,
  pageSize,
  appId,
}: ModelUsageParams): Promise<any> => {
  return http.get(
    `/userAuth/getModelDetailByEnterpriseId?page=${page}&pageSize=${pageSize}&appId=${appId}`
  );
};

/** ## 个人空间 获取知识库和成员用量 */
export const getKnowledgeUsage = (): Promise<any> => {
  return http.get('/userAuth/getDetailByUid');
};

/** ## 团队空间 获取知识库和成员用量 */
export const getTeamKnowledgeUsage = (): Promise<any> => {
  return http.get('/userAuth/getDetailByEnterpriseId');
};

/** ## 获取是否为特定用户 get /user/profile/specialUser */
export const getSpecialUser = (): Promise<any> => {
  return http.get('/user/profile/specialUser');
};
