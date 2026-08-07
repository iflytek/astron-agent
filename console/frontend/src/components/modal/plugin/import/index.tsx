import { useState, useRef } from 'react';
import { Modal, Button, Upload, message, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import uploadAct from '@/assets/imgs/knowledge/icon_zhishi_upload_act.png';
import close from '@/assets/imgs/workflow/modal-close.png';
import { importPlugin } from '@/services/plugin';
import { UploadFile } from 'antd/es/upload/interface';

const { Dragger } = Upload;
const ImportModal = (props: any) => {
  const { t } = useTranslation();
  const { visible, handleCancel, onImport } = props;
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  function beforeUpload(file) {
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      message.error(t('effectEvaluation.dataset.create.fileSizeExceeded'));
      return false;
    }
    const extension = file.name.split('.').pop().toLowerCase();
    const isLegal = ['json', 'yaml'].includes(extension);
    if (!isLegal) {
      message.error('文件格式错误');
      return false;
    }
    setFileList([file]);
    return false;
  }

  const handleUpload = () => {
    setUploading(true);
    importPlugin({
      file: fileList[0],
    })
      .then(res => {
        message.success(t('effectEvaluation.dimensions.import.importSuccess'));
        handleCancel();
        onImport(res);
      })
      .finally(() => {
        setUploading(false);
      });
  };

  const handleClose = () => {
    setFileList([]);
    setUploading(false);
  };
  const uploadProps = {
    showUploadList: true,
    accept: '.json,.yaml',
    fileList: fileList,
    maxCount: 1,
    onRemove: (file: UploadFile) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload,
  };
  const title = (
    <div className="flex justify-between">
      <span>{t('plugin.importFile')}</span>
      <img
        src={close}
        className="cursor-pointer w-3 h-3"
        alt=""
        onClick={handleCancel}
      />
    </div>
  );
  const footer = (
    <Space className="flex justify-end">
      <Button onClick={handleCancel}>
        {t('effectEvaluation.dimensions.import.cancel')}
      </Button>
      <Button
        type="primary"
        disabled={fileList.length === 0}
        loading={uploading}
        onClick={handleUpload}
      >
        {t('effectEvaluation.dimensions.import.confirm')}
      </Button>
    </Space>
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
      closable={false}
      zIndex={9999}
      centered
    >
      <div className="pb-[24px]">
        <div className="mt-6">
          <Dragger {...uploadProps} className="icon-upload">
            <img src={uploadAct} className="w-8 h-8" alt="" />
            <div className="mt-6 font-medium">
              {t('effectEvaluation.dimensions.import.dragFileHere')}
              <span className="text-[#6356ea]">
                {t('effectEvaluation.dimensions.import.selectFile')}
              </span>
            </div>
            <p className="mt-2 text-desc">
              {t('plugin.importFileDescription')}
            </p>
          </Dragger>
        </div>
      </div>
    </Modal>
  );
};

export default ImportModal;
