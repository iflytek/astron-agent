import { Button } from 'antd';
import {
  ArrowUpOutlined,
  CloseOutlined,
  PaperClipOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { RefObject } from 'react';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  active: boolean;
  stopping: boolean;
  disabled: boolean;
  sendDisabled: boolean;
  stopDisabled: boolean;
  uploading: boolean;
  files: { id: string; name: string }[];
  fileInput?: RefObject<HTMLInputElement>;
  uploadDisabled?: boolean;
  onUpload: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  debug?: boolean;
}

export default function AgentComposer({
  value,
  onChange,
  onSend,
  onStop,
  active,
  stopping,
  disabled,
  sendDisabled,
  stopDisabled,
  uploading,
  files,
  fileInput,
  uploadDisabled,
  onUpload,
  onRemove,
  debug,
}: ComposerProps) {
  return (
    <form
      className="agents-composer"
      onSubmit={event => {
        event.preventDefault();
        if (!sendDisabled && !active) onSend();
      }}
    >
      <label className="agent-message-input">
        <span className="agent-sr-only">消息</span>
        <textarea
          aria-label={debug ? '调试消息' : '聊天消息'}
          value={value}
          disabled={disabled}
          onChange={event => onChange(event.target.value)}
          placeholder={debug ? '发送消息，测试你的 Agent…' : '发送消息…'}
          rows={2}
          onKeyDown={event => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              if (!sendDisabled && !active) onSend();
            }
          }}
        />
      </label>
      {files.length > 0 && (
        <div className="agents-files">
          {files.map(file => (
            <span key={file.id}>
              {file.name}
              <button
                type="button"
                aria-label={`移除 ${file.name}`}
                disabled={disabled || uploading}
                onClick={() => onRemove(file.id)}
              >
                <CloseOutlined />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="agents-actions agent-composer-actions">
        {fileInput && (
          <>
            <input
              ref={fileInput}
              className="agents-file-input"
              type="file"
              accept=".txt,.md,.csv,.json,.pdf,.docx"
              multiple
              disabled={disabled || uploading || uploadDisabled}
              onChange={event => onUpload(event.target.files)}
            />
            <Button
              type="text"
              icon={<PaperClipOutlined />}
              aria-label="添加文件"
              title="添加文件"
              loading={uploading}
              disabled={disabled || uploading || uploadDisabled}
              onClick={() => fileInput.current?.click()}
            />
          </>
        )}
        {active ? (
          <button
            className="danger"
            type="button"
            disabled={stopping || stopDisabled}
            onClick={onStop}
          >
            <StopOutlined /> <span>{stopping ? '正在停止…' : '停止生成'}</span>
          </button>
        ) : (
          <button
            className="primary agent-send-button"
            aria-label="发送消息"
            title="发送消息"
            type="submit"
            disabled={sendDisabled}
          >
            <ArrowUpOutlined />
          </button>
        )}
      </div>
    </form>
  );
}
