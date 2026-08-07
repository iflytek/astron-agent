import http from '@/utils/http';
import type { AxiosResponse } from 'axios';
import {
  PageData,
  DatabaseItem,
  DbPageListParams,
  CreateDbParams,
  DbDetailParams,
  UpdateDbParams,
  DeleteDbParams,
  CopyDbParams,
  CreateTableParams,
  TableField,
  TableListParams,
  DeleteTableParams,
  FieldListParams,
  UpdateTableParams,
  QueryTableDataParams,
  OperateTableDataParams,
  CopyTableParams,
  ImportDataParams,
  ExportDataParams,
  DownloadTableTemplateParams,
  ImportFieldDataParams,
  TableDataResponse,
} from '@/types/database';

// 查询数据库
export async function pageList(
  params: DbPageListParams
): Promise<PageData<DatabaseItem>> {
  return await http.post('/db/page-list', params);
}
// 创建数据库
export async function create(params: CreateDbParams): Promise<void> {
  await http.post('/db/create', params);
}

// 查询数据库详情
export async function dbDetail(params: DbDetailParams): Promise<DatabaseItem> {
  return await http.get('/db/detail', { params });
}

// 编辑数据库
export async function update(params: UpdateDbParams): Promise<void> {
  await http.post('/db/update', params);
}
// 删除数据库
export async function deleteDb(params: DeleteDbParams): Promise<void> {
  await http.get('/db/delete', { params });
}
// 复制数据库
export async function copyDb(params: CopyDbParams): Promise<void> {
  await http.get('/db/copy', { params });
}

// 创建表
export async function createTable(params: CreateTableParams): Promise<void> {
  await http.post('/db/create-table', params);
}
// 获取表列表
export async function tableList(
  params: TableListParams
): Promise<DatabaseItem[]> {
  return await http.get('/db/table-list', { params });
}
// 删除表
export async function deleteTable(params: DeleteTableParams): Promise<void> {
  await http.get('/db/delete-table', { params });
}
// 获取表字段
export async function fieldList(
  params: FieldListParams
): Promise<{ records: TableField[] }> {
  return await http.post('/db/table-field-list', params);
}
// 更新表
export async function updateTable(params: UpdateTableParams): Promise<void> {
  await http.post('/db/update-table', params);
}
// 查询表数据
export async function queryTableData(
  params: QueryTableDataParams
): Promise<TableDataResponse> {
  return await http.post('/db/select-table-data', params);
}
// 操作表数据
export async function operateTableData(
  params: OperateTableDataParams
): Promise<void> {
  await http.post('/db/operate-table-data', params);
}
// 复制表
export async function copyTable(params: CopyTableParams): Promise<void> {
  await http.get('/db/copy-table', { params });
}
// 导入数据
export async function importData(params: ImportDataParams): Promise<unknown> {
  const formData = new FormData();
  formData.append('tbId', params.tbId.toString());
  formData.append('execDev', params.execDev.toString());
  formData.append('file', params.file);

  return await http.post('/db/import-table-data', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
// 导出数据
export async function exportData(
  params: ExportDataParams
): Promise<AxiosResponse<Blob>> {
  // 这个接口返回blob文件，需要特殊处理
  return await http.post('/db/export-table-data', params, {
    responseType: 'blob',
  });
}
// 下载表字段模板
export async function downloadFieldTemplate(): Promise<string> {
  return await http.get(
    '/config-info/get-by-category-and-code?category=DB_TABLE_TEMPLATE&code=TB'
  );
}
// 下载数据模板文件
export async function downloadTableTemplate(
  params: DownloadTableTemplateParams
): Promise<AxiosResponse<Blob>> {
  // 这个接口返回blob文件，需要特殊处理
  const response = await http.get('/db/table-template', {
    params,
    responseType: 'blob',
  });
  try {
    const blob = response.data as unknown as Blob;
    const data = await blob?.text();
    const jsonData = JSON.parse(data);
    // 如果可以解析为JSON，说明是错误信息
    throw new Error(jsonData.message);
  } catch {
    // 不能解析为JSON，说明是正常的文件
    return response;
  }
}
// 获取库表
export async function allTableList(): Promise<
  Array<{ value: string; label: string; children: unknown[] }>
> {
  return await http.get('/db/db_table-list');
}
// 导入表数据
export async function importFieldData(
  params: ImportFieldDataParams
): Promise<unknown> {
  const formData = new FormData();
  formData.append('file', params.file);

  return await http.post('/db/import-field-list', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
// 禁止字段枚举
export async function getDisableFields(): Promise<{ value: string }> {
  return await http.get(
    '/config-info/get-by-category-and-code?category=DB_TABLE_RESERVED_KEYWORD&code=reserved_keyword'
  );
}
