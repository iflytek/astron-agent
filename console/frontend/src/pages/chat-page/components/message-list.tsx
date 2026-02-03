import {
  ReactElement,
  useEffect,
  useRef,
  MutableRefObject,
  useState,
} from 'react';
import type {
  MessageListType,
  BotInfoType,
  Option,
  UploadFileInfo,
} from '@/types/chat';
import recommendIcon from '@/assets/imgs/chat/recommend.svg';
import rightArrowIcon from '@/assets/imgs/chat/right-arrow.svg';
import LoadingAnimate from '@/constants/lottie-react/chat-loading.json';
import { Progress, Skeleton } from 'antd';
import useUserStore from '@/store/user-store';
import useChatStore from '@/store/chat-store';
import Lottie from 'lottie-react';
import DeepThinkProgress from './deep-think-progress';
import MarkdownRender from '@/components/markdown-render';
import useBindEvents from '@/hooks/search-event-bind';
import SourceInfoBox from './source-info-box';
import UseToolsInfo from './use-tools-info';
import WorkflowNodeOptions from './workflow-node-options';
import FilePreview from './file-preview';
import ResqBottomButtons from './resq-bottom-buttons';
import { useTranslation } from 'react-i18next';
import FileGridDisplay from './file-grid-display';
const MessageList = (props: {
  messageList: MessageListType[];
  botInfo: BotInfoType;
  isDataLoading: boolean;
  botNameColor: string;
  handleSendMessage: (params: {
    item: string;
    fileUrl?: string;
    callback?: () => void;
  }) => void;
  chatType: string;
  vmsInteractionCmpRef: any;
}): ReactElement => {
  const {
    messageList,
    botInfo,
    isDataLoading,
    botNameColor,
    handleSendMessage,
    chatType,
    vmsInteractionCmpRef,
  } = props;
  const { t } = useTranslation();
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const answerPercent = useChatStore((state: any) => state.answerPercent); //回答进度条
  const isLoading = useChatStore(state => state.isLoading); //是否正在加载
  const streamId = useChatStore(state => state.streamId); //流式回复id
  const workflowOperation = useChatStore(state => state.workflowOperation); //工作流操作
  const { user } = useUserStore();
  const lastClickedQA: MutableRefObject<MessageListType | null> =
    useRef<MessageListType | null>(null);
  const { bindTagClickEvent } = useBindEvents(lastClickedQA);
  const [previewFile, setPreviewFile] = useState<UploadFileInfo>(); //预览文件
  const [inputExample, setInputExample] = useState<string[]>([]);
  const [prologue, setPrologue] = useState<string>('');
  // 选中的选项状态
  const [selectedOptionId, setSelectedOptionId] = useState<{
    id: number;
    option: { id: string };
  } | null>(null);

  // 处理节点选项点击
  const handleNodeClick = (option: Option, messageId: number) => {
    setSelectedOptionId({ id: messageId, option });
    handleSendMessage({
      item: JSON.stringify(option),
    });
  };

  useEffect((): void => {
    bindTagClickEvent();
    scrollAnchorRef.current?.scrollIntoView();
  }, [messageList.length, streamId]);

  useEffect((): void => {
    let advancedConfig: any = {};
    if (botInfo?.inputExample?.length > 0) {
      setInputExample(
        botInfo.inputExample?.filter(item => item.length > 0)?.slice(0, 3)
      );
    } else {
      try {
        advancedConfig = JSON.parse(botInfo?.advancedConfig || '{}');
        const inputExample = advancedConfig?.prologue?.inputExample;
        setInputExample(
          inputExample?.filter((item: string) => item.length > 0)?.slice(0, 3)
        );
      } catch (error) {
        setInputExample([]);
      }
    }
    setPrologue(
      botInfo.prologue ||
        advancedConfig?.prologue?.prologueText ||
        botInfo.botDesc ||
        ''
    );
  }, [botInfo]);

  //渲染全新开始
  const renderRestart = (): ReactElement => {
    return (
      <div className="flex items-center w-full mx-5 text-[#c4c4c8]">
        <div className="flex-1 h-[1px] bg-[#e3e4e9]" />
        <div className="px-4 py-1.5">{t('chatPage.chatWindow.freshStart')}</div>
        <div className="flex-1 h-[1px] bg-[#e3e4e9]" />
      </div>
    );
  };

  // 渲染Header和推荐内容的函数 - 在column-reverse中需要反序渲染
  const renderHeaderAndRecommend = (): ReactElement => (
    <>
      {(inputExample?.length > 0 || prologue?.length > 0) && (
        <div className="p-6 pb-5 rounded-2xl bg-white/50 mt-8 w-[inherit]">
          <div className="text-lg font-medium text-gray-800 w-full">
            <MarkdownRender content={`👋Hi，${prologue}`} isSending={false} />
          </div>
          {inputExample?.map((item: string, index: number) => (
            <div
              className="h-12 flex items-center mb-2 bg-white border border-[#e4eaff] rounded-xl px-4 cursor-pointer text-sm font-normal transition-all duration-200 ease-in-out hover:border-[#6356EA]"
              key={index}
              onClick={() =>
                handleSendMessage({
                  item: item,
                })
              }
            >
              <img src={recommendIcon} alt="" className="w-[18px] h-[18px]" />
              <span className="flex-1 mx-3 truncate">{item}</span>
              <img
                src={rightArrowIcon}
                alt=""
                className="w-4 h-4 transition-transform duration-300 ease-in-out group-hover:translate-x-1"
              />
            </div>
          ))}
        </div>
      )}

      {chatType === 'text' && (
        <div className="flex flex-col items-center justify-center mt-10 min-h-[116px]">
          {isDataLoading ? (
            <>
              <Skeleton.Avatar active size={88} style={{ borderRadius: 12 }} />
              <Skeleton.Input
                active
                size="small"
                style={{ width: 120, marginTop: 8 }}
              />
            </>
          ) : (
            <>
              <img
                src={botInfo.avatar}
                alt="avatar"
                className="w-[88px] h-[88px] rounded-xl"
              />
              <span
                className={`text-2xl font-[PingFang SC] font-medium mt-2 text-[${botNameColor}] leading-9`}
              >
                {botInfo.botName}
              </span>
            </>
          )}
        </div>
      )}
    </>
  );

  //渲染问题

  const renderReq = (item: MessageListType): ReactElement => {
    return (
      <div
        key={item.id}
        className="max-w-[90%] text-white py-2.5 flex flex-row-reverse leading-[1.4] ml-auto h-auto"
      >
        <img src={user?.avatar} alt="" className="h-9 w-9 rounded-full ml-4" />
        <div className="bg-[#6356EA] rounded-[12px_0px_12px_12px] p-[14px_19px] relative max-w-full">
          <div className="text-base font-normal text-white leading-[25px] whitespace-pre-wrap w-auto break-words">
            {item.message}
          </div>
          {item?.chatFileList && (
            <FileGridDisplay files={item?.chatFileList} autoAdjustCols />
          )}
        </div>
      </div>
    );
  };

  //渲染回复
  const renderResp = (
    item: MessageListType,
    messageIndex: number
  ): ReactElement => {
    const showLoading = !item.sid && (isLoading || !!answerPercent);
    const workflowContent = item?.workflowEventData?.content;
    const messageContent = workflowContent ? workflowContent : item.message;
    const isLastMessage = messageIndex === messageList.length - 1; //是否是最后一条消息
    return (
      <div
        className="mt-[14px] w-[inherit] max-w-full"
        onClick={() => (lastClickedQA.current = item)}
      >
        <div className="flex w-full mb-3">
          <img
            src={botInfo.avatar}
            alt="avatar"
            className="w-9 h-9 rounded-full mr-4 object-cover"
          />
          <div className="bg-white rounded-[0px_12px_12px_12px] p-[14px_19px] w-auto text-[#333333] max-w-full min-w-[10%]">
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
                  {t('chatPage.chatWindow.answeringInProgress')}
                </span>
                {!!answerPercent && (
                  <Progress
                    percent={answerPercent}
                    size="small"
                    strokeColor="#6178FF"
                    className="ml-2 flex-1"
                  />
                )}
              </div>
            )}

            {/* 使用工具 */}
            <UseToolsInfo
              allToolsList={item?.tools || []}
              loading={!isLoading && !!streamId}
            />
            {/* 思考链 */}
            <DeepThinkProgress answerItem={item} />
            {/* 回答内容 */}
            <MarkdownRender
              content={messageContent}
              isSending={!!streamId && !item.sid}
            />
            <WorkflowNodeOptions
              message={item}
              isLastMessage={isLastMessage}
              workflowOperation={workflowOperation}
              selectedOptionId={selectedOptionId}
              onOptionClick={handleNodeClick}
            />
          </div>
        </div>
        {item?.sid && <SourceInfoBox traceSource={item?.traceSource} />}
        {item?.sid && (
          <ResqBottomButtons
            message={item}
            isLastMessage={isLastMessage}
            chatType={chatType}
          />
        )}
      </div>
    );
  };

  return (
    <div
      className={`relative w-full flex flex-col flex-1 overflow-hidden scrollbar-hide  `}
    >
      <div
        className="w-full flex flex-col-reverse items-center overflow-y-auto min-h-0  pl-6"
        style={{
          scrollbarWidth: 'none',
        }}
      >
        <div
          className={`w-full flex flex-col-reverse items-center max-w-[960px] min-h-min scrollbar-hide m-[0_auto] ${
            chatType === 'text' ? 'pr-0' : 'pr-52'
          }`}
        >
          <div ref={scrollAnchorRef} />

          {/* 直接渲染消息列表 */}
          {messageList
            .slice()
            .reverse()
            .map((item: MessageListType, index: number) => {
              const actualIndex = messageList.length - 1 - index; // 计算真实的消息索引
              return (
                <div className="w-[inherit]" key={actualIndex}>
                  {item?.reqType === 'USER' && renderReq(item)}
                  {item?.reqType === 'BOT' && renderResp(item, actualIndex)}
                  {item?.reqType === 'START' && renderRestart()}
                </div>
              );
            })}

          {renderHeaderAndRecommend()}
        </div>
      </div>
      <FilePreview
        file={previewFile || ({} as UploadFileInfo)}
        onClose={() => setPreviewFile({} as UploadFileInfo)}
      />
    </div>
  );
};

export default MessageList;
