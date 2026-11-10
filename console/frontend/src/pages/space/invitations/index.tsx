import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Spin, Tag } from 'antd';
import { Link } from 'react-router-dom';
import http from '@/utils/http';
import styles from './index.module.scss';

type Invitation = {
  id: number;
  status: number;
  type: number;
  spaceName: string;
  enterpriseName: string;
  inviterName: string;
  expireTime: string;
};
const statusNames: Record<number, string> = {
  1: '待处理',
  2: '已拒绝',
  3: '已加入',
  4: '已撤回',
  5: '已过期',
};

export default function Invitations() {
  const [items, setItems] = useState<Invitation[]>([]);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    http
      .get<never, Invitation[]>('/invite-record/my-invitations')
      .then(result => {
        if (!ignore) setItems(result);
      })
      .catch(() => {
        if (!ignore) setError('无法获取邀请，请重试。');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [revision]);

  async function decide(id: number, accept: boolean) {
    if (busy !== null) return;
    setBusy(id);
    setActionError('');
    try {
      await http.post(
        `/invite-record/${accept ? 'accept' : 'refuse'}-invite?inviteId=${id}`
      );
      setRevision(value => value + 1);
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : '邀请处理失败，请重试。'
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>我的空间与团队邀请</h1>
          <p>查看邀请来源、有效期和处理状态。</p>
        </div>
        <Link to="/space">管理空间</Link>
      </header>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button onClick={() => setRevision(value => value + 1)}>
              重试
            </Button>
          }
        />
      )}
      {actionError && <Alert type="error" showIcon message={actionError} />}
      {loading ? (
        <div className={styles.loading} role="status" aria-label="正在加载邀请">
          <Spin />
        </div>
      ) : (
        !error &&
        (items.length ? (
          <ul className={styles.list}>
            {items.map(item => (
              <li key={item.id} className={styles.item}>
                <div className={styles.identity}>
                  <div className={styles.name}>
                    <h2>
                      {item.type === 1 ? item.spaceName : item.enterpriseName}
                    </h2>
                    <Tag color={item.status === 1 ? 'blue' : 'default'}>
                      {statusNames[item.status] || '未知状态'}
                    </Tag>
                  </div>
                  <p>
                    {item.inviterName} 邀请您加入
                    {item.type === 1 ? '空间' : '团队'}
                  </p>
                  <p>
                    有效期至{' '}
                    {item.expireTime
                      ? new Date(item.expireTime).toLocaleString()
                      : '—'}
                  </p>
                </div>
                {item.status === 1 && (
                  <div className={styles.actions}>
                    <Button
                      type="primary"
                      loading={busy === item.id}
                      disabled={busy !== null}
                      onClick={() => void decide(item.id, true)}
                    >
                      接受邀请
                    </Button>
                    <Button
                      disabled={busy !== null}
                      onClick={() => void decide(item.id, false)}
                    >
                      拒绝邀请
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty description="暂无邀请。收到的空间和团队邀请会显示在这里。" />
        ))
      )}
    </main>
  );
}
