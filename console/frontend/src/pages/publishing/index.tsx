import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Input, Modal, Select, Spin, Tag } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  DeploymentUnitOutlined,
  RobotOutlined,
} from '@ant-design/icons';
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
  hasFrozenDependencies?: boolean;
}
interface Bot {
  botId: number | null;
  botName: string;
  botDesc: string;
  resourceKind: 'agent' | 'workflow';
  resourceId: string;
  workflowId?: number;
  publications: Publication[];
  pendingApprovals: { id: number; publish_type: string; target_id: string }[];
  legacyPublicationNeedsReview?: boolean;
}
interface Version {
  id: number;
  name: string;
  createdTime: string;
}
interface Preparation {
  apps: { appId: string; appName: string }[];
  versions: { records: Version[]; total: number };
  requiresApproval: boolean;
}
const channelName = (channel: string): string =>
  ({ MARKET: '市场', API: 'API', INTERNAL: '内部调用', WECHAT: '微信' })[
    channel
  ] || channel;
const resourceKey = (bot: Bot): string =>
  `${bot.resourceKind}:${bot.resourceId}`;

function ReleaseDetails({
  initial,
  onChanged,
}: {
  initial: Bot;
  onChanged: () => void;
}) {
  const [bot, setBot] = useState(initial);
  const [preparation, setPreparation] = useState<Preparation | null>(null);
  const [channel, setChannel] = useState('MARKET');
  const [appId, setAppId] = useState('');
  const [versionId, setVersionId] = useState<number | 'draft'>('draft');
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [versionPage, setVersionPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [detailTab, setDetailTab] = useState('channels');
  const [shareKey, setShareKey] = useState('');
  const mounted = useRef(false);
  const submitting = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    const load = async () => {
      const identity =
        initial.botId === null
          ? await http.post<unknown, Bot>('/publish/workflows/bind', {
              workflowId: initial.resourceId,
            })
          : initial;
      if (!active) return;
      const [current, data] = await Promise.all([
        http.get<unknown, Bot>(`/publish/bots/${identity.botId}`),
        http.get<unknown, Preparation>(
          `/publish/bots/${identity.botId}/prepare`,
          { params: { type: 'API', page: versionPage, size: 20 } }
        ),
      ]);
      if (active) {
        setBot(current);
        setPreparation(data);
      }
    };
    void load()
      .catch(reason => {
        if (active) setLoadError(errorText(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initial, revision, versionPage]);
  const act = async (operation: () => Promise<void>) => {
    if (submitting.current || !mounted.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation();
      if (mounted.current) {
        setRevision(value => value + 1);
        onChanged();
      }
    } catch (reason) {
      if (mounted.current) setError(errorText(reason));
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const confirm = (
    title: string,
    content: string,
    operation: () => Promise<void>,
    danger = false
  ) => {
    Modal.confirm({
      title,
      content,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger },
      onOk: () => (mounted.current ? act(operation) : undefined),
    });
  };
  const market = bot.publications.some(pub => pub.channel === 'MARKET');
  const target = channel === 'API' ? appId : '';
  const pending = bot.pendingApprovals.some(
    row => row.publish_type === channel && row.target_id === target
  );
  const selectedLabel =
    versionId === 'draft'
      ? '当前已保存草稿（创建新版本）'
      : `${selectedVersion?.name || '版本'} · #${versionId}`;
  const versions = preparation?.versions.records || [];
  const versionOptions =
    selectedVersion && !versions.some(row => row.id === selectedVersion.id)
      ? [selectedVersion, ...versions]
      : versions;
  return (
    <div className={styles.detail}>
      <div className={styles.objectHeading}>
        <Tag>{bot.resourceKind === 'workflow' ? '工作流' : 'Agent'}</Tag>
        <p>{bot.botDesc || '暂无描述'}</p>
        <Button
          type="link"
          href={
            bot.resourceKind === 'workflow'
              ? `/work_flow/${bot.workflowId}/arrange`
              : `/space/config/${bot.botId}/base`
          }
        >
          前往编辑器 <ArrowRightOutlined />
        </Button>
      </div>
      <nav className={styles.detailTabs} aria-label="发布详情">
        <Button
          type={detailTab === 'channels' ? 'primary' : 'text'}
          onClick={() => setDetailTab('channels')}
        >
          渠道与版本
        </Button>
        <Button
          type={detailTab === 'analytics' ? 'primary' : 'text'}
          disabled={bot.botId === null}
          onClick={() => setDetailTab('analytics')}
        >
          使用分析
        </Button>
      </nav>
      {error && <Alert showIcon type="error" message={error} />}
      {notice && <Alert showIcon type="success" message={notice} />}
      {loadError && (
        <Alert
          showIcon
          type="error"
          message="无法读取发布配置"
          description={loadError}
          action={
            <Button onClick={() => setRevision(value => value + 1)}>
              重试
            </Button>
          }
        />
      )}
      {detailTab === 'analytics' && bot.botId !== null ? (
        <Analytics botId={bot.botId} />
      ) : (
        <>
          {bot.legacyPublicationNeedsReview && (
            <Alert
              type="warning"
              showIcon
              message="历史发布缺少可验证快照，请检查配置后重新发布。"
            />
          )}
          {bot.publications.some(
            pub => pub.hasFrozenDependencies === false
          ) && (
            <Alert
              type="warning"
              showIcon
              message="部分旧发布未冻结执行依赖"
              description="旧版本沿用原执行行为。请检查依赖后重新发布，新的发布会同时固定子工作流和 Agent 版本。"
            />
          )}
          <section className={styles.detailSection}>
            <h2>发布新版本</h2>
            <p className={styles.hint}>
              每个渠道独立使用发布快照。编辑草稿不会更新线上版本。
            </p>
            {loading && (
              <div role="status">
                <Spin size="small" /> 正在读取版本与应用…
              </div>
            )}
            <fieldset
              disabled={busy || loading || !!loadError}
              className={styles.publishForm}
            >
              <label>
                发布渠道
                <Select
                  aria-label="发布渠道"
                  disabled={busy || loading || !!loadError}
                  value={channel}
                  onChange={setChannel}
                  options={[
                    { value: 'MARKET', label: '市场 · 对话与分享' },
                    { value: 'API', label: 'API · 应用调用' },
                  ]}
                />
              </label>
              <label>
                版本来源
                <Select
                  aria-label="版本来源"
                  disabled={busy || loading || !!loadError}
                  value={versionId}
                  onChange={value => {
                    setVersionId(value);
                    setSelectedVersion(
                      versionOptions.find(row => row.id === value) || null
                    );
                  }}
                  options={[
                    { value: 'draft', label: '当前已保存草稿（创建新版本）' },
                    ...versionOptions.map(row => ({
                      value: row.id,
                      label: `${row.name} · #${row.id}`,
                    })),
                  ]}
                />
              </label>
              {(preparation?.versions.total || 0) > 20 && (
                <div className={styles.versionPager}>
                  <span>保存版本 · 第 {versionPage} 页</span>
                  <Button
                    size="small"
                    disabled={loading || busy || versionPage === 1}
                    onClick={() => setVersionPage(value => value - 1)}
                  >
                    较新
                  </Button>
                  <Button
                    size="small"
                    disabled={
                      loading ||
                      busy ||
                      versionPage * 20 >= (preparation?.versions.total || 0)
                    }
                    onClick={() => setVersionPage(value => value + 1)}
                  >
                    更早
                  </Button>
                </div>
              )}
              {channel === 'API' && (
                <label>
                  目标应用
                  <Select
                    aria-label="目标应用"
                    disabled={busy || loading || !!loadError}
                    placeholder="选择调用此版本的应用"
                    value={appId || undefined}
                    onChange={setAppId}
                    options={preparation?.apps.map(app => ({
                      value: app.appId,
                      label: app.appName,
                    }))}
                  />
                </label>
              )}
              {channel === 'API' &&
                !loading &&
                preparation &&
                !preparation.apps.length && (
                  <p>
                    暂无应用，请先
                    <Button type="link" href="/management/app">
                      创建应用
                    </Button>
                    。
                  </p>
                )}
              {preparation?.requiresApproval && (
                <p className={styles.hint}>
                  发布需由空间管理员审批，审批通过前继续使用现有版本。
                </p>
              )}
              <div className={styles.formFooter}>
                <Button
                  type="primary"
                  loading={busy}
                  disabled={
                    loading ||
                    !!loadError ||
                    !preparation ||
                    pending ||
                    (channel === 'API' && !appId)
                  }
                  onClick={() =>
                    confirm(
                      preparation?.requiresApproval
                        ? '提交发布审批？'
                        : '确认发布此版本？',
                      `${bot.botName} · ${selectedLabel} → ${channelName(channel)}${channel === 'API' ? ` / ${preparation?.apps.find(app => app.appId === appId)?.appName || appId}` : ''}。${preparation?.requiresApproval ? '审批通过后生效。' : '成功后替换该目标的当前版本。'}`,
                      async () => {
                        const result = await http.post<
                          unknown,
                          { approvalRequired?: boolean }
                        >(`/publish/bots/${bot.botId}`, {
                          publishType: channel,
                          publishData: {
                            appId: target,
                            ...(versionId === 'draft' ? {} : { versionId }),
                          },
                        });
                        if (mounted.current)
                          setNotice(
                            result.approvalRequired
                              ? '已提交审批，当前发布版本保持不变。'
                              : '发布成功，新的调用将使用此次版本。'
                          );
                      }
                    )
                  }
                >
                  {pending
                    ? '该目标正在审批'
                    : preparation?.requiresApproval
                      ? '提交审批'
                      : '发布版本'}
                </Button>
                <span className={styles.hint}>
                  草稿的未保存修改请先在编辑器保存。
                </span>
              </div>
            </fieldset>
          </section>
          <section className={styles.detailSection}>
            <div className={styles.panelHeading}>
              <h2>已发布渠道</h2>
              {market && (
                <Button href={`/published/${bot.botId}`}>打开市场版本</Button>
              )}
            </div>
            {!bot.publications.length && (
              <p className={styles.hint}>
                尚未发布。选择上方渠道，发布第一个版本。
              </p>
            )}
            <ul className={styles.channelList}>
              {bot.publications.map(pub => (
                <li key={pub.id}>
                  <div>
                    <strong>{channelName(pub.channel)}</strong>
                    <span>版本 #{pub.versionId}</span>
                    {pub.targetId && (
                      <small>
                        应用：
                        {preparation?.apps.find(
                          app => app.appId === pub.targetId
                        )?.appName || pub.targetId}
                      </small>
                    )}
                  </div>
                  {pub.channel === 'WECHAT' ? (
                    <span className={styles.hint}>在微信渠道中管理</span>
                  ) : (
                    <Button
                      danger
                      disabled={busy || preparation?.requiresApproval}
                      onClick={() =>
                        confirm(
                          `下架${channelName(pub.channel)}版本？`,
                          `${bot.botName} · 版本 #${pub.versionId}${pub.targetId ? ` · 应用 ${pub.targetId}` : ''}。该目标将停止接收新调用。`,
                          async () => {
                            await http.post(`/publish/bots/${bot.botId}`, {
                              publishType: pub.channel,
                              action: 'OFFLINE',
                              publishData: { appId: pub.targetId },
                            });
                            if (mounted.current) {
                              setNotice('已下架指定渠道目标。');
                              if (pub.channel === 'MARKET') setShareKey('');
                            }
                          },
                          true
                        )
                      }
                    >
                      下架
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {!!bot.pendingApprovals.length && (
              <p className={styles.hint}>
                有 {bot.pendingApprovals.length}{' '}
                项待审批申请，请在“发布审批”中查看或撤回。
              </p>
            )}
          </section>
          <section className={styles.detailSection}>
            <h2>分享与其他渠道</h2>
            <p className={styles.hint}>
              市场发布后可生成分享链接；微信公众号需单独授权。
            </p>
            <div className={styles.actions}>
              <Button
                disabled={busy || !market}
                onClick={() =>
                  void act(async () => {
                    const result = await http.post<
                      unknown,
                      { shareAgentKey: string }
                    >('/share/get-share-key', {
                      relateId: bot.botId,
                      relateType: 0,
                    });
                    if (mounted.current) setShareKey(result.shareAgentKey);
                  })
                }
              >
                获取分享链接
              </Button>
              {bot.botId !== null && (
                <WechatBinding
                  key={bot.botId}
                  botId={bot.botId}
                  disabled={busy}
                  onChanged={() => {
                    if (!mounted.current) return;
                    setRevision(value => value + 1);
                    onChanged();
                  }}
                />
              )}
            </div>
            {shareKey && (
              <div className={styles.share}>
                <Input
                  aria-label="分享链接"
                  readOnly
                  value={`${window.location.origin}/published/${bot.botId}?shareKey=${encodeURIComponent(shareKey)}`}
                />
                <Button
                  danger
                  disabled={busy}
                  onClick={() =>
                    confirm(
                      '撤销分享链接？',
                      '撤销后，此链接将无法继续访问。',
                      async () => {
                        await http.post('/share/revoke', {
                          shareAgentKey: shareKey,
                        });
                        if (mounted.current) {
                          setShareKey('');
                          setNotice('分享链接已撤销。');
                        }
                      },
                      true
                    )
                  }
                >
                  撤销链接
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function PublishingCatalog() {
  const { spaceId, enterpriseId, spaceType } = useSpaceStore();
  const [bots, setBots] = useState<Bot[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('releases');
  const [selected, setSelected] = useState<Bot | null>(null);
  const scopeKey = `${spaceId}:${enterpriseId}`;
  useEffect(() => {
    setSelected(null);
    setPage(1);
    setSearch('');
    setQuery('');
  }, [spaceId, enterpriseId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    void http
      .get<unknown, { records: Bot[]; total: number }>('/publish/bots', {
        params: {
          page,
          size: 20,
          search: query,
          resourceKind: kind,
          includeWorkflows: true,
        },
      })
      .then(data => {
        if (active) {
          setBots(data.records);
          setTotal(data.total);
          if (page > 1 && !data.records.length) setPage(value => value - 1);
        }
      })
      .catch(reason => {
        if (active) {
          setBots([]);
          setLoadError(errorText(reason));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [spaceId, enterpriseId, page, query, kind, revision]);
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>发布管理</h1>
          <p>将 Agent 与工作流发布到所需渠道，清楚掌握每个线上版本。</p>
        </div>
        <Button href="/store/agent">
          浏览市场 <ArrowRightOutlined />
        </Button>
      </header>
      <nav className={styles.tabs} aria-label="发布管理">
        <button
          type="button"
          aria-current={tab === 'releases' ? 'page' : undefined}
          onClick={() => setTab('releases')}
        >
          发布与分享
        </button>
        <button
          type="button"
          aria-current={tab === 'approvals' ? 'page' : undefined}
          onClick={() => setTab('approvals')}
        >
          发布审批
        </button>
        <Button type="link" href="/management/app">
          应用与密钥 <ArrowRightOutlined />
        </Button>
      </nav>
      {tab === 'approvals' ? (
        <ApprovalList key={scopeKey} spaceId={spaceId} spaceType={spaceType} />
      ) : (
        <>
          <div className={styles.catalogToolbar}>
            <Input
              prefix={<SearchOutlined />}
              aria-label="搜索 Agent 或工作流"
              placeholder="搜索 Agent 或工作流"
              value={search}
              allowClear
              onChange={event => setSearch(event.target.value)}
            />
            <Select
              aria-label="资源类型"
              value={kind}
              onChange={value => {
                setKind(value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: '全部类型' },
                { value: 'agent', label: 'Agent' },
                { value: 'workflow', label: '工作流' },
              ]}
            />
            <span className={styles.resultCount}>
              {loading ? '正在读取…' : `共 ${total} 个对象`}
            </span>
            <Button
              icon={<ReloadOutlined />}
              aria-label="刷新发布列表"
              onClick={() => setRevision(value => value + 1)}
            />
          </div>
          {loadError ? (
            <Alert
              showIcon
              type="error"
              message="无法读取发布列表"
              description={loadError}
              action={
                <Button onClick={() => setRevision(value => value + 1)}>
                  重试
                </Button>
              }
            />
          ) : loading ? (
            <div role="status" className={styles.empty}>
              <Spin />
              <p>正在读取发布列表…</p>
            </div>
          ) : !bots.length ? (
            <section className={styles.empty}>
              <h2>
                {query || kind !== 'all'
                  ? '没有匹配的发布对象'
                  : '从第一个发布版本开始'}
              </h2>
              <p>
                {query || kind !== 'all'
                  ? '换个关键词，或查看全部类型。'
                  : '创建并保存 Agent 或工作流后，即可在这里管理渠道与版本。'}
              </p>
              {query || kind !== 'all' ? (
                <Button
                  onClick={() => {
                    setSearch('');
                    setQuery('');
                    setKind('all');
                    setPage(1);
                  }}
                >
                  清除筛选
                </Button>
              ) : (
                <div className={styles.emptyActions}>
                  <Button href="/space/agent">前往 Agent</Button>
                  <Button href="/work_flow">前往工作流</Button>
                </div>
              )}
            </section>
          ) : (
            <>
              <div className={styles.releaseTable}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">发布对象</th>
                      <th scope="col">类型</th>
                      <th scope="col">渠道与线上版本</th>
                      <th scope="col">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bots.map(bot => (
                      <tr key={resourceKey(bot)}>
                        <td>
                          <button
                            className={styles.objectLink}
                            onClick={() => setSelected(bot)}
                          >
                            {bot.resourceKind === 'workflow' ? (
                              <DeploymentUnitOutlined />
                            ) : (
                              <RobotOutlined />
                            )}
                            <span>{bot.botName || '未命名'}</span>
                          </button>
                          <p className={styles.description}>
                            {bot.botDesc || '暂无描述'}
                          </p>
                        </td>
                        <td>
                          <span className={styles.kind}>
                            {bot.resourceKind === 'workflow'
                              ? '工作流'
                              : 'Agent'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.channelSummary}>
                            {bot.publications.length ? (
                              bot.publications.map(pub => (
                                <Tag key={pub.id}>
                                  {channelName(pub.channel)}{' '}
                                  <span>#{pub.versionId}</span>
                                  {pub.channel === 'API' && (
                                    <small> / {pub.targetId}</small>
                                  )}
                                </Tag>
                              ))
                            ) : (
                              <span className={styles.hint}>尚未发布</span>
                            )}
                            {!!bot.pendingApprovals.length && (
                              <Tag color="gold">
                                待审批 {bot.pendingApprovals.length}
                              </Tag>
                            )}
                            {bot.legacyPublicationNeedsReview && (
                              <Tag color="orange">历史发布需检查</Tag>
                            )}
                          </div>
                        </td>
                        <td>
                          <Button type="link" onClick={() => setSelected(bot)}>
                            管理发布 <ArrowRightOutlined />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.pagination}>
                <span>共 {total} 个对象</span>
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(value => value - 1)}
                >
                  上一页
                </Button>
                <span>第 {page} 页</span>
                <Button
                  disabled={page * 20 >= total}
                  onClick={() => setPage(value => value + 1)}
                >
                  下一页
                </Button>
              </div>
            </>
          )}
        </>
      )}
      <Drawer
        title={selected?.botName || '发布详情'}
        open={!!selected}
        onClose={() => setSelected(null)}
        width="min(680px, 100vw)"
        destroyOnClose
        rootClassName={styles.releaseDrawer}
      >
        {selected && (
          <ReleaseDetails
            key={`${scopeKey}:${resourceKey(selected)}`}
            initial={selected}
            onChanged={() => setRevision(value => value + 1)}
          />
        )}
      </Drawer>
    </main>
  );
}

export default function Publishing() {
  const { spaceId, enterpriseId } = useSpaceStore();
  return <PublishingCatalog key={`${spaceId}:${enterpriseId}`} />;
}
