import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Button, Descriptions, Select, Space, Typography } from 'antd';
import {
  bindPublishedApi,
  listApplications,
  publishedApiInfo,
  type PublishedApiInfo,
} from '@/services/published-api';
import type { UserApp } from '@/types/common';
import { ApiCallGuide } from '@/components/publishing/api-call-guide';
import useSpaceStore from '@/store/space-store';
import { errorText } from '@/pages/agents/errors';
import CreateApplication from './components/create-application';
import Credential from './components/credential';
import styles from './api.module.scss';

export default function BotApi(): ReactElement {
  const [search] = useSearchParams();
  const botId = search.get('id') || '';
  const [recentTarget, setRecentTarget] = useState<{
    botId: string;
    appId: string;
  } | null>(null);
  const targetAppId =
    recentTarget?.botId === botId ? recentTarget.appId : undefined;
  const { spaceId, enterpriseId } = useSpaceStore();
  const [apps, setApps] = useState<UserApp[]>([]);
  const [appId, setAppId] = useState('');
  const [info, setInfo] = useState<PublishedApiInfo | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const requestPending = useRef(false);

  useEffect(() => {
    let active = true;
    setInfo(null);
    setAppId('');
    setError('');
    if (!botId) {
      setError('缺少 Agent 或工作流标识，请从发布管理打开 API 配置。');
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      listApplications(),
      publishedApiInfo(botId, { appId: targetAppId }),
    ])
      .then(([rows, publication]) => {
        if (!active) return;
        setApps(rows);
        setInfo(publication);
        setAppId(publication?.appId || '');
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return (): void => {
      active = false;
    };
  }, [botId, spaceId, enterpriseId, targetAppId, revision]);

  const bind = async (): Promise<void> => {
    if (!botId || !appId || requestPending.current) return;
    requestPending.current = true;
    setPublishing(true);
    setError('');
    setNotice('');
    try {
      const result = await bindPublishedApi(botId, appId);
      if (!result.approvalRequired) setRecentTarget({ botId, appId });
      setNotice(
        result.approvalRequired
          ? '已提交审批，审核通过后生效；当前已发布版本保持不变。'
          : '发布成功，新的调用将使用此次发布版本。'
      );
      setRevision(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      requestPending.current = false;
      setPublishing(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className="agents-header">
        <div>
          <h1>发布为 API</h1>
          <p>将 Agent 或工作流绑定到应用，以应用密钥调用已发布版本。</p>
        </div>
        <Link className="button" to="/management/release">
          返回发布管理
        </Link>
      </header>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          className="mb-4"
          action={
            botId && (
              <Button
                size="small"
                disabled={loading}
                onClick={() => setRevision(value => value + 1)}
              >
                重试
              </Button>
            )
          }
        />
      )}
      {notice && (
        <Alert type="success" showIcon message={notice} className="mb-4" />
      )}
      <section className="agents-panel">
        <h2>应用绑定</h2>
        <Space wrap className="my-4">
          <Select
            aria-label="选择应用"
            placeholder="选择应用"
            value={appId || undefined}
            onChange={setAppId}
            loading={loading}
            disabled={loading || publishing}
            style={{ minWidth: 240 }}
            options={apps.map(app => ({
              value: app.appId,
              label: `${app.appName} (${app.appId})`,
            }))}
          />
          <Button
            type="primary"
            onClick={() => void bind()}
            loading={publishing}
            disabled={loading || !appId || !botId}
          >
            {info ? '发布更新' : '绑定并发布'}
          </Button>
          <Button onClick={() => setCreating(true)} disabled={publishing}>
            创建应用
          </Button>
          <Button
            onClick={() => setRevision(value => value + 1)}
            disabled={publishing || loading}
          >
            刷新
          </Button>
        </Space>
        {info ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="名称">{info.botName}</Descriptions.Item>
            <Descriptions.Item label="当前应用">
              {info.appName} ({info.appId})
            </Descriptions.Item>
            <Descriptions.Item label="服务地址">
              <Typography.Text copyable>{info.serviceUrl}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item
              label={info.resourceKind === 'workflow' ? 'Flow ID' : 'Agent ID'}
            >
              {info.resourceKind === 'workflow' ? info.flowId : info.botId}
            </Descriptions.Item>
            <Descriptions.Item label="发布版本">
              {info.versionId}
            </Descriptions.Item>
            <Descriptions.Item label="API Key">
              <Credential value={info.appKey || ''} />
            </Descriptions.Item>
            <Descriptions.Item label="API Secret">
              <Credential value={info.appSecret || ''} />
            </Descriptions.Item>
          </Descriptions>
        ) : (
          !loading && !error && <p>尚未绑定应用，或发布尚未通过审批。</p>
        )}
      </section>
      {info && (
        <section className="agents-panel">
          <h2>API 调用方式</h2>
          <ApiCallGuide info={info} />
        </section>
      )}
      {creating && (
        <CreateApplication
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setRevision(value => value + 1);
          }}
        />
      )}
    </main>
  );
}
