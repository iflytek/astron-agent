import { UploadFileInfo } from '@/types/chat';
import { ReactElement, useEffect, useState } from 'react';
import { Modal, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { getFileIcon } from '@/utils';
import closeIcon from '@/assets/imgs/chat/plugin/delete-file.png';
import { useTranslation } from 'react-i18next';

const FilePreview = ({
  file,
  onClose,
}: {
  file: UploadFileInfo;
  onClose: () => void;
}): ReactElement => {
  const { t } = useTranslation();
  const extension = file.fileName?.split('.').pop()?.toLowerCase();
  const [content, setContent] = useState('');
  const downloadTxtFile = (url?: string) => {
    if (!url) return;
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.text();
      })
      .then(txtContent => {
        setContent(txtContent);
      })
      .catch(error => {
        console.error('下载失败:', error);
      });
  };
  useEffect(() => {
    if (extension === 'txt') {
      downloadTxtFile(file.fileUrl);
    }
  }, [file.fileUrl]);

  // 根据文件类型渲染预览内容 预览txt文件时，需要先下载文件内容
  const renderFilePreview = (): ReactElement => {
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
        return (
          <div className="flex justify-center">
            <img
              src={file.fileUrl}
              alt={file.fileName}
              className="max-h-[60vh] max-w-full object-contain rounded-lg"
            />
          </div>
        );
      case 'pdf':
        return (
          <iframe
            src={file.fileUrl}
            className="w-full h-[60vh] rounded-lg border"
          />
        );
      case 'audio':
      case 'mp3':
      case 'wav':
        return (
          <div className="flex justify-center">
            <audio controls className="w-full max-w-md">
              <source src={file.fileUrl} type={file.type} />
            </audio>
          </div>
        );
      case 'txt':
        return (
          <div className="flex justify-center">
            <pre>{content}</pre>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center p-4">
            <img src={getFileIcon(file)} alt="" className="w-16 h-16 mb-4" />
            <p className="text-gray-700">
              {t('chatPage.chatWindow.previewNotSupported')}
            </p>
          </div>
        );
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center">
          <img src={getFileIcon(file)} alt="" className="w-6 h-8 mr-2" />
          <span className="truncate max-w-xs">{file.fileName}</span>
        </div>
      }
      open={!!file.fileUrl}
      onCancel={onClose}
      footer={
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => window.open(file.fileUrl, '_blank')}
        >
          {t('chatPage.chatWindow.download')}
        </Button>
      }
      width="60%"
      centered
      closeIcon={<img src={closeIcon} alt="" className="w-4 h-4" />}
      destroyOnClose
    >
      <div className="overflow-auto max-h-[80vh]">{renderFilePreview()}</div>
    </Modal>
  );
};

export default FilePreview;
