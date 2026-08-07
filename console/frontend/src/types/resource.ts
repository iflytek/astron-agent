import { UploadFileStatus } from 'antd/es/upload/interface';

// 通用响应结构
export interface ApiResponse<T> {
  sid: string;
  code: number;
  message: string;
  data: T;
}

// 分页数据结构
export interface PageData<T> {
  page: number | null;
  pageSize: number | null;
  records?: T[];
  extMap: Record<string, string | number | boolean | null>;
  fileSliceCount: Record<string, FlexibleType> | null;
  total: number;
  pageData?: T[];
  totalCount: number;
}

// 数据库分页结构
export interface DbPageData<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

// ========== 工具相关类型 ==========

// 工具项
export interface ToolItem {
  id: number | string;
  toolId: string;
  name: string;
  description: string;
  icon: string | null;
  userId: string;
  spaceId: string | null;
  appId: string;
  endPoint: string;
  method: string;
  webSchema: string;
  schema: string;
  visibility: number;
  deleted: boolean;
  createTime: string;
  updateTime: string;
  isPublic: boolean;
  favoriteCount: number;
  usageCount: number;
  toolTag: string | null;
  operationId: string;
  creationMethod: number;
  authType: number;
  authInfo?: string;
  top: number;
  source: number;
  displaySource: string;
  avatarColor: string;
  status: number;
  version: string;
  temporaryData: string;
  address: string;
  bots: Record<string, FlexibleType>[] | null;
  isFavorite: boolean | null;
  botUsedCount: number;
  creator: string;
  tags: string[] | null;
  heatValue: number | null;
  isMcp: boolean;
  mcpTooId: string | null;
  toolRequestInput?: InputParamsData[];
  toolRequestOutput?: InputParamsData[];
  avatarIcon?: string;
}

// 工具列表响应
export type ToolListResponse = ApiResponse<PageData<ToolItem>>;

// ========== 知识库相关类型 ==========

// 标签 DTO
export interface TagDto {
  parentId?: number;
  repoId?: string | null;
  type?: number | string;
  tags?: string[];
  id?: string | null;
  name?: string;
  source_id?: string;
  tagName?: string;
}

// 知识库项
export interface RepoItem {
  id: number;
  name: string;
  userId: string;
  appId: string | null;
  outerRepoId: string;
  coreRepoId: string;
  description: string;
  icon: string;
  color: string | null;
  status: number;
  embeddedModel: string | null;
  indexType: string | null;
  visibility: number;
  source: number;
  enableAudit: boolean;
  deleted: boolean;
  createTime: string;
  updateTime: string;
  isTop: boolean;
  tag: string;
  spaceId: string | null;
  address: string;
  tagDtoList: TagDto[];
  bots: Record<string, FlexibleType>[];
  fileCount: number;
  charCount: number;
  knowledgeCount: number | null;
  corner: string;
}

// 知识库列表响应
export type RepoListResponse = ApiResponse<PageData<RepoItem>>;

// ========== 数据库相关类型 ==========

// 数据库项
export interface DatabaseItem {
  id: number;
  uid: string;
  spaceId: string | null;
  appId: string;
  dbId: number;
  name: string;
  description: string;
  deleted: boolean;
  createTime: string;
  updateTime: string;
  [key: string]: string | number | boolean | Object | null;
}

// 数据库列表响应
export type DatabaseListResponse = ApiResponse<DbPageData<DatabaseItem>>;

export type AvatarType = {
  name?: string;
  value?: string;
};

// ========== 知识库相关类型定义 ==========

// 创建知识库参数
export interface CreateKnowledgeParams {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: number;
  enableAudit?: boolean;
  embeddedModel?: string;
  indexType?: string;
  spaceId?: string;
  appId?: string;
}

// 更新知识库参数
export interface UpdateRepoParams {
  id?: number | string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: number;
  enableAudit?: boolean;
  embeddedModel?: string;
  indexType?: string;
}

// 知识库列表查询参数
export interface ListReposParams {
  page?: number;
  pageSize?: number;
  name?: string;
  userId?: string;
  spaceId?: string;
  appId?: string;
  tag?: string;
}

// 命中测试参数
export interface HitTestParams {
  id?: string;
  query: string;
  topK?: number;
}

// 命中历史查询参数
export interface HitHistoryParams {
  repoId: number | string;
  page?: number;
  pageSize?: number;
}

// 文件项
export interface FileItem {
  id: number | string;
  name: string;
  fileId: number;
  type?: string;
  size?: number;
  createTime: string;
  isFile: number;
  fileInfoV2: FileInfoV2;
  parentId?: number;
  repoId?: number;
  enabled?: boolean;
  status?: number;
  progress?: number;
  tagDtoList?: TagDto[];
  appId?: string;
  pid?: number | string;
}

// 文件列表查询参数
export interface QueryFileListParams {
  repoId: number | string;
  parentId?: number | string;
  page?: number;
  pageSize?: number;
  name?: string;
}

// 创建文件夹参数
export interface CreateFolderParams {
  repoId: number;
  name: string;
  parentId?: number;
  tags?: string[];
  id?: number | string;
}

// 更新文件夹参数
export interface UpdateFolderParams {
  id?: number | string;
  name: string;
  tags?: string[];
}

// 更新文件参数
export interface UpdateFileParams {
  id: number | string;
  name?: string;
  content?: string;
}

// 启用/禁用文件参数
export interface EnableFileParams {
  id: number | string;
  enabled: number;
}

// 文件目录树参数
export interface FileDirectoryTreeParams {
  repoId: number | string;
  fileId?: number | string;
}

// 文件摘要参数
export interface FileSummaryParams {
  repoId?: number | string;
  content?: string;
  tag?: string;
  fileIds?: (number | string)[];
}

// 知识块项 - 根据实际JSON数据重写
export interface KnowledgeItem {
  id: string;
  fileId: number;
  content: {
    references: Record<
      string,
      { format: string; link: string; content: string }
    >;
    dataIndex: string;
    docId: string;
    context: string;
    title: string;
    content: string;
    knowledge?: string;
    auditSuggest?: string;
    auditDetail?: Array<{ category_description: string }>;
  };
  tagDtoList: TagDto[];
  charCount: number;
  createdAt: string;
  updatedAt: string;
  fileInfoV2: FileInfoV2;
  fileName?: string;
  chunkIndex?: number;
  score?: number;
  enabled?: boolean;
  createTime?: string;
  updateTime?: string;
}

// Chunk 类型 - 用于 modifyChunks 处理后的数据
export interface Chunk {
  // 继承自 KnowledgeItem 的所有属性
  id: string;
  fileId: number;
  charCount: number;
  createdAt: string;
  updatedAt: string;
  fileInfoV2: FileInfoV2;
  fileName?: string;
  chunkIndex?: number;
  score?: number;
  enabled?: boolean;
  createTime?: string;
  updateTime?: string;

  // modifyChunks 函数修改的属性
  content: string | undefined;
  tagDtoList: TagDto[];

  // modifyChunks 函数添加的新属性
  markdownContent: string;
  auditSuggest?: string;
  auditDetail?: string;
  source?: number;
  index?: number;
  testHitCount?: number;
}
// 创建知识块参数
export interface CreateKnowledgeChunkParams {
  repoId?: number;
  content: string;
  fileId?: number | string;
  chunkIndex?: number;
}

// 更新知识块参数
export interface UpdateKnowledgeParams {
  id: number | string;
  content?: string;
  enabled?: number;
}

// 启用/禁用知识块参数
export interface EnableKnowledgeParams {
  id: number | string;
  enabled: number;
}

// 创建 HTML 文件参数
export interface CreateHtmlFileParams {
  repoId: number | string;
  name?: string;
  content?: string;
  parentId?: number | string;
  htmlAddressList?: string[];
}

// 切片文件参数
export interface SliceFilesParams {
  fileIds: (number | string)[];
  chunkSize?: number;
  overlap?: number;
}

// 导入数据参数 (FormData)
export type ImportKnowledgeDataParams = FormData;

// 知识列表查询参数
export interface ListKnowledgeParams {
  pageSize?: number;
  tag?: string;
  fileIds: (number | string)[];
  pageNo: number;
  auditType?: number;
  query?: string;
}

// 向量化文件参数
export interface EmbeddingFilesParams {
  fileIds: (number | string)[];
  embeddingModel?: string;
  sparkFiles?: UploadFile[];
  repoId?: number | string;
  tag?: string;
  configs?: Record<string, string | number | boolean>;
}

// 文件索引状态参数
export interface FileStatusParams {
  fileIds: (number | string)[];
}

// 下载违规知识参数
export interface DownloadViolationParams {
  repoId?: number;
  violationType?: string;
  fileIds?: (number | string)[];
  source?: number;
}

// 向量化回退参数
export interface EmbeddingBackParams {
  fileIds: (number | string)[];
}

// 重试参数
export interface RetryParams {
  fileIds: number[];
}

// 知识库使用状态参数
export interface RepoUseStatusParams {
  repoId: number | string;
}

// 命中结果
export interface HitResult {
  content: string;
  score: number;
  fileId?: number;
  fileName?: string;
  chunkIndex?: number;
  knowledge: string;
  index: number;
  query?: string;
  fileInfo: FileInfoV2;
  createTime?: string;
}

// 文件状态响应
export interface FileStatusResponse {
  fileId: number | string;
  status: number;
  progress?: number;
  errorMessage?: string;
  id?: number | string;
  name?: string;
  charCount?: number;
  type?: string;
  reason?: string;
}

// 知识库操作响应
export interface KnowledgeOperationResponse {
  id: string;
}

// 文件目录树响应
export interface FileDirectoryTreeResponse {
  id: string;
  name: string;
  isFile: boolean;
  children?: FileDirectoryTreeResponse[];
  parentId?: number;
}

// 文件信息 V2
export interface FileInfoV2 {
  id: number;
  uuid: string;
  lastUuid: string;
  uid: string;
  repoId: number;
  name: string;
  address: string;
  size: number;
  charCount: number;
  type: string;
  status: number;
  enabled: number;
  reason: string | null;
  sliceConfig: string;
  currentSliceConfig: string;
  pid: number;
  source: string;
  createTime: string;
  updateTime: string;
  downloadUrl: string | null;
  spaceId: string | null;
}

// 文件摘要响应
export interface FileSummaryResponse {
  sliceType: number;
  seperator: string[];
  lengthRange: number[];
  knowledgeCount: number;
  knowledgeTotalLength: number;
  knowledgeAvgLength: number;
  hitCount: number;
  keyPoints?: string[];
  fileInfoV2?: FileInfoV2;
  fileDirectoryTreeId?: number;
}

// 配置响应
export interface ConfigResponse {
  category: string;
  code: string;
  value: string;
  description?: string;
}

// 知识库使用状态响应
export interface RepoUseStatusResponse {
  repoId: number;
  isUsed: boolean;
  usedBy?: string[];
}

// ========== 数据库相关类型定义 ==========

// 数据库分页查询参数
export interface DbPageListParams {
  page?: number;
  pageSize: number;
  name?: string;
  userId?: string;
  spaceId?: string;
  appId?: string;
}

// 创建数据库参数
export interface CreateDbParams {
  name: string;
  description?: string;
  spaceId?: string;
  appId?: string;
}

// 数据库详情参数
export interface DbDetailParams {
  id?: number | string;
}

// 更新数据库参数
export interface UpdateDbParams {
  id: number;
  name?: string;
  description?: string;
}

// 删除数据库参数
export interface DeleteDbParams {
  id: number;
}

// 复制数据库参数
export interface CopyDbParams {
  id: number;
  name?: string;
}

// 数据库表项
export interface TableItem {
  id: number;
  name: string;
  description?: string;
  dbId: number;
  fieldCount?: number;
  rowCount?: number;
  createTime: string;
  updateTime: string;
}

// 创建表参数
export interface CreateTableParams {
  id?: number;
  dbId?: number | string;
  name: string;
  description?: string;
  fields: TableField[];
}

// 表字段定义
export interface TableField {
  id: number;
  name: string;
  type: string;
  length?: number;
  nullable?: boolean;
  defaultValue?: string;
  comment?: string;
  isPrimaryKey?: boolean;
  isAutoIncrement?: boolean;
  description?: string;
  isRequired?: boolean;
  isSystem?: boolean;
  nameErrMsg?: string;
  descriptionErrMsg?: string;
}

// 获取表列表参数
export interface TableListParams {
  dbId?: number | string;
}

// 删除表参数
export interface DeleteTableParams {
  id: number;
}

// 获取表字段参数
export interface FieldListParams {
  tbId?: number | string;
  pageNum?: number;
  pageSize?: number;
}

// 更新表参数
export interface UpdateTableParams {
  id?: number;
  name?: string;
  description?: string;
  fields?: TableField[];
}

// 查询表数据参数
export interface QueryTableDataParams {
  tbId: number;
  execDev: number;
  page?: number;
  pageSize?: number;
  conditions?: Record<string, string | number | boolean>;
}

// 操作表数据参数
export interface OperateTableDataParams {
  tbId?: number;
  execDev: number;
  data: {
    operateType: number;
    tableData: Record<string, string | number | boolean>;
  }[];
}

// 复制表参数
export interface CopyTableParams {
  id?: number;
  tbId?: number;
  name?: string;
}

// 导入数据参数 (FormData)
export type ImportDataParams = FormData;

// 导出数据参数
export interface ExportDataParams {
  tbId?: number;
  format?: 'CSV' | 'EXCEL';
  execDev?: number;
  dataIds?: string[];
}

// 下载表模板参数
export interface DownloadTableTemplateParams {
  tbId?: number | undefined;
}

// 导入字段数据参数 (FormData)
export type ImportFieldDataParams = FormData;

// 表数据响应
export interface TableDataResponse {
  records: DatabaseItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UploadFile {
  id?: number | string;
  progress?: number;
  loaded?: number;
  total?: number;
  fileId?: number;
  charCount?: number;
  uid: string;
  size?: number;
  name: string;
  fileName?: string;
  lastModified?: number;
  lastModifiedDate?: Date;
  url?: string;
  status?: UploadFileStatus | 'failed';
  percent?: number;
  thumbUrl?: string;
  type?: string;
  preview?: string;
  response?: {
    data?: JsonObject;
    code?: number;
    message?: string;
  };
}

export type DbTableListItem = {
  id: number;
  value: string;
  children?: DbTableListItem[];
};

export type FlexibleType =
  | string
  | number
  | boolean
  | object
  | null
  | undefined;
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray
  | undefined;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export interface InputParamsData {
  id: string;
  name: string;
  children?: InputParamsData[];
  subChild?: InputParamsData;
  type: string;
  default?:
    | string
    | RecurseData
    | InputParamsData[]
    | InputParamsData
    | undefined;
  required: boolean;
  defaultErrMsg?: string;
  description: string;
  nameErrMsg?: string;
  descriptionErrMsg?: string;
  [key: string]: JsonValue;
}
export interface RecurseData {
  [key: string]: RecurseData;
}
