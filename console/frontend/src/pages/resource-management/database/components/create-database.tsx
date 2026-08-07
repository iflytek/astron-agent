import React, { useEffect, useState } from 'react';
import { Modal, Button, Input, Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { DatabaseItem } from '@/types/database';

const { TextArea } = Input;

const CreateDatabase = (props: {
  open: boolean;
  handleOk: (values: DatabaseItem) => Promise<void>;
  handleCancel: () => void;
  type: 'add' | 'edit';
  info?: DatabaseItem;
}): React.JSX.Element => {
  const { t } = useTranslation();
  const { open, handleOk, handleCancel, type, info = {} } = props;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onSave = (): void => {
    form.validateFields().then(async values => {
      try {
        setLoading(true);
        if (type == 'edit') {
          await handleOk({
            ...info,
            ...values,
          });
        } else {
          await handleOk(values);
        }
        handleCancel();
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    if (type == 'edit') {
      form.setFieldsValue({
        ...info,
      });
    }
  }, [type]);

  const footer = [
    <Button
      key="back"
      className="w-[76px]"
      autoInsertSpace={false}
      onClick={handleCancel}
    >
      {t('database.cancel')}
    </Button>,
    <Button
      key="submit"
      className="w-[76px]"
      autoInsertSpace={false}
      type="primary"
      loading={loading}
      onClick={onSave}
    >
      {t('database.confirm')}
    </Button>,
  ];

  return (
    <Modal
      title={`${type == 'add' ? t('database.create') : t('database.edit')}${t(
        'database.database'
      )}`}
      open={open}
      width={600}
      footer={footer}
      focusTriggerAfterClose={false}
      onCancel={handleCancel}
      styles={{
        footer: {
          marginTop: 0,
          paddingTop: 16,
        },
      }}
      keyboard={false}
      maskClosable={false}
      closable={false}
      centered
    >
      <div className="pt-[24px]">
        <Form layout="vertical" form={form} name="control-hooks">
          <Form.Item
            label={t('database.databaseName')}
            name="name"
            rules={[
              {
                required: true,
                message: t('database.pleaseEnterDatabaseName'),
              },
              {
                pattern: /^[a-z][a-z0-9_]*$/,
                message: t('database.nameValidationMessage'),
              },
            ]}
          >
            <Input
              disabled={type == 'edit'}
              variant={type == 'edit' ? 'borderless' : 'outlined'}
              placeholder={t('database.pleaseEnter')}
              className={`h-[40px] ${type === 'add' ? 'global-input' : ''}`}
              maxLength={20}
              showCount={type === 'add'}
            />
          </Form.Item>
          <Form.Item
            label={t('database.databaseDescription')}
            name="description"
          >
            <TextArea
              placeholder={t('database.pleaseEnterDatabaseDescription')}
              maxLength={200}
              className="h-[100px] border-[#E4EAFF]"
              styles={{
                count: {
                  color: '#B2B2B2',
                  fontWeight: 'normal',
                  position: 'absolute',
                  bottom: '2px',
                  right: '8px',
                },
              }}
              style={{ resize: 'none' }}
              showCount
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default CreateDatabase;
