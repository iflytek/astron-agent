import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
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
  CodeOutlined,
  ExperimentOutlined,
  GlobalOutlined,
  SettingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  getSkillSandboxConfig,
  revealSandboxCredential,
  saveSkillSandboxConfig,
  testSkillSandboxConfig,
} from '@/services/sandbox';
import SavedCredentialInput from '@/components/saved-credential-input';
import useSpaceStore from '@/store/space-store';
import type { SkillSandboxConfig } from '@/types/sandbox';
import type { RuleObject } from 'rc-field-form/es/interface';
import styles from './index.module.scss';

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
    key: 'docker',
    name: '本地 Docker',
    icon: <CodeOutlined />,
    description: '在部署服务器上运行脚本和代码，按 Agent 或工作流保留文件。',
  },
  {
    key: 'daytona',
    name: 'Daytona',
    icon: <GlobalOutlined />,
    description: '预留第三方沙箱入口，后续可接入云端开发环境类运行时。',
  },
] as const;

type Provider = (typeof PROVIDERS)[number];
type ConfigurableProvider = 'e2b' | 'docker';

function testStatusText(config: SkillSandboxConfig | null): string {
  if (!config?.lastTestStatus) return '尚未测试';
  const status = config.lastTestStatus === 'success' ? '测试通过' : '测试失败';
  return config.lastTestTime ? status + ' · ' + config.lastTestTime : status;
}

interface ProviderCardProps {
  provider: Provider;
  loading: boolean;
  configurable: boolean;
  lastTestText: string;
  statusTag: React.ReactNode;
  onConfigure: () => void;
}

interface ConfigModalProps {
  form: FormInstance<SkillSandboxConfig>;
  provider: ConfigurableProvider;
  localAvailable: boolean;
  open: boolean;
  loading: boolean;
  saving: boolean;
  testing: boolean;
  lastTestText: string;
  lastTestMessage?: string;
  actionError?: string;
  statusTag: React.ReactNode;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onTest: () => Promise<void>;
}

function ProviderCard({
  provider,
  loading,
  configurable,
  lastTestText,
  statusTag,
  onConfigure,
}: ProviderCardProps): React.ReactElement {
  return (
    <Card loading={loading} className={styles.providerCard}>
      <div className="flex min-h-[190px] flex-col justify-between">
        <div>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e7eeff] text-[20px] text-[#315ff4]">
                {provider.icon}
              </div>
              <div>
                <div className="text-[16px] font-medium text-[#18243d]">
                  {provider.name}
                </div>
                {lastTestText && (
                  <div className="mt-1 text-[12px] text-[#607089]">
                    {lastTestText}
                  </div>
                )}
              </div>
            </div>
            {statusTag}
          </div>
          <p className="m-0 text-[13px] leading-6 text-[#607089]">
            {provider.description}
          </p>
        </div>
        <div className="mt-5">
          <Button
            icon={configurable ? <SettingOutlined /> : undefined}
            disabled={!configurable}
            onClick={onConfigure}
          >
            {provider.key === 'daytona' ? '未开放' : '配置'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SandboxConfigModal({
  form,
  provider,
  localAvailable,
  open,
  loading,
  saving,
  testing,
  lastTestText,
  lastTestMessage,
  actionError,
  statusTag,
  onCancel,
  onSave,
  onTest,
}: ConfigModalProps): React.ReactElement {
  const local = provider === 'docker';
  const name = local ? '本地 Docker' : 'E2B Sandbox';
  return (
    <Modal
      title={'配置 ' + name}
      open={open}
      width={680}
      forceRender
      onCancel={saving || testing ? undefined : onCancel}
      closable={!saving && !testing}
      maskClosable={!saving && !testing}
      footer={[
        <Button
          key="test"
          icon={<ExperimentOutlined />}
          loading={testing}
          disabled={saving || loading || (local && !localAvailable)}
          onClick={onTest}
        >
          测试配置
        </Button>,
        <Button key="cancel" disabled={saving || testing} onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={saving}
          disabled={testing || loading}
          onClick={onSave}
        >
          保存配置
        </Button>,
      ]}
    >
      {actionError && (
        <Alert type="error" showIcon message={actionError} className="mb-5" />
      )}
      <Form
        form={form}
        layout="vertical"
        initialValues={DEFAULT_CONFIG}
        disabled={loading || saving || testing}
      >
        <Alert
          type="info"
          showIcon
          className="mb-5"
          message={
            local
              ? '本地 Docker 在部署服务器上执行。Agent 和工作流产出的文件保存在各自的沙箱目录。'
              : '启用后，Agent Skill 脚本和已开启沙箱的工作流代码节点使用 E2B 隔离环境。'
          }
        />
        {local && !localAvailable && (
          <Alert
            type="warning"
            showIcon
            className="mb-5"
            message="当前部署尚未启用本地 Docker 沙箱。"
          />
        )}
        <div className={styles.enableSection}>
          <div>
            <div id="sandbox-enabled-label" className={styles.enableLabel}>
              {'启用 ' + name}
            </div>
            <p
              id="sandbox-enabled-description"
              className={styles.enableDescription}
            >
              {local ? '保存后应用更改。' : '保存配置或测试配置时应用更改。'}
            </p>
          </div>
          <Form.Item name="enabled" valuePropName="checked" noStyle>
            <Switch
              className={styles.enableSwitch}
              aria-labelledby="sandbox-enabled-label"
              aria-describedby="sandbox-enabled-description"
              checkedChildren="已启用"
              unCheckedChildren="已停用"
            />
          </Form.Item>
        </div>
        {!local && (
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
            <SavedCredentialInput
              placeholder="输入 E2B API Key"
              disabled={!open || loading || saving || testing}
              maskedValue="********"
              loadSaved={open ? revealSandboxCredential : undefined}
            />
          </Form.Item>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Item
            label="执行超时"
            name="timeoutSeconds"
            rules={[
              { required: true, message: '请设置执行超时时间' },
              {
                type: 'integer',
                min: local ? 1 : 30,
                max: local ? 600 : 1800,
                message: local
                  ? '请输入 1 到 600 的整数'
                  : '请输入 30 到 1800 的整数',
              },
            ]}
          >
            <InputNumber
              min={local ? 1 : 30}
              max={local ? 600 : 1800}
              addonAfter="秒"
              className="w-full"
            />
          </Form.Item>
          {!local && (
            <Form.Item
              label="允许访问公网"
              name="allowInternetAccess"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          )}
        </div>

        {lastTestMessage && (
          <div className="mb-5 rounded-md bg-[#f7f8fc] px-4 py-3 text-[13px] leading-5 text-[#607089]">
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

function SandboxConfiguration(): React.ReactElement {
  const [form] = Form.useForm<SkillSandboxConfig>();
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const pendingAction = useRef(false);
  const [testing, setTesting] = useState(false);
  const [editing, setEditing] = useState<ConfigurableProvider | null>(null);
  const [probeResult, setProbeResult] = useState<SkillSandboxConfig | null>(
    null
  );
  const [loadedConfig, setLoadedConfig] =
    useState<SkillSandboxConfig>(DEFAULT_CONFIG);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSkillSandboxConfig();
      const nextConfig = { ...DEFAULT_CONFIG, ...data };
      setLoadedConfig(nextConfig);
      setLoaded(true);
    } catch {
      setError('无法加载沙箱配置，请重试。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const normalizeSubmitConfig = (
    values: SkillSandboxConfig,
    provider: ConfigurableProvider
  ): SkillSandboxConfig => ({
    provider,
    enabled: values.enabled,
    timeoutSeconds: values.timeoutSeconds,
    apiKey: provider === 'e2b' ? values.apiKey : '',
    apiKeyMasked:
      provider === 'e2b' &&
      Boolean(loadedConfig.apiKeyMasked) &&
      values.apiKey === loadedConfig.apiKey,
    allowInternetAccess:
      provider === 'e2b' && Boolean(values.allowInternetAccess),
  });

  const openModal = (provider: ConfigurableProvider): void => {
    if (!loaded || loading) return;
    form.setFieldsValue({
      ...loadedConfig,
      ...(provider === 'e2b' && {
        allowInternetAccess:
          loadedConfig.e2bAllowInternetAccess ??
          loadedConfig.allowInternetAccess,
      }),
      ...(provider !== loadedConfig.provider && {
        enabled: false,
        timeoutSeconds: DEFAULT_CONFIG.timeoutSeconds,
      }),
    });
    setActionError('');
    setProbeResult(null);
    setEditing(provider);
  };

  const handleSave = async (): Promise<void> => {
    if (pendingAction.current || !editing) return;
    pendingAction.current = true;
    setSaving(true);
    setActionError('');
    try {
      const values = await form.validateFields();
      const data = await saveSkillSandboxConfig(
        normalizeSubmitConfig(values, editing)
      );
      const nextConfig = { ...DEFAULT_CONFIG, ...data };
      setLoadedConfig(nextConfig);
      form.setFieldsValue(nextConfig);
      setEditing(null);
      message.success('脚本沙箱配置已保存');
    } catch (error) {
      if (!(error && typeof error === 'object' && 'errorFields' in error)) {
        setActionError('保存沙箱配置失败，输入已保留，请重试。');
      }
    } finally {
      pendingAction.current = false;
      setSaving(false);
    }
  };

  const handleTest = async (): Promise<void> => {
    if (pendingAction.current || !editing) return;
    pendingAction.current = true;
    setTesting(true);
    setActionError('');
    setProbeResult(null);
    try {
      const values = await form.validateFields();
      const data = await testSkillSandboxConfig(
        normalizeSubmitConfig(values, editing)
      );
      if (editing === 'docker') {
        setProbeResult(data);
      } else {
        const nextConfig = { ...DEFAULT_CONFIG, ...data };
        setLoadedConfig(nextConfig);
        form.setFieldsValue(nextConfig);
      }
      if (data.lastTestStatus === 'success') {
        message.success(data.lastTestMessage || '脚本沙箱配置可用');
      } else {
        message.warning(data.lastTestMessage || '脚本沙箱配置未通过测试');
      }
    } catch (error) {
      if (!(error && typeof error === 'object' && 'errorFields' in error)) {
        setActionError('测试沙箱配置失败，输入已保留，请重试。');
      }
    } finally {
      pendingAction.current = false;
      setTesting(false);
    }
  };

  const activeStatus = loadedConfig.enabled ? (
    <Tag color="success" icon={<CheckCircleOutlined />}>
      已启用
    </Tag>
  ) : (
    <Tag>未启用</Tag>
  );
  const modalResult =
    probeResult ?? (editing === loadedConfig.provider ? loadedConfig : null);

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.pageHeader}>
          <div>
            <h1>脚本沙箱</h1>
            <p className="mt-2 mb-0 max-w-[720px] text-[13px] leading-5 text-[#607089]">
              启用后，Agent 可以通过 execute
              在所选沙箱中运行命令。工作流代码节点也可使用此配置。
            </p>
          </div>
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            disabled={editing !== null}
            onClick={() => void loadConfig()}
          >
            刷新
          </Button>
        </header>

        {error && (
          <Alert
            className="mb-5"
            type="error"
            showIcon
            message={error}
            action={
              <Button loading={loading} onClick={() => void loadConfig()}>
                重试
              </Button>
            }
          />
        )}
        <Alert
          type="info"
          showIcon
          className="mb-5"
          message="工作流代码节点关闭沙箱时默认使用内置 LangChain/Pyodide 执行器。Agent 的 execute 工具需要启用一种沙箱。"
        />

        {(loaded || loading) && (
          <div className={styles.providerGrid}>
            {PROVIDERS.map(provider => {
              const active = loadedConfig.provider === provider.key;
              const unavailable =
                provider.key === 'docker' && !loadedConfig.localAvailable;
              let statusTag = active ? activeStatus : <Tag>未选择</Tag>;
              if (unavailable) statusTag = <Tag>部署未启用</Tag>;
              if (provider.key === 'daytona') statusTag = <Tag>待接入</Tag>;
              return (
                <ProviderCard
                  key={provider.key}
                  provider={provider}
                  loading={loading || !loaded}
                  configurable={
                    provider.key !== 'daytona' && (active || !unavailable)
                  }
                  lastTestText={active ? testStatusText(loadedConfig) : ''}
                  statusTag={statusTag}
                  onConfigure={() => {
                    if (provider.key !== 'daytona') openModal(provider.key);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <SandboxConfigModal
        form={form}
        provider={editing ?? 'e2b'}
        localAvailable={Boolean(loadedConfig.localAvailable)}
        open={editing !== null}
        loading={loading}
        saving={saving}
        testing={testing}
        lastTestText={testStatusText(modalResult)}
        actionError={actionError}
        lastTestMessage={modalResult?.lastTestMessage}
        statusTag={
          editing === loadedConfig.provider ? activeStatus : <Tag>未选择</Tag>
        }
        onCancel={() => setEditing(null)}
        onSave={handleSave}
        onTest={handleTest}
      />
    </div>
  );
}

export default function SandboxPage(): React.ReactElement {
  const spaceId = useSpaceStore(state => state.spaceId);
  const enterpriseId = useSpaceStore(state => state.enterpriseId);
  return <SandboxConfiguration key={`${spaceId}:${enterpriseId}`} />;
}
