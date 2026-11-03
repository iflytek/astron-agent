import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Image,
  Input,
  Upload,
  Button,
  message,
  UploadFile,
  UploadProps,
  FormInstance,
} from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import uploadAct from '@/assets/imgs/knowledge/icon_zhishi_upload_act.png';
import classNames from 'classnames';
import { createFeedback } from '@/services/common';
import styles from './index.module.scss';
import i18next from 'i18next';
import { getFixedUrl, getCsrfToken } from '@/components/workflow/utils';

const { TextArea } = Input;

interface FeedbackItem {
  id: string;
  picUrl: string;
  description: string;
  createTime: string;
}

interface FeedbackModalProps {
  visible: boolean;
  flowId?: string;
  botId?: string;
  sid?: string;
  detail?: FeedbackItem;
  detailMode?: boolean;
  onCancel: () => void;
}

interface FeedbackUploadResponse {
  data?: { downloadLink?: string };
}
interface FeedbackValues {
  description: string;
  picUrl?: UploadFile<FeedbackUploadResponse>[];
}
interface FeedbackFormProps {
  form: FormInstance<FeedbackValues>;
  detailMode?: boolean;
  previewImages: string[];
  uploadProps: UploadProps<FeedbackUploadResponse>;
}

const FeedbackForm = ({
  form,
  detailMode,
  previewImages,
  uploadProps,
}: FeedbackFormProps): React.ReactElement => {
  return (
    <Form form={form} layout="vertical">
      <Form.Item
        name="description"
        label={i18next.t('workflow.promptDebugger.feedbackContent')}
        rules={[
          {
            required: true,
            message: i18next.t(
              'workflow.promptDebugger.pleaseEnterFeedbackContent'
            ),
          },
          {
            max: 1000,
            message: i18next.t(
              'workflow.promptDebugger.feedbackContentMaxLength'
            ),
          },
        ]}
        required={!detailMode}
      >
        <TextArea
          rows={4}
          showCount={!detailMode}
          maxLength={1000}
          placeholder={i18next.t('workflow.promptDebugger.feedbackPlaceholder')}
          className={classNames('!border-[#E4EAFF]', '!leading-6', {
            '!bg-[#F7F7FA]': detailMode,
          })}
          style={{ resize: 'none', height: detailMode ? '136px' : '150px' }}
          styles={{
            count: {
              paddingBottom: '2px',
              fontWeight: 'normal',
              color: '#B2B2B2',
            },
          }}
          disabled={detailMode}
        />
      </Form.Item>

      <Form.Item
        name="picUrl"
        label={i18next.t('workflow.promptDebugger.uploadImage')}
        getValueFromEvent={e => {
          if (Array.isArray(e)) return e;
          return e && e.fileList;
        }}
        hidden={detailMode && previewImages.length === 0}
      >
        {detailMode ? (
          <div className="flex flex-wrap gap-[12px]">
            {previewImages.map((url, index) => (
              <div
                key={index}
                className="w-[139px] h-[104px] border border-solid border-[#E4EAFF] rounded-[12px] overflow-hidden"
              >
                <Image
                  src={url}
                  className="object-cover"
                  width={'100%'}
                  height={'100%'}
                  alt=""
                />
              </div>
            ))}
          </div>
        ) : (
          <Upload.Dragger {...uploadProps} className={styles.feedbackUpload}>
            <img src={uploadAct} className="w-10 h-10" alt="" />
            <div className="mt-6 font-[500]">
              {i18next.t('workflow.promptDebugger.dragFileHereOr')}
              <span className="text-[#6356EA]">
                {i18next.t('workflow.promptDebugger.selectFile')}
              </span>
            </div>
            <p className="mt-2 text-desc">
              {i18next.t('workflow.promptDebugger.supportUploadFormat')}
            </p>
          </Upload.Dragger>
        )}
      </Form.Item>
    </Form>
  );
};

const FeedbackDialog: React.FC<FeedbackModalProps> = props => {
  const { visible, detailMode, flowId, botId, sid, detail, onCancel } = props;
  const [form] = Form.useForm<FeedbackValues>();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<
    UploadFile<FeedbackUploadResponse>[]
  >([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  useEffect(() => {
    if (visible && detailMode) {
      form.setFieldValue('description', detail?.description);
      const imgs = detail?.picUrl ? detail?.picUrl.split(',') : [];
      setPreviewImages(imgs);
    }
  }, [visible, detailMode, detail]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      const { description, picUrl } = values;
      const uploadedUrls: string[] = [];
      for (const file of picUrl ?? []) {
        const downloadLink = file.response?.data?.downloadLink;
        if (file.status === 'uploading' || !downloadLink) return;
        uploadedUrls.push(downloadLink);
      }
      setLoading(true);
      const params = {
        flowId,
        botId,
        sid,
        description,
        picUrl: uploadedUrls.join(','),
      };
      await createFeedback(params);
      setLoading(false);
      handleCancel();
    } catch (error) {
      setLoading(false);
    }
  };

  const handleCancel = (): void => {
    form.resetFields();
    setFileList([]);
    onCancel();
  };

  const beforeUpload = (file: RcFile, files: RcFile[]): boolean | string => {
    const totalFiles =
      fileList.filter(file => file.status !== 'error').length + files.length;
    if (totalFiles > 10) {
      message.destroy();
      message.error(i18next.t('workflow.promptDebugger.maxUploadImages'));
      return Upload.LIST_IGNORE;
    }
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    const extension =
      (file.name ? file.name.split('.').pop() : '')?.toLowerCase() || '';
    const extArr = ['jpg', 'jpeg', 'png'];
    if (!isJpgOrPng && !extArr.includes(extension)) {
      message.error(i18next.t('workflow.promptDebugger.onlySupportJpgPng'));
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const uploadProps: UploadProps<FeedbackUploadResponse> = {
    name: 'file',
    action: getFixedUrl('/image/upload'),
    headers: {
      'X-CSRFToken': getCsrfToken(),
    },
    accept: '.png,.jpg,.jpeg',
    multiple: true,
    maxCount: 10,
    fileList: fileList,
    beforeUpload: beforeUpload,
    onChange: info => {
      setFileList([...info.fileList]);
    },
    onRemove: file => {
      const newFileList = fileList.filter(item => item.uid !== file.uid);
      setFileList(newFileList);
    },
  };

  return (
    <Modal
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            {detailMode
              ? i18next.t('workflow.promptDebugger.feedbackDetail')
              : i18next.t('workflow.promptDebugger.oneClickFeedback')}
          </span>
          <CloseOutlined style={{ cursor: 'pointer' }} onClick={handleCancel} />
        </div>
      }
      closeIcon={false}
      maskClosable={false}
      keyboard={false}
      centered
      open={visible}
      onCancel={handleCancel}
      footer={
        !detailMode && [
          <Button key="cancel" onClick={handleCancel}>
            {i18next.t('workflow.promptDebugger.cancel')}
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={handleSubmit}
          >
            {i18next.t('common.save')}
          </Button>,
        ]
      }
      width={640}
      styles={{
        header: {
          marginBottom: 24,
        },
      }}
      destroyOnClose
    >
      {detailMode && (
        <div className="flex gap-x-[32px] mb-[24px] text-[#7F7F7F]">
          <div>
            {i18next.t('workflow.promptDebugger.problemId')}
            <span className="text-[#333333]">{detail?.id}</span>
          </div>
          <div>
            {i18next.t('workflow.promptDebugger.createTime')}
            <span className="text-[#333333]">{detail?.createTime}</span>
          </div>
        </div>
      )}
      <FeedbackForm
        form={form}
        detailMode={detailMode}
        previewImages={previewImages}
        uploadProps={uploadProps}
      />
    </Modal>
  );
};

export default FeedbackDialog;
