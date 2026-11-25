import { useState } from 'react';
import AddMemberModal from '@/components/space/add-member-modal';
import SpaceButton from '@/components/button-group/space-button';
import { batchImportEnterpriseUsername } from '@/services/enterprise';
import type { InviteUser } from '@/components/space/add-member-modal/types';
import { btnConfigs, type BatchImportProps } from './config';

export default function BatchImport({ onSubmit }: BatchImportProps) {
  const [open, setOpen] = useState(false);
  const [names, setNames] = useState('');
  const [users, setUsers] = useState<InviteUser[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function lookup() {
    const usernames = [
      ...new Set(
        names
          .split(/[\n,，]+/)
          .map(value => value.trim())
          .filter(Boolean)
      ),
    ];
    if (!usernames.length || usernames.length > 500) {
      setError('请输入 1 至 500 个用户名，每行一个。');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = (await batchImportEnterpriseUsername({
        usernames,
      })) as unknown as {
        chatUserVOS: InviteUser[];
        missingUsernames: string[];
      };
      if (result.missingUsernames.length) {
        setError(
          `未找到账号：${result.missingUsernames.join('、')}。请修改后重试。`
        );
      } else {
        setUsers(result.chatUserVOS);
        setOpen(false);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '查询失败');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SpaceButton
        config={btnConfigs.batchImport}
        onClick={() => setOpen(true)}
      />
      {open && (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="批量邀请"
          style={{
            position: 'fixed',
            inset: '20% 25%',
            padding: 24,
            zIndex: 1100,
            background: 'white',
            boxShadow: '0 8px 40px #999',
            borderRadius: 12,
          }}
        >
          <h2>批量邀请成员</h2>
          <label htmlFor="invite-usernames">
            每行输入一个已有账号用户名（最多 500 个）
          </label>
          <textarea
            id="invite-usernames"
            rows={8}
            value={names}
            onChange={event => setNames(event.target.value)}
            style={{
              display: 'block',
              width: '100%',
              border: '1px solid #aaa',
              margin: '12px 0',
            }}
          />
          {error && <p role="alert">{error}</p>}
          <button disabled={busy} onClick={() => void lookup()}>
            查找成员
          </button>
          <button
            disabled={busy}
            onClick={() => setOpen(false)}
            style={{ marginLeft: 16 }}
          >
            取消
          </button>
        </section>
      )}
      {users && (
        <AddMemberModal
          open
          initialUsers={users}
          inviteType="enterprise"
          onClose={() => setUsers(null)}
          onSubmit={async values => {
            const result = await onSubmit?.(values);
            if (result) setUsers(null);
            return result;
          }}
        />
      )}
    </>
  );
}
