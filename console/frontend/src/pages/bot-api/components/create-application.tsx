import { useRef, useState, type ReactElement } from 'react';
import { Alert, Form, Input, Modal } from 'antd';
import { v4 as uuid } from 'uuid';
import { createApplication } from '@/services/published-api';
import { errorText } from '@/pages/agents/errors';

export default function CreateApplication({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (appId: string) => void;
}): ReactElement {
  const [form] = Form.useForm<{ appName: string; appDescribe?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(uuid());
  const creating = useRef(false);
  const submit = async (): Promise<void> => {
    if (creating.current) return;
    creating.current = true;
    let values: { appName: string; appDescribe?: string };
    try {
      values = await form.validateFields();
    } catch {
      creating.current = false;
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await createApplication({
        ...values,
        appName: values.appName.trim(),
        requestId: requestId.current,
      });
      onCreated(result.appId);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      creating.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal
      title="创建应用"
      open
      onCancel={() => !busy && onClose()}
      onOk={() => void submit()}
      confirmLoading={busy}
      okText="创建应用"
      cancelText="取消"
      cancelButtonProps={{ disabled: busy }}
      maskClosable={false}
    >
      {error && <Alert type="error" message={error} className="mb-4" />}
      <Form form={form} layout="vertical" disabled={busy}>
        <Form.Item
          label="应用名称"
          name="appName"
          rules={[
            { required: true, whitespace: true, message: '请输入应用名称' },
          ]}
        >
          <Input maxLength={128} />
        </Form.Item>
        <Form.Item label="应用描述" name="appDescribe">
          <Input.TextArea rows={3} maxLength={512} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
