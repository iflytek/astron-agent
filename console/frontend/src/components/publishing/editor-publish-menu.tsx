import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Alert, Button, Dropdown, Modal, Select, Spin, message } from 'antd';
import {
  ApiOutlined,
  CloudUploadOutlined,
  DownOutlined,
  SaveOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import http from '@/utils/http';
import useSpaceStore from '@/store/space-store';
import { ApiCallDialog, type ApiCallTarget } from './api-call-guide';
import styles from './editor-publish-menu.module.scss';

interface EditorPublishMenuProps {
  target: { kind: 'workflow' | 'agent'; id: string | number };
  name: string;
  onSaveVersion: () => void;
  beforePublish?: () => Promise<unknown>;
  disabled?: boolean;
  saveVersionDisabled?: boolean;
  disabledReason?: string;
  onPublishingChange?: (busy: boolean) => void;
}

interface PublishApp {
  appId: string;
  appName: string;
}

type Channel = 'MARKET' | 'API';

const describeError = (reason: unknown): string =>
  reason && typeof reason === 'object' && 'message' in reason
    ? String(reason.message)
    : '发布失败，请重试';

export default function EditorPublishMenu({
  target,
  name,
  onSaveVersion,
  beforePublish,
  disabled = false,
  saveVersionDisabled = false,
  disabledReason,
  onPublishingChange,
}: EditorPublishMenuProps): ReactElement {
  const isWorkflow = target.kind === 'workflow';
  const spaceId = useSpaceStore(state => state.spaceId);
  const enterpriseId = useSpaceStore(state => state.enterpriseId);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [apps, setApps] = useState<PublishApp[]>([]);
  const [appId, setAppId] = useState('');
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState('');
  const [appsRevision, setAppsRevision] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [calling, setCalling] = useState<ApiCallTarget | null>(null);
  const generation = useRef(0);
  const submitting = useRef(false);
  const publishingChange = useRef(onPublishingChange);
  publishingChange.current = onPublishingChange;

  useEffect(() => {
    generation.current += 1;
    submitting.current = false;
    setChannel(null);
    setApps([]);
    setAppId('');
    setError('');
    setCalling(null);
    setPublishing(false);
    return (): void => {
      generation.current += 1;
      publishingChange.current?.(false);
    };
  }, [target.kind, target.id, spaceId, enterpriseId]);

  useEffect(() => {
    if (channel !== 'API') return;
    let active = true;
    setApps([]);
    setAppId('');
    setAppsError('');
    setAppsLoading(true);
    const load = async (): Promise<void> => {
      const bot =
        target.kind === 'workflow'
          ? await http.post<unknown, { botId: number }>(
              '/publish/workflows/bind',
              { workflowId: target.id }
            )
          : { botId: target.id };
      if (!active) return;
      // The preparation endpoint omits application keys and secrets.
      const data = await http.get<unknown, { apps: PublishApp[] }>(
        `/publish/bots/${bot.botId}/prepare`,
        { params: { type: 'API' } }
      );
      if (active) setApps(data.apps);
    };
    void load()
      .catch(reason => {
        if (active) setAppsError(describeError(reason));
      })
      .finally(() => {
        if (active) setAppsLoading(false);
      });
    return (): void => {
      active = false;
    };
  }, [channel, target.kind, target.id, spaceId, enterpriseId, appsRevision]);

  const publish = async (): Promise<void> => {
    if (
      disabled ||
      submitting.current ||
      !channel ||
      (channel === 'API' && !appId)
    )
      return;
    const currentGeneration = generation.current;
    submitting.current = true;
    setPublishing(true);
    publishingChange.current?.(true);
    setError('');
    try {
      await beforePublish?.();
      if (currentGeneration !== generation.current) return;
      const bot =
        target.kind === 'workflow'
          ? await http.post<unknown, { botId: number }>(
              '/publish/workflows/bind',
              { workflowId: target.id }
            )
          : { botId: target.id };
      if (currentGeneration !== generation.current) return;
      const result = await http.post<unknown, { approvalRequired?: boolean }>(
        `/publish/bots/${bot.botId}`,
        {
          publishType: channel,
          action: 'PUBLISH',
          publishData: { appId: channel === 'API' ? appId : '' },
        }
      );
      if (currentGeneration !== generation.current) return;
      setChannel(null);
      if (channel === 'API' && !result.approvalRequired) {
        setCalling({ botId: bot.botId, appId });
      }
      message.success(
        result.approvalRequired
          ? '已提交发布审批，审批通过后新版本生效。'
          : '发布成功，新的调用将使用此次版本。'
      );
    } catch (reason) {
      if (currentGeneration === generation.current)
        setError(describeError(reason));
    } finally {
      if (currentGeneration === generation.current) {
        submitting.current = false;
        setPublishing(false);
        publishingChange.current?.(false);
      }
    }
  };

  const openChannel = (value: Channel): void => {
    setError('');
    setChannel(value);
  };

  return (
    <>
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        overlayClassName={isWorkflow ? styles.workflowMenu : undefined}
        menu={{
          items: [
            {
              key: 'market',
              label: '发布到市场',
              icon: isWorkflow ? <ShopOutlined /> : undefined,
              onClick: (): void => openChannel('MARKET'),
            },
            {
              key: 'api',
              label: '发布为 API',
              icon: isWorkflow ? <ApiOutlined /> : undefined,
              onClick: (): void => openChannel('API'),
            },
            { type: 'divider' },
            {
              key: 'version',
              label: '保存版本',
              icon: isWorkflow ? <SaveOutlined /> : undefined,
              disabled: saveVersionDisabled,
              onClick: onSaveVersion,
            },
          ],
        }}
        disabled={disabled || publishing}
      >
        <Button
          type="primary"
          className={isWorkflow ? styles.workflowTrigger : undefined}
          icon={isWorkflow ? <CloudUploadOutlined /> : undefined}
          disabled={disabled || publishing}
          title={disabledReason}
        >
          发布 <DownOutlined />
        </Button>
      </Dropdown>
      <Modal
        title={channel === 'API' ? '发布为 API' : '发布到市场'}
        open={channel !== null}
        confirmLoading={publishing}
        closable={!publishing}
        maskClosable={!publishing}
        keyboard={!publishing}
        cancelButtonProps={{ disabled: publishing }}
        okText={channel === 'API' ? '发布为 API' : '发布到市场'}
        cancelText="取消"
        okButtonProps={{
          disabled:
            disabled ||
            (channel === 'API' &&
              (appsLoading || Boolean(appsError) || !appId)),
        }}
        onCancel={() => {
          if (!publishing) setChannel(null);
        }}
        onOk={() => void publish()}
      >
        <p className="mb-4">
          {channel === 'API'
            ? `将“${name}”的已保存配置发布到所选应用，新的 API 调用使用此次版本。`
            : `将“${name}”的已保存配置发布到市场，市场用户可访问此次版本。`}
          后续编辑不会修改本次发布；需要审批时将先提交审批。
        </p>
        {channel === 'API' && (
          <>
            {appsLoading && <Spin aria-label="正在读取发布应用" />}
            {appsError && (
              <Alert
                type="error"
                showIcon
                message="无法读取发布应用"
                description={appsError}
                action={
                  <Button onClick={() => setAppsRevision(value => value + 1)}>
                    重试
                  </Button>
                }
              />
            )}
            {!appsLoading && !appsError && (
              <label className="flex flex-col gap-2">
                API 发布应用
                <Select
                  aria-label="API 发布应用"
                  disabled={publishing}
                  value={appId || undefined}
                  placeholder="选择应用"
                  onChange={setAppId}
                  options={apps.map(app => ({
                    value: app.appId,
                    label: app.appName,
                  }))}
                />
                {!apps.length && (
                  <p>
                    暂无可用应用，请先在<a href="/management/app">应用与密钥</a>
                    中创建应用。
                  </p>
                )}
              </label>
            )}
          </>
        )}
        {disabled && disabledReason && (
          <Alert
            className="mt-3"
            type="warning"
            showIcon
            message={disabledReason}
          />
        )}
        {error && (
          <Alert className="mt-3" type="error" showIcon message={error} />
        )}
      </Modal>
      {calling && (
        <ApiCallDialog target={calling} onClose={() => setCalling(null)} />
      )}
    </>
  );
}
