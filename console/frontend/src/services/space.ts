import http from '../utils/http';
import { objectToQueryString } from '@/utils';
import { SpaceItem } from '@/types/space';

//个人空间创建
export const personalSpaceCreate = (params: any) => {
  return http.post('/space/create-personal-space', params);
};

//获取个人全部空间
export const getAllSpace = (name?: string) => {
  const params = name ? { name } : {};
  return http.get('/space/personal-list', { params });
};

//访问空间
export const visitSpace = (params: any) => {
  return http.get(`/space/visit-space?spaceId=${params}`);
};

//最近访问列表
export const getRecentVisit = () => {
  return http.get('/space/recent-visit-list');
};

//我创建的空间
export const getMyCreateSpace = (name?: string) => {
  const params = name ? { name } : {};
  return http.get('/space/personal-self-list', { params });
};

//个人创建空间
export const createPersonalSpace = (params: any) => {
  return http.post('/space/create-personal-space', params);
};

// 编辑个人空间
export const updatePersonalSpace = (params: any) => {
  return http.post('/space/update-personal-space', params);
};

//个人空间删除
export const deletePersonalSpace = (params: {
  spaceId: string;
  mobile: string;
  verifyCode: string;
}) => {
  return http.delete(
    `/space/delete-personal-space${objectToQueryString(params)}`
  );
};

//删除空间发送验证码
export const deleteSpaceSendCode = ({ spaceId }: { spaceId: string }) => {
  return http.get(
    `/space/send-message-code${objectToQueryString({ spaceId })}`
  );
};

// 空间创建，名称重复校验
export const checkSpaceName = (params: { name: string; id?: string }) => {
  return http.get('/space/check-name', { params });
};

// 空间详情
export const getSpaceDetail = () => {
  return http.get('/space/detail');
};

// 获取空间成员列表
export const getSpaceMemberList = (params: {
  nickname: string;
  pageNum: number; // 当前页码
  pageSize: number; // 每页条数
  role?: number; // 角色
}) => {
  return http.post('/space-user/page', params);
};

/**
 * 企业空间
 */
// 获取全部企业空间 /space/corporateList
export const getAllCorporateList = (params?: any): Promise<SpaceItem[]> => {
  return http.get('/space/corporate-list', { params });
};

// 获取我加入的企业空间
export const getJoinedCorporateList = (params?: any): Promise<SpaceItem[]> => {
  return http.get('/space/corporate-join-list', { params });
};

// 创建企业空间
export const createCorporateSpace = (params: any) => {
  return http.post('/space/create-corporate-space', params);
};

// 编辑企业空间
export const updateCorporateSpace = (params: any) => {
  return http.post('/space/update-corporate-space', params);
};

// 删除企业空间
export const deleteCorporateSpace = (params: {
  spaceId: string;
  mobile: string;
  verifyCode: string;
}) => {
  return http.delete(
    `/space/delete-corporate-space${objectToQueryString(params)}`
  );
};

// 最近访问空间
export const getLastVisitSpace = () => {
  return http.get(`/space/get-last-visit-space`);
};

// 空间邀请搜索 /inviteRecord/spaceSearchUser
export const getSpaceSearchUser = (params: any) => {
  return http.get('/invite-record/space-search-user', { params });
};

export const getSpaceSearchUsername = (params: any) => {
  return http.get('/invite-record/space-search-username', { params });
};

//修改空间用户角色
export const updateUserRole = (params: { uid: number; role: number }) => {
  return http.post('/space-user/update-role', null, { params });
};

//删除空间用户角色
export const deleteUser = (params: { uid: number }) => {
  return http.delete(`/space-user/remove${objectToQueryString(params)}`);
};

// 离开空间
export const leaveSpace = () => {
  return http.post('/space-user/quit-space');
};

// 邀请进入空间 /inviteRecord/spaceInvite
export const spaceInvite = (params: any) => {
  return http.post('/invite-record/space-invite', params);
};

// 撤回邀请进入空间 /inviteRecord/revokeSpaceInvite
export const revokeSpaceInvite = (params: any) => {
  return http.post(
    `/invite-record/revoke-space-invite${objectToQueryString(params)}`
  );
};

// 空间邀请列表 /inviteRecord/spaceInviteList
export const getSpaceInviteList = (params: any) => {
  return http.post('/invite-record/space-invite-list', params);
};

// 申请加入企业空间 /applyRecord/joinEnterpriseSpace
export const joinEnterpriseSpace = (params: any) => {
  return http.post(
    `/apply-record/join-enterprise-space${objectToQueryString(params)}`
  );
};

// 同意申请加入企业空间 /applyRecord/agreeEnterpriseSpace
export const agreeEnterpriseSpace = (params: any) => {
  return http.post(
    `/apply-record/agree-enterprise-space${objectToQueryString(params)}`
  );
};

// 拒绝申请加入企业空间 /applyRecord/refuseEnterpriseSpace
export const refuseEnterpriseSpace = (params: any) => {
  return http.post(
    `/apply-record/refuse-enterprise-space${objectToQueryString(params)}`
  );
};

// 获取企业空间申请列表 /applyRecord/page
export const getApllyRecord = (params: any) => {
  return http.post('/apply-record/page', params);
};

// 查询企业空间所有成员(非所有者)
export const getEnterpriseSpaceMemberList = () => {
  return http.get('/space-user/list-space-member');
};

// 转让空间
export const transferSpace = (params: any) => {
  return http.post(`/space-user/transfer-space${objectToQueryString(params)}`);
};

// 获取空间用户限制
export const getSpaceUserLimit = () => {
  return http.get('/space-user/get-user-limit');
};

// 获取企业全部空间数量 /space/corporateCount
export const getCorporateCount = () => {
  return http.get('/space/corporate-count');
};
