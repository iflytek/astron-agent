import { shouldShowRequestError } from '@/utils/http-error';
import { getEnterpriseSearchUsername } from '@/services/enterprise';
import { getSpaceSearchUsername, getSpaceUserLimit } from '@/services/space';
import { message } from 'antd';

const methodMap = {
  enterprise: getEnterpriseSearchUsername,
  space: getSpaceSearchUsername,
};

// 查询邀请列表
export const searchInviteUsers = async (
  params: any,
  inviteType: string = 'enterprise'
) => {
  const searchFn = methodMap[inviteType as keyof typeof methodMap];

  try {
    const res = await searchFn(params);

    if (res && res instanceof Array) {
      return res;
    }

    return [];
  } catch (err: any) {
    shouldShowRequestError(err) && message.error(err?.msg || err?.desc);
    return [];
  }
};

// 添加成员数量限制
export const getPersonalSpaceLimit = async (): Promise<number> => {
  try {
    const res = (await getSpaceUserLimit()) as unknown as { remain: number };
    return res.remain;
  } catch (err) {
    return 0;
  }
};
