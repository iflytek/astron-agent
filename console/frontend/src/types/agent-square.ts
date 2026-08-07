/**
 * 助手
 */
interface Bot {
  /** 助手Id */
  botId: number;
  /** 关联用户uid的历史对话Id */
  chatId: string;
  /** 助手名称 */
  botName: string;
  /** 助手类型 */
  botType: number;
  /** 助手封面url */
  botCoverUrl: string;
  /** 助手prompt */
  prompt: string;
  /** 助手描述 */
  botDesc: string;
  /** 是否收藏 */
  isFavorite: boolean;
  /** 助手创作者 */
  creator: string;
  createTime?: string;
  version?: number;
  hotNum?: number;
}

interface BotListPage {
  /** 存储助手信息的列表 */
  pageData: Bot[];
  /** 总记录数（以字符串形式返回） */
  totalCount: number;
  /** 每页显示的条数（以字符串形式返回） */
  pageSize: number;
  /** 当前页码（以字符串形式返回） */
  page: number;
  /** 总页数（以字符串形式返回） */
  totalPages: number;
  /** 最大限制条数（以字符串形式返回） */
  maxLimit: number;
}

interface BotType {
  /** 助手类型编码 */
  typeKey: number;
  /** 助手类型名称 */
  typeName: string;
  /** 助手类型图标URL */
  icon: string;
  /** 助手类型英文名 */
  typeNameEn: string;
}

interface SearchBotParam {
  search: string;
  page: number;
  pageSize: number;
  type: number;
}

interface Banner {
  src: string;
  srcEn: string;
  url: string;
  isOpen: boolean;
}

/**
 * 获取助手市场列表入参
 */
interface BotMarketParam {
  searchValue: string;
  botType: string;
  official: number;
  pageIndex: number;
  pageSize: number;
}

/**
 * 获取助手市场列表返回数据项
 */
interface BotMarketItem {
  bot: Bot;
}

/**
 * 获取助手市场列表返回
 */
interface BotMarketPage {
  pageList: (BotMarketItem | undefined)[];
  total: number;
}

export type {
  Bot,
  BotListPage,
  BotType,
  SearchBotParam,
  Banner,
  BotMarketParam,
  BotMarketPage,
};
