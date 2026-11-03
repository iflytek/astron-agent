import { useEffect, useState } from 'react';
import http from '@/utils/http';

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
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => {
    let ignore = false;
    http
      .get<never, Invitation[]>('/invite-record/my-invitations')
      .then(result => {
        if (!ignore) setItems(result);
      })
      .catch((reason: Error) => {
        if (!ignore) setError(reason.message || '无法获取邀请');
      });
    return () => {
      ignore = true;
    };
  }, [revision]);

  async function decide(id: number, accept: boolean) {
    setBusy(id);
    setError('');
    try {
      await http.post(
        `/invite-record/${accept ? 'accept' : 'refuse'}-invite?inviteId=${id}`
      );
      setRevision(value => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '邀请处理失败');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 1000, margin: 'auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>我的空间与团队邀请</h1>
      {error && <p role="alert">{error}</p>}
      {items.length === 0 && <p>暂无邀请。</p>}
      <ul style={{ display: 'grid', gap: 16 }}>
        {items.map(item => (
          <li
            key={item.id}
            style={{ padding: 20, border: '1px solid #ddd', borderRadius: 12 }}
          >
            <h2>{item.type === 1 ? item.spaceName : item.enterpriseName}</h2>
            <p>
              {item.inviterName} 邀请您加入 · {statusNames[item.status]}
            </p>
            <p>有效期至 {new Date(item.expireTime).toLocaleString()}</p>
            {item.status === 1 && (
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <button
                  disabled={busy !== null}
                  onClick={() => void decide(item.id, true)}
                >
                  接受邀请
                </button>
                <button
                  disabled={busy !== null}
                  onClick={() => void decide(item.id, false)}
                >
                  拒绝邀请
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
