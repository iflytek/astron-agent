import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { Button, Input, type InputProps, type InputRef } from 'antd';
import { forwardRef, useEffect, useRef, useState } from 'react';

export type LoadCredential = (
  signal: AbortSignal
) => Promise<{ value: string }>;

interface SavedCredentialInputProps extends InputProps {
  loadSaved?: LoadCredential;
  maskedValue?: string;
}

const SavedCredentialInput = forwardRef<InputRef, SavedCredentialInputProps>(
  function SavedCredentialInput(
    { loadSaved, maskedValue, value, disabled, ...props },
    ref
  ) {
    const [visible, setVisible] = useState(false);
    const [revealed, setRevealed] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const pending = useRef<AbortController | null>(null);
    const saved = Boolean(loadSaved) && value === maskedValue;

    useEffect(() => {
      setVisible(false);
      setRevealed(null);
      setLoading(false);
      return () => pending.current?.abort();
    }, [disabled, saved]);

    const toggle = async (): Promise<void> => {
      if (visible) {
        setVisible(false);
        setRevealed(null);
        return;
      }
      if (!loadSaved || !saved) {
        setVisible(true);
        return;
      }
      if (pending.current && !pending.current.signal.aborted) return;
      const request = new AbortController();
      pending.current = request;
      setLoading(true);
      try {
        const result = await loadSaved(request.signal);
        if (!request.signal.aborted) {
          setRevealed(result.value);
          setVisible(true);
        }
      } catch {
        // The Console HTTP client reports the request error.
      } finally {
        if (pending.current === request) {
          pending.current = null;
          if (!request.signal.aborted) setLoading(false);
        }
      }
    };

    const show = visible && !disabled;
    const showSaved = show && saved && revealed !== null;
    return (
      <Input
        {...props}
        ref={ref}
        disabled={disabled}
        autoComplete="new-password"
        type={show ? 'text' : 'password'}
        value={showSaved ? revealed : value}
        readOnly={showSaved || props.readOnly}
        suffix={
          <Button
            type="text"
            size="small"
            aria-label={show ? '隐藏凭证' : '显示凭证'}
            aria-pressed={show}
            title={show ? '隐藏凭证' : '显示凭证'}
            disabled={disabled}
            loading={loading}
            icon={show ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => void toggle()}
          />
        }
      />
    );
  }
);

export default SavedCredentialInput;
