import http from '../utils/http';
import { objectToQueryString } from '@/utils';

// 校验是否需要创建团队 /enterprise/checkNeedCreateTeam
export const checkNeedCreateTeam = () => {
  return http.get('/enterprise/check-need-create-team');
};

// 校验团队名称重复 /enterprise/checkName
export const checkEnterpriseName = (params: { name: string; id?: string }) => {
  return http.get('/enterprise/check-name', { params });
};

// 创建团队 /enterprise/create
export interface CreateEnterpriseParams {
  name: string;
  avatarUrl?: string;
}

export const createEnterprise = (params: CreateEnterpriseParams) => {
  return http.post('/enterprise/create', params);
};

// 修改企业团队名 /enterprise/updateName
export const updateEnterpriseName = (params: any) => {
  return http.post(`/enterprise/update-name${objectToQueryString(params)}`);
};

// 获取企业团队详情 /enterprise/detail
export const getEnterpriseDetail = () => {
  return http.get('/enterprise/detail');
};

// 加入的团队列表 get /enterprise/joinList
export const getEnterpriseJoinList = () => {
  return http.get('/enterprise/join-list');
};

// 搜索查询邀请的用户列表 /inviteRecord/enterpriseSearchUser
export const getEnterpriseSearchUsername = (params: any) => {
  return http.get('/invite-record/enterprise-search-username', {
    params,
  });
};

// 邀请加入企业团队 /inviteRecord/enterpriseInvite
export const enterpriseInvite = (params: any) => {
  return http.post(`/invite-record/enterprise-invite`, params);
};

// 获取团队成员列表 /enterpriseUser/page
export const getEnterpriseMemberList = (params: any) => {
  return http.post('/enterprise-user/page', params);
};

// 企业团队-移除用户 /enterpriseUser/remove
export const removeEnterpriseUser = (params: { uid: string }) => {
  return http.delete(`/enterprise-user/remove${objectToQueryString(params)}`);
};

// 企业团队-修改用户角色 /enterpriseUser/updateRole
export const updateEnterpriseUserRole = (params: any) => {
  return http.post(
    `/enterprise-user/update-role${objectToQueryString(params)}`
  );
};

// 企业团队-撤回邀请 /inviteRecord/revokeEnterpriseInvite
export const revokeEnterpriseInvite = (params: any) => {
  return http.post(
    `/invite-record/revoke-enterprise-invite${objectToQueryString(params)}`
  );
};

// 获取企业团队-邀请列表 /inviteRecord/enterpriseInviteList
export const getEnterpriseInviteList = (params: any) => {
  return http.post('/invite-record/enterprise-invite-list', params);
};

// 离开团队 / 企业 (接口未实现)
export const leaveTeam = (params: any) => {
  return http.post(`/enterprise/leave${objectToQueryString(params)}`);
};

// 更新企业头像 /enterprise/updateAvatar
export const updateEnterpriseAvatar = (avatarUrl: string) => {
  return http.post(`/enterprise/update-avatar?avatarUrl=${avatarUrl}`);
};
export const quitEnterprise = () => {
  return http.post('/enterprise-user/quit-enterprise');
};

// 团队邀请限制获取
export const getEnterpriseUserLimit = () => {
  return http.get('/enterprise-user/get-user-limit');
};

// 团队批量导入
export const batchImportEnterpriseUsername = (
  params: any,
  options: { signal?: AbortSignal } = {}
) => {
  return http.post('/invite-record/enterprise-batch-search-username', params, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal: options.signal, // 传递 AbortSignal
  });
};

// 访问企业团队
export const visitEnterprise = (enterpriseId: string) => {
  return http.get(`/enterprise/visit-enterprise?enterpriseId=${enterpriseId}`);
};

// 开源 升级套餐
export const upgradeCombo = () => {
  return http.post('/space/oss-version-user-upgrade'); // todo 替换为后端接口地址
};
