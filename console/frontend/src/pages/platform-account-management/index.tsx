import {
  ApiOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import {
  Button,
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeCard, setActiveCard] = useState<PlatformAccountCard | null>(
    null
  );
  const [form] = Form.useForm<PlatformAccountConfig>();

  const modalTitle = useMemo(
    () => (activeCard ? `${activeCard.name}配置` : ''),
    [activeCard]
  );

  const loadCards = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getPlatformAccountCards();
      setCards(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCards();
  }, []);

  const openConfig = (card: PlatformAccountCard): void => {
    setActiveCard(card);
    form.setFieldsValue(card.config || {});
  };

  const handleSave = async (): Promise<void> => {
    if (!activeCard) {
      return;
    }
    const values = await form.validateFields();
    setSaving(true);
    try {
      await savePlatformAccountConfig(activeCard.type, values);
      message.success('配置已保存');
      setActiveCard(null);
      await loadCards();
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
    <div className="h-full overflow-auto bg-[#f7f8fa] px-8 py-7">
      <div className="mb-6">
        <h1 className="m-0 text-2xl font-semibold text-[#202124]">
          平台账号管理
        </h1>
      </div>
      <Spin spinning={loading}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {cards.map(card => (
            <button
              key={card.type}
              type="button"
              onClick={() => openConfig(card)}
              className="min-h-[168px] rounded-lg border border-[#e5e7eb] bg-white p-5 text-left shadow-sm transition hover:border-[#4f46e5] hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2ff] text-xl text-[#4338ca]">
                  {CARD_META[card.type].icon}
                </div>
                <Tag color={card.configured ? 'green' : 'default'}>
                  {card.configured ? '已配置' : '未配置'}
                </Tag>
              </div>
              <div className="text-lg font-semibold text-[#202124]">
                {card.name}
              </div>
              <div className="mt-2 text-sm leading-6 text-[#6b7280]">
                {CARD_META[card.type].desc}
              </div>
              <div className="mt-5">
                <Button type="primary">
                  {card.configured ? '修改配置' : '去配置'}
                </Button>
              </div>
            </button>
          ))}
        </div>
      </Spin>

      <Modal
        title={modalTitle}
        open={!!activeCard}
        onCancel={() => setActiveCard(null)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnClose
        width={720}
      >
        <Form form={form} layout="vertical" preserve={false}>
          {renderForm()}
        </Form>
      </Modal>
    </div>
  );
};

export default PlatformAccountManagement;
