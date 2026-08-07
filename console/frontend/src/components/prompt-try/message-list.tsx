import { ReactElement, useEffect, useRef, MutableRefObject } from 'react';
import type { MessageListType, BotInfoType } from '@/types/chat';
import errorIcon from '@/assets/imgs/sparkImg/errorIcon.svg';
import userImg from '@/assets/svgs/user-logo.svg';
import LoadingAnimate from '@/constants/lottie-react/chat-loading.json';
import useUserStore from '@/store/user-store';
import Lottie from 'lottie-react';
import DeepThinkProgress from '@/pages/chat-page/components/deep-think-progress';
import MarkdownRender from '@/components/markdown-render';
import useBindEvents from '@/hooks/search-event-bind';
import SourceInfoBox from '@/pages/chat-page/components/source-info-box';
import UseToolsInfo from '@/pages/chat-page/components/use-tools-info';
import { useTranslation } from 'react-i18next';
import eventBus from '@/utils/event-bus';

const MessageList = (props: {
  messageList: MessageListType[];
  botInfo: BotInfoType;
  coverUrl: string;
  inputExample: string[];
  isLoading: boolean;
  isCompleted: boolean;
  stopAnswer: () => void;
  showHeaderAndRecommend?: boolean;
}): ReactElement => {
  const {
    messageList,
    botInfo,
    coverUrl,
    inputExample,
    isLoading,
    isCompleted,
    stopAnswer,
    showHeaderAndRecommend = true,
  } = props;
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const { user } = useUserStore();
  const lastClickedQA: MutableRefObject<MessageListType | null> =
    useRef<MessageListType | null>(null);
  const { bindTagClickEvent } = useBindEvents(lastClickedQA);
  const { t } = useTranslation();

  useEffect((): void => {
    bindTagClickEvent();
    scrollAnchorRef.current?.scrollIntoView();
  }, [messageList.length]);
  const handleSendMessage = (text?: string) => {
    if (!text) return;
    eventBus.emit('promptTry.inputExample', text);
  };

  const renderHeaderAndRecommend = (): ReactElement => (
    <div className="w-full mx-auto flex text-[#43436b] mt-3">
      <div className="bg-[#f8faff] rounded-[0px_18px_18px_18px] p-[14px_19px] w-full border border-[#d3dbf8]">
        <div className="m-3 p-5 rounded-18px bg-[#f2f5fe] flex items-center">
          <img
            src={coverUrl || errorIcon}
            className="w-12 h-12 rounded-full object-cover mr-3"
          />
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-normal text-[#43436b]">
              {botInfo?.botName || t('configBase.promptTry.hereIsTheAgentName')}
            </h2>
            <div className="text-sm font-normal text-[#43436b]">
              {botInfo?.botDesc ||
                t('configBase.promptTry.hereIsTheAgentIntroduction')}
            </div>
          </div>
        </div>
        {inputExample?.some((ex: string) => ex) && (
          <div className="m-3 p-5 rounded-18px bg-[#ffffff] flex justify-between items-center">
            <div className="flex flex-wrap gap-2">
              {inputExample?.map((ex: string, index: number) => {
                return ex ? (
                  <div
                    key={index}
                    className="bg-[#eef1fd] rounded-md px-3 py-1 cursor-pointer text-[#9295bf] hover:text-[#257eff] text-xs h-8 leading-6"
                    onClick={() => {
                      handleSendMessage(ex);
                    }}
                  >
                    {ex.length > 15 ? ex.slice(0, 15) + '...' : ex}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  //渲染问题

  const renderReq = (item: MessageListType): ReactElement => {
    return (
      <div
        key={item.id}
        className="text-white py-2.5 flex leading-[1.4] h-auto"
      >
        <img
          src={user?.avatar || userImg}
          alt=""
          className="h-6 w-6 rounded-full mr-4"
        />
        <div className="bg-[#257eff] rounded-[0px_18px_18px_18px] p-[14px_19px] relative max-w-full">
          <div className="text-base font-normal text-white leading-[25px] whitespace-pre-wrap w-auto break-words">
            {item.message}
          </div>
        </div>
      </div>
    );
  };

  //渲染回复
  const renderResp = (item: MessageListType): ReactElement => {
    const showLoading = !item.sid && isLoading;
    return (
      <div
        className="mt-[14px] w-[inherit] max-w-full"
        onClick={() => (lastClickedQA.current = item)}
      >
        <div className="flex w-full mb-3">
          <img
            src={coverUrl || errorIcon}
            alt="avatar"
            className="w-6 h-6 rounded-full mr-4 object-cover"
          />
          <div className="bg-[#f8faff] rounded-[0px_18px_18px_18px] p-[14px_19px] w-auto text-[#333333] max-w-full min-w-[10%] border border-[#d3dbf8]">
            {showLoading && (
              <div className="flex items-center w-auto max-w-xs mb-2">
                <Lottie
                  animationData={LoadingAnimate}
                  loop={true}
                  className="w-[30px] h-[30px] mr-1"
                  rendererSettings={{
                    preserveAspectRatio: 'xMidYMid slice',
                  }}
                />
                <span className="text-sm text-gray-500">
                  {t('configBase.promptTry.answerInProgress')}
                </span>
              </div>
            )}

            {/* 使用工具 */}
            <UseToolsInfo
              allToolsList={item?.tools || []}
              loading={showLoading}
            />
            {/* 思考链 */}
            <DeepThinkProgress answerItem={item} />
            {/* 回答内容 */}
            <MarkdownRender content={item.message} isSending={showLoading} />
          </div>
        </div>
        {!isLoading && !isCompleted && !item.sid && (
          <div
            className="text-sm text-[#9194bf] bg-white cursor-pointer ml-10 hover:text-[#257eff] mb-3"
            onClick={() => {
              stopAnswer();
            }}
          >
            {t('configBase.promptTry.stopOutput')}
          </div>
        )}
        {item?.sid && <SourceInfoBox traceSource={item?.traceSource} />}
      </div>
    );
  };

  return (
    <div className="relative w-full flex flex-col flex-1 overflow-hidden ">
      <div
        className="w-full flex flex-col-reverse items-center overflow-y-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        <div ref={scrollAnchorRef} />
        {messageList
          .slice()
          .reverse()
          .map((item: MessageListType, index: number) => {
            return (
              <div className="w-full" key={index}>
                {item?.reqType === 'USER' && renderReq(item)}
                {item?.reqType === 'BOT' && renderResp(item)}
              </div>
            );
          })}
        {showHeaderAndRecommend && renderHeaderAndRecommend()}
      </div>
    </div>
  );
};

export default MessageList;
