import {
  useState,
  memo,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import MessageList from './message-list';
import { MessageListType } from '@/types/chat';
import { getLanguageCode } from '@/utils/http';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import eventBus from '@/utils/event-bus';
import { baseURL } from '@/utils/http';
import { ModelListData } from '@/services/spark-common';
import {
  hasInvalidMcpServerUrls,
  normalizeMcpServerUrls,
} from '@/components/config-page-component/config-base/mcp-url-config';
import type { AgentSkill } from '@/types/skill';
import type { AgentTool } from '@/types/plugin-store';
import type { AgentWorkflow } from '@/types/agent-workflow';

// PromptTry组件暴露的方法接口
export interface PromptTryRef {
  send: (text: string) => void;
  clear: () => void;
}

interface SSEData {
  type?: string;
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning_content?: string;
      tool_calls?: Array<{
        deskToolName: string;
      }>;
    };
  }>;
  end?: boolean;
  id?: number;
  content?: string;
  error?: string | boolean;
  message?: string;
  code?: number;
}

const PromptTry = forwardRef<
  PromptTryRef,
  {
    newPrompt?: string;
    baseinfo?: any;
    inputExample?: string[];
    coverUrl?: string;
    selectSource?: any;
    prompt?: string;
    model?: string;
    supportContext?: number;
    promptText?: string;
    botId?: number | null;
    debugSessionId?: string;
    initialMessages?: MessageListType[];
    onMessagesChange?: (messages: MessageListType[]) => void;
    showHeaderAndRecommend?: boolean;
    choosedAlltool?: {
      [key: string]: boolean;
    };
    mcpServerUrls?: string[];
    skills?: AgentSkill[];
    tools?: AgentTool[];
    workflows?: AgentWorkflow[];
    findModelOptionByUniqueKey: (
      uniqueKey: string
    ) => ModelListData | undefined;
    personalityConfig?: {
      personality?: string;
      sceneType?: 1 | 2;
      sceneInfo?: string;
    } | null;
  }
>(
  (
    {
      newPrompt,
      baseinfo,
      inputExample,
      coverUrl,
      selectSource,
      prompt,
      model,
      supportContext,
      botId,
      debugSessionId,
      choosedAlltool,
      mcpServerUrls,
      skills,
      tools,
      workflows,
      initialMessages,
      onMessagesChange,
      showHeaderAndRecommend = true,
      findModelOptionByUniqueKey,
      personalityConfig,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const instanceId = useRef(Math.random().toString(36).substr(2, 9)); // 实例唯一标识符
    const [isLoading, setIsLoading] = useState<boolean>(false); // 是否正在加载
    const [isCompleted, setIsCompleted] = useState<boolean>(true); // 是否完成
    const [messageList, setMessageList] = useState<MessageListType[]>([]); // 消息列表
    const controllerRef = useRef<AbortController>(new AbortController()); //sse请求ref
    const currentSid = useRef<string>(''); // 当前sid
    const pendingInitialMessagesRef = useRef<MessageListType[] | null>(null);

    // 使用useImperativeHandle暴露组件方法
    useImperativeHandle(ref, () => ({
      send: handleSendBtnClick,
      clear: removeAll,
    }));

    useEffect(() => {
      // 监听清除所有消息的事件
      const handleRemoveAll = () => {
        removeAll();
      };

      eventBus.on('eventRemoveAll', handleRemoveAll);

      return () => {
        eventBus.off('eventRemoveAll', handleRemoveAll);
        // 组件卸载时清理loading状态
        eventBus.emit('promptTry.loadingChange', {
          instanceId: instanceId.current,
          loading: false,
        });
      };
    }, []);

    useEffect(() => {
      if (initialMessages) {
        pendingInitialMessagesRef.current = initialMessages;
        setMessageList(current => {
          if (current === initialMessages) {
            pendingInitialMessagesRef.current = null;
            return current;
          }
          return initialMessages;
        });
      }
    }, [initialMessages]);

    useEffect(() => {
      if (pendingInitialMessagesRef.current) {
        if (pendingInitialMessagesRef.current === messageList) {
          pendingInitialMessagesRef.current = null;
        }
        return;
      }
      onMessagesChange?.(messageList);
    }, [messageList, onMessagesChange]);

    // 监听loading状态变化，通知config-base
    useEffect(() => {
      eventBus.emit('promptTry.loadingChange', {
        instanceId: instanceId.current,
        loading: isLoading,
      });
    }, [isLoading]);

    // 点击发送按钮
    const handleSendBtnClick = (text?: string) => {
      if (isLoading) {
        message.warning(t('configBase.promptTry.answerPleaseTryAgainLater'));
        return;
      }

      if (!text || text.trim() === '') {
        message.info(t('configBase.promptTry.pleaseEnterQuestion'));
        return;
      }

      getAnswer(text);
    };

    //清除聊天记录
    const removeAll = () => {
      if (isLoading || !isCompleted) {
        message.warning(t('configBase.promptTry.answerPleaseTryAgainLater'));
        return;
      }
      setMessageList([]);
    };

    // 获取答案
    const getAnswer = (question: string) => {
      if (hasInvalidMcpServerUrls(mcpServerUrls)) {
        message.warning('请先修正 MCP Server URL');
        return;
      }
      const esURL = `${baseURL}/chat-message/bot-debug`;
      const form = new FormData();
      const useModel = findModelOptionByUniqueKey(model || '');
      if (useModel?.isCustom) {
        form.append('modelId', useModel.modelId);
      }
      form.append('model', useModel?.modelDomain || 'spark');

      form.append('text', question);
      if (botId !== undefined && botId !== null) {
        form.append('botId', String(botId));
      }
      if (debugSessionId) {
        form.append('debugSessionId', debugSessionId);
      }
      const datasetList: string[] = [];
      (selectSource || []).forEach((item: any) => {
        datasetList.push(item.id);
      });
      if (datasetList.join(',') !== '') {
        if (selectSource[0]?.tag == 'SparkDesk-RAG') {
          form.append('datasetList', JSON.stringify(datasetList.join(',')));
        } else {
          form.append('maasDatasetList', JSON.stringify(datasetList.join(',')));
        }
      }
      form.append('prompt', newPrompt ? newPrompt : prompt || '');
      form.append('multiTurn', `${supportContext}`); //是否开启多轮对话
      const arr = messageList.map((item: MessageListType) => item.message);
      if (supportContext === 1) form.append('arr', JSON.stringify(arr));

      if (choosedAlltool) {
        form.append(
          'openedTool',
          Object.keys(choosedAlltool)
            .filter((key: string) => choosedAlltool[key])
            .join(',')
        );
      }
      const normalizedMcpServerUrls = normalizeMcpServerUrls(mcpServerUrls);
      if (normalizedMcpServerUrls.length > 0) {
        form.append('mcpServerUrls', JSON.stringify(normalizedMcpServerUrls));
      }
      if (skills && skills.length > 0) {
        form.append('skills', JSON.stringify(skills));
      }
      if (tools && tools.length > 0) {
        form.append('tools', JSON.stringify(tools));
      }
      if (workflows && workflows.length > 0) {
        form.append('workflows', JSON.stringify(workflows));
      }

      // 添加人设配置信息
      if (personalityConfig) {
        form.append('personalityConfig', JSON.stringify(personalityConfig));
      }

      handleFetchSSE(esURL, form);
    };
    const handleFetchSSE = (esURL: string, form: FormData) => {
      let ans: string = '';
      let reasoning: string = ''; //思考链内容
      let toolsName: string = ''; //工具名称
      const controller = new AbortController();
      controllerRef.current = controller;
      const headerConfig = {
        'Accept-Language': getLanguageCode(),
        authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      };
      setIsLoading(true);
      setIsCompleted(false);
      // 先追加用户消息
      setMessageList(prev => [
        ...prev,
        {
          id: Date.now(),
          message: form.get('text')?.toString() || '',
          updateTime: new Date().toISOString(),
          reqType: 'USER',
        },
      ]);
      // 追加一个空的机器人消息，用于流式更新
      setMessageList(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          message: '',
          reqType: 'BOT',
          updateTime: new Date().toISOString(),
        },
      ]);

      fetchEventSource(esURL, {
        method: 'POST',
        body: form,
        headers: { ...headerConfig },
        openWhenHidden: true,
        signal: controller.signal,
        onopen(): Promise<void> {
          return Promise.resolve();
        },
        onmessage(event: { data: string }): void {
          const data: SSEData = JSON.parse(event.data);
          const { error, id, type, choices, end, content, message, code } =
            data;
          id && (currentSid.current = id.toString());
          if (type === 'start') return;
          setIsLoading(false);
          if (code || error) {
            const errorMsg = (message as string) || '发生未知错误';
            setMessageList(prev => {
              const updated = [...prev];
              const last = updated.length - 1;
              updated[last] = { ...updated[last], message: errorMsg };
              return updated;
            });
            setIsLoading(false);
            setIsCompleted(true);
            controller.abort('错误结束');
            return;
          }

          if (end) {
            setIsLoading(false);
            setIsCompleted(true);
            setMessageList(prev => {
              const updated = [...prev];
              const last = updated.length - 1;
              updated[last] = {
                ...updated[last],
                sid: currentSid?.current?.toString() || '',
                message: updated[last]?.message || '',
              };
              return updated;
            });
            controller.abort('结束');
            return;
          }
          // 思考链
          reasoning += choices?.[0]?.delta?.reasoning_content || '';
          // 工具调用
          toolsName = choices?.[1]?.delta?.tool_calls?.[0]?.deskToolName || '';
          // 正常文本内容
          ans = `${ans}${choices?.[0]?.delta?.content || content || ''}`;
          setMessageList(prev => {
            const updated = [...prev];
            const last = updated.length - 1;
            updated[last] = {
              ...updated[last],
              message: ans || '',
              reasoning: reasoning,
              tools: toolsName ? [toolsName] : [],
              traceSource: choices?.[1]?.delta?.tool_calls
                ? JSON.stringify(choices[1].delta.tool_calls)
                : '',
            };
            return updated;
          });
        },
        onerror(err: Error): void {
          setIsLoading(false);
          setIsCompleted(true);
          controllerRef.current.abort('连接错误');
          console.error('esError', err);
        },
      }).catch((err: Error) => {
        setIsLoading(false);
        setIsCompleted(true);
        controllerRef.current.abort('请求失败');
        console.error('fetchError', err);
      });
    };

    // 停止回答
    const stopAnswer = () => {
      controllerRef?.current.abort();
      setMessageList(prev => {
        const updated = [...prev];
        const last = updated.length - 1;
        updated[last] = {
          ...updated[last],
          sid: currentSid?.current?.toString() || '',
          message: updated[last]?.message || '',
        };
        return updated;
      });
      setIsLoading(false);
      setIsCompleted(true);
    };

    return (
      <div className="w-full h-full">
        <div className="w-full mx-auto flex flex-col flex-1 min-h-0 h-full overflow-hidden">
          <MessageList
            messageList={messageList}
            botInfo={baseinfo}
            coverUrl={coverUrl || ''}
            inputExample={inputExample || []}
            isLoading={isLoading}
            isCompleted={isCompleted}
            stopAnswer={stopAnswer}
            showHeaderAndRecommend={showHeaderAndRecommend}
          />
        </div>
      </div>
    );
  }
);

// 设置displayName以便调试
PromptTry.displayName = 'PromptTry';

export default memo(PromptTry);
