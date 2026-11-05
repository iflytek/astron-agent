import { useState, type ReactElement } from 'react';
import { Button, Input, Modal, Space, message } from 'antd';
import http from '@/utils/http';

export default function WechatBinding({
  botId,
}: {
  botId: string | number;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [appid, setAppid] = useState('');
  const [busy, setBusy] = useState(false);
  const authorize = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await http.post<never, { authUrl: string }>(
        '/api/wx/auth-url',
        { botId, appid }
      );
      const target = new URL(result.authUrl);
      if (
        target.protocol !== 'https:' ||
        target.hostname !== 'mp.weixin.qq.com'
      )
        throw new Error('授权地址无效');
      window.location.assign(target.href);
    } catch {
      // The shared HTTP boundary displays the server's concrete validation error.
    } finally {
      setBusy(false);
    }
  };
  const revoke = async (): Promise<void> => {
    setBusy(true);
    try {
      await http.delete('/api/wx/binding', { data: { appid } });
      message.success('微信发布已撤销');
      setOpen(false);
    } catch {
      // Preserve the form for a corrected account identifier.
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>微信渠道</Button>
      <Modal
        title="微信公众号"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
      >
        <p>授权成功后发布当前完整版本。授权期间继续使用原已发布版本。</p>
        <Input
          value={appid}
          onChange={event => setAppid(event.target.value)}
          placeholder="公众号 AppID"
        />
        <Space className="mt-4">
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
