import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Space,
  Switch,
  Tag,
} from 'antd';
import type { FormInstance } from 'antd';
import {
  CheckCircleOutlined,
  CloudServerOutlined,
  ExperimentOutlined,
  GlobalOutlined,
  LockOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  getSkillSandboxConfig,
  saveSkillSandboxConfig,
  testSkillSandboxConfig,
} from '@/services/sandbox';
import type { SkillSandboxConfig } from '@/types/sandbox';
import type { RuleObject } from 'rc-field-form/es/interface';

const DEFAULT_CONFIG: SkillSandboxConfig = {
  provider: 'e2b',
  enabled: false,
  apiKey: '',
  apiKeyMasked: false,
  timeoutSeconds: 300,
  allowInternetAccess: false,
};

const PROVIDERS = [
  {
    key: 'e2b',
    name: 'E2B Sandbox',
    icon: <CloudServerOutlined />,
    description:
      '通过 E2B 官方 SDK 在第三方隔离环境中运行 Skill 脚本和工作流代码。',
  },
  {
    key: 'daytona',
    name: 'Daytona',
    icon: <GlobalOutlined />,
    description: '预留第三方沙箱入口，后续可接入云端开发环境类运行时。',
  },
  {
    key: 'custom',
    name: '自定义沙箱',
    icon: <LockOutlined />,
    description: '预留私有化或企业内部沙箱入口，适合后续扩展。',
  },
] as const;

type Provider = (typeof PROVIDERS)[number];

interface ProviderCardProps {
  provider: Provider;
  loading: boolean;
  lastTestText: string;
  statusTag: React.ReactNode;
  onConfigure: () => void;
}

interface ConfigModalProps {
  form: FormInstance<SkillSandboxConfig>;
  open: boolean;
  loading: boolean;
  saving: boolean;
  testing: boolean;
  lastTestText: string;
  lastTestMessage?: string;
  statusTag: React.ReactNode;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onTest: () => Promise<void>;
}

function ProviderCard({
  provider,
  loading,
  lastTestText,
  statusTag,
  onConfigure,
}: ProviderCardProps): React.ReactElement {
  const isE2b = provider.key === 'e2b';
  const handleButtonClick = (event: React.MouseEvent<HTMLElement>): void => {
    event.stopPropagation();
    if (isE2b) {
      onConfigure();
    }
  };

  return (
    <Card
      loading={loading && isE2b}
      hoverable={isE2b}
      className="rounded-lg border-[#e2e8ff]"
      onClick={isE2b ? onConfigure : undefined}
    >
      <div className="flex min-h-[190px] flex-col justify-between">
        <div>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef1ff] text-[20px] text-[#6554f2]">
                {provider.icon}
              </div>
              <div>
                <div className="text-[16px] font-medium text-[#222529]">
                  {provider.name}
                </div>
                <div className="mt-1 text-[12px] text-[#8a8f9d]">
                  {isE2b ? lastTestText : '待接入'}
                </div>
              </div>
            </div>
            {isE2b ? statusTag : <Tag color="default">待接入</Tag>}
          </div>
          <p className="m-0 text-[13px] leading-6 text-[#676773]">
            {provider.description}
          </p>
        </div>
        <div className="mt-5">
          <Button
            icon={isE2b ? <SettingOutlined /> : undefined}
            disabled={!isE2b}
            onClick={handleButtonClick}
          >
            {isE2b ? '配置' : '未开放'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SandboxConfigModal({
  form,
  open,
  loading,
  saving,
  testing,
  lastTestText,
  lastTestMessage,
  statusTag,
  onCancel,
  onSave,
  onTest,
}: ConfigModalProps): React.ReactElement {
  return (
    <Modal
      title="配置 E2B Sandbox"
      open={open}
      width={680}
      destroyOnClose
      onCancel={onCancel}
      footer={[
        <Button
          key="test"
          icon={<ExperimentOutlined />}
          loading={testing}
          onClick={onTest}
        >
          测试配置
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={onSave}>
          保存配置
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={DEFAULT_CONFIG}
        disabled={loading}
      >
        <Alert
          type="info"
          showIcon
          className="mb-5"
          message="保存并启用后，Agent Skill 脚本和工作流代码节点将使用该沙箱配置执行；未启用时，系统会按当前默认执行策略处理。"
        />
        <Form.Item name="provider" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="enabled" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
        <Form.Item
          label="API Key"
          name="apiKey"
          rules={[
            ({ getFieldValue }): RuleObject => ({
              validator(_, value): Promise<void> {
                if (!getFieldValue('enabled') || value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error('启用脚本沙箱后需要填写 E2B API Key')
                );
              },
            }),
          ]}
        >
          <Input.Password
            placeholder="输入 E2B API Key"
            autoComplete="new-password"
          />
        </Form.Item>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Item
            label="执行超时"
            name="timeoutSeconds"
            rules={[{ required: true, message: '请设置执行超时时间' }]}
          >
            <InputNumber
              min={30}
              max={1800}
              addonAfter="秒"
              className="w-full"
            />
          </Form.Item>
          <Form.Item
            label="允许访问公网"
            name="allowInternetAccess"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </div>

        {lastTestMessage && (
          <div className="mb-5 rounded-md bg-[#f7f8fc] px-4 py-3 text-[13px] leading-5 text-[#676773]">
            {lastTestMessage}
          </div>
        )}

        <Space size={8}>
          <Tag>{lastTestText}</Tag>
          {statusTag}
        </Space>
      </Form>
    </Modal>
  );
}

function SandboxPage(): React.ReactElement {
  const [form] = Form.useForm<SkillSandboxConfig>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadedConfig, setLoadedConfig] =
    useState<SkillSandboxConfig>(DEFAULT_CONFIG);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSkillSandboxConfig();
      const nextConfig = { ...DEFAULT_CONFIG, ...data, provider: 'e2b' };
      setLoadedConfig(nextConfig);
      form.setFieldsValue(nextConfig);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const normalizeSubmitConfig = useCallback(
    (values: SkillSandboxConfig): SkillSandboxConfig => {
      const apiKeyMasked =
        Boolean(loadedConfig.apiKeyMasked) &&
        values.apiKey === loadedConfig.apiKey;
      return {
        ...DEFAULT_CONFIG,
        ...values,
        provider: 'e2b',
        apiKeyMasked,
      };
    },
    [loadedConfig]
  );

  const openE2bModal = (): void => {
    form.setFieldsValue(loadedConfig);
    setModalOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const data = await saveSkillSandboxConfig(normalizeSubmitConfig(values));
      const nextConfig = { ...DEFAULT_CONFIG, ...data, provider: 'e2b' };
      setLoadedConfig(nextConfig);
      form.setFieldsValue(nextConfig);
      setModalOpen(false);
      message.success('脚本沙箱配置已保存');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (): Promise<void> => {
    const values = await form.validateFields();
    setTesting(true);
    try {
      const data = await testSkillSandboxConfig(normalizeSubmitConfig(values));
      const nextConfig = { ...DEFAULT_CONFIG, ...data, provider: 'e2b' };
      setLoadedConfig(nextConfig);
      form.setFieldsValue(nextConfig);
      if (data.lastTestStatus === 'success') {
        message.success(data.lastTestMessage || '脚本沙箱配置可用');
      } else {
        message.warning(data.lastTestMessage || '脚本沙箱配置未通过测试');
      }
    } finally {
      setTesting(false);
    }
  };

  const lastTestText = useMemo(() => {
    if (!loadedConfig.lastTestStatus) {
      return '尚未测试';
    }
    const status =
      loadedConfig.lastTestStatus === 'success' ? '测试通过' : '测试失败';
    return `${status}${loadedConfig.lastTestTime ? ` · ${loadedConfig.lastTestTime}` : ''}`;
  }, [loadedConfig.lastTestStatus, loadedConfig.lastTestTime]);

  const e2bStatusTag = loadedConfig.enabled ? (
    <Tag color="success" icon={<CheckCircleOutlined />}>
      已启用
    </Tag>
  ) : (
    <Tag>未启用</Tag>
  );

  return (
    <div className="h-full overflow-auto bg-[#f7f8fc] px-8 py-6">
      <div className="mx-auto max-w-[1160px]">
        <div className="mb-5">
          <h1 className="m-0 text-[20px] font-medium text-[#222529]">
            脚本沙箱
          </h1>
          <p className="mt-2 mb-0 max-w-[720px] text-[13px] leading-5 text-[#676773]">
            统一配置第三方脚本沙箱。启用后，Agent 节点的 Skill
            脚本和工作流代码节点都会在隔离沙箱中执行，并自动归档执行过程中生成的文件。
          </p>
        </div>

        <Alert
          type="info"
          showIcon
          className="mb-5"
          message="未启用脚本沙箱时，Skill 脚本会返回环境未配置的提示；工作流代码节点将继续使用系统默认执行方式。启用并配置 E2B 后，两类脚本都会优先进入沙箱执行。"
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {PROVIDERS.map(provider => (
            <ProviderCard
              key={provider.key}
              provider={provider}
              loading={loading}
              lastTestText={lastTestText}
              statusTag={e2bStatusTag}
              onConfigure={openE2bModal}
            />
          ))}
        </div>
      </div>

      <SandboxConfigModal
        form={form}
        open={modalOpen}
        loading={loading}
        saving={saving}
        testing={testing}
        lastTestText={lastTestText}
        lastTestMessage={loadedConfig.lastTestMessage}
        statusTag={e2bStatusTag}
        onCancel={() => setModalOpen(false)}
        onSave={handleSave}
        onTest={handleTest}
      />
    </div>
  );
}

export default SandboxPage;
