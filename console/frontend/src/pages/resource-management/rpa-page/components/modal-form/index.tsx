import { forwardRef, useImperativeHandle, useState } from 'react';
import useAntModal from '@/hooks/use-ant-modal';
import { createRpa, getRpaSourceList, updateRpa } from '@/services/rpa';
import { RpaDetailFormInfo, RpaInfo } from '@/types/rpa';
import { useRequest } from 'ahooks';
import {
  Alert,
  Button,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
} from 'antd';
import { useTranslation } from 'react-i18next';

export const ModalForm = forwardRef<
  { showModal: (values?: RpaDetailFormInfo) => void },
  {
    refresh: () => void;
  }
>(({ refresh }, ref) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [type, setType] = useState<'create' | 'edit'>('create');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { showModal, commonAntModalProps, open, closeModal } = useAntModal();
  const { data: rpaSourceList } = useRequest(
    open ? getRpaSourceList : () => [] as unknown as Promise<RpaInfo[]>,
    {
      refreshDeps: [open],
    }
  );
  useImperativeHandle(ref, () => ({
    showModal: values => {
      setSaveError('');
      form.resetFields();
      if (values) {
        setType('edit');
        form.setFieldsValue(values);
      } else {
        setType('create');
      }
      showModal();
    },
  }));
  const handleReset = () => {
    closeModal();
    form.resetFields();
  };
  const handleSave = async (): Promise<void> => {
    if (saving) return;
    try {
      const { platformId, assistantName, icon, id, remarks, ...values } =
        await form.validateFields();
      setSaving(true);
      setSaveError('');
      if (type === 'create')
        await createRpa({
          fields: values,
          platformId,
          assistantName,
          icon,
          remarks,
        });
      else
        await updateRpa(id, {
          fields: values,
          assistantName,
          icon,
          platformId,
          remarks,
          replaceFields: true,
        });
      message.success(
        type === 'create' ? t('rpa.createRpaSuccess') : t('rpa.editRpaSuccess')
      );
      handleReset();
      refresh();
    } catch (failure) {
      if (!(failure && typeof failure === 'object' && 'errorFields' in failure))
        setSaveError(
          failure instanceof Error ? failure.message : '保存失败，请重试。'
        );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form form={form} layout="vertical" wrapperCol={{ span: 24 }}>
      <Modal
        {...commonAntModalProps}
        footer={null}
        title={type === 'create' ? t('rpa.createRpa') : t('rpa.editRpa')}
        onCancel={() => {
          if (!saving) handleReset();
        }}
      >
        <div className="pt-[24px]">
          {saveError && (
            <Alert type="error" showIcon message={saveError} className="mb-4" />
          )}
          <Form.Item name="id" label="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="icon" label="icon" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="remarks" label="remarks" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="platformId"
            label={t('rpa.rpaPlatform')}
            required
            rules={[
              { required: true, message: t('rpa.pleaseSelectRpaPlatform') },
            ]}
          >
            <Select
              placeholder={t('rpa.pleaseSelectRpaPlatform')}
              options={rpaSourceList?.map(item => ({
                label: item.name,
                value: item.id,
              }))}
              onChange={value => {
                const values = form.getFieldsValue();
                form.setFieldsValue({
                  ...values,
                  assistantName: rpaSourceList?.find(item => item.id === value)
                    ?.name,
                  icon: rpaSourceList?.find(item => item.id === value)?.icon,
                  remarks: rpaSourceList?.find(item => item.id === value)
                    ?.remarks,
                });
              }}
            />
          </Form.Item>
          <Form.Item name="assistantName" label="assistantName" hidden>
            <Input />
          </Form.Item>
          <Form.Item dependencies={['platformId']} noStyle>
            {({ getFieldValue }) => {
              const platformId = getFieldValue('platformId');
              const platformInfo = rpaSourceList?.find(
                item => item.id === platformId
              );
              const fields = JSON.parse(platformInfo?.value || '[]') as {
                key: string;
                name: string;
                required: boolean;
                desc: string;
              }[];
              return fields?.map((item, index) => {
                return (
                  <Form.Item
                    key={`${platformId}-${item.name}`}
                    label={<div className="w-full">{item.key}</div>}
                    required={item.required}
                  >
                    <div className="w-full relative">
                      {index === 0 && platformInfo?.path && (
                        <a
                          className="absolute right-0 top-[-22px] text-[#6356EA]"
                          href={platformInfo?.path}
                          target="_blank"
                        >
                          {t('rpa.noAccount', { platform: platformInfo?.name })}
                        </a>
                      )}
                      <Form.Item
                        name={item.name}
                        noStyle
                        rules={[
                          { required: item.required, message: item.desc },
                        ]}
                      >
                        <Input
                          placeholder={`${t('rpa.pleaseEnter')} ${item.desc}`}
                        />
                      </Form.Item>
                    </div>
                  </Form.Item>
                );
              });
            }}
          </Form.Item>
          <div className="w-full flex justify-end">
            <Space>
              <Button disabled={saving} onClick={() => handleReset()}>
                {t('rpa.cancel')}
              </Button>
              <Button
                type="primary"
                loading={saving}
                onClick={() => void handleSave()}
              >
                {t('rpa.save')}
              </Button>
            </Space>
          </div>
        </div>
      </Modal>
    </Form>
  );
});
