import { useState, useMemo, useCallback, JSX } from 'react';
import { Modal, Button, Upload, message, Space, UploadFile } from 'antd';
import { useTranslation } from 'react-i18next';
import upload from '@/assets/imgs/common/upload.png';
import downloadSvg from '@/assets/svgs/download.svg';
import closeSvg from '@/assets/svgs/close.svg';
import {
  downloadTableTemplate,
  importData,
  downloadFieldTemplate,
  importFieldData,
} from '@/services/database';
import {
  DatabaseItem,
  ImportType,
  ImportDataParams,
  ImportFieldDataParams,
} from '@/types/database';

const { Dragger } = Upload;

const SUPPORTED_FILE_EXTENSIONS = ['csv', 'xlsx'] as const; // 支持的文件格式

// 下载服务映射
const DOWNLOAD_SERVICE_MAP = {
  [ImportType.FIELD_TEMPLATE]: downloadFieldTemplate,
  [ImportType.TABLE_DATA]: downloadTableTemplate,
  [ImportType.TEST_DATA]: downloadTableTemplate,
} as const;

// 工具函数
const generateFileName = (contentDisposition: string): string => {
  let fileName = 'download.xlsx';
  if (contentDisposition && contentDisposition.includes('filename=')) {
    try {
      const filenameParts = contentDisposition.split('filename=');
      if (filenameParts.length > 1 && filenameParts[1]) {
        const rawFileName =
          filenameParts[1]?.split(';')[0]?.replace(/["']/g, '') ||
          'download.xlsx';
        fileName = decodeURIComponent(rawFileName);
      }
    } catch (_error) {
      // 如果解析失败，使用默认文件名
      fileName = 'download.xlsx';
    }
  }
  return fileName;
};

const validateFileFormat = (
  file: UploadFile,
  t: (key: string) => string
): boolean => {
  const extension = file.name?.split('.').pop()?.toLowerCase();
  const isValidate = SUPPORTED_FILE_EXTENSIONS.includes(
    extension as (typeof SUPPORTED_FILE_EXTENSIONS)[number]
  );
  if (!isValidate) {
    message.error(t('database.fileFormatNotMatch'));
    return false;
  }
  return true;
};

interface ImportDataModalProps {
  visible: boolean;
  handleCancel: () => void;
  type: ImportType;
  onImport: (data?: DatabaseItem[]) => void;
  info?: DatabaseItem;
}

// 自定义hook：处理文件上传逻辑
const useFileUpload = (
  type: ImportType,
  info?: DatabaseItem,
  onImport?: (data?: DatabaseItem[]) => void,
  handleCancel?: () => void
): {
  fileList: UploadFile[];
  setFileList: (files: UploadFile[]) => void;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
  beforeUpload: (file: UploadFile) => boolean;
  handleUpload: () => Promise<void>;
} => {
  const { t } = useTranslation();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const beforeUpload = useCallback(
    (file: UploadFile): boolean => {
      if (!validateFileFormat(file, t)) return false;
      setFileList([file]);
      return false;
    },
    [t]
  );

  const handleUpload = useCallback(async (): Promise<void> => {
    if (!fileList[0]) {
      message.error(t('database.noFileSelected'));
      return;
    }
    setUploading(true);
    try {
      if (type === ImportType.FIELD_TEMPLATE) {
        const fieldParams: ImportFieldDataParams = {
          file: fileList[0] as unknown as File,
        };
        const data = await importFieldData(fieldParams);
        onImport?.(data as DatabaseItem[]);
      } else {
        const importParams: ImportDataParams = {
          tbId: info?.id ?? 0,
          execDev: type - 1,
          file: fileList[0] as unknown as File,
        };
        await importData(importParams);
        message.success(t('database.importSuccess'));
        handleCancel?.();
        onImport?.();
      }
    } catch (error) {
      message.error(t('database.importFailed'));
    } finally {
      setUploading(false);
    }
  }, [fileList, type, info?.id, handleCancel, onImport]);

  return {
    fileList,
    setFileList,
    uploading,
    setUploading,
    beforeUpload,
    handleUpload,
  };
};

// 自定义hook：处理模板下载
const useTemplateDownload = (
  type: ImportType,
  info?: DatabaseItem
): {
  downloadTemplate: () => Promise<void>;
} => {
  const { t } = useTranslation();
  const downloadTemplate = useCallback(async (): Promise<void> => {
    try {
      const serviceFunction = DOWNLOAD_SERVICE_MAP[type as ImportType];
      if (!serviceFunction) {
        message.error(t('database.unsupportedImportType'));
        return;
      }
      const res = await serviceFunction({ tbId: info?.id ?? 0 });
      if (type === ImportType.FIELD_TEMPLATE) {
        // 处理模板下载链接
        if (typeof res === 'string') {
          window.open(res, '_blank');
        } else if (res && typeof res === 'object' && 'value' in res) {
          window.open((res as { value: string }).value, '_blank');
        }
        return;
      }
      // 处理文件下载
      if (res && typeof res === 'object' && 'data' in res) {
        const response = res as {
          data: Blob;
          headers: { 'content-disposition'?: string };
        };
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = generateFileName(
          response.headers['content-disposition'] || ''
        );
        link.click();
        window.URL.revokeObjectURL(url);
        link.remove();
      }
    } catch (error) {
      message.error(t('database.downloadTemplateFailed'));
    }
  }, [type, info?.id, t]);

  return { downloadTemplate };
};

// 导入数据弹框
const ImportDataModal = (props: ImportDataModalProps): JSX.Element => {
  const { t } = useTranslation();
  const { visible, handleCancel, type, onImport, info } = props;

  const titleList = useMemo(
    () => [t('database.importTestData'), t('database.importDataTable')],
    [t]
  );

  const {
    fileList,
    setFileList,
    uploading,
    setUploading,
    beforeUpload,
    handleUpload,
  } = useFileUpload(type, info, onImport, handleCancel);
  const { downloadTemplate } = useTemplateDownload(type, info);

  // 关闭弹框
  const handleClose = useCallback((): void => {
    setFileList([]);
    setUploading(false);
  }, []);

  // 文件移除
  const handleRemoveFile = useCallback(
    (file: UploadFile): void => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    [fileList]
  );

  // 上传组件属性
  const uploadProps = useMemo(
    () => ({
      showUploadList: true,
      accept: SUPPORTED_FILE_EXTENSIONS.map(ext => `.${ext}`).join(', '),
      fileList: fileList,
      maxCount: 1,
      onRemove: handleRemoveFile,
      beforeUpload,
    }),
    [fileList, handleRemoveFile, beforeUpload]
  );

  // 标题
  const title = useMemo(
    () => (
      <div className="flex justify-between">
        <span>
          {t('database.importData')}
          {titleList[type - 1]}
        </span>
        <img
          src={closeSvg}
          className="cursor-pointer"
          alt=""
          onClick={handleCancel}
        />
      </div>
    ),
    [t, titleList, type, handleCancel]
  );

  // 底部按钮
  const footer = useMemo(
    () => (
      <Space className="flex justify-end">
        <Button onClick={handleCancel}>{t('database.cancel')}</Button>
        <Button
          type="primary"
          disabled={fileList.length === 0}
          loading={uploading}
          onClick={handleUpload}
        >
          {t('database.confirm')}
        </Button>
      </Space>
    ),
    [fileList.length, uploading, handleCancel, handleUpload]
  );

  return (
    <Modal
      title={title}
      open={visible}
      width={640}
      footer={footer}
      focusTriggerAfterClose={false}
      onCancel={handleCancel}
      afterClose={handleClose}
      maskClosable={false}
      closable={false}
      keyboard={false}
      centered
    >
      <div className="pb-[24px]">
        <div className="w-full mt-4 text-right">
          <div
            className="inline-flex items-center text-[#6356EA] cursor-pointer"
            onClick={downloadTemplate}
          >
            <img src={downloadSvg} className="mr-[6px]" alt="" />
            {t('database.downloadTemplate')}
          </div>
        </div>
        <div className="mt-2">
          <Dragger {...uploadProps} className="icon-upload">
            <img src={upload} className="w-8 h-8" alt="" />
            <div className="mt-6 font-medium">
              {t('database.dragFileHere')}
              <span className="text-[#6356EA]">{t('database.selectFile')}</span>
            </div>
            <p className="mt-2 text-desc">
              {t('database.fileFormatDescription')}
            </p>
          </Dragger>
        </div>
      </div>
    </Modal>
  );
};

export default ImportDataModal;
