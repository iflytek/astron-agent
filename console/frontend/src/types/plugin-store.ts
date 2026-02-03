import React from 'react';
//插件广场插件列表参数
interface ListToolSquareParams {
  search?: string;
  favoriteFlag?: number;
  content?: string;
  tags?: string | number;
  orderFlag?: number;
  page?: number;
  tagFlag?: number | string;
  pageSize?: number;
}

//插件广场收藏插件参数
interface EnableToolFavoriteParams {
  toolId?: string | undefined;
  favoriteFlag: number;
  isMcp?: boolean;
}

//插件广场插件
interface Tool {
  id: string;
  toolId?: string;
  avatar: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isMcp?: boolean;
  mcpTooId?: string;
  isFavorite?: boolean;
  favoriteCount?: number;
  address: string;
  icon?: string;
  heatValue: number;
}
//插件广场展示分类
interface Classify {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
interface GetToolDetailParams {
  id: string;
}

interface DebugToolParams {
  id: number | string;
  input?: string;
  output?: string;
  description: string;
  endPoint: string;
  authType: number;
  method: string;
  visibility: number;
  creationMethod: number;
  webSchema: string;
  name: string;
  authInfo?: string;
}

interface DebugInputBase {
  default: string | boolean | number;
  description: string;
  from: number;
  id: string;
  location: string;
  name: string;
  open: boolean;
  required?: boolean;
  type: string;
  children?: DebugInput[]; // 注意：此处引用了最终的 DebugInput，需确保类型定义顺序正确
  defalutDisabled?: boolean;
  fatherType?: string;
  fatherId?: string;
}

// 2. 定义“映射类型字段”（SplicedKey 由 BaseKey 拼接生成）
type BaseKey = keyof DebugInputBase; // 基于基础接口的 key 生成 BaseKey
type SplicedKey = `${BaseKey}ErrMsg`; // 拼接生成新 key（如 defaultErrMsg、descriptionErrMsg）
type DebugInputSplicedFields = {
  [k in SplicedKey]?: string; // 映射类型：每个 SplicedKey 对应可选的 string 类型
};

// 3. 交叉合并两个类型，得到最终的 DebugInput 类型
type DebugInput = DebugInputBase & DebugInputSplicedFields;

/**
 * 插件数据类型定义
 */
interface ToolDetail {
  /** 工具唯一ID（数字标识） */
  id: number;
  /** 工具标识（格式：tool@xxx） */
  toolId: string;
  /** 工具名称（如“聚合搜索”） */
  name: string;
  /** 工具功能描述 */
  description: string;
  /** 工具资源存储地址（OSS地址） */
  address: string;
  /** 工具关联的应用ID */
  appId: string;
  /** 授权信息（当前为空字符串，无授权数据） */
  authInfo: string;
  /** 授权类型（数字枚举，1 为其中一种授权类型） */
  authType: number;
  /** 头像颜色（无颜色时为 null） */
  avatarColor?: string;
  /** 机器人使用该工具的次数 */
  botUsedCount: number;
  /** 关联的机器人列表（当前无数据，为 null） */
  bots: string;
  /** 工具创建时间（格式：YYYY-MM-DD HH:mm:ss） */
  createTime: string;
  /** 创建方式（数字枚举，1 为其中一种创建方式） */
  creationMethod: number;
  /** 工具创建者姓名 */
  creator: string;
  /** 是否删除（false 表示未删除，true 表示已删除） */
  deleted: boolean;
  /** 展示来源（逗号分隔的字符串，如“1,2”表示多个来源） */
  displaySource: string;
  /** 工具接口端点（请求地址） */
  endPoint: string;
  /** 工具被收藏的次数 */
  favoriteCount: number;
  /** 热度值（当前无数据，为 null） */
  heatValue: number;
  /** 工具图标地址（相对路径或URL） */
  icon: string;
  /** 当前用户是否收藏该工具（false 表示未收藏） */
  isFavorite: boolean;
  /** 是否为MCP相关工具（false 表示非MCP工具） */
  isMcp: boolean;
  /** 是否公开（true 表示公开可访问） */
  isPublic: boolean;
  /** MCP工具ID（非MCP工具时为 null） */
  mcpTooId?: string;
  /** 接口请求方法（HTTP方法，此处固定为“post”） */
  method: string;
  /** 操作ID（工具的唯一操作标识） */
  operationId: string;
  /** 数据 schema 定义（当前为空字符串，无schema配置） */
  schema: string;
  /** 工具来源（数字枚举，1 为其中一种来源） */
  source: number;
  /** 空间ID（无关联空间时为 null） */
  spaceId?: string;
  /** 工具状态（数字枚举，1 表示正常状态） */
  status: number;
  /** 工具标签（当前无数据，为 null） */
  tags?: string[];
  /** 临时数据（当前无临时数据，为 null） */
  temporaryData?: string;
  /** 工具标签ID（数字字符串形式） */
  toolTag: string;
  top: number;
  /** 工具更新时间（格式：YYYY-MM-DD HH:mm:ss） */
  updateTime: string;
  /** 工具使用次数（当前为 0，未被使用） */
  usageCount: number;
  /** 工具创建者的用户ID */
  userId: string;
  /** 工具版本（当前无版本信息，为 null） */
  version?: string;
  /** 可见性（数字枚举，0 表示默认可见性） */
  visibility: number;
  /** Web端数据 schema 定义（当前为空字符串，无Web端schema配置） */
  webSchema: string;
  location: string;
  parameterName: string;
  serviceToken: string;
  childName: string;
}

//InputSchema的properties的类型
interface SchemaProperty {
  type: string;
  description: string;
  enum?: string[];
  default?: unknown;
}
/**
 * 工具输入参数的 JSON Schema 类型定义
 * 描述参数的结构、必填项与属性约束
 */
interface InputSchema {
  /** 数据类型（此处固定为 "object"，表示参数是一个对象） */
  type: string;
  /** 必填参数的字段名列表（此处包含 "name"） */
  required: string[];
  /** 参数属性的详细定义 */
  properties: Record<string, SchemaProperty>;
  // {
  //   /** "name" 参数的定义 */
  //   name: {
  //     /** "name" 参数的描述说明 */
  //     description: string;
  //     /** "name" 参数的数据类型（此处固定为 "string"） */
  //     type: string;
  //     enum?: string[];
  //   };
  //   // 若后续扩展其他参数，可在此处添加对应字段的定义
  // };
}

interface ToolArg {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
  value?: unknown;
}

/**
 * 工具配置的详细类型定义
 * 包含工具的输入参数 schema、名称与描述
 */
interface ToolConfig {
  /** 工具的输入参数 schema 定义（遵循 JSON Schema 规范） */
  inputSchema: InputSchema;
  /** 工具名称 */
  name: string;
  /** 工具功能描述 */
  description: string;
  args?: ToolArg[];
  loading?: boolean;
  textResult?: string;
  open?: boolean;
}

/**
 * 聚合搜索相关 MCP 配置的数据类型定义
 * 对应 JSON 结构的完整 TypeScript 接口映射
 */
interface MCPToolDetail {
  /** 简述信息 */
  brief: string;
  /** 概述信息（包含 "什么是聚合搜索" 等标题性内容） */
  overview: string;
  /** 创建者信息 */
  creator: string;
  /** Spark 标识（可为 null） */
  sparkId: string | null;
  /** 创建时间（ISO 时间格式，如 "2025-04-26T12:01:31+08:00"） */
  createTime: string;
  /** Logo 图片的 URL 地址 */
  logoUrl: string;
  /** MCP 类型（此处固定为 "flow"） */
  mcpType: string;
  /** 关联的工具列表 */
  tools: ToolConfig[];
  /** 详细描述内容 */
  content: string;
  /** 标签列表（此处包含 "搜索" 等标签） */
  tags: string[];
  /** 记录标识 ID */
  recordId: string;
  /** MCP 名称 */
  name: string;
  /** MCP 唯一标识 ID */
  id: string;
  /** SSE 服务的地址 URL */
  serverUrl: string;
}
interface UseMcpDetailProps {
  handleInputParamsChange: (
    toolIndex: number,
    argIndex: number,
    value: unknown
  ) => void;
  renderInput: (
    arg: ToolArg,
    toolIndex: number,
    index: number
  ) => React.ReactElement | undefined;
  handleOpenTool: (toolIndex: number) => void;
  handleDebugServerMCP: (
    e: React.MouseEvent<HTMLButtonElement>,
    toolIndex: number
  ) => void;
}

export type {
  ListToolSquareParams,
  EnableToolFavoriteParams,
  Tool,
  Classify,
  GetToolDetailParams,
  DebugToolParams,
  DebugInput,
  DebugInputBase,
  ToolDetail,
  MCPToolDetail,
  ToolConfig,
  InputSchema,
  SchemaProperty,
  ToolArg,
  UseMcpDetailProps,
};
