import { useEffect, useState, type ReactElement } from 'react';
import { Alert, Button, Descriptions, Modal, Spin, Typography } from 'antd';
import {
  publishedApiInfo,
  type PublishedApiInfo,
} from '@/services/published-api';
import { errorText } from '@/pages/agents/errors';
import styles from './api-call-guide.module.scss';

const shellQuote = (value: string): string =>
  "'" + value.replace(/'/g, "'\\''") + "'";

export function ApiCallGuide({
  info,
}: {
  info: PublishedApiInfo;
}): ReactElement {
  const command = [
    'curl --no-buffer --request POST ' + shellQuote(info.serviceUrl),
    "  -H 'Authorization: Bearer <API_KEY>:<API_SECRET>'",
    "  -H 'Content-Type: application/json'",
    '  --data-raw ' + shellQuote(JSON.stringify(info.requestExample, null, 2)),
  ].join(' \\\n');
  const workflow = info.resourceKind === 'workflow';

  return (
    <section className={styles.guide} aria-label="API 调用方式">
      <Descriptions column={1} size="small">
        <Descriptions.Item label="目标应用">
          {info.appName} ({info.appId})
        </Descriptions.Item>
        <Descriptions.Item label="发布版本">
          #{info.versionId}
        </Descriptions.Item>
        <Descriptions.Item label="请求地址">
          <Typography.Text copyable>{info.serviceUrl}</Typography.Text>
        </Descriptions.Item>
      </Descriptions>
      <p>
        从<a href="/management/app">应用与密钥</a>复制目标应用的 API Key 和 API
        Secret，替换命令中的占位符，然后在服务端运行。
      </p>
      <div className={styles.example}>
        <Typography.Text
          copyable={{ text: command, tooltips: ['复制 cURL', '已复制'] }}
        >
          cURL
        </Typography.Text>
        <pre>
          <code>{command}</code>
        </pre>
      </div>
      {workflow && info.inputs.length > 0 && (
        <div className={styles.parameters}>
          <strong>工作流输入</strong>
          <ul>
            {info.inputs.map(input => (
              <li key={input.name}>
                <code>{input.name}</code>
                <span>
                  {input.type} · {input.required ? '必填' : '选填'}
                </span>
                {input.description && <span>{input.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p>
        <code>stream: true</code> 返回 SSE 事件。设置为 <code>false</code>{' '}
        可等待 JSON 格式的运行结果。
      </p>
      {!workflow && (
        <p>
          每次发送一条用户消息。需要连续对话时，使用同一个 <code>user</code>{' '}
          和自行生成的 <code>sessionId</code>。
        </p>
      )}
      {workflow && (
        <p>
          工作流暂停后，使用同一应用凭据请求{' '}
          <code>POST /workflow/v1/resume</code>， 在正文中提交原运行的{' '}
          <code>runId</code> 和补充的 <code>content</code>。
        </p>
      )}
      <p>
        使用同一应用凭据请求 <code>POST /workflow/v1/stop</code> 并提交{' '}
        <code>runId</code> 可停止运行，以返回的状态或原 SSE 终态确认结果。
      </p>
    </section>
  );
}

export interface ApiCallTarget {
  botId: string | number;
  appId: string;
}

export function ApiCallDialog({
  target,
  onClose,
}: {
  target: ApiCallTarget;
  onClose: () => void;
}): ReactElement {
  const { botId, appId } = target;
  const [info, setInfo] = useState<PublishedApiInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setInfo(null);
    setLoading(true);
    setError('');
    void publishedApiInfo(botId, { appId, metadataOnly: true })
      .then(data => {
        if (active) setInfo(data);
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
  }, [botId, appId, revision]);

  return (
    <Modal
      title="API 调用方式"
      open
      width={640}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
    >
      {loading && <Spin aria-label="正在读取 API 调用方式" />}
      {error && (
        <Alert
          type="error"
          showIcon
          message="无法读取 API 调用方式"
          description={error}
          action={
            <Button onClick={() => setRevision(value => value + 1)}>
              重试
            </Button>
          }
        />
      )}
      {!loading && !error && !info && (
        <Alert
          type="info"
          showIcon
          message="此应用没有可查看的已发布版本"
          description="发布生效后，绑定应用的所有者可查看调用方式。"
        />
      )}
      {info && <ApiCallGuide info={info} />}
    </Modal>
  );
}
