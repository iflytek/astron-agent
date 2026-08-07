export type fileType = {
  id: string;
  name: string;
  fileId: number;
  type?: string;
  size?: number;
  createTime: string;
  isFile: number;
  fileInfoV2: any;
};

export type fileListType = {
  pageData: fileType[];
  totalCount: number;
};

export type knowledgeType = {
  id: string;
  name: string;
  description: string;
};

export type appType = {
  appId: string;
  largeModelApplyDetail: any;
  name: string;
  status: number;
};

export type robotType = {
  id: string;
  name: string;
  appId: string;
  createTime: string;
  avatarIcon: string;
  description: string;
  authStatus?: number;
  color: string;
  uuid?: string;
  address: string;
  floated: boolean;
  appDetail: {};
};

export type apiType = {
  apiKey: string;
  apiSecret: string;
};

export type feedbackType = {
  appId: string;
  botId?: string;
  flowId?: string;
  sid: string;
  reason: Array<any>;
  remark?: string;
  action: string;
};

export type resType = {
  code: number;
  message?: string;
  data: any;
};
