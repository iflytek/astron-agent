import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Button, Result, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import http from '@/utils/http';

export default function WechatCallback(): ReactElement {
  const navigate = useNavigate();
  const started = useRef(false);
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>(
    'pending'
  );
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const state = params.get('state');
    const authCode = params.get('auth_code');
    // Remove one-use credentials from browser history before fetching other content.
    window.history.replaceState({}, '', window.location.pathname);
    if (!state || !authCode) {
      setStatus('error');
      return;
    }
    void http
      .post('/api/wx/authCallback', { state, authCode })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, []);
  if (status === 'pending')
    return (
      <div className="p-12">
        <Spin tip="正在核验微信授权" />
      </div>
    );
  return (
    <Result
      status={status}
      title={status === 'success' ? '微信发布成功' : '微信授权未完成'}
      subTitle={
        status === 'error'
          ? '请返回发布管理检查账号和授权状态；原发布版本保持不变。'
          : undefined
      }
      extra={
        <Button onClick={() => navigate('/management/release')}>
          返回发布管理
        </Button>
      }
    />
  );
}
