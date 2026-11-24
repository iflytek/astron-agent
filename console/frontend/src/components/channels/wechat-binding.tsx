import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Alert, Button, Input, Modal, Space, message } from 'antd';
import http from '@/utils/http';
import { errorText } from '@/pages/agents/errors';

export default function WechatBinding({
  botId,
  onChanged,
  disabled = false,
}: {
  botId: string | number;
  onChanged?: () => void;
  disabled?: boolean;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [appid, setAppid] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const identity = useRef(0);
  const submitting = useRef(false);
  useEffect(() => {
    generation.current += 1;
    identity.current += 1;
    submitting.current = false;
    setOpen(false);
    setAppid('');
    setError('');
    setBusy(false);
    return () => {
      generation.current += 1;
      identity.current += 1;
    };
  }, [botId]);
  const close = (): void => {
    generation.current += 1;
    submitting.current = false;
    setBusy(false);
    setOpen(false);
  };
  const authorize = async (): Promise<void> => {
    if (disabled || submitting.current || !appid.trim()) return;
    submitting.current = true;
    const current = generation.current;
    setBusy(true);
    setError('');
    try {
      const result = await http.post<never, { authUrl: string }>(
        '/api/wx/auth-url',
        { botId, appid }
      );
      if (current !== generation.current) return;
      const target = new URL(result.authUrl);
      if (
        target.protocol !== 'https:' ||
        target.hostname !== 'mp.weixin.qq.com'
      )
        throw new Error('授权地址无效');
      window.location.assign(target.href);
    } catch (reason) {
      if (current === generation.current) setError(errorText(reason));
    } finally {
      if (current === generation.current) {
        submitting.current = false;
        setBusy(false);
      }
    }
  };
  const revoke = async (): Promise<void> => {
    if (disabled || submitting.current || !appid.trim()) return;
    submitting.current = true;
    const current = generation.current;
    const currentIdentity = identity.current;
    setBusy(true);
    setError('');
    try {
      await http.delete('/api/wx/binding', { data: { appid } });
      if (currentIdentity !== identity.current) return;
      // Closing the dialog cancels its feedback, but the completed revocation still
      // changes this object's channel state and must refresh the parent.
      onChanged?.();
      if (current !== generation.current) return;
      message.success('微信发布已撤销');
      setOpen(false);
    } catch (reason) {
      if (current === generation.current) setError(errorText(reason));
    } finally {
      if (current === generation.current) {
        submitting.current = false;
        setBusy(false);
      }
    }
  };
  return (
    <>
      <Button disabled={disabled || busy} onClick={() => setOpen(true)}>
        微信渠道
      </Button>
      <Modal title="微信公众号" open={open} onCancel={close} footer={null}>
        <p>授权成功后发布当前完整版本。授权期间继续使用原已发布版本。</p>
        {error && (
          <Alert type="error" showIcon message={error} className="my-4" />
        )}
        <label htmlFor={`wechat-appid-${botId}`}>公众号 AppID</label>
        <Input
          id={`wechat-appid-${botId}`}
          value={appid}
          disabled={busy}
          onChange={event => setAppid(event.target.value)}
          placeholder="公众号 AppID"
        />
        <Space className="mt-4" wrap>
          <Button
            type="primary"
            disabled={!appid.trim()}
            loading={busy}
            onClick={() => void authorize()}
          >
            前往微信授权
          </Button>
          <Button
            danger
            disabled={!appid.trim()}
            loading={busy}
            onClick={() => void revoke()}
          >
            撤销发布
          </Button>
        </Space>
      </Modal>
    </>
  );
}
