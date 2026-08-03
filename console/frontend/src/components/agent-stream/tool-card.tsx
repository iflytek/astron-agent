import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DownOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';
import copy from 'copy-to-clipboard';
import React, { useMemo, useState } from 'react';

import type { AgentToolRecord, AgentToolStatus } from './types';
import { describeToolValue } from './tool-value';

interface ToolCardProps {
  tool: AgentToolRecord;
}

interface ToolValueSectionProps {
  title: string;
  value: unknown;
}

const statusPresentation: Record<
  AgentToolStatus,
  {
    color: string;
    label: string;
    icon: React.ReactNode;
  }
> = {
  running: {
    color: 'processing',
    label: '运行中',
    icon: <ClockCircleOutlined spin />,
  },
  success: {
    color: 'success',
    label: '成功',
    icon: <CheckCircleOutlined />,
  },
  error: {
    color: 'error',
    label: '失败',
    icon: <CloseCircleOutlined />,
  },
  cancelled: {
    color: 'default',
    label: '已取消',
    icon: <StopOutlined />,
  },
};

const formatDuration = (durationMs?: number): string => {
  if (durationMs === undefined) return '';
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
};

const ToolValueSection = ({
  title,
  value,
}: ToolValueSectionProps): React.ReactElement => {
  const description = useMemo(() => describeToolValue(value), [value]);
  const [showFull, setShowFull] = useState(!description.large);
  const [copied, setCopied] = useState(false);

  const handleCopy = (): void => {
    copy(description.serialized);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="rounded-lg border border-[#e5e7eb] bg-white p-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-[#4b5563]">{title}</div>
          <div className="mt-0.5 truncate text-xs text-[#8b93a1]">
            {description.summary}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {description.large ? (
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-[#5b5bf7] hover:bg-[#f1f1ff]"
              onClick={() => setShowFull(current => !current)}
            >
              {showFull ? '收起' : '查看全部'}
            </button>
          ) : null}
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#5b6472] hover:bg-[#f3f4f6]"
            onClick={handleCopy}
          >
            <CopyOutlined />
            {copied ? '已复制' : '复制完整内容'}
          </button>
        </div>
      </div>
      {showFull ? (
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#f7f8fa] p-3 text-xs leading-5 text-[#303846]">
          {description.serialized}
        </pre>
      ) : null}
    </section>
  );
};

export const ToolCard = ({ tool }: ToolCardProps): React.ReactElement => {
  const [expanded, setExpanded] = useState(false);
  const presentation = statusPresentation[tool.status];
  const hasResponse = Object.prototype.hasOwnProperty.call(tool, 'response');
  const duration = formatDuration(tool.durationMs);

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3eb] bg-[#f8f9fb] text-[#242933]">
      <button
        type="button"
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f1f3f7]"
        onClick={() => setExpanded(current => !current)}
      >
        <DownOutlined
          className={`text-xs text-[#7b8494] transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {tool.name}
        </span>
        {duration ? (
          <span className="text-xs text-[#8b93a1]">{duration}</span>
        ) : null}
        <Tag
          color={presentation.color}
          icon={presentation.icon}
          className="m-0"
        >
          {presentation.label}
        </Tag>
      </button>

      {expanded ? (
        <div className="flex flex-col gap-2 border-t border-[#e5e7eb] p-3">
          {tool.progress ? (
            <div className="rounded-md bg-[#eef2ff] px-3 py-2 text-xs text-[#556078]">
              {tool.progress}
            </div>
          ) : null}
          <ToolValueSection title="参数 Arguments" value={tool.arguments} />
          {hasResponse ? (
            <ToolValueSection title="响应 Response" value={tool.response} />
          ) : (
            <div className="rounded-lg border border-dashed border-[#dfe3eb] bg-white px-3 py-2 text-xs text-[#8b93a1]">
              等待工具返回…
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
