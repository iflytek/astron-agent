import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Select, Spin } from 'antd';
import http from '@/utils/http';
import useSpaceStore from '@/store/space-store';
import WechatBinding from '@/components/channels/wechat-binding';
import ApprovalList from '@/pages/release-management/approval-list';
import Analytics from './analytics';
import { errorText } from '@/pages/agents/errors';
import styles from './index.module.scss';

interface Publication {
  id: number;
  channel: string;
  targetId: string;
  versionId: number;
}
interface Bot {
  botId: number;
  botName: string;
  botDesc: string;
  publications: Publication[];
  legacyPublicationNeedsReview?: boolean;
}
interface App {
  appId: string;
  appName: string;
}
export default function Publishing() {
  const scope = useSpaceStore();
  const [bots, setBots] = useState<Bot[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [appId, setAppId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('releases');
  const [analyticsBotId, setAnalyticsBotId] = useState<number | null>(null);
  const [share, setShare] = useState<{ botId: number; key: string } | null>(
    null
  );
  useEffect(() => {
    generation.current += 1;
    setShare(null);
    setBusy(false);
    setAnalyticsBotId(null);
    setAppId('');
    setApps([]);
    setNotice('');
    setError('');
    setPage(1);
    return () => {
      generation.current += 1;
    };
  }, [scope.spaceId, scope.enterpriseId]);
  useEffect(() => {
    let active = true;
    setBots([]);
    setLoadError('');
    setLoading(true);
    Promise.all([
      http.get<unknown, { records: Bot[]; total: number }>('/publish/bots', {
        params: { page, size: 20 },
      }),
      http.get<unknown, App[]>('/publish-api/app-list'),
    ])
      .then(([data, applicationList]) => {
        if (active) {
          setBots(data.records);
          setTotal(data.total);
          setApps(applicationList);
        }
      })
      .catch(reason => {
        if (active) setLoadError(errorText(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scope.spaceId, scope.enterpriseId, page, revision]);
  const act = async (operation: () => Promise<unknown>) => {
    if (busy) return;
    const currentGeneration = generation.current;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation();
      if (currentGeneration === generation.current)
        setRevision(value => value + 1);
    } catch (reason) {
      if (currentGeneration === generation.current) setError(errorText(reason));
    } finally {
      if (currentGeneration === generation.current) setBusy(false);
    }
  };
  const publish = async (
    botId: number,
    channel: string,
    action = 'PUBLISH',
    targetId = ''
  ) => {
    const currentGeneration = generation.current;
    const data = await http.post<unknown, { approvalRequired?: boolean }>(
      `/publish/bots/${botId}`,
      { publishType: channel, action, publishData: { appId: targetId } }
    );
    if (currentGeneration !== generation.current) return;
    setNotice(
      data.approvalRequired
        ? '已提交审批，当前发布版本保持不变。'
        : action === 'OFFLINE'
          ? '已下架。'
          : '发布成功，新的调用将使用此次版本。'
    );
  };
  const confirm = (options: {
    title: string;
    content: string;
    okText: string;
    cancelText: string;
    onOk: () => Promise<void>;
  }) => {
    const currentGeneration = generation.current;
    Modal.confirm({
      ...options,
      onOk: () => {
        if (currentGeneration !== generation.current) return;
        return options.onOk();
      },
    });
  };
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>发布管理</h1>
          <p>管理 Agent 的发布渠道、版本、审批与分享。</p>
        </div>
        <Button href="/store/agent">浏览市场</Button>
      </header>
      <nav className={styles.tabs} aria-label="发布管理">
        <Button
          type={tab === 'releases' ? 'primary' : 'default'}
          aria-pressed={tab === 'releases'}
          onClick={() => setTab('releases')}
        >
          发布与分享
        </Button>
        <Button
          type={tab === 'approvals' ? 'primary' : 'default'}
          aria-pressed={tab === 'approvals'}
          onClick={() => setTab('approvals')}
        >
          发布审批
        </Button>
        <Button href="/management/app">应用与密钥</Button>
      </nav>
      {error && <Alert type="error" showIcon message={error} />}
      {notice && <Alert type="success" showIcon message={notice} />}
      {tab === 'approvals' ? (
        <ApprovalList key={`${scope.spaceId}:${scope.enterpriseId}`} />
      ) : (
        <>
          <div className={styles.toolbar}>
            <label>
              API 发布应用
              <Select
                aria-label="API 发布应用"
                value={appId || undefined}
                placeholder="选择应用"
                style={{ width: 240, maxWidth: '100%' }}
                onChange={setAppId}
                options={apps.map(app => ({
                  value: app.appId,
                  label: app.appName,
                }))}
              />
            </label>
            <span className={styles.hint}>
              发布到 API 前，请先选择目标应用。
            </span>
          </div>
          {loadError && (
            <Alert
              type="error"
              showIcon
              message="无法读取发布列表"
              description={loadError}
              action={
                <Button onClick={() => setRevision(value => value + 1)}>
                  重试
                </Button>
              }
            />
          )}
          {loading && (
            <div role="status" className={styles.empty}>
              <Spin />
              <p>正在读取发布与应用…</p>
            </div>
          )}
          {!loading && !loadError && !bots.length && (
            <section className={styles.empty}>
              <h2>暂无可发布的 Agent</h2>
              <p>创建并保存 Agent 配置后，即可选择渠道发布。</p>
              <Button type="primary" href="/space/agent">
                前往 Agent
              </Button>
            </section>
          )}
          {!loading && (
            <div className={styles.list}>
              {bots.map(bot => (
                <article className={styles.release} key={bot.botId}>
                  <div className={styles.releaseHeading}>
                    <div>
                      <h2>{bot.botName}</h2>
                      <p>{bot.botDesc || '暂无描述'}</p>
                    </div>
                    <Button onClick={() => setAnalyticsBotId(bot.botId)}>
                      使用分析与版本
                    </Button>
                  </div>
                  {bot.legacyPublicationNeedsReview && (
                    <Alert
                      type="warning"
                      showIcon
                      message="历史发布缺少可验证快照，请检查配置后重新发布。"
                    />
                  )}
                  <h3>已发布渠道</h3>
                  {bot.publications.length ? (
                    <ul className={styles.channels}>
                      {bot.publications.map(pub => (
                        <li key={pub.id}>
                          <span className={styles.channelName}>
                            {pub.channel === 'MARKET'
                              ? 'Agent 市场'
                              : pub.channel}
                          </span>
                          <span>版本 {pub.versionId}</span>
                          <span className={styles.target}>
                            {pub.targetId && `应用：${pub.targetId}`}
                          </span>
                          <Button
                            danger
                            disabled={busy}
                            onClick={() =>
                              confirm({
                                title: `下架 ${bot.botName}？`,
                                content: `此操作将下架 ${pub.channel} 渠道的版本 ${pub.versionId}。`,
                                okText: '确认下架',
                                cancelText: '取消',
                                onOk: () =>
                                  act(() =>
                                    publish(
                                      bot.botId,
                                      pub.channel,
                                      'OFFLINE',
                                      pub.targetId
                                    )
                                  ),
                              })
                            }
                          >
                            下架
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.hint}>尚未发布到任何渠道。</p>
                  )}
                  <div className={styles.actions}>
                    <Button
                      type="primary"
                      disabled={busy}
                      onClick={() =>
                        void act(() => publish(bot.botId, 'MARKET'))
                      }
                    >
                      发布到市场
                    </Button>
                    <Button
                      disabled={busy || !appId}
                      onClick={() =>
                        void act(() =>
                          publish(bot.botId, 'API', 'PUBLISH', appId)
                        )
                      }
                    >
                      发布到 API
                    </Button>
                    <WechatBinding botId={bot.botId} />
                    <Button href={`/published/${bot.botId}`}>
                      打开已发布版本
                    </Button>
                    {bot.publications.some(pub => pub.channel === 'MARKET') && (
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void act(async () => {
                            const currentGeneration = generation.current;
                            const value = await http.post<
                              unknown,
                              { shareAgentKey: string }
                            >('/share/get-share-key', {
                              relateId: bot.botId,
                              relateType: 0,
                            });
                            if (currentGeneration === generation.current)
                              setShare({
                                botId: bot.botId,
                                key: value.shareAgentKey,
                              });
                          })
                        }
                      >
                        获取分享链接
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          {analyticsBotId !== null && (
            <div className={styles.panel}>
              <div className={styles.panelHeading}>
                <h2>
                  {bots.find(bot => bot.botId === analyticsBotId)?.botName ||
                    `Agent ${analyticsBotId}`}
                </h2>
                <Button onClick={() => setAnalyticsBotId(null)}>
                  关闭分析
                </Button>
              </div>
              <Analytics
                key={`${scope.spaceId}:${analyticsBotId}`}
                botId={analyticsBotId}
              />
            </div>
          )}
          {share && (
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <h2>分享链接</h2>
                <Button
                  disabled={busy}
                  danger
                  onClick={() =>
                    confirm({
                      title: '撤销此分享链接？',
                      content: '撤销后，此链接将无法继续访问。',
                      okText: '确认撤销',
                      cancelText: '取消',
                      onOk: () =>
                        act(async () => {
                          const currentGeneration = generation.current;
                          await http.post('/share/revoke', {
                            shareAgentKey: share.key,
                          });
                          if (currentGeneration === generation.current) {
                            setShare(null);
                            setNotice('分享链接已撤销。');
                          }
                        }),
                    })
                  }
                >
                  撤销链接
                </Button>
              </div>
              <Input
                aria-label="分享链接"
                readOnly
                value={`${window.location.origin}/published/${share.botId}?shareKey=${encodeURIComponent(share.key)}`}
              />
            </section>
          )}
          {!loading && !loadError && total > 0 && (
            <div className={styles.pagination}>
              <Button
                disabled={page === 1 || busy}
                onClick={() => setPage(value => value - 1)}
              >
                上一页
              </Button>
              <span>
                第 {page} 页 · 共 {total} 个 Agent
              </span>
              <Button
                disabled={page * 20 >= total || busy}
                onClick={() => setPage(value => value + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
