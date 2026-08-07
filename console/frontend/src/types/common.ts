export type AvatarType = {
  id: number;
  category: string;
  code: string;
  name: string;
  value: string;
  isValid: number;
  remarks: string;
  createTime: string;
  updateTime: string;
};

export type UserApp = {
  appId: string;
  appName: string;
  appDescribe?: string;
  appKey: string;
  appSecret: string;
  createTime?: string;
  updateTime?: string;
};
