import { ReactElement, useEffect, useRef, useState } from 'react';
import { message, Spin } from 'antd';
import useBotInfoStore from '@/store/bot-info-store';
import ChatHeader from './components/chat-header';
import chatBg from '@/assets/imgs/chat/chat-bg.png';
import MessageList from './components/message-list';
import useChatStore from '@/store/chat-store';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  getChatHistory,
  postCreateChat,
  getBotInfoApi,
  postStopChat,
  postChatList,
  createChatByShareKey,
  getWorkflowBotInfoApi,
} from '@/services/chat';
import ChatInput from './components/chat-input';
import ChatSide from './components/chat-side';
import useChat from '@/hooks/use-chat';
import { formatHistoryToMessages, isPureText } from '@/utils';
import { useTranslation } from 'react-i18next';
import styles from './index.module.scss';
import vmsIcon from '@/assets/svgs/icon-user-filled.svg';
import messageIcon from '@/assets/svgs/icon-message-filled.svg';
import VmsInteractionCmp from '@/components/vms-interaction-cmp';
import { getSceneList } from '@/services/spark-common';
import { getTalkAgentConfig } from '@/services/agent-square';

/** 形象项（后端归一化后的前端结构） */
interface SceneItem {
  sceneId: string;
  name: string;
  gender?: string;
  posture?: string;
  type?: string;
  avatar?: string;
  defaultVCN?: string;
}

let vmsInter: any = null;
//虚拟人形象参数
const sdkAvatarInfo = {
  avatar_id: '',
};
//虚拟人发言人参数
const sdkTTSInfo = {
  vcn: '',
};

let prevTempAns = '';
let tempAnsBak = '';

const ChatPage = (): ReactElement => {
  const botInfo = useBotInfoStore(state => state.botInfo); //  智能体信息
  const setBotInfo = useBotInfoStore(state => state.setBotInfo); //  设置智能体信息
  const messageList = useChatStore(state => state.messageList); //  消息列表
  const streamId = useChatStore(state => state.streamId); //  流式id
  const isLoading = useChatStore(state => state.isLoading); //  加载状态
  const workflowOperation = useChatStore(state => state.workflowOperation); //  工作流操作
  const setMessageList = useChatStore(state => state.setMessageList); //  设置消息列表
  const setCurrentChatId = useChatStore(state => state.setCurrentChatId); //  设置当前聊天id
  const initChatStore = useChatStore(state => state.initChatStore); //  初始化聊天store
  const setChatFileListNoReq = useChatStore(
    state => state.setChatFileListNoReq
  ); //  设置聊天文件列表
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false); //  数据加载状态
  const [searchParams] = useSearchParams();
  const { botId: botIdParam, version } = useParams<{
    botId: string;
    version?: string;
  }>();
  const sharekey = searchParams.get('sharekey') || ''; //  分享key
  const botId = parseInt(botIdParam || '0', 10) || 0; //  智能体ID
  const [botNameColor, setBotNameColor] = useState<string>('#000000'); //设置字体颜色
  const { onSendMsg } = useChat();
  const { t } = useTranslation();
  const [showVmsPermissionTip, setShowVmsPermissionTip] =
    useState<boolean>(false); //是否展示虚拟人播报权限提示
  const vmsInteractionCmpRef = useRef<any>(null);
  const [talkAgentConfig, setTalkAgentConfig] = useState<any>({});
  const chatType = useChatStore(state => state.chatType); //  聊天类型
  const setChatType = useChatStore((state: any) => state.setChatType);

  const vmsInteractiveRefStatus = useChatStore(
    (state: any) => state.vmsInteractiveRefStatus
  );
  const [loadingVms, setLoadingVms] = useState<boolean>(false);
  const setVmsInteractiveRefStatus = useChatStore(
    (state: any) => state.setVmsInteractiveRefStatus
  );
  useEffect(() => {
    initializeChatPage();
    return () => {
      vmsInteractionCmpRef.current?.instance &&
        vmsInteractionCmpRef?.current?.dispose();
    };
  }, []);

  const handleChatTypeChange = (type: string) => {
    setChatType(type);
    if (type === 'vms') {
      setTimeout(() => {
        vmsInteractionCmpRef?.current?.initAvatar({
          sdkAvatarInfo,
          sdkTTSInfo,
        });
      });
    } else {
      vmsInteractionCmpRef?.current?.instance &&
        vmsInteractionCmpRef?.current?.dispose();
      tempAnsBak = '';
      prevTempAns = '';
      vmsInter && clearInterval(vmsInter);
      vmsInter = null;
    }
  };

  // 初始化聊天页面
  const initializeChatPage = async (): Promise<void> => {
    try {
      setIsDataLoading(true);
      initChatStore();
      // 1. 判断是否有对话
      const chatList = await postChatList();
      const hasChat = chatList.find(item => item.botId === botId);

      // 2. 判断是否有分享key
      if (!hasChat) {
        sharekey
          ? await createChatByShareKey({ shareAgentKey: sharekey })
          : await postCreateChat(botId);
      }

      // 3. 获取智能体信息
      const botInfo = await getBotInfoApi(
        botId,
        version !== 'debugger' ? version || '' : ''
      );
      if (botInfo?.pcBackground) {
        getBotNameColor(botInfo?.pcBackground);
      }
      //如果是语音智能体工作流，加载配置信息
      if (botInfo?.version === 4) {
        const talkAgentConfigRes: any = await getTalkAgentConfig(
          version === 'debugger' || botInfo?.botStatus === -9
            ? 'debug'
            : 'chat',
          botId,
          version !== 'debugger' ? version : undefined
        );

        //设置聊天类型:1、文本 2、语音通话 3、虚拟人播报 4、语音虚拟人
        setChatType(
          talkAgentConfigRes?.interactType === 2
            ? 'vms'
            : talkAgentConfigRes?.interactType === 1
              ? 'text'
              : talkAgentConfigRes?.interactType === 0
                ? 'phone'
                : 'phoneVms'
        );

        setTalkAgentConfig(talkAgentConfigRes);
        //如果是虚拟人播报或者语音通话虚拟人，初始化虚拟人sdk信息，并写入开场白
        if (talkAgentConfigRes?.sceneEnable === 1) {
          sdkAvatarInfo.avatar_id = talkAgentConfigRes?.sceneId;
          sdkTTSInfo.vcn = talkAgentConfigRes?.vcn;
          if (talkAgentConfigRes?.interactType === 2) {
            setTimeout(() => {
              vmsInteractionCmpRef?.current?.initAvatar({
                sdkAvatarInfo,
                sdkTTSInfo,
              });
            }, 1000);
            botInfo?.prologue &&
              !showVmsPermissionTip &&
              vmsInteractionCmpRef?.current?.instance?.writeText(
                botInfo?.prologue,
                {
                  tts: sdkTTSInfo,
                  avatar_dispatch: {
                    interactive_mode: 0,
                  },
                }
              );
          }
        }
      } else {
        setChatType('text');
      }
      const workflowBotInfo = await getWorkflowBotInfoApi(botId);
      setBotInfo({
        ...botInfo,
        advancedConfig: workflowBotInfo?.advancedConfig,
        openedTool: workflowBotInfo.openedTool,
        config: workflowBotInfo.config,
      });
      setCurrentChatId(botInfo.chatId);
      // 4. 获取对话历史
      await getChatHistoryData(botInfo.chatId);
      setIsDataLoading(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDataLoading(false);
    }
  };
  // 获取对话历史
  const getChatHistoryData = async (chatId: number): Promise<void> => {
    const res = await getChatHistory(chatId);
    setChatFileListNoReq(res?.[0]?.chatFileListNoReq || []);
    const formattedMessages = formatHistoryToMessages(res);
    setMessageList(formattedMessages);
  };

  //send message
  const handleRecomendClick = (params: {
    item: string;
    callback?: () => void;
  }) => {
    if (streamId || isDataLoading || isLoading) {
      message.warning(t('chatPage.chatWindow.answeringInProgress'));
      return;
    }
    onSendMsg({
      msg: params.item,
      workflowOperation: (workflowOperation || []).length === 0 ? '' : 'resume',
      onSendCallback: params.callback,
    });
  };

  //stop answer
  const stopAnswer = () => {
    postStopChat(streamId).catch(err => {
      console.error(err);
    });
  };

  //set color
  const getBotNameColor = (imgUrl: string) => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous'; // handle cross-origin problem
    img.src = imgUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const context: any = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);

      const imageData = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data;
      const length = imageData.length / 4;

      let r = 0,
        g = 0,
        b = 0;

      for (let i = 0; i < length; i++) {
        r += imageData[i * 4 + 0];
        g += imageData[i * 4 + 1];
        b += imageData[i * 4 + 2];
      }

      r = Math.floor(r / length);
      g = Math.floor(g / length);
      b = Math.floor(b / length);

      // calculate brightness
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const fontColor = brightness > 144 ? '#000000' : '#FFFFFF'; // set font color based on brightness
      setBotNameColor(fontColor);
    };
  };

  useEffect(() => {
    if (vmsInteractiveRefStatus !== 'init') {
      vmsInter && clearInterval(vmsInter);
      vmsInter = null;
      tempAnsBak = '';
      prevTempAns = '';
    } else {
      const updatedMessageList = [...messageList];
      const lastMessage = updatedMessageList[updatedMessageList.length - 1];
      //如果正在回答中，或者回答内容已经结束，但是虚拟人还未播完的状态
      if ((lastMessage && !lastMessage.sid) || tempAnsBak) {
        vmsInter && clearInterval(vmsInter);
        vmsInter = null;
        //如果虚拟人实例初始化成功，则开始播报，若是打断或者断开状态，则不进行播报
        if (vmsInteractiveRefStatus === 'init') {
          vmsInter = setInterval(() => {
            //表示正在回答中
            if (lastMessage && !lastMessage.sid) {
              const arr = lastMessage.message.split('');
              let str = '';
              arr.splice(0, prevTempAns.length); //去除之前播报过的内容
              //如果剩下的要播的内容超过2000，必须截断处理，否则播报报错
              if (arr.length > 2000) {
                const newArr = arr.splice(0, 2000);
                str = newArr.join('').trim();
                prevTempAns += newArr.join('')?.toString();
              } else {
                str = arr.join('').trim();
                prevTempAns = lastMessage.message?.toString() + '';
              }
              tempAnsBak = lastMessage.message;
              //如果非纯文本，直接提示不支持播报
              isPureText(str) &&
                vmsInteractionCmpRef?.current?.instance
                  ?.writeText(str, {
                    tts: sdkTTSInfo,
                    avatar_dispatch: {
                      interactive_mode: 0,
                    },
                  })
                  .then(() => {
                    console.log('文本驱动发送成功');
                  })
                  .catch((err: any) => {
                    console.error(err);
                  });
            } else {
              //表示回答结束
              if (messageList?.[messageList?.length - 1]?.sid && tempAnsBak) {
                const fullMessage =
                  messageList?.[messageList?.length - 1]?.message || '';
                const arr = fullMessage.split('');
                let str = '';
                arr.splice(0, prevTempAns.length); //去除之前播报过的内容
                //如果剩下的要播的内容超过2000，必须截断处理，否则播报报错
                if (arr.length > 2000) {
                  const newArr = arr.splice(0, 2000);
                  str = newArr.join('').trim();
                  prevTempAns += newArr.join('')?.toString();
                } else {
                  str = arr.join('').trim();
                  tempAnsBak = '';
                  prevTempAns = '';
                }
                isPureText(str) &&
                  vmsInteractionCmpRef?.current?.instance
                    ?.writeText(str, {
                      tts: sdkTTSInfo,
                      avatar_dispatch: {
                        interactive_mode: 0,
                      },
                    })
                    .then(() => {
                      console.log('发送成功');
                    })
                    .catch((err: any) => {
                      console.error(err);
                    });

                vmsInter && clearInterval(vmsInter);
              }
            }
          }, 200);
        }
      }
    }
  }, [messageList, vmsInteractiveRefStatus]);

  return (
    <div
      className="w-full h-screen bg-no-repeat bg-center bg-cover flex flex-col overflow-auto scrollbar-none"
      style={{ backgroundImage: `url(${botInfo.pcBackground || chatBg})` }}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Spin spinning={isDataLoading} />
      </div>
      <ChatHeader
        botInfo={botInfo}
        setBotInfo={setBotInfo}
        isDataLoading={isDataLoading}
      />
      <div className="overflow-scroll flex flex-1 flex-col pt-[100px] pr-[388px] pl-[24px]">
        <div className="flex items-center justify-end gap-4">
          {talkAgentConfig?.sceneEnable === 1 && (
            <>
              {chatType !== 'vms' && (
                <img
                  src={vmsIcon}
                  alt=""
                  className="cursor-pointer"
                  onClick={() => handleChatTypeChange('vms')}
                />
              )}
              {chatType !== 'text' && (
                <img
                  src={messageIcon}
                  alt=""
                  className="cursor-pointer"
                  onClick={() => handleChatTypeChange('text')}
                />
              )}
            </>
          )}
        </div>
        <div
          className={`w-full mx-auto flex flex-col flex-1 min-h-0 overflow-hidden z-[1]`}
        >
          <MessageList
            messageList={messageList}
            botInfo={botInfo}
            isDataLoading={isDataLoading}
            botNameColor={botNameColor}
            handleSendMessage={handleRecomendClick}
            chatType={chatType}
            vmsInteractionCmpRef={vmsInteractionCmpRef}
          />
        </div>
      </div>
      <ChatSide botInfo={botInfo} />
      <ChatInput
        handleSendMessage={handleRecomendClick}
        botInfo={botInfo}
        stopAnswer={stopAnswer}
      />
      {chatType === 'vms' && (
        <div className={styles.vms_container}>
          {showVmsPermissionTip && (
            <div className={styles.avatar_permission_tip_wrapper}>
              <div className={styles.avatar_permission_tip}>
                <span>{t('chatPage.chatWindow.virtualVoicePermission')}</span>
                <a
                  href="javascript:void(0)"
                  onClick={() => {
                    vmsInteractionCmpRef?.current?.player?.resume();
                    setShowVmsPermissionTip(false);
                  }}
                >
                  {t('chatPage.chatWindow.virtualAuthorization')}
                </a>
              </div>
            </div>
          )}
          <div className={styles.vms_container_inner}>
            <div
              style={{
                width: '380px',
                height: '100%',
                zIndex: 10,
                position: 'absolute',
                right: '-150px',
              }}
            >
              <Spin
                spinning={loadingVms}
                tip={t('chatPage.chatWindow.virtualLoading') + '...'}
                className="mt-[100px] color-[#275EFF]"
              >
                <div></div>
              </Spin>
            </div>
            {/* {showResetOperation && <div>虚拟人已离开，是否恢复</div>} */}
            <VmsInteractionCmp
              ref={vmsInteractionCmpRef}
              notAllowedPlayCallback={() => {
                setShowVmsPermissionTip(true);
              }}
              playerResumeCallback={() => {
                setShowVmsPermissionTip(false);
              }}
              avatarDom={document.getElementById('avatarDom') as HTMLDivElement}
              styles={{
                width: '380px',
                height: '100%',
                zIndex: 10,
                position: 'absolute',
                right: '-150px',
              }}
              loadingStatusChange={setLoadingVms}
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default ChatPage;
