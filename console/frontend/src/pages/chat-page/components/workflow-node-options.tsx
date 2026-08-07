/**
 * 工作流节点选项组件
 * 处理节点问答功能的选项渲染和交互
 */
import React, { useMemo } from 'react';
import type { MessageListType, Option } from '@/types/chat';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import useChat from '@/hooks/use-chat';
import chatIgnoreNormal from '@/assets/imgs/chat/chat-ignore-normal.svg';
import chatIgnoreActive from '@/assets/imgs/chat/chat-ignore-active.svg';
import chatEndRoundNormal from '@/assets/imgs/chat/chat-end-round-normal.svg';
import chatEndRoundActive from '@/assets/imgs/chat/chat-end-round-active.svg';

interface WorkflowNodeOptionsProps {
  /** 消息数据 */
  message: MessageListType;
  /** 是否是最后一条消息 */
  isLastMessage: boolean;
  /** 当前工作流操作列表 */
  workflowOperation: string[];
  /** 当前选中的选项ID */
  selectedOptionId?: {
    id: number;
    option: { id: string };
  } | null;
  /** 点击选项的处理函数 */
  onOptionClick: (option: Option, messageId: number) => void;
}

/**
 * 工作流节点选项组件
 */
const WorkflowNodeOptions: React.FC<WorkflowNodeOptionsProps> = ({
  message,
  isLastMessage,
  workflowOperation,
  selectedOptionId,
  onOptionClick,
}) => {
  // 获取选项列表
  const options = useMemo(() => {
    return (
      message?.workflowEventData?.option?.filter(
        (option: Option) => option?.text
      ) || []
    );
  }, [message?.workflowEventData?.option]);
  const { t } = useTranslation();
  const { onSendMsg } = useChat();

  // 判断选项是否可点击
  const isOptionClickable = useMemo(() => {
    return isLastMessage && workflowOperation.length > 0;
  }, [isLastMessage, workflowOperation.length]);
  // 如果没有选项，不渲染
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      {/* 节点选项列表 */}
      <div className="space-y-2">
        {options.map((option: Option) => {
          // 检查选项是否被选中
          const isSelected =
            option?.selected ||
            (selectedOptionId?.id === message?.id &&
              selectedOptionId?.option?.id === option?.id);

          return (
            <div
              key={option?.id}
              className={clsx(
                // 基础样式
                'max-w-sm w-full min-w-[200px] h-auto rounded-lg border leading-10 px-3 mb-2',
                'font-sans text-sm text-gray-800 font-normal',
                {
                  'border-blue-200 bg-blue-50': isSelected,
                  'border-blue-100': !isSelected,
                },
                {
                  'cursor-pointer hover:bg-blue-50': isOptionClickable,
                  'cursor-not-allowed': !isOptionClickable,
                }
              )}
              onClick={() => {
                if (isOptionClickable && message?.id) {
                  onOptionClick(option, message.id);
                }
              }}
            >
              <span className="mr-1.5 text-gray-600">{option?.id}</span>
              {option?.contentType === 'image' ? (
                <img
                  src={option?.text}
                  alt=""
                  className="mb-2.5 max-h-32 object-contain"
                />
              ) : (
                <span className="text-gray-800">{option?.text}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 节点聊天操作按钮 */}
      {isLastMessage && workflowOperation.length > 0 && (
        <div className="w-full flex items-center ml-14 text-xs mt-4 md:ml-0">
          {/* 忽略按钮 */}
          {workflowOperation.includes('ignore') && (
            <div
              className={clsx(
                // 基础按钮样式
                'group flex items-center cursor-pointer h-7 pr-3 rounded-lg',
                'transition-all duration-200 ease-in-out mr-2',
                'text-gray-500 hover:text-blue-700'
              )}
              onClick={() => {
                onSendMsg({
                  msg: t('workflow.nodes.chatDebugger.ignoreThisQuestion'),
                  workflowOperation: 'ignore',
                });
              }}
            >
              <img
                src={chatIgnoreNormal}
                alt=""
                className="w-4 h-4 group-hover:hidden"
              />
              <img
                src={chatIgnoreActive}
                alt=""
                className="w-4 h-4 hidden group-hover:block"
              />
              <span>{t('workflow.nodes.chatDebugger.ignoreThisQuestion')}</span>
            </div>
          )}

          {/* 结束按钮 */}
          {workflowOperation.includes('abort') && (
            <div
              className={clsx(
                // 基础按钮样式
                'group flex items-center cursor-pointer h-7 pr-3 rounded-lg',
                'transition-all duration-200 ease-in-out',
                'bg-cover bg-no-repeat',
                // 背景图标和文字颜色
                'text-gray-500 hover:text-red-700'
              )}
              onClick={() => {
                onSendMsg({
                  msg: t(
                    'workflow.nodes.chatDebugger.endThisRoundConversation'
                  ),
                  workflowOperation: 'abort',
                });
              }}
            >
              <img
                src={chatEndRoundNormal}
                alt=""
                className="w-4 h-4 group-hover:hidden"
              />
              {/* hover状态的图标 */}
              <img
                src={chatEndRoundActive}
                alt=""
                className="w-4 h-4 hidden group-hover:block"
              />
              <span>
                {t('workflow.nodes.chatDebugger.endThisRoundConversation')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowNodeOptions;
