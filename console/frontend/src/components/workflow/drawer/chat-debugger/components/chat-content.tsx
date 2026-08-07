import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Image, message } from 'antd';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { isJSON } from '@/utils';
import MarkdownRender from '@/components/markdown-render';
import JSONPretty from 'react-json-view';
import copy from 'copy-to-clipboard';
import { useSearchParams } from 'react-router-dom';
import { useMemoizedFn } from 'ahooks';
import { typeList } from '@/constants';
import FeedbackDialog from '@/components/workflow/modal/feedback-dialog';

// 类型导入
import {
  FlowType,
  ChatContentProps,
  ChatContentAdvancedConfig,
  ChatListItemExtended,
  StartNodeType,
  UseChatContentProps,
} from '@/components/workflow/types';

// 从统一的图标管理中导入
import { Icons } from '@/components/workflow/icons';
import useVoicePlayStore from '@/store/voice-play-store';
import TtsModule from '@/components/tts-module';

// 获取 Chat Content 模块的图标
const icons = Icons.chatDebugger.chatContent;
import useChatStore from '@/store/chat-store';
import { SDKEvents } from '@/utils/avatar-sdk-web_3.1.2.1002/index.js';
import { isPureText } from '@/utils';
const Prologue = ({
  advancedConfig,
  currentFlow,
  startNodeParams,
  debuggering,
  resetNodesAndEdges,
  handleRunDebugger,
  t,
}): React.ReactElement => {
  return (
    <>
      {advancedConfig?.prologue?.enabled &&
        advancedConfig?.prologue?.prologueText && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div
                className="w-[36px] h-[36px] p-2 rounded-full flex-shrink-0"
                style={{
                  background: `url(${currentFlow?.avatarIcon}) no-repeat center / cover`,
                }}
              ></div>
              <div className="bg-[#F7F7FA] rounded-xl p-4 relative w-fit">
                <MarkdownRender
                  content={advancedConfig?.prologue?.prologueText}
                  isSending={false}
                />
              </div>
            </div>
          </div>
        )}
      {startNodeParams?.length === 1 &&
        advancedConfig?.prologue?.enabled &&
        advancedConfig?.prologue?.inputExample?.filter(item => item?.trim())
          ?.length > 0 && (
          <div className="flex flex-col gap-3 ml-[52px]">
            {advancedConfig?.prologue?.inputExample
              ?.filter(item => item?.trim())
              ?.map((item, index) => (
                <div
                  key={index}
                  className="border border-[#e2e8ff] py-4 px-5 rounded-2xl w-fit cursor-pointer hover:bg-[#fff]"
                  onClick={() => {
                    if (debuggering) return;
                    const { nodes, edges } = resetNodesAndEdges();
                    handleRunDebugger(nodes, edges, [
                      {
                        name: 'AGENT_USER_INPUT',
                        type: 'string',
                        default: item,
                        description: t(
                          'workflow.nodes.chatDebugger.userCurrentRoundInput'
                        ),
                        required: true,
                        validationSchema: null,
                        errorMsg: '',
                        originErrorMsg: '',
                      },
                    ]);
                  }}
                >
                  {item}
                </div>
              ))}
          </div>
        )}
    </>
  );
};

const MessageDivider = ({ chat, t }): React.ReactElement => {
  return (
    <div key={chat.id} className="flex items-center justify-center gap-3">
      <img
        src={icons.startNewConversationLeft}
        className="w-[151px] h-[7px]"
        alt=""
      />
      <span className="text-[#6356EA] font-medium">
        {t('workflow.nodes.chatDebugger.startNewConversation')}
      </span>
      <img
        src={icons.startNewConversationRight}
        className="w-[151px] h-[7px]"
        alt=""
      />
    </div>
  );
};

const MessageAsk = ({ chat, renderInputElement }): React.ReactElement => {
  return (
    <div className="flex items-start gap-4" key={chat.id}>
      <div className="flex items-center gap-4">
        <img src={icons.chatUser} className="w-9 h-9" alt="" />
      </div>
      <div className="w-fit min-w-[50px] bg-[#6356EA] p-3 flex flex-col gap-2.5 rounded-xl overflow-hidden">
        {chat?.inputs?.map((input, index) => (
          <div key={index}>
            {renderInputElement(chat as ChatListItemExtended, input)}
          </div>
        ))}
      </div>
    </div>
  );
};

const MessageReplyContent = ({
  chat,
  debuggering,
  index,
  chatList,
  handleResumeChat,
}): React.ReactElement => {
  return (
    <>
      {(chat?.messageContent || chat?.reasoningContent || chat?.content) && (
        <div>
          <div>
            <MarkdownRender
              content={chat?.messageContent}
              isSending={
                debuggering &&
                index === chatList?.length - 1 &&
                !chat?.reasoningContent
              }
            />
            {chat?.reasoningContent && (
              <div className="deep-seek-think">
                <MarkdownRender
                  content={chat?.reasoningContent}
                  isSending={
                    debuggering &&
                    index === chatList?.length - 1 &&
                    !chat?.content
                  }
                />
              </div>
            )}
            {isJSON(chat?.content || '') ? (
              <div onClick={e => e.stopPropagation()}>
                <JSONPretty
                  name={false}
                  src={JSON.parse(chat?.content || '{}')}
                  theme="rjv-default"
                />
              </div>
            ) : (
              <MarkdownRender
                content={chat?.content || ''}
                isSending={debuggering && index === chatList?.length - 1}
              />
            )}
            {chat?.option && (
              <div className="flex flex-col items-center gap-2 my-2">
                {chat?.option?.map(item => (
                  <div
                    key={item?.id}
                    className="w-full rounded-lg border border-[#E4EAFF] px-3 py-2.5 hover:bg-[#F8FAFF] flex items-start gap-3"
                    onClick={() =>
                      index === chatList?.length - 1 &&
                      handleResumeChat(item?.id)
                    }
                    style={{
                      cursor:
                        index === chatList?.length - 1 ? 'pointer' : 'default',
                    }}
                  >
                    <span>{item?.id}</span>
                    {item?.content_type === 'image' ? (
                      <img src={item?.text} alt="" />
                    ) : (
                      <span>{item?.text}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const MessageActions = ({
  chat,
  index,
  chatList,
  debuggering,
  setSid,
  setVisible,
  copyData,
  advancedConfig,
  chatType,
}): React.ReactElement => {
  const { t } = useTranslation();
  // 为每个消息创建播放状态映射
  const [playingStates, setPlayingStates] = useState<Record<string, boolean>>(
    {}
  );
  const useLanguage = useRef<string>('cn');
  const currentPlayingId = useVoicePlayStore(state => state.currentPlayingId);
  const setCurrentPlayingId = useVoicePlayStore(
    state => state.setCurrentPlayingId
  );
  const vmsInteractiveRef = useChatStore(state => state.vmsInteractiveRef);
  const vmsInteractiveRefStatus = useChatStore(
    state => state.vmsInteractiveRefStatus
  );
  const setVmsInteractiveRefStatus = useChatStore(
    (state: any) => state.setVmsInteractiveRefStatus
  );
  function processStringByChunk(str, chunkSize = 200, handleChunk) {
    // 1. 边界判断：若字符串为空或未传入处理函数，直接返回
    if (!str || typeof handleChunk !== 'function') return;

    // 2. 获取字符串总长度
    const totalLength = str.length;

    // 3. 判断是否超出长度：未超出则直接处理整个字符串
    if (totalLength <= chunkSize) {
      handleChunk(str);
      return;
    }

    // 4. 超出长度：循环拆分并处理（核心逻辑）
    // 计算需要拆分的总次数 = 总长度 / 拆分长度，向上取整（如 450 字符需拆 3 次：200+200+50）
    const totalChunks = Math.ceil(totalLength / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      // 计算当前子串的起始索引：i * 拆分长度
      const start = i * chunkSize;
      // 截取子串：slice(start, end)，end 超出总长度时自动取到末尾
      const chunk = str.slice(start, start + chunkSize);

      // 执行自定义处理逻辑（如打印、上传、存储等）
      handleChunk(chunk, i + 1, totalChunks); // 额外传 子串序号、总次数，方便追踪
    }
  }
  // 播放语音
  const playAudio = useCallback(
    async (item: any) => {
      if (chatType === 'vms') {
        console.log('vmsInteractiveRef', vmsInteractiveRef);
        vmsInteractiveRef?.on(SDKEvents.frame_stop, () => {
          setCurrentPlayingId(null);
        });
        vmsInteractiveRef?.interrupt();
        if (playingStates[item.id]) {
          setCurrentPlayingId(null);
        } else {
          console.log('advancedConfig', advancedConfig, item);
          if (!isPureText(item.content)) {
            message.error(t('chatPage.chatBottom.unSupportRead'));
            return;
          }
          setCurrentPlayingId(item?.id);
          if (item.content.length >= 2000) {
            processStringByChunk(item.content, 2000, chunk => {
              isPureText(chunk) && advancedConfig?.textToSpeech?.vcn_cn
                ? vmsInteractiveRef
                    ?.writeText(chunk, {
                      tts: { vcn: advancedConfig?.textToSpeech?.vcn_cn },
                      avatar_dispatch: {
                        interactive_mode: 0, //此处默认追加模式
                      },
                    })
                    .then(() => {})
                    .catch((err: any) => {
                      message.warning(
                        err?.msg || t('chatPage.chatBottom.feedbackFailed')
                      );
                    })
                : vmsInteractiveRef?.writeText(chunk);
            });
          } else {
            advancedConfig?.textToSpeech?.vcn_cn
              ? vmsInteractiveRef
                  ?.writeText(item.content, {
                    tts: { vcn: advancedConfig?.textToSpeech?.vcn_cn },
                  })
                  .then(() => {})
                  .catch((err: any) => {
                    // console.error(err);
                    // message.error(err?.msg || t('chatPage.chatBottom.feedbackFailed'));
                  })
              : vmsInteractiveRef?.writeText(item.content);
          }
          setVmsInteractiveRefStatus('init');
        }
      } else {
        if (playingStates[item.id]) {
          // 如果当前正在播放，则停止
          setCurrentPlayingId(null);
        } else {
          // 切换播放：先停止当前播放
          if (currentPlayingId) {
            setCurrentPlayingId(null);
          }
          // 使用 setTimeout 确保状态更新完成后再开始新的播放
          setTimeout(() => {
            setCurrentPlayingId(item.id);
          }, 50);
        }
      }
    },
    [
      playingStates,
      setCurrentPlayingId,
      currentPlayingId,
      chatType,
      vmsInteractiveRefStatus,
      vmsInteractiveRef,
      advancedConfig,
    ]
  );
  useEffect(() => {
    const newPlayingStates: Record<string, boolean> = {};
    chatList.forEach((chat: any) => {
      newPlayingStates[chat.id] = currentPlayingId === chat.id;
    });
    setPlayingStates(newPlayingStates);
  }, [currentPlayingId, chatList]);

  const handleWindowTabChange = () => {
    // 判断页面是否从“可见”变为“不可见”（即切换到其他标签页）
    if (document.visibilityState === 'hidden') {
      setCurrentPlayingId(null);
    }
  };

  useEffect(() => {
    //如果是被打断了，那么重置播放状态
    if (vmsInteractiveRefStatus === 'interrupt') {
      chatType === 'vms' && setCurrentPlayingId(null);
    }
  }, [vmsInteractiveRefStatus, chatType]);

  useEffect(() => {
    // 绑定 visibilitychange 事件
    document.addEventListener('visibilitychange', handleWindowTabChange);
  }, []);
  return (
    <>
      {(index !== chatList?.length - 1 || !debuggering) && (
        <div className="flex justify-end mt-1">
          <div
            className="inline-flex items-center justify-end gap-1.5 ml-6 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            {advancedConfig?.textToSpeech?.enabled && (
              <>
                <span
                  onClick={() => playAudio(chat)}
                  className={`${
                    playingStates[chat.id] ? 'play-active' : 'play-normal'
                  }`}
                ></span>
                {chatType === 'text' && (
                  <TtsModule
                    text={chat.content}
                    language={useLanguage.current}
                    voiceName={advancedConfig?.textToSpeech?.vcn_cn}
                    isPlaying={playingStates[chat.id] || false}
                    setIsPlaying={playing => {
                      if (!playing) {
                        setCurrentPlayingId(null);
                      }
                    }}
                  />
                )}
              </>
            )}
            <img
              src={icons.feedback}
              className="w-[16px] cursor-pointer"
              alt=""
              onClick={() => {
                setSid((chat as ChatListItemExtended).sid);
                setVisible(true);
              }}
            />
            <img
              src={
                (chat as ChatListItemExtended).copied
                  ? icons.chatCopied
                  : icons.chatCopy
              }
              className="w-4 h-4 cursor-pointer "
              alt=""
              onClick={() => {
                copyData(chat as ChatListItemExtended);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

const MessageSuggestions = ({
  chat,
  advancedConfig,
  index,
  chatList,
  debuggering,
  suggestLoading,
  suggestProblem,
  resetNodesAndEdges,
  handleRunDebugger,
  t,
}): React.ReactElement => {
  return (
    <>
      {!chat?.showResponse &&
        advancedConfig?.suggestedQuestionsAfterAnswer?.enabled &&
        index === chatList?.length - 1 &&
        !debuggering &&
        (suggestLoading ? (
          <div className="ml-[52px]">
            <div className="inline-flex chatLoading">
              <i></i>
              <i></i>
              <i></i>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 ml-[52px]">
            {suggestProblem.map((item, index) => (
              <div
                key={index}
                className="border border-[#e2e8ff] py-4 px-5 rounded-2xl w-fit cursor-pointer hover:bg-[#fff]"
                onClick={() => {
                  if (debuggering) return;
                  const { nodes, edges } = resetNodesAndEdges();
                  handleRunDebugger(nodes, edges, [
                    {
                      name: 'AGENT_USER_INPUT',
                      type: 'string',
                      default: item,
                      description: t(
                        'workflow.nodes.chatDebugger.userCurrentRoundInput'
                      ),
                      required: true,
                      validationSchema: null,
                      errorMsg: '',
                      originErrorMsg: '',
                    },
                  ]);
                }}
              >
                {item}
              </div>
            ))}
          </div>
        ))}
    </>
  );
};

const MessageRegenerate = ({
  debuggering,
  index,
  chatList,
  setChatList,
  resetNodesAndEdges,
  handleRunDebugger,
  needReply,
  handleResumeChat,
  t,
  handleStopConversation,
}): React.ReactElement => {
  return (
    <>
      {!debuggering && index === chatList.length - 1 && (
        <div className="flex items-center gap-2 ml-[52px]">
          {!needReply && (
            <div
              className="px-4 py-1.5 text-[#7F7F7F] border border-[transparent] rounded-[16px] hover:bg-[#F8FAFF] hover:text-[#6356EA] cursor-pointer flex items-center gap-1 group"
              onClick={() => handleResumeChat('')}
            >
              <img
                src={icons.chatIgnoreNormal}
                className="w-[14px] h-[14px] block group-hover:hidden"
                alt=""
              />
              <img
                src={icons.chatIgnoreActive}
                className="w-[14px] h-[14px] hidden group-hover:block"
                alt=""
              />
              <span>{t('workflow.nodes.chatDebugger.ignoreThisQuestion')}</span>
            </div>
          )}
          <div
            className="px-4 py-1.5 text-[#7F7F7F] border border-[transparent] rounded-[16px] hover:bg-[#F8FAFF] hover:text-[#BA0000] cursor-pointer flex items-center gap-1 group"
            onClick={handleStopConversation}
          >
            <img
              src={icons.chatEndRoundNormal}
              className="w-[14px] h-[14px] block group-hover:hidden"
              alt=""
            />
            <img
              src={icons.chatEndRoundActive}
              className="w-[14px] h-[14px] hidden group-hover:block"
              alt=""
            />
            <span>
              {t('workflow.nodes.chatDebugger.endThisRoundConversation')}
            </span>
          </div>
        </div>
      )}
      {!debuggering && index === chatList.length - 1 && (
        <div
          className="flex items-center gap-1.5 text-desc cursor-pointer ml-[52px]"
          onClick={() => {
            setChatList(chatList => chatList.slice(0, chatList?.length - 2));
            const { nodes, edges } = resetNodesAndEdges();
            handleRunDebugger(nodes, edges, chatList[index - 1]?.inputs, true);
          }}
        >
          <img src={icons.chatRefresh} className="w-4 h-4" alt="" />
          <span>{t('workflow.nodes.chatDebugger.regenerate')}</span>
        </div>
      )}
    </>
  );
};

const MessageReply = ({
  chat,
  currentFlow,
  debuggering,
  index,
  chatList,
  setSid,
  setVisible,
  handleResumeChat,
  t,
  advancedConfig,
  copyData,
  suggestLoading,
  suggestProblem,
  resetNodesAndEdges,
  handleRunDebugger,
  needReply,
  handleStopConversation,
  setChatList,
  chatType,
}): React.ReactElement => {
  return (
    <div className="flex flex-col gap-4 group" key={chat?.id}>
      <div className="flex items-start gap-4">
        <div
          className="w-[36px] h-[36px] p-2 rounded-full flex-shrink-0"
          style={{
            background: `url(${currentFlow?.avatarIcon}) no-repeat center / cover`,
          }}
        ></div>
        <div>
          {chat?.reasoningContent && (
            <div className="inline-flex items-center rounded-md px-[14px] py-[7px] bg-[#f5f5f5] hover:bg-[#ededed] mb-2 gap-2">
              <svg
                width="15"
                height="15"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.656 17.344c-1.016-1.015-1.15-2.75-.313-4.925.325-.825.73-1.617 1.205-2.365L3.582 10l-.033-.054c-.5-.799-.91-1.596-1.206-2.365-.836-2.175-.703-3.91.313-4.926.56-.56 1.364-.86 2.335-.86 1.425 0 3.168.636 4.957 1.756l.053.034.053-.034c1.79-1.12 3.532-1.757 4.957-1.757.972 0 1.776.3 2.335.86 1.014 1.015 1.148 2.752.312 4.926a13.892 13.892 0 0 1-1.206 2.365l-.034.054.034.053c.5.8.91 1.596 1.205 2.365.837 2.175.704 3.911-.311 4.926-.56.56-1.364.861-2.335.861-1.425 0-3.168-.637-4.957-1.757L10 16.415l-.053.033c-1.79 1.12-3.532 1.757-4.957 1.757-.972 0-1.776-.3-2.335-.86zm13.631-4.399c-.187-.488-.429-.988-.71-1.492l-.075-.132-.092.12a22.075 22.075 0 0 1-3.968 3.968l-.12.093.132.074c1.308.734 2.559 1.162 3.556 1.162.563 0 1.006-.138 1.298-.43.3-.3.436-.774.428-1.346-.008-.575-.159-1.264-.449-2.017zm-6.345 1.65l.058.042.058-.042a19.881 19.881 0 0 0 4.551-4.537l.043-.058-.043-.058a20.123 20.123 0 0 0-2.093-2.458 19.732 19.732 0 0 0-2.458-2.08L10 5.364l-.058.042A19.883 19.883 0 0 0 5.39 9.942L5.348 10l.042.059c.631.874 1.332 1.695 2.094 2.457a19.74 19.74 0 0 0 2.458 2.08zm6.366-10.902c-.293-.293-.736-.431-1.298-.431-.998 0-2.248.429-3.556 1.163l-.132.074.12.092a21.938 21.938 0 0 1 3.968 3.968l.092.12.074-.132c.282-.504.524-1.004.711-1.492.29-.753.442-1.442.45-2.017.007-.572-.129-1.045-.429-1.345zM3.712 7.055c.202.514.44 1.013.712 1.493l.074.13.092-.119a21.94 21.94 0 0 1 3.968-3.968l.12-.092-.132-.074C7.238 3.69 5.987 3.262 4.99 3.262c-.563 0-1.006.138-1.298.43-.3.301-.436.774-.428 1.346.007.575.159 1.264.448 2.017zm0 5.89c-.29.753-.44 1.442-.448 2.017-.008.572.127 1.045.428 1.345.293.293.736.431 1.298.431.997 0 2.247-.428 3.556-1.162l.131-.074-.12-.093a21.94 21.94 0 0 1-3.967-3.968l-.093-.12-.074.132a11.712 11.712 0 0 0-.71 1.492z"
                  fill="currentColor"
                  stroke="currentColor"
                  stroke-width=".1"
                ></path>
                <path
                  d="M10.706 11.704A1.843 1.843 0 0 1 8.155 10a1.845 1.845 0 1 1 2.551 1.704z"
                  fill="currentColor"
                  stroke="currentColor"
                  stroke-width=".2"
                ></path>
              </svg>
              <span>{t('workflow.nodes.chatDebugger.deepThinking')}</span>
            </div>
          )}
          <div className="rounded-xl p-4 relative flex-1 bg-[#f7f7fa]">
            <MessageReplyContent
              chat={chat}
              debuggering={debuggering}
              index={index}
              chatList={chatList}
              handleResumeChat={handleResumeChat}
            />
            {index === chatList?.length - 1 &&
              debuggering &&
              !chat?.messageContent &&
              !chat?.reasoningContent &&
              !chat?.content && (
                <div className="flex items-center gap-2.5">
                  <span>{t('workflow.nodes.chatDebugger.generating')}</span>
                  <img
                    src={icons.chatLoading}
                    className="w-5 h-5 flow-rotate-center"
                    alt=""
                  />
                </div>
              )}
            <MessageActions
              chat={chat}
              index={index}
              chatList={chatList}
              debuggering={debuggering}
              setSid={setSid}
              setVisible={setVisible}
              copyData={copyData}
              advancedConfig={advancedConfig}
              chatType={chatType}
            />
          </div>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex flex-col gap-1">
          <MessageSuggestions
            chat={chat}
            advancedConfig={advancedConfig}
            index={index}
            chatList={chatList}
            debuggering={debuggering}
            suggestLoading={suggestLoading}
            suggestProblem={suggestProblem}
            resetNodesAndEdges={resetNodesAndEdges}
            handleRunDebugger={handleRunDebugger}
            t={t}
          />
          <MessageRegenerate
            debuggering={debuggering}
            index={index}
            chatList={chatList}
            setChatList={setChatList}
            resetNodesAndEdges={resetNodesAndEdges}
            handleRunDebugger={handleRunDebugger}
            needReply={needReply}
            handleResumeChat={handleResumeChat}
            t={t}
            handleStopConversation={handleStopConversation}
          />
        </div>
      </div>
    </div>
  );
};

const useChatContent = ({ chatList, setChatList }): UseChatContentProps => {
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const [sid, setSid] = useState<string | undefined>('');
  const advancedConfig = useMemo<ChatContentAdvancedConfig>(() => {
    if (currentFlow?.advancedConfig && isJSON(currentFlow.advancedConfig)) {
      const parsedConfig = JSON.parse(currentFlow.advancedConfig);
      const newInputExampleList = ['', '', ''].map(
        (item, index) => parsedConfig?.prologue?.inputExample?.[index] || item
      );
      return {
        prologue: {
          enabled: parsedConfig?.prologue?.enabled ?? true,
          prologueText: parsedConfig?.prologue?.prologueText || '',
          inputExample: newInputExampleList,
        },
        feedback: {
          enabled: parsedConfig?.feedback?.enabled ?? true,
        },
        textToSpeech: {
          enabled: parsedConfig?.textToSpeech?.enabled ?? true,
          vcn_cn: parsedConfig?.textToSpeech?.vcn_cn || '',
        },
        suggestedQuestionsAfterAnswer: {
          enabled: parsedConfig?.suggestedQuestionsAfterAnswer?.enabled ?? true,
        },
        chatBackground: {
          enabled: parsedConfig?.chatBackground?.enabled ?? true,
          info: parsedConfig?.chatBackground?.info || null,
        },
      };
    } else {
      return {
        prologue: {
          enabled: true,
          prologueText: '',
          inputExample: ['', '', ''],
        },
        feedback: {
          enabled: true,
        },
        suggestedQuestionsAfterAnswer: {
          enabled: true,
        },
        chatBackground: {
          enabled: true,
          info: null,
        },
      };
    }
  }, [currentFlow?.advancedConfig]);
  const copyData = useMemoizedFn((params: ChatListItemExtended): void => {
    const clickData = chatList.find(item => item.id === params.id) as
      | ChatListItemExtended
      | undefined;
    if (clickData) {
      clickData.copied = true;
      setChatList([...chatList]);
      const content = params?.content || '';
      copy(content);
      setTimeout(() => {
        if (clickData) {
          clickData.copied = false;
          setChatList([...chatList]);
        }
      }, 2000);
    }
  });

  const renderInputElement = useMemoizedFn(
    (chat: ChatListItemExtended, input: StartNodeType): React.ReactElement => {
      const inputName = chat?.inputs?.length && chat.inputs.length > 1 && (
        <div className="px-4 py-1 bg-[#688fff] rounded-lg text-[#fff] inline-block">
          {input?.name}
        </div>
      );
      if (input?.fileType === 'image' && input?.type === 'string') {
        return (
          <div>
            {inputName}
            {Array.isArray(input?.default) && input.default.length > 0 && (
              <div>
                <Image
                  src={(input.default as unknown)?.[0]?.url}
                  className="mt-2"
                  alt=""
                />
              </div>
            )}
          </div>
        );
      }
      if (input?.fileType) {
        return (
          <div>
            {inputName}
            {Array.isArray(input?.default) && input.default.length > 0 && (
              <div className="flex gap-1 mt-2 item-center">
                <div className="flex items-center justify-center w-[22px] h-[22px] bg-[#fff] rounded">
                  <img
                    src={typeList.get(input?.fileType)}
                    className="w-[16px] h-[13px]"
                    alt=""
                  />
                </div>
                <span className="text-[#fff]">
                  {(input.default as unknown)?.[0]?.name}
                </span>
              </div>
            )}
          </div>
        );
      }
      return (
        <div className="flex items-start gap-2.5 text-[#fff]">
          {inputName}
          <div className="flow-chat-drawer-ask inline-block flex-1 overflow-hidden min-h-[29px]">
            {typeof input?.default === 'string' ? (
              <MarkdownRender content={input?.default} isSending={false} />
            ) : (
              <div
                style={{
                  lineHeight: '29px',
                }}
              >{`${input?.default}`}</div>
            )}
          </div>
        </div>
      );
    }
  );
  return {
    advancedConfig,
    sid,
    renderInputElement,
    setSid,
    copyData,
  };
};

function ChatContent({
  open,
  userWheel,
  setUserWheel,
  chatList,
  setChatList,
  startNodeParams,
  resetNodesAndEdges,
  handleRunDebugger,
  debuggering,
  suggestProblem,
  suggestLoading,
  needReply,
  handleResumeChat,
  handleStopConversation,
  chatType,
}: ChatContentProps): React.ReactElement {
  const { t } = useTranslation();
  const currentFlow = useFlowsManager(state => state.currentFlow) as
    | FlowType
    | undefined;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const botId = searchParams.get('botId');
  const { advancedConfig, sid, renderInputElement, setSid, copyData } =
    useChatContent({
      chatList,
      setChatList,
    });

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (dialogRef.current) {
          dialogRef.current.scrollTop = dialogRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [open]);

  const handleWheel = useMemoizedFn((event: React.WheelEvent): void => {
    if (event.deltaY < 0) {
      setUserWheel(true);
    }
  });

  useEffect(() => {
    if (!userWheel && dialogRef.current) {
      dialogRef.current.scrollTop = dialogRef.current.scrollHeight;
    }
  }, [chatList, userWheel]);

  return (
    <div
      ref={dialogRef}
      onWheel={handleWheel}
      className="flex flex-col flex-1 gap-4 px-5 pt-3 overflow-auto"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: chatType === 'text' ? '100%' : '315px',
        zIndex: 0,
      }}
    >
      <Prologue
        advancedConfig={advancedConfig}
        currentFlow={currentFlow}
        startNodeParams={startNodeParams}
        debuggering={debuggering}
        resetNodesAndEdges={resetNodesAndEdges}
        handleRunDebugger={handleRunDebugger}
        t={t}
      />
      {chatList.map((chat, index) =>
        chat.type === 'divider' ? (
          <MessageDivider key={chat.id} chat={chat} t={t} />
        ) : chat.type === 'ask' ? (
          <MessageAsk
            key={chat.id}
            chat={chat}
            renderInputElement={renderInputElement}
          />
        ) : (
          <MessageReply
            key={chat.id}
            chat={chat}
            currentFlow={currentFlow}
            debuggering={debuggering}
            index={index}
            chatList={chatList}
            setSid={setSid}
            setVisible={setVisible}
            handleResumeChat={handleResumeChat}
            t={t}
            advancedConfig={advancedConfig}
            copyData={copyData}
            suggestLoading={suggestLoading}
            suggestProblem={suggestProblem}
            resetNodesAndEdges={resetNodesAndEdges}
            handleRunDebugger={handleRunDebugger}
            needReply={needReply}
            handleStopConversation={handleStopConversation}
            setChatList={setChatList}
            chatType={chatType}
          />
        )
      )}
      <FeedbackDialog
        visible={visible}
        sid={sid}
        botId={botId || ''}
        flowId={currentFlow?.flowId || ''}
        onCancel={() => setVisible(false)}
      />
    </div>
  );
}

export default ChatContent;
