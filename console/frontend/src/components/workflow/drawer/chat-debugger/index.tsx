import { useWorkflowExecutionView } from '../../hooks/use-workflow-execution-view';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, message, Spin } from 'antd';
import { cloneDeep } from 'lodash';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import useFlowStore from '@/components/workflow/store/use-flow-store';
import { getProcessedStr, isPureText, splitSentencesBasic } from '@/utils';
import {
  validateInputJSON,
  generateDefaultInput,
  generateValidationSchema,
} from '@/components/workflow/utils/reactflowUtils';
import DeleteChatHistory from '@/components/workflow/modal/delete-chat-history';
import ChatContent from './components/chat-content';
import ChatInput from './components/chat-input';
import useChatStore from '@/components/workflow/store/use-chat-store';
import type { FlowType } from '@/components/workflow/types';
import type { WorkflowNode } from '@/components/workflow/types/domain';
import type { ChatStoreType } from '@/components/workflow/types/zustand/chat';
import {
  appendChatReply,
  createStartInputInitializer,
  readConfigObject,
} from './chat-state';
import useChatStores from '@/store/chat-store';
// 类型导入
import {
  InterruptChatType,
  ChatDebuggerContentProps,
  ReactFlowNode,
} from '@/components/workflow/types';

// 从统一的图标管理中导入
import { Icons } from '@/components/workflow/icons';
import VmsInteractionCmp, {
  type VirtualAvatarHandle,
} from '@/components/vms-interaction-cmp';
import './index.scss';
// 获取 Chat Debugger 模块的图标
const icons = Icons.chatDebugger;

export let chatAnswer = '';
//虚拟人形象参数
export const sdkAvatarInfo = {
  avatar_id: '',
};
//虚拟人发言人参数
export const sdkTTSInfo = {
  vcn: '',
};

export const vmsInteractionCmpRefDome = null;
const initInterruptChat: InterruptChatType = {
  eventId: '',
  interrupt: false,
  nodeId: '',
  type: '',
  option: null,
  needReply: true,
};

type ChatFooterProps = Pick<
  ChatStoreType,
  | 'debuggering'
  | 'setDeleteAllModal'
  | 'handleResumeChat'
  | 'resetNodesAndEdges'
  | 'handleRunDebugger'
  | 'startNodeParams'
  | 'interruptChat'
  | 'userInput'
> & {
  trialRun: boolean;
  t: ReturnType<typeof useTranslation>['t'];
  clearData: () => void;
};

const ChatFooter = ({
  trialRun,
  debuggering,
  setDeleteAllModal,
  t,
  clearData,
  handleResumeChat,
  resetNodesAndEdges,
  handleRunDebugger,
  startNodeParams,
  interruptChat,
  userInput,
}: ChatFooterProps): React.ReactElement | null => {
  const canRunDebugger = useChatStore(state => state.canRunDebugger);
  const stopRequested = useChatStore(state => state.stopRequested);
  const canRunChat = useMemo(
    () => canRunDebugger(),
    [debuggering, startNodeParams, stopRequested, interruptChat, userInput]
  );
  if (!trialRun) return null;
  return (
    <div className="flex items-center justify-between mt-4 px-5">
      {!debuggering ? (
        <Button
          type="text"
          className="origin-btn px-[26px]"
          disabled={stopRequested}
          onClick={() => setDeleteAllModal(true)}
        >
          {t('workflow.nodes.chatDebugger.clearDialogue')}
        </Button>
      ) : (
        <div className="h-1"></div>
      )}
      <div className="flex items-center gap-2.5">
        <Button
          type="text"
          className="origin-btn px-[24px]"
          disabled={stopRequested}
          loading={stopRequested}
          onClick={() => clearData()}
        >
          {stopRequested
            ? '正在停止运行…'
            : debuggering || interruptChat.interrupt
              ? '停止运行'
              : t('common.cancel')}
        </Button>
        <Button
          type="primary"
          className="px-[24px] flex items-center gap-2"
          onClick={() => {
            if (startNodeParams?.length === 1 || interruptChat?.interrupt) {
              if (interruptChat?.interrupt) {
                handleResumeChat(userInput);
              } else {
                const { nodes, edges } = resetNodesAndEdges();
                handleRunDebugger(nodes, edges, [
                  {
                    name: startNodeParams[0]?.name || 'AGENT_USER_INPUT',
                    type: 'string',
                    default: userInput,
                    description: t(
                      'workflow.nodes.chatDebugger.userCurrentRoundInput'
                    ),
                    required: true,
                    validationSchema: null,
                    errorMsg: '',
                    originErrorMsg: '',
                  },
                ]);
              }
            } else {
              const { nodes, edges } = resetNodesAndEdges();
              handleRunDebugger(nodes, edges);
            }
          }}
          disabled={!canRunChat}
        >
          <img src={icons.trialRun} className="w-3 h-3" alt="" />
          <span>{t('workflow.nodes.chatDebugger.send')}</span>
        </Button>
      </div>
    </div>
  );
};

const useChatDebuggerEffect = (
  currentFlow: FlowType | undefined,
  open: boolean,
  startNode: WorkflowNode | undefined,
  setStartNodeParams: ChatStoreType['setStartNodeParams'],
  vmsInteractionCmpRef: React.RefObject<VirtualAvatarHandle>,
  vmsInteractiveRefStatus: string
): void => {
  const isMounted = useRef<boolean>(false);
  const initializeInputs = useRef(createStartInputInitializer());
  const flowResult = useFlowsManager(state => state.flowResult);
  const setInterruptChat = useChatStore(state => state.setInterruptChat);
  const clearNodeStatus = useChatStore(state => state.clearNodeStatus);
  const handleSaveDialogue = useChatStore(state => state.handleSaveDialogue);
  const debuggering = useChatStore(state => state.debuggering);
  const buildPassRef = useChatStore(state => state.buildPassRef);
  const getTextQueueContent = useChatStore(state => state.getTextQueueContent);
  const getChatKey = useChatStore(state => state.getChatKey);
  const isChatEnd = useChatStore(state => state.isChatEnd);
  const setDebuggering = useChatStore(state => state.setDebuggering);
  const getDialogues = useChatStore(state => state.getDialogues);
  const historyVersion = useFlowsManager(state => state.historyVersion);
  const historyVersionNum = useFlowsManager(
    state => state.historyVersionData?.versionNum
  );
  const setChatList = useChatStore(state => state.setChatList);
  const chatInfoRef = useChatStore(state => state.chatInfoRef);
  const interruptChat = useChatStore(state => state.interruptChat);
  const controllerRef = useChatStore(state => state.controllerRef);
  const setWsMessageStatus = useChatStore(state => state.setWsMessageStatus);
  const setQueue = useChatStore(state => state.setQueue);
  const chatList = useChatStore(state => state.chatList);
  const setNodes = useFlowStore(state => state.setNodes);
  const setEdges = useFlowStore(state => state.setEdges);
  useEffect(() => {
    if (!flowResult?.status) {
      controllerRef?.abort();
      setWsMessageStatus('end');
      setInterruptChat({ ...initInterruptChat });
      setNodes(old => {
        old.forEach(node => (node.data.status = ''));
        return cloneDeep(old);
      });
      setEdges(edges =>
        edges?.map(edge => ({
          ...edge,
          animated: false,
          style: {
            stroke: '#6356EA',
            strokeWidth: 2,
          },
        }))
      );
    }
  }, [flowResult?.status, currentFlow?.flowId]);
  useEffect(() => {
    currentFlow?.id && getDialogues(currentFlow?.id, true);
  }, [currentFlow?.id, historyVersion, historyVersionNum]);
  useEffect(() => {
    const handleBeforeUnload = (): void => {
      useChatStore.getState().controllerRef?.abort();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return (): void => {
      clearNodeStatus();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      useChatStore.getState().controllerRef?.abort();
    };
  }, [currentFlow?.flowId]);
  useEffect(() => {
    initializeInputs.current(
      open,
      currentFlow?.flowId,
      startNode?.data?.outputs
    ) &&
      setStartNodeParams(
        startNode?.data?.outputs?.map(input => {
          const errorMsg =
            input?.schema?.type === 'object'
              ? validateInputJSON('{}', generateValidationSchema(input))
              : '';
          const allowedFileType = input?.allowedFileType?.[0];
          return {
            name: input.name,
            type: input?.schema?.type,
            fileType: allowedFileType,
            default: allowedFileType
              ? []
              : input?.schema?.type === 'object'
                ? '{}'
                : input?.schema?.type.includes('array')
                  ? '[]'
                  : generateDefaultInput(input?.schema?.type),
            description:
              typeof input.schema.default === 'string'
                ? input.schema.default
                : undefined,
            required: input.required ?? false,
            validationSchema:
              input?.schema?.type === 'object' ||
              (input?.schema?.type.includes('array') && !input?.fileType)
                ? generateValidationSchema(input)
                : null,
            errorMsg: errorMsg,
            originErrorMsg: errorMsg,
          };
        }) || []
      );
  }, [startNode, open, currentFlow?.flowId]);
  useEffect(() => {
    if (isMounted.current) {
      !debuggering && buildPassRef && handleSaveDialogue();
    } else {
      isMounted.current = true;
    }
  }, [debuggering]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (debuggering) {
      timer = setInterval((): void => {
        const content = getTextQueueContent();
        const chatKey = getChatKey();
        const value = content.slice(0, 10);
        if (value) {
          setQueue(10);
          setChatList(chatList => {
            chatInfoRef.answer[chatKey] = chatInfoRef.answer[chatKey] + value;
            return appendChatReply(chatList, chatKey, value);
          });
        }
        if (isChatEnd()) {
          setDebuggering(false);
          setChatList(chatList => {
            const last = chatList[chatList.length - 1];
            if (last) {
              last.showResponse = true;
              if (interruptChat?.type === 'option') {
                last.option = interruptChat.option ?? undefined;
              }
            }
            return [...chatList];
          });
          if (chatAnswer && vmsInteractiveRefStatus === 'init') {
            if (chatAnswer.length >= 2000) {
              const str = chatAnswer.slice(0, 2000);
              isPureText(str) &&
                vmsInteractionCmpRef?.current?.instance?.writeText(str, {
                  tts: sdkTTSInfo,
                  avatar_dispatch: {
                    interactive_mode: 0,
                  },
                });
              chatAnswer = chatAnswer.slice(str.length, chatAnswer.length);
            } else {
              vmsInteractionCmpRef?.current?.instance?.writeText(chatAnswer, {
                tts: sdkTTSInfo,
                avatar_dispatch: {
                  interactive_mode: 0,
                },
              });
              chatAnswer = '';
            }
          }
        }
      }, 10);
    } else {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    return (): void => {
      if (timer !== null) clearInterval(timer);
    };
  }, [debuggering, chatList, interruptChat]);
};

const useChatDebuggerContent = ({
  currentFlow,
}: {
  currentFlow: FlowType | undefined;
}) => {
  const nodes = useFlowStore(state => state.nodes);
  const errNodes = useFlowsManager(state => state.errNodes);
  const startNode = useMemo(() => {
    return nodes?.find((node: ReactFlowNode) => node.nodeType === 'node-start');
  }, [nodes]);
  const trialRun = useMemo(() => {
    return errNodes?.length === 0;
  }, [errNodes]);
  const xfYunBot = useMemo(() => {
    const config = readConfigObject(currentFlow?.ext);
    return {
      chatId:
        typeof config.chatId === 'string' || typeof config.chatId === 'number'
          ? config.chatId
          : undefined,
      botId:
        typeof config.botId === 'string' || typeof config.botId === 'number'
          ? config.botId
          : undefined,
    };
  }, [currentFlow]);
  const multiParams = useMemo((): boolean => {
    const startNode = nodes?.find(node => node?.nodeType === 'node-start');
    const outputs = startNode?.data?.outputs;
    let multiParams = true;
    if (
      outputs?.length === 1 ||
      outputs?.slice(1).every(item => item.fileType === 'file')
    ) {
      multiParams = false;
    }
    return multiParams;
  }, [nodes]);
  const talkAgentConfig = useMemo(() => {
    const config = readConfigObject(currentFlow?.flowConfig);
    const sceneMode = Number(config.sceneMode) === 1 ? 1 : 0;
    const sceneId = typeof config.sceneId === 'string' ? config.sceneId : '';
    const callSceneId =
      typeof config.callSceneId === 'string' ? config.callSceneId : '';
    return {
      interactType:
        typeof config.interactType === 'number' ||
        typeof config.interactType === 'string'
          ? config.interactType
          : undefined,
      sceneEnable: config.sceneEnable,
      sceneMode,
      sceneId,
      callSceneId,
      // Legacy call avatars belong to SparkOS, not the Avatar SDK asset catalog.
      // Retain their configuration, but never send them or fall back to another face.
      avatarId: sceneMode === 0 ? sceneId : '',
      vcn: typeof config.vcn === 'string' ? config.vcn : '',
    };
  }, [currentFlow?.flowConfig]);
  return {
    startNode,
    trialRun,
    multiParams,
    xfYunBot,
    talkAgentConfig,
  };
};

export function ChatDebuggerContent({
  open,
  setOpen,
}: ChatDebuggerContentProps): React.ReactElement {
  const { t } = useTranslation();
  const currentFlow = useWorkflowExecutionView();
  const historyVersionData = useFlowsManager(state => state.historyVersionData);
  const userInput = useChatStore(state => state.userInput);
  const setUserInput = useChatStore(state => state.setUserInput);
  const historyVersion = useFlowsManager(state => state.historyVersion);
  const chatType = useChatStore(state => state.chatType);
  const startNodeParams = useChatStore(state => state.startNodeParams);
  const setStartNodeParams = useChatStore(state => state.setStartNodeParams);
  const chatList = useChatStore(state => state.chatList);
  const setChatList = useChatStore(state => state.setChatList);
  const debuggering = useChatStore(state => state.debuggering);
  const userWheel = useChatStore(state => state.userWheel);
  const setUserWheel = useChatStore(state => state.setUserWheel);
  const deleteAllModal = useChatStore(state => state.deleteAllModal);
  const setDeleteAllModal = useChatStore(state => state.setDeleteAllModal);
  const suggestLoading = useChatStore(state => state.suggestLoading);
  const suggestProblem = useChatStore(state => state.suggestProblem);
  const interruptChat = useChatStore(state => state.interruptChat);
  const deleteAllChat = useChatStore(state => state.deleteAllChat);
  const clearData = useChatStore(state => state.clearData);
  const handleResumeChat = useChatStore(state => state.handleResumeChat);
  const resetNodesAndEdges = useChatStore(state => state.resetNodesAndEdges);
  const handleRunDebugger = useChatStore(state => state.handleRunDebugger);
  const handleEnterKey = useChatStore(state => state.handleEnterKey);
  const handleStopConversation = useChatStore(
    state => state.handleStopConversation
  );
  const handleChatTypeChange = useChatStore(
    state => state.handleChatTypeChange
  );
  const { startNode, trialRun, talkAgentConfig } = useChatDebuggerContent({
    currentFlow,
  });
  const interactType = Number(talkAgentConfig?.interactType);
  const hasVirtualScene = talkAgentConfig?.sceneEnable === 1;
  const [callStatus, setCallStatus] = useState('hangup');
  const [loadingVms, setLoadingVms] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarRetry, setAvatarRetry] = useState(0);
  const vmsInteractionCmpRef = useRef<VirtualAvatarHandle>(null);
  const vmsInteractiveRefStatus = useChatStores(
    state => state.vmsInteractiveRefStatus
  );
  const setVmsInteractiveRefStatus = useChatStores(
    state => state.setVmsInteractiveRefStatus
  );

  useEffect(() => {
    if (interactType === 0) {
      handleChatTypeChange('phone');
      setCallStatus('ringing');
    } else if (interactType === 1) {
      handleChatTypeChange('text');
      setCallStatus('hangup');
    } else if (interactType === 2) {
      handleChatTypeChange('vms');
      setCallStatus('hangup');
    } else {
      handleChatTypeChange('text');
      setCallStatus('hangup');
    }
  }, [interactType, handleChatTypeChange, open]);

  useEffect(() => {
    let cancelled = false;
    const avatar = vmsInteractionCmpRef.current;
    // This invalidates both a ready SDK and any pending signature/start request.
    avatar?.dispose();
    sdkAvatarInfo.avatar_id = '';
    sdkTTSInfo.vcn = talkAgentConfig.vcn;
    chatAnswer = '';
    setAvatarError('');
    setLoadingVms(false);
    const cleanup = (): void => {
      cancelled = true;
      avatar?.dispose();
    };
    if (!open || chatType !== 'vms' || !hasVirtualScene) return cleanup;
    if (talkAgentConfig.sceneMode === 1) {
      setAvatarError(
        '旧通话形象不支持当前虚拟人播放，请在设置中选择目录形象。'
      );
      return cleanup;
    }
    if (!talkAgentConfig.avatarId) {
      setAvatarError('所选模式未配置虚拟人形象，请先完成设置。');
      return cleanup;
    }
    if (!avatar) {
      setAvatarError('虚拟人连接尚未就绪，请重试。');
      return cleanup;
    }
    const voice = { vcn: talkAgentConfig.vcn };
    void avatar
      .initAvatar({
        sdkAvatarInfo: { avatar_id: talkAgentConfig.avatarId },
        sdkTTSInfo: voice,
      })
      .then(async started => {
        if (cancelled || !started) return;
        sdkAvatarInfo.avatar_id = talkAgentConfig.avatarId;
        const advancedConfig = readConfigObject(currentFlow?.advancedConfig);
        const prologue = advancedConfig.prologue as
          | { enabled?: boolean; prologueText?: unknown }
          | undefined;
        if (
          prologue?.enabled &&
          typeof prologue.prologueText === 'string' &&
          prologue.prologueText
        ) {
          await avatar.instance?.writeText(prologue.prologueText, {
            tts: voice,
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        avatar.dispose();
        sdkAvatarInfo.avatar_id = '';
        setVmsInteractiveRefStatus('error');
        setAvatarError('虚拟人连接失败，请检查配置后重试。');
      });
    return cleanup;
  }, [
    currentFlow?.id,
    currentFlow?.advancedConfig,
    hasVirtualScene,
    chatType,
    open,
    avatarRetry,
    setVmsInteractiveRefStatus,
    talkAgentConfig.sceneMode,
    talkAgentConfig.avatarId,
    talkAgentConfig.vcn,
  ]);
  useChatDebuggerEffect(
    currentFlow,
    open,
    startNode,
    setStartNodeParams,
    vmsInteractionCmpRef,
    vmsInteractiveRefStatus
  );

  const closeFunction = () => {
    clearData(setOpen);
    vmsInteractionCmpRef.current?.dispose();
    sdkAvatarInfo.avatar_id = '';
    setVmsInteractiveRefStatus('stop');
    chatAnswer = '';
  };
  useEffect(() => {
    if (!open) closeFunction();
  }, [open]);

  useEffect(() => {
    const responseResult = chatList[chatList.length - 1];
    if (responseResult?.type === 'answer') {
      if (responseResult?.showResponse) return;
      if (vmsInteractiveRefStatus === 'init') {
        //送文本到虚拟人，不一定是纯文本
        if (
          responseResult?.content &&
          typeof responseResult?.content === 'string'
        ) {
          chatAnswer += responseResult?.content;
          const splitSentencesArr = splitSentencesBasic(chatAnswer);
          //判断是否可以按照句子来分割
          if (splitSentencesArr?.length) {
            const str = getProcessedStr(splitSentencesArr);

            str &&
              vmsInteractionCmpRef?.current?.instance
                ?.writeText(str, {
                  tts: sdkTTSInfo,
                  avatar_dispatch: {
                    interactive_mode: 0,
                  },
                })
                .then(() => {})
                .catch((err: unknown) => {
                  console.error(err);
                  message.error('发送失败，可以打开控制台查看信息');
                });
            chatAnswer = chatAnswer.slice(str.length, chatAnswer.length);
          } else {
            if (chatAnswer.length >= 2000) {
              const str = chatAnswer.slice(0, 2000);
              isPureText(str) &&
                vmsInteractionCmpRef?.current?.instance?.writeText(str, {
                  tts: sdkTTSInfo,
                  avatar_dispatch: {
                    interactive_mode: 0,
                  },
                });
              chatAnswer = chatAnswer.slice(str.length, chatAnswer.length);
            } else {
              vmsInteractionCmpRef?.current?.instance?.writeText(chatAnswer, {
                tts: sdkTTSInfo,
              });
            }
          }
        }
      }
    }
  }, [chatList]);
  return (
    <div
      className="w-full h-full py-4 flex flex-col overflow-hidden"
      tabIndex={0}
      onKeyDown={e => e.stopPropagation()}
    >
      {deleteAllModal && (
        <DeleteChatHistory
          setDeleteModal={setDeleteAllModal}
          deleteChat={deleteAllChat}
        />
      )}
      <div className="flex items-center justify-between px-5 z-[10]">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg">
            {trialRun
              ? t('workflow.nodes.chatDebugger.dialogue')
              : t('workflow.nodes.chatDebugger.runResult')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {hasVirtualScene && (
            <>
              {chatType !== 'vms' && (
                <img
                  src={icons?.vms}
                  alt=""
                  className="cursor-pointer"
                  onClick={() => handleChatTypeChange('vms')}
                />
              )}
              {chatType !== 'text' && (
                <img
                  src={icons?.message}
                  alt=""
                  className="cursor-pointer"
                  onClick={() => handleChatTypeChange('text')}
                />
              )}
            </>
          )}
          <img
            src={icons.close}
            className="w-3 h-3 cursor-pointer"
            alt=""
            onClick={() => closeFunction()}
          />
        </div>
      </div>
      {avatarError && open && chatType === 'vms' && (
        <div role="alert" className="relative z-[11] mx-5 my-2 text-red-600">
          {avatarError}
          <Button
            className="ml-2"
            onClick={() => setAvatarRetry(value => value + 1)}
          >
            重试连接
          </Button>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden mt-1 relative">
        <div className="w-full flex items-center justify-between px-5">
          <div className="flex items-center gap-2 text-desc">
            <img src={icons.chatListTip} className="w-3 h-3 mt-0.5" alt="" />
            <span>{t('workflow.nodes.chatDebugger.debugHistory')}</span>
          </div>
          <span className="text-xs text-gray-500">
            {historyVersion
              ? `工作流版本 ${historyVersionData?.name || ''}`
              : '当前草稿'}{' '}
            · 历史由服务端保存
          </span>
        </div>

        <div
          className="vms-container"
          style={{
            width: '100%',
            height: 'calc(100% - 100px)',
            overflow: 'hidden',
            position: 'absolute',
            bottom: '80px',
            left: 0,
            display: hasVirtualScene && chatType === 'vms' ? 'block' : 'none',
            textAlign: 'center',
          }}
        >
          <Spin
            spinning={loadingVms}
            tip={t('workflow.nodes.chatDebugger.virtualLoading') + '...'}
            className="mt-[100px] color-[#6356ea]"
          >
            <div></div>
          </Spin>
          <VmsInteractionCmp
            ref={vmsInteractionCmpRef}
            avatarDom={document.getElementById('avatarDom') as HTMLDivElement}
            styles={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 0,
            }}
            loadingStatusChange={setLoadingVms}
          />
        </div>
        {(chatType === 'text' || chatType === 'vms') && (
          <div className="w-full flex-1 relative debugger-chat-content">
            <ChatContent
              open={open}
              userWheel={userWheel}
              setUserWheel={setUserWheel}
              chatList={chatList}
              setChatList={setChatList}
              startNodeParams={startNodeParams}
              resetNodesAndEdges={resetNodesAndEdges}
              handleRunDebugger={handleRunDebugger}
              debuggering={debuggering}
              suggestProblem={suggestProblem}
              suggestLoading={suggestLoading}
              needReply={interruptChat?.needReply}
              handleResumeChat={handleResumeChat}
              handleStopConversation={handleStopConversation}
              chatType={chatType}
            />
          </div>
        )}
        <ChatInput
          interruptChat={interruptChat}
          startNodeParams={startNodeParams}
          setStartNodeParams={setStartNodeParams}
          userInput={userInput}
          setUserInput={setUserInput}
          handleEnterKey={handleEnterKey}
        />
        <ChatFooter
          trialRun={trialRun}
          debuggering={debuggering}
          setDeleteAllModal={setDeleteAllModal}
          t={t}
          clearData={() => clearData(setOpen)}
          handleResumeChat={handleResumeChat}
          resetNodesAndEdges={resetNodesAndEdges}
          handleRunDebugger={handleRunDebugger}
          startNodeParams={startNodeParams}
          interruptChat={interruptChat}
          userInput={userInput}
        />
      </div>
    </div>
  );
}
