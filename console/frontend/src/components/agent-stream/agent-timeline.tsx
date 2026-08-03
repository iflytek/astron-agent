import MarkdownRender from '@/components/markdown-render';
import React from 'react';

import { selectReasoningTimeline } from './reducer';
import { ToolCard } from './tool-card';
import type { AgentStreamState } from './types';

interface AgentTimelineProps {
  state: AgentStreamState;
  isStreaming: boolean;
}

export const AgentTimeline = ({
  state,
  isStreaming,
}: AgentTimelineProps): React.ReactElement | null => {
  const timeline = selectReasoningTimeline(state);
  if (timeline.length === 0) return null;

  return (
    <div className="my-2.5 flex flex-col gap-2 text-sm text-[#5b6472]">
      {timeline.map(item => {
        if (item.kind === 'tool') {
          return (
            <ToolCard key={`${item.runId}:${item.callId}`} tool={item.tool} />
          );
        }

        return (
          <div
            key={`${item.runId}:${item.segmentId}`}
            className="border-l-2 border-[#dfe3eb] pl-3 reasoning-markdown"
          >
            <MarkdownRender
              content={item.text}
              isSending={isStreaming && !item.ended}
            />
            {item.partial ? (
              <span className="mt-1 inline-block text-xs text-[#9a6b16]">
                此段内容因任务中断而提前结束
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
