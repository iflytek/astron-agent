/* ========== 数据库相关类型定义 ========== */

// 执行环境枚举
export enum ExecEnv {
  TEST = 1, // 测试环境
  PRODUCTION = 2, // 生产环境
}

// 操作类型枚举
export enum OperateType {
  ADD = 1, // 新增
  EDIT = 2, // 编辑
  DELETE = 4, // 删除
}

// 导入类型枚举
export enum ImportType {
  FIELD_TEMPLATE = 1,
  TABLE_DATA = 2,
  TEST_DATA = 3,
}

export type UploadFileStatus = 'error' | 'done' | 'uploading' | 'removed';

export interface ResponseData<T> {
  code: number;
  data: T;
  message: string;
  sid: string;
}

// 分页数据结构
export interface PageData<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export interface DatabaseItem {
  id: number;
  uid: string;
  spaceId: string | null;
  appId: string;
  dbId: number;
  name: string;
  description: string;
  avatarIcon?: string | null;
  avatarColor?: string | null;
  deleted: boolean;
  createTime: string;
  updateTime: string;
  [key: string]: unknown;
}

// 数据库分页查询参数
export interface DbPageListParams {
  search?: string;
  pageNum: number;
  pageSize: number;
}

// 创建数据库参数
export interface CreateDbParams {
  name: string;
  description?: string;
  avatarIcon?: string;
  avatarColor?: string;
}

// 数据库详情参数
export interface DbDetailParams {
  id?: number | string;
}

// 更新数据库参数
export interface UpdateDbParams {
  id: number;
  name: string;
  description?: string;
  avatarIcon?: string;
  avatarColor?: string;
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
  dbId: number;
  name: string;
  description: string;
  deleted: boolean;
  createTime: string;
  updateTime: string;
}

// 创建表参数
export interface CreateTableParams {
  dbId: number;
  name: string;
  description?: string;
  fields: TableField[];
}

// 表字段定义
export interface TableField {
  id: number;
  tbId?: number;
  name: string;
  type: 'String' | 'Integer' | 'Time' | 'Number' | 'Boolean';
  description?: string;
  defaultValue?: string;
  isRequired?: boolean;
  isSystem?: boolean;
  operateType?: OperateType;
  createTime?: string;
  updateTime?: string;
  descriptionErrMsg?: string;
  nameErrMsg?: string;
}

// 获取表列表参数
export interface TableListParams {
  dbId: number | string; // 支持传入number或string类型的dbId
}

// 删除表参数
export interface DeleteTableParams {
  id: number;
}

// 获取表字段参数
export interface FieldListParams {
  tbId: number;
  pageNum: number;
  pageSize: number;
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
  execDev: ExecEnv;
  pageNum: number;
  pageSize: number;
}

// 操作表数据参数
export interface OperateTableDataParams {
  tbId: number;
  execDev: ExecEnv;
  data: {
    operateType: OperateType;
    tableData: Record<string, unknown>;
  }[];
}

// 复制表参数
export interface CopyTableParams {
  tbId: number;
}

// 导入数据参数
export interface ImportDataParams {
  tbId: number;
  execDev: ExecEnv;
  file: File;
}

// 导出数据参数
export interface ExportDataParams {
  tbId: number;
  execDev: ExecEnv;
  dataIds?: string[];
}

// 下载表模板参数
export interface DownloadTableTemplateParams {
  tbId: number;
}

// 导入字段数据参数
export interface ImportFieldDataParams {
  file: File;
}

export interface DownloadFieldTemplateResponse {
  id: number;
  category: string;
  code: string;
  name: string;
  value: string;
  isValid: number;
  remarks: string;
  createTime: string;
  updateTime: string;
}

export interface DownloadTableTemplateResponse {
  id: number;
  category: string;
  code: string;
  name: string;
  value: string;
  isValid: number;
  remarks: string | null;
  createTime: string;
  updateTime: string;
}

// 表数据响应
export interface TableDataResponse {
  records: Record<string, unknown>[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export interface UploadFile {
  id: number;
  progress: number;
  loaded: number;
  total: number;
  fileId?: number;
  charCount?: number;
  uid?: string;
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
}
