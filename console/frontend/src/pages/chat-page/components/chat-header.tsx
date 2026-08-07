import { ReactElement, useState } from 'react';
import { Skeleton, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { BotInfoType } from '@/types/chat';
import { collectBot, cancelFavorite } from '@/services/agent-square';
import backIcon from '@/assets/imgs/chat/back.svg';
import authorIcon from '@/assets/svgs/author.svg';
import collectIcon from '@/assets/svgs/collect.svg';
import collectHoverIcon from '@/assets/svgs/collect-hover.svg';
import chatCollectIcon from '@/assets/svgs/collected.svg';
import shareIcon from '@/assets/svgs/share.svg';
import shareHoverIcon from '@/assets/svgs/hover-share.svg';
import { useNavigate } from 'react-router-dom';
import useChatStore from '@/store/chat-store';
import { handleShare } from '@/utils';

const ChatHeader = (props: {
  botInfo: BotInfoType;
  setBotInfo: (botInfo: Partial<BotInfoType>) => void;
  isDataLoading: boolean;
}): ReactElement => {
  const { botInfo, setBotInfo, isDataLoading } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [collectHover, setCollectHover] = useState<boolean>(false);
  const [shareHover, setShareHover] = useState<boolean>(false);
  const controllerRef = useChatStore(state => state.controllerRef); //sse请求ref

  // 返回首页
  const handleBack = (): void => {
    controllerRef?.abort();
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  // 收藏/取消收藏
  const handleFavoriteOperation = (): void => {
    const isCurrentlyFavorite = botInfo.isFavorite === 1;
    if (!isCurrentlyFavorite) {
      // 添加收藏
      collectBot({
        botId: botInfo.botId,
      })
        .then(() => {
          message.success(t('home.collectionSuccess'));
          setBotInfo({
            ...botInfo,
            isFavorite: 1,
          });
        })
        .catch(err => {
          message.error(err?.msg || '收藏失败，请稍后再试~');
        });
    } else {
      // 取消收藏
      cancelFavorite({
        botId: botInfo.botId,
      })
        .then(() => {
          message.success(t('home.cancelCollectionSuccess'));
          setBotInfo({
            ...botInfo,
            isFavorite: 0,
          });
        })
        .catch(err => {
          message.error(err?.msg || '取消收藏失败，请稍后再试~');
        });
    }
  };

  //分享智能体
  const handleShareAgent = async (): Promise<void> => {
    await handleShare(botInfo.botName, botInfo.botId, t);
  };

  //收藏icon
  const getCollectIcon = (): string => {
    if (botInfo.isFavorite === 1) {
      return chatCollectIcon;
    }
    return collectHover ? collectHoverIcon : collectIcon;
  };

  //分享icon
  const getShareIcon = (): string => {
    return shareHover ? shareHoverIcon : shareIcon;
  };

  //收藏按钮样式
  const collectButtonClass = `cursor-pointer flex items-center justify-center w-[84px] h-9 border rounded-[18px] transition-all duration-200 ${
    collectHover
      ? 'text-[#6356EA] border-[#6356EA]'
      : 'text-gray-600 border-[#e4eaff] hover:text-[#6356EA] hover:border-[#6356EA]'
  }`;

  //分享按钮样式
  const shareButtonClass = `cursor-pointer flex items-center justify-center w-[84px] h-9 border rounded-[18px] transition-all duration-200 ${
    shareHover
      ? 'text-[#6356EA] border-[#6356EA]'
      : 'text-gray-600 border-[#e4eaff] hover:text-[#6356EA] hover:border-[#6356EA]'
  }`;

  // 渲染左侧区域内容
  const renderLeftContent = () => {
    if (isDataLoading) {
      return (
        <div className="flex items-center">
          <Skeleton.Avatar
            active
            size={48}
            className="mr-4"
            style={{ borderRadius: 12 }}
          />
          <div className="flex flex-col gap-1">
            <Skeleton.Input
              active
              size="small"
              style={{ width: 120, height: 20 }}
            />
            <div className="flex items-center">
              <Skeleton.Input
                active
                size="small"
                style={{ width: 80, height: 16 }}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <img
          src={botInfo.avatar}
          alt={botInfo.botName}
          className="w-12 h-12 mr-4 rounded-xl object-cover"
        />
        <div className="flex flex-col">
          <div className="text-base font-medium text-black mb-1">
            {botInfo.botName}
          </div>
          <div className="flex items-center">
            <img src={authorIcon} alt="" className="w-3.5 h-3.5 mr-2" />
            <span className="text-sm font-normal text-[#7f7f7f]">
              {botInfo.creatorNickname}
            </span>
          </div>
        </div>
      </>
    );
  };

  // 渲染右侧按钮
  const renderRightContent = () => {
    if (isDataLoading) {
      return (
        <div className="flex items-center gap-3">
          <Skeleton.Button
            active
            size="small"
            style={{ width: 84, height: 36, borderRadius: 18 }}
          />
          <Skeleton.Button
            active
            size="small"
            style={{ width: 84, height: 36, borderRadius: 18 }}
          />
        </div>
      );
    }

    return (
      <>
        {/* 收藏按钮 */}
        <div
          className={collectButtonClass}
          onClick={handleFavoriteOperation}
          onMouseEnter={() => setCollectHover(true)}
          onMouseLeave={() => setCollectHover(false)}
        >
          <img src={getCollectIcon()} alt="" className="w-4 h-4 mr-2" />
          <span>{t('chatPage.chatHeader.collect')}</span>
        </div>

        {/* 分享按钮 */}
        <div
          className={shareButtonClass}
          onClick={handleShareAgent}
          onMouseEnter={() => setShareHover(true)}
          onMouseLeave={() => setShareHover(false)}
        >
          <img src={getShareIcon()} alt="" className="w-4 h-4 mr-2" />
          <span>{t('chatPage.chatHeader.share')}</span>
        </div>
      </>
    );
  };

  return (
    <div className="w-full h-20 bg-white flex justify-between items-center z-10 fixed rounded-b-[18px] shadow-sm">
      {/* 左侧区域 */}
      <div className="flex items-center justify-start h-full">
        <img
          src={backIcon}
          onClick={handleBack}
          className="ml-6 mr-6 cursor-pointer hover:opacity-70 transition-opacity"
        />
        {renderLeftContent()}
      </div>

      {/* 右侧区域 */}
      <div className="flex items-center mr-3 text-sm gap-3">
        {renderRightContent()}
      </div>
    </div>
  );
};

export default ChatHeader;
