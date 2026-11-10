import {
  ApiOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Spin,
  Tag,
  message,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import {
  getPlatformAccountCards,
  savePlatformAccountConfig,
} from '@/services/platform-account';
import {
  PlatformAccountCard,
  PlatformAccountConfig,
  PlatformAccountType,
} from '@/types/platform-account';
import { errorText } from '@/pages/agents/errors';
import styles from './index.module.scss';

const CARD_META: Record<
  PlatformAccountType,
  {
    desc: string;
    icon: React.ReactElement;
  }
> = {
  iflytek_open_platform: {
    desc: '星火对话、图片生成、语音转写、发音人与星火知识库签名能力',
    icon: <CloudServerOutlined />,
  },
  ai_ability_chat: {
    desc: 'OpenAI 兼容对话服务，用于系统内 AI Ability Chat 场景',
    icon: <RobotOutlined />,
  },
  virtual_man: {
    desc: '虚拟人互动 SDK 所需的 AppId 与接口鉴权密钥',
    icon: <ApiOutlined />,
  },
  knowledge_platform: {
    desc: 'RAGFlow 与星火知识库的全局连接配置',
    icon: <DatabaseOutlined />,
  },
};

const PlatformAccountManagement = (): React.ReactElement => {
  const [cards, setCards] = useState<PlatformAccountCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activeCard, setActiveCard] = useState<PlatformAccountCard | null>(
    null
  );
  const [form] = Form.useForm<PlatformAccountConfig>();

  const modalTitle = useMemo(
    () => (activeCard ? `${activeCard.name}配置` : ''),
    [activeCard]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getPlatformAccountCards()
      .then(data => {
        if (active) setCards(data);
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  const openConfig = (card: PlatformAccountCard): void => {
    setSaveError('');
    form.resetFields();
    setActiveCard(card);
    form.setFieldsValue(card.config || {});
  };

  const handleSave = async (): Promise<void> => {
    if (!activeCard) {
      return;
    }
    let values: PlatformAccountConfig;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await savePlatformAccountConfig(activeCard.type, values);
      message.success('配置已保存');
      setActiveCard(null);
      setRevision(value => value + 1);
    } catch (reason) {
      setSaveError(errorText(reason));
    } finally {
      setSaving(false);
    }
  };

  const renderForm = (): React.ReactElement | null => {
    if (!activeCard) {
      return null;
    }
    switch (activeCard.type) {
      case 'iflytek_open_platform':
        return (
          <>
            <Form.Item
              name={['iflytekOpenPlatform', 'platformAppId']}
              label="PLATFORM_APP_ID"
              rules={[{ required: true }]}
            >
              <Input placeholder="请输入" />
            </Form.Item>
            <Form.Item
              name={['iflytekOpenPlatform', 'platformApiKey']}
              label="PLATFORM_API_KEY"
              rules={[{ required: true }]}
            >
              <Input.Password placeholder="请输入" />
            </Form.Item>
            <Form.Item
              name={['iflytekOpenPlatform', 'platformApiSecret']}
              label="PLATFORM_API_SECRET"
              rules={[{ required: true }]}
            >
              <Input.Password placeholder="请输入" />
            </Form.Item>
            <Form.Item
              name={['iflytekOpenPlatform', 'sparkApiPassword']}
              label="SPARK_API_PASSWORD"
              rules={[{ required: true }]}
            >
              <Input.Password placeholder="请输入" />
            </Form.Item>
            <Form.Item
              name={['iflytekOpenPlatform', 'sparkRtasrApiKey']}
              label="SPARK_RTASR_API_KEY"
              rules={[{ required: true }]}
            >
              <Input.Password placeholder="请输入" />
            </Form.Item>
          </>
        );
      case 'ai_ability_chat':
        return (
          <>
            <Form.Item
              name={['aiAbilityChat', 'baseUrl']}
              label="AI_ABILITY_CHAT_BASE_URL"
              rules={[{ required: true }]}
            >
              <Input placeholder="https://spark-api-open.xf-yun.com/v1" />
            </Form.Item>
            <Form.Item
              name={['aiAbilityChat', 'model']}
              label="AI_ABILITY_CHAT_MODEL"
              rules={[{ required: true }]}
            >
              <Input placeholder="请输入" />
            </Form.Item>
            <Form.Item
              name={['aiAbilityChat', 'apiKey']}
              label="AI_ABILITY_CHAT_API_KEY"
              rules={[{ required: true }]}
            >
              <Input.Password placeholder="请输入" />
            </Form.Item>
          </>
        );
      case 'virtual_man':
        return (
          <>
            <Form.Item
              name={['virtualMan', 'sparkVirtualManAppId']}
              label="SPARK_VIRTUAL_MAN_APP_ID"
              rules={[{ required: true }]}
            >
              <Input placeholder="请输入" />
            </Form.Item>
            <Form.Item
              name={['virtualMan', 'sparkVirtualManApiKey']}
              label="SPARK_VIRTUAL_MAN_API_KEY"
              rules={[{ required: true }]}
            >
              <Input.Password placeholder="请输入" />
            </Form.Item>
            <Form.Item
              name={['virtualMan', 'sparkVirtualManApiSecret']}
              label="SPARK_VIRTUAL_MAN_API_SECRET"
              rules={[{ required: true }]}
            >
              <Input.Password placeholder="请输入" />
            </Form.Item>
          </>
        );
      case 'knowledge_platform':
        return (
          <>
            <div className="mb-3 text-base font-medium text-[#202124]">
              RAGFlow
            </div>
            <Form.Item
              name={['knowledgePlatform', 'ragflow', 'baseUrl']}
              label="RAGFLOW_BASE_URL"
            >
              <Input placeholder="http://your-ragflow-url/" />
            </Form.Item>
            <Form.Item
              name={['knowledgePlatform', 'ragflow', 'apiToken']}
              label="RAGFLOW_API_TOKEN"
            >
              <Input.Password placeholder="请输入" />
            </Form.Item>
            <Form.Item
              name={['knowledgePlatform', 'ragflow', 'timeout']}
              label="RAGFLOW_TIMEOUT"
            >
              <InputNumber min={1} className="w-full" placeholder="60" />
            </Form.Item>
            <Form.Item
              name={['knowledgePlatform', 'ragflow', 'defaultGroup']}
              label="RAGFLOW_DEFAULT_GROUP"
            >
              <Input placeholder="请输入" />
            </Form.Item>
            <div className="mb-3 mt-6 text-base font-medium text-[#202124]">
              星火知识库
            </div>
            <Form.Item
              name={['knowledgePlatform', 'xinghuo', 'datasetId']}
              label="XINGHUO_DATASET_ID"
            >
              <Input placeholder="请输入" />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>平台账号管理</h1>
          <p>管理平台能力的连接配置与鉴权凭证。</p>
        </div>
        <Button
          disabled={loading}
          onClick={() => setRevision(value => value + 1)}
        >
          刷新
        </Button>
      </header>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button
              size="small"
              onClick={() => setRevision(value => value + 1)}
            >
              重试
            </Button>
          }
        />
      )}
      <Spin spinning={loading}>
        <div className={styles.grid} aria-busy={loading}>
          {cards.map(card => (
            <article key={card.type} className={styles.card}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className={styles.icon}>{CARD_META[card.type].icon}</div>
                <Tag color={card.configured ? 'green' : 'default'}>
                  {card.configured ? '已配置' : '未配置'}
                </Tag>
              </div>
              <h2>{card.name}</h2>
              <p>{CARD_META[card.type].desc}</p>
              <div className={styles.footer}>
                <Button
                  onClick={() => openConfig(card)}
                  aria-label={`${card.configured ? '修改' : '配置'}${card.name}`}
                >
                  {card.configured ? '修改配置' : '去配置'}
                </Button>
              </div>
            </article>
          ))}
        </div>
        {!loading && !error && !cards.length && (
          <Empty description="暂无平台账号配置" />
        )}
      </Spin>

      <Modal
        title={modalTitle}
        open={!!activeCard}
        onCancel={() => !saving && setActiveCard(null)}
        onOk={handleSave}
        confirmLoading={saving}
        cancelButtonProps={{ disabled: saving }}
        maskClosable={!saving}
        okText="保存配置"
        cancelText="取消"
        destroyOnClose
        width={720}
      >
        <p className={styles.hint}>
          已保存的敏感凭证以掩码显示；保留掩码将继续使用原凭证。
        </p>
        {saveError && (
          <Alert type="error" showIcon message={saveError} className="mb-4" />
        )}
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          disabled={saving}
          labelWrap
        >
          {renderForm()}
        </Form>
      </Modal>
    </main>
  );
};

export default PlatformAccountManagement;
