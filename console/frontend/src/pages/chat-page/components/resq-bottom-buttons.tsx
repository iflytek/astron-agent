import { MessageListType } from '@/types/chat';
import { ReactElement, useEffect, useState } from 'react';
import { copyText, processStringByChunk } from '@/utils';
import copyIcon from '@/assets/imgs/chat/copy.svg';
import { ReactSVG } from 'react-svg';
import { Tooltip } from 'antd';
import AudioAnimate from './audio-animate';
import { useTranslation } from 'react-i18next';
import TtsModule from '@/components/tts-module';
import useChat from '@/hooks/use-chat';
import useVoicePlayStore from '@/store/voice-play-store';
import useBotInfoStore from '@/store/bot-info-store';
import useChatStore from '@/store/chat-store';
import { isPureText } from '@/utils';
import { SDKEvents } from '@/utils/avatar-sdk-web_3.1.2.1002/index.js';
import { message as AntdMessage } from 'antd';

/**
 * 每个回复内容下面的按钮
 */
const ResqBottomButtons = ({
  message,
  isLastMessage,
  chatType,
}: {
  message: MessageListType;
  isLastMessage: boolean;
  chatType: string;
}): ReactElement => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState<boolean>(false); // 是否正在播放音频
  const { handleReAnswer } = useChat();
  const currentPlayingId = useVoicePlayStore(state => state.currentPlayingId);
  const setCurrentPlayingId = useVoicePlayStore(
    state => state.setCurrentPlayingId
  );
  const botInfo = useBotInfoStore(state => state.botInfo); //  智能体信息
  const vmsInteractiveRef = useChatStore(state => state.vmsInteractiveRef);
  const vmsInteractiveRefStatus = useChatStore(
    (state: any) => state.vmsInteractiveRefStatus
  );

  const setVmsInteractiveRefStatus = useChatStore(
    (state: any) => state.setVmsInteractiveRefStatus
  );
  const getVoiceName = () => {
    if (botInfo?.vcnCn) {
      return botInfo?.vcnCn;
    } else {
      if (botInfo?.advancedConfig) {
        try {
          const advancedConfig = JSON.parse(botInfo?.advancedConfig);
          return advancedConfig?.textToSpeech?.vcn_cn;
        } catch (error) {
          return '';
        }
      }
    }
    return 'x4_lingbosong';
  };
  // 播放按钮点击
  const handlePlayAudio = () => {
    const answerInfo = message;
    if (chatType === 'vms') {
      vmsInteractiveRef?.on(SDKEvents.frame_stop, () => {
        setCurrentPlayingId(null);
      });
      if (isPlaying) {
        vmsInteractiveRef?.interrupt();
        setVmsInteractiveRefStatus('init');
        setCurrentPlayingId(null);
      } else {
        if (!isPureText(answerInfo?.message)) {
          return;
        }
        if (vmsInteractiveRefStatus === 'init') {
          setCurrentPlayingId(answerInfo?.id);
          if (answerInfo?.message.length >= 2000) {
            processStringByChunk(answerInfo?.message, 2000, chunk => {
              isPureText(chunk) &&
                vmsInteractiveRef
                  ?.writeText(chunk, {
                    avatar_dispatch: {
                      interactive_mode: 0, //此处默认追加模式
                    },
                  })
                  .then(() => {})
                  .catch((err: any) => {});
            });
          } else {
            vmsInteractiveRef
              ?.writeText(answerInfo?.message)
              .then(() => {})
              .catch((err: any) => {
                // console.error(err);
                // message.error(err?.msg || t('chatPage.chatBottom.feedbackFailed'));
              });
          }
        }
      }
    } else {
      if (message?.message?.length > 8000) {
        AntdMessage.error(t('chatPage.chatBottom.textTooLong'));
        return;
      }
      if (!isPureText(message?.message)) {
        AntdMessage.error(t('chatPage.chatBottom.unSupportRead'));
        return;
      }
      if (isPlaying) {
        setIsPlaying(false);
        setCurrentPlayingId(null);
      } else {
        setIsPlaying(true);
        setCurrentPlayingId(message.id || 0);
      }
    }
  };

  // 监听全局播放ID，更新本地播放状态
  useEffect(() => {
    setIsPlaying(currentPlayingId === message?.id);
  }, [currentPlayingId, message?.id]);

  const playText = message?.reasoning
    ? message?.reasoning + message?.message
    : message?.message;

  return (
    <div className="flex items-center ml-14 w-fit px-2 py-1 h-7">
      <TtsModule
        text={playText}
        language="cn"
        voiceName={getVoiceName()}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
      />
      <Tooltip
        title={t('chatPage.chatBottom.reAnswer')}
        placement="top"
        overlayClassName="black-tooltip"
      >
        {isLastMessage && (
          <div
            onClick={() => handleReAnswer({ requestId: message.reqId || 0 })}
            className="text-sm cursor-pointer mr-3 chat-copy-icon"
          >
            <ReactSVG
              wrapper="span"
              src={
                'https://openres.xfyun.cn/xfyundoc/2025-08-28/ead19985-ae09-4fd0-9c05-d993ec65d7a2/1756369724570/rotate-cw.svg'
              }
            />
          </div>
        )}
      </Tooltip>
      <Tooltip
        title={t('chatPage.chatBottom.copy')}
        placement="top"
        overlayClassName="black-tooltip"
      >
        <div
          onClick={() => copyText({ text: message.message })}
          className="text-sm cursor-pointer mr-3 chat-copy-icon"
        >
          <ReactSVG wrapper="span" src={copyIcon} />
        </div>
      </Tooltip>
      <Tooltip
        title={
          isPlaying
            ? t('chatPage.chatBottom.stopReading')
            : t('chatPage.chatBottom.read')
        }
        placement="top"
        overlayClassName="black-tooltip"
      >
        <div
          onClick={() => handlePlayAudio()}
          className="text-sm cursor-pointer chat-play-icon"
        >
          <AudioAnimate isPlaying={isPlaying} type="play" />
        </div>
      </Tooltip>
    </div>
  );
};

export default ResqBottomButtons;
