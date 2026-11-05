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
import useSpaceStore from '@/store/space-store';
import { errorText } from '@/pages/agents/errors';
import CreateApplication from './components/create-application';
import Credential from './components/credential';
import '@/pages/agents/style.css';

export default function BotApi(): ReactElement {
  const [search] = useSearchParams();
  const botId = search.get('id') || '';
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
    Promise.all([listApplications(), publishedApiInfo(botId)])
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
  }, [botId, spaceId, enterpriseId, revision]);

  const bind = async (): Promise<void> => {
    if (!botId || !appId || requestPending.current) return;
    requestPending.current = true;
    setPublishing(true);
    setError('');
    setNotice('');
    try {
      const result = await bindPublishedApi(botId, appId);
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
    <main className="agents-page">
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
        <Alert type="error" showIcon message={error} className="mb-4" />
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
              label={
                info.serviceUrl.includes('/workflow/v1/')
                  ? 'Flow ID'
                  : 'Agent ID'
              }
            >
              {info.serviceUrl.includes('/workflow/v1/')
                ? info.flowId
                : info.botId}
            </Descriptions.Item>
            <Descriptions.Item label="发布版本">
              {info.versionId}
            </Descriptions.Item>
            <Descriptions.Item label="API Key">
              <Credential value={info.appKey} />
            </Descriptions.Item>
            <Descriptions.Item label="API Secret">
              <Credential value={info.appSecret} />
            </Descriptions.Item>
          </Descriptions>
        ) : (
          !loading && <p>尚未绑定应用，或发布尚未通过审批。</p>
        )}
      </section>
      <ApiInstructions
        info={info}
        requestedWorkflow={search.get('version') !== '1'}
      />
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

function ApiInstructions({
  info,
  requestedWorkflow,
}: {
  info: PublishedApiInfo | null;
  requestedWorkflow: boolean;
}): ReactElement {
  const workflow =
    info?.serviceUrl.includes('/workflow/v1/') ?? requestedWorkflow;
  const body = workflow
    ? {
        flow_id: info?.flowId || '<FLOW_ID>',
        uid: 'your-user-id',
        stream: true,
        parameters: { query: '你好' },
      }
    : {
        bot_id: info?.botId || '<BOT_ID>',
        user: 'your-user-id',
        stream: true,
        sessionId: 'conversation-1',
        messages: [{ role: 'user', content: '你好' }],
      };
  const endpoint =
    info?.serviceUrl ||
    `${window.location.origin}/${workflow ? 'workflow' : 'agent'}/v1/chat/completions`;
  const example = `curl --no-buffer '${endpoint}' \\\n  -H 'Authorization: Bearer <API_KEY>:<API_SECRET>' \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(body, null, 2)}'`;

  return (
    <section className="agents-panel mt-6">
      <h2>调用说明</h2>
      <p className="my-3">
        在服务端使用 Authorization: Bearer
        API_KEY:API_SECRET。密钥仅可访问该应用已发布的资源，不能代替 Console
        登录。
      </p>
      <Typography.Paragraph copyable={{ text: example }}>
        <pre className="overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-4">
          {example}
        </pre>
      </Typography.Paragraph>
      <p>
        {workflow
          ? 'parameters 使用工作流开始节点的输入名称；请将示例 query 替换为实际输入。'
          : '每次发送一条用户消息；同一 user 和 sessionId 延续服务端会话，不能上传 assistant 历史。'}
      </p>
      <p className="mt-2">
        stream=true 返回实际执行事件的 SSE；stream=false
        等待本次执行结果。发布更新影响新运行，正在执行的运行保持原版本。
      </p>
      {workflow && (
        <p className="mt-2">
          暂停后使用相同应用凭据 POST /workflow/v1/resume，正文提供运行返回的
          runId 和 content。恢复始终返回
          SSE，继续原版本和原运行，不重放已完成节点。
        </p>
      )}
      <p className="mt-2">
        Agent 和工作流均可使用相同应用凭据 POST /workflow/v1/stop，正文为
        {' {"runId":"<RUN_ID>"}'}。cancelRequested=true
        表示已请求取消，应以返回的 status 和原 SSE
        终态确认结果；关闭连接不能代替停止请求。
      </p>
      <p className="mt-2">
        runId
        来自运行事件或非流式响应。停止和恢复只能操作当前应用创建且仍有访问权限的运行，不能通过更换
        runId 控制其他应用的任务。
      </p>
    </section>
  );
}
