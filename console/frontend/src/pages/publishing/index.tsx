import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import http from '@/utils/http';
import useSpaceStore from '@/store/space-store';
import WechatBinding from '@/components/channels/wechat-binding';
import ApprovalList from '@/pages/release-management/approval-list';
import Analytics from './analytics';
import { errorText } from '@/pages/agents/errors';
import '@/pages/agents/style.css';

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
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('releases');
  const [analyticsBotId, setAnalyticsBotId] = useState<number | null>(null);
  const [share, setShare] = useState<{ botId: number; key: string } | null>(
    null
  );
  useEffect(() => {
    setShare(null);
    setAnalyticsBotId(null);
    setAppId('');
    setApps([]);
    setNotice('');
  }, [scope.spaceId, scope.enterpriseId]);
  useEffect(() => {
    let active = true;
    setBots([]);
    setError('');
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
        if (active) setError(errorText(reason));
      });
    return () => {
      active = false;
    };
  }, [scope.spaceId, scope.enterpriseId, page, revision]);
  const act = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation();
      setRevision(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  const publish = async (
    botId: number,
    channel: string,
    action = 'PUBLISH',
    targetId = ''
  ) => {
    const data = await http.post<unknown, { approvalRequired?: boolean }>(
      `/publish/bots/${botId}`,
      {
        publishType: channel,
        action,
        publishData: { appId: targetId },
      }
    );
    setNotice(
      data.approvalRequired
        ? '已提交审批，当前发布版本保持不变。'
        : action === 'OFFLINE'
          ? '已下架。'
          : '发布成功，新的调用将使用此次版本。'
    );
  };
  return (
    <main className="agents-page">
      <header className="agents-header">
        <div>
          <h1>发布管理</h1>
          <p>将保存的配置发布到市场或应用，管理审批与分享。</p>
        </div>
        <Link className="button" to="/store/agent">
          浏览市场
        </Link>
      </header>
      <nav className="agents-toolbar">
        <button onClick={() => setTab('releases')}>发布与分享</button>
        <button onClick={() => setTab('approvals')}>发布审批</button>
        <Link to="/management/app">应用与密钥</Link>
      </nav>
      {error && (
        <p role="alert" className="agents-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {tab === 'approvals' ? (
        <ApprovalList key={`${scope.spaceId}:${scope.enterpriseId}`} />
      ) : (
        <>
          <label>
            API 发布应用
            <select
              aria-label="API 发布应用"
              value={appId}
              onChange={event => setAppId(event.target.value)}
            >
              <option value="">选择应用</option>
              {apps.map(app => (
                <option key={app.appId} value={app.appId}>
                  {app.appName}
                </option>
              ))}
            </select>
          </label>
          <div className="agents-grid">
            {bots.map(bot => (
              <article className="agents-card" key={bot.botId}>
                <h2>{bot.botName}</h2>
                <button onClick={() => setAnalyticsBotId(bot.botId)}>
                  查看使用分析与版本
                </button>
                <WechatBinding botId={bot.botId} />
                <p>{bot.botDesc}</p>
                {bot.legacyPublicationNeedsReview && (
                  <p role="alert">
                    历史发布缺少可验证快照，请检查配置后重新发布。
                  </p>
                )}
                <div className="agents-actions">
                  <button
                    disabled={busy}
                    onClick={() => void act(() => publish(bot.botId, 'MARKET'))}
                  >
                    发布到市场
                  </button>
                  <button
                    disabled={busy || !appId}
                    onClick={() =>
                      void act(() =>
                        publish(bot.botId, 'API', 'PUBLISH', appId)
                      )
                    }
                  >
                    发布到 API
                  </button>
                  <Link className="button" to={`/published/${bot.botId}`}>
                    打开已发布版本
                  </Link>
                </div>
                <ul>
                  {bot.publications.map(pub => (
                    <li key={pub.id}>
                      {pub.channel} · 版本 {pub.versionId}{' '}
                      {pub.targetId && `· ${pub.targetId}`}{' '}
                      <button
                        disabled={busy}
                        onClick={() =>
                          void act(() =>
                            publish(
                              bot.botId,
                              pub.channel,
                              'OFFLINE',
                              pub.targetId
                            )
                          )
                        }
                      >
                        下架
                      </button>
                    </li>
                  ))}
                </ul>
                {bot.publications.some(pub => pub.channel === 'MARKET') && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        const value = await http.post<
                          unknown,
                          { shareAgentKey: string }
                        >('/share/get-share-key', {
                          relateId: bot.botId,
                          relateType: 0,
                        });
                        setShare({
                          botId: bot.botId,
                          key: value.shareAgentKey,
                        });
                      })
                    }
                  >
                    获取分享链接
                  </button>
                )}
              </article>
            ))}
          </div>
          {!bots.length && (
            <p>暂无可发布的 Agent。先创建并保存配置，再回到这里发布。</p>
          )}
          {analyticsBotId !== null && (
            <Analytics
              key={`${scope.spaceId}:${analyticsBotId}`}
              botId={analyticsBotId}
            />
          )}
          {share && (
            <section className="agents-panel">
              <h2>分享链接</h2>
              <input
                aria-label="分享链接"
                readOnly
                value={`${window.location.origin}/published/${share.botId}?shareKey=${encodeURIComponent(share.key)}`}
              />
              <button
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await http.post('/share/revoke', {
                      shareAgentKey: share.key,
                    });
                    setShare(null);
                    setNotice('分享链接已撤销。');
                  })
                }
              >
                撤销链接
              </button>
            </section>
          )}
          <div className="agents-actions">
            <button
              disabled={page === 1}
              onClick={() => setPage(value => value - 1)}
            >
              上一页
            </button>
            <span>{page}</span>
            <button
              disabled={page * 20 >= total}
              onClick={() => setPage(value => value + 1)}
            >
              下一页
            </button>
          </div>
        </>
      )}
    </main>
  );
}
