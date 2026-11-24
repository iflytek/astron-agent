import { shouldShowRequestError } from '@/utils/http-error';
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import createSpaceBg from '@/assets/imgs/space/createSpaceBg.png';
import styles from './index.module.scss';
import UploadAvatar from './upload-avatar';
import ButtonGroup from '@/components/button-group';
import type { ButtonConfig } from '@/components/button-group';
import useSpaceStore from '@/store/space-store';
import {
  checkSpaceName,
  createCorporateSpace,
  createPersonalSpace,
  updateCorporateSpace,
  updatePersonalSpace,
} from '@/services/space';
import eventBus from '@/utils/event-bus';
import { patterns } from '@/utils/pattern';

const { TextArea } = Input;

interface SpaceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: 'create' | 'edit';
  enterpriseId: string;
  initialData?: {
    name?: string;
    description?: string;
    avatarUrl?: string;
    [key: string]: any;
  };
}

interface FormValues {
  name: string;
  description: string;
  avatarUrl: string;
}
const defaultAvatar =
  'https://openres.xfyun.cn/xfyundoc/2025-07-28/1b05a0cf-e3b5-424c-8fd7-7a527488ab70/1753700397686/spaceAvatar.png';

const SpaceModal: React.FC<SpaceModalProps> = ({
  open,
  onClose,
  onSuccess,
  mode = 'create',
  enterpriseId,
  initialData,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [avatarUrl, setAvatarUrl] = useState<string>(
    initialData?.avatarUrl || defaultAvatar
  );
  const [name, setName] = useState<string>(initialData?.name || '');
  const [description, setDescription] = useState<string>(
    initialData?.description || ''
  );
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (open && initialData) {
      setAvatarUrl(initialData.avatarUrl || defaultAvatar);
      setName(initialData.name || '');
      setDescription(initialData.description || '');
    }
  }, [open, initialData]);

  const defaultSubmitHandle = async (values: FormValues) => {
    const editId = mode === 'edit' ? String(initialData?.id || '') : '';
    if (await checkSpaceName({ name: values.name, id: editId })) {
      throw new Error(t('space.spaceNameExists'));
    }

    if (mode === 'create') {
      if (enterpriseId) {
        await createCorporateSpace(values, enterpriseId);
      } else {
        await createPersonalSpace(values);
      }
    } else {
      const data = { ...values, id: editId };
      if (enterpriseId) {
        await updateCorporateSpace(data, enterpriseId, editId);
      } else {
        await updatePersonalSpace(data, editId);
      }
      const selected = useSpaceStore.getState();
      if (
        selected.spaceId === editId &&
        selected.enterpriseId === enterpriseId
      ) {
        selected.setSpaceStore({
          spaceName: values.name,
          spaceAvatar: values.avatarUrl,
        });
      }
    }
    eventBus.emit('spaceList');
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const values = await form.validateFields();
      // 将头像地址添加到提交数据中
      const submitData = {
        ...values,
        avatarUrl,
      };

      await defaultSubmitHandle(submitData);
      message.success(
        mode === 'create' ? t('space.createSuccess') : t('space.updateSuccess')
      );
      handleCancel();
      onSuccess?.();
    } catch (error: any) {
      shouldShowRequestError(error) &&
        message.error(error?.msg || error?.message || t('space.createFailed'));
      console.error('表单验证失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setName('');
    setDescription('');
    setAvatarUrl(defaultAvatar);
    onClose();
  };

  const buttons: ButtonConfig[] = [
    {
      key: 'cancel',
      text: t('space.cancel'),
      type: 'default',
      onClick: () => handleCancel(),
    },
    {
      key: 'submit',
      text: mode === 'create' ? t('space.confirm') : t('space.save'),
      type: 'primary',
      loading: submitting,
      onClick: () => void handleSubmit(),
    },
  ];

  return (
    <>
      <Modal
        title={
          mode === 'create' ? t('space.createSpace') : t('space.editSpace')
        }
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={648}
        className={styles.spaceModal}
        destroyOnClose
        maskClosable={false}
        keyboard={false}
      >
        <div
          className={styles.infoBanner}
          style={{ backgroundImage: `url(${createSpaceBg})` }}
        >
          <div className={styles.bannerIcon}>
            <UploadAvatar
              name={name}
              botDesc={description}
              coverUrl={avatarUrl}
              setCoverUrl={setAvatarUrl}
            />
          </div>
          <div className={styles.bannerText}>{t('space.bannerText')}</div>
        </div>

        <Form
          form={form}
          layout="vertical"
          className={styles.form}
          initialValues={initialData}
          onValuesChange={changedValues => {
            if (changedValues.name !== undefined) {
              setName(changedValues.name || '');
            }
            if (changedValues.description !== undefined) {
              setDescription(changedValues.description || '');
            }
          }}
        >
          <Form.Item
            label={t('space.spaceName')}
            name="name"
            rules={[
              { required: true, message: t('space.pleaseEnterSpaceName') },
              { max: 50, message: t('space.spaceNameMaxLength') },
              {
                pattern: patterns.spaceName?.pattern,
                message: patterns.spaceName?.message,
              },
            ]}
          >
            <Input
              placeholder={t('space.pleaseEnterSpaceName')}
              maxLength={50}
              showCount
            />
          </Form.Item>

          <Form.Item
            label={t('space.description')}
            name="description"
            rules={[{ max: 2000, message: t('space.descriptionMaxLength') }]}
          >
            <TextArea
              className="xingchen-textarea xingchen-space-textarea"
              autoSize={{ minRows: 3, maxRows: 3 }}
              placeholder={t('space.describeSpace')}
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Form.Item className={styles.footerItem}>
            <div className={styles.buttonGroup}>
              <ButtonGroup buttons={buttons} size="large" />
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SpaceModal;
