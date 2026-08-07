import {
  getEnterpriseSearchUsername,
  getEnterpriseUserLimit,
} from '@/services/enterprise';
import { getSpaceSearchUsername, getSpaceUserLimit } from '@/services/space';
import { message } from 'antd';

const DEFAULT_LIMIT = {
  enterprise: 1000,
  space: 48,
};

const methodMap = {
  enterprise: {
    search: getEnterpriseSearchUsername,
    limit: getEnterpriseUserLimit,
  },
  space: {
    search: getSpaceSearchUsername,
    limit: getSpaceUserLimit,
  },
};

// 查询邀请列表
export const searchInviteUsers = async (
  params: any,
  inviteType: string = 'enterprise'
) => {
  const searchFn = methodMap[inviteType as keyof typeof methodMap].search;

  try {
    const res = await searchFn(params);

    if (res && res instanceof Array) {
      return res;
    }

    return [];
  } catch (err: any) {
    message.error(err?.msg || err?.desc);
    return [];
  }
};

// 添加成员数量限制
export const getUserLimit = async (
  inviteType: string = 'enterprise'
): Promise<number> => {
  try {
    const res = await methodMap[inviteType as keyof typeof methodMap].limit();
    return (
      res.data?.remain ??
      DEFAULT_LIMIT[inviteType as keyof typeof DEFAULT_LIMIT]
    );
  } catch (err) {
    return DEFAULT_LIMIT[inviteType as keyof typeof DEFAULT_LIMIT];
  }
};
