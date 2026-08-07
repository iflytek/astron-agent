import { batchImportEnterpriseUsername } from '@/services/enterprise';
import { message } from 'antd';

const templateUrl =
  'https://openres.xfyun.cn/xfyundoc/2025-09-30/c7044679-2817-4d22-b470-353012d55efd/1759213793509/%E5%AF%BC%E5%85%A5%E6%A8%A1%E6%9D%BF.xlsx';

// 批量导入成员接口类型
export interface BatchImportParams {
  file: File;
}

export interface BatchImportResult {
  success: boolean;
  data: {
    userList: any[];
    resultUrl: string;
  };
}

// 根据链接下载excel文件
const downloadExcelByUrl = (url: string, filename?: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  message.success('下载成功');
};

// 下载成员导入模板
export function downloadMemberTemplate(): void {
  downloadExcelByUrl(templateUrl, '成员导入模板.xlsx');
}

// excel校验
export const validExcel = (file: File) => {
  return (
    file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel' ||
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.xls')
  );
};

// 批量导入成员
export async function batchImportMembers(
  params: FormData,
  signal?: AbortSignal
): Promise<BatchImportResult> {
  try {
    const response: any = await batchImportEnterpriseUsername(params, {
      signal, // 传递 AbortSignal
    });
    console.log(response, '======== batchImportMembers =======');
    const { chatUserVOS, resultUrl } = response;
    const mockResult: BatchImportResult = {
      success: true,
      data: {
        userList: chatUserVOS || [],
        resultUrl,
      },
    };

    return mockResult;
  } catch (error: any) {
    console.error('批量导入成员失败:', error);
    throw error;
  }
}

export const downloadResult = (url: string, filename?: string) => {
  downloadExcelByUrl(url, filename);
};
