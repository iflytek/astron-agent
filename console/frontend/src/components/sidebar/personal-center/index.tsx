import React from 'react';
import { FC, useState, useCallback, useMemo } from 'react';
import { Input, message, Modal } from 'antd';
import styles from './index.module.scss';
import useUserStore from '@/store/user-store';
import user from '@/assets/imgs/personal-center/user.svg';
import copy from '@/assets/imgs/personal-center/copy.svg';
import edit from '@/assets/imgs/personal-center/edit.svg';
import yes from '@/assets/imgs/personal-center/yes.svg';
import no from '@/assets/imgs/personal-center/no.svg';
import act from '@/assets/imgs/personal-center/act.png';
import fire from '@/assets/imgs/personal-center/fire.png';
import empty from '@/assets/imgs/common/empty-gray.png';
import { copyText } from '@/utils/spark-utils';
import UploadAvatar from '@/components/upload-avatar';
import { PostChatItem, FavoriteEntry } from '@/types/chat';
import { updateUserInfo } from '@/services/spark-common';
import { useNavigate } from 'react-router-dom';
import { cancelFavorite } from '@/services/agent-square';
import { deleteChatList } from '@/services/chat';
import { useTranslation } from 'react-i18next';
import eventBus from '@/utils/event-bus';

interface PersonalCenterProps {
  open: boolean;
  onCancel: () => void;
  mixedChatList: PostChatItem[];
  favoriteBotList: FavoriteEntry[];
  onRefreshData: () => void;
  onRefreshRecentData: () => void;
  onRefreshFavoriteData: () => void;
}

// 类型定义
interface TabItem {
  tab: string;
}

// 常量定义
const tabs: TabItem[] = [{ tab: '最近使用' }, { tab: '我的收藏' }];

// 内部组件定义

// 空状态组件
const EmptyState: FC = React.memo(() => (
  <div className={styles.emptyBox}>
    <img src={empty} alt="" />
  </div>
));

// Tab 头部组件
const TabsHeader: FC<{
  tabs: TabItem[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}> = React.memo(({ tabs, activeIndex, onTabChange }) => {
  const handleTabClick = useCallback(
    (index: number) => {
      onTabChange(index);
    },
    [onTabChange]
  );

  return (
    <div className={styles.tabs}>
      {tabs.map((item, index) => (
        <div
          key={index}
          onClick={() => handleTabClick(index)}
          className={activeIndex === index ? styles.tabActive : styles.tab}
        >
          {item.tab}
        </div>
      ))}
    </div>
  );
});

// 最近使用列表组件
const RecentUsedList: FC<{
  recentList: PostChatItem[];
  onItemClick: (item: PostChatItem) => void;
  onDeleteClick: (item: PostChatItem, e: any, isRecentTab: boolean) => void;
}> = React.memo(({ recentList, onItemClick, onDeleteClick }) => {
  const memoizedList = useMemo(() => recentList, [recentList]);

  const handleItemClick = useCallback(
    (item: PostChatItem) => {
      onItemClick(item);
    },
    [onItemClick]
  );

  const handleDeleteClick = useCallback(
    (item: PostChatItem, e: React.MouseEvent) => {
      onDeleteClick(item, e, true);
    },
    [onDeleteClick]
  );

  if (memoizedList?.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      {memoizedList?.length > 0 &&
        memoizedList.map((item, index) => (
          <div
            key={`recent-${index}`}
            onClick={() => handleItemClick(item)}
            className={styles.itemBox}
          >
            <div className={styles.itemHead}>
              <img className={styles.headImg} src={item.botAvatar} alt="" />
              <div title={item.botName} className={styles.headTitle}>
                {item.botName}
              </div>
            </div>
            <div title={item.botDesc} className={styles.headDesc}>
              {item.botDesc}
            </div>
            <div className={styles.itemInfo}>
              <img className={styles.actImg} src={act} alt="" />
              <div className={styles.actText}>
                {item.creatorName || '@讯飞星火'}
              </div>
              <img className={styles.fireImg} src={fire} alt="" />
              <div className={styles.fireText}>{item.hotNum || 0}</div>
            </div>
            <div
              onClick={e => handleDeleteClick(item, e)}
              className={styles.delete}
            />
          </div>
        ))}
    </>
  );
});

// 我的收藏列表组件
const FavoritesList: FC<{
  collectList: FavoriteEntry[];
  onItemClick: (item: any) => void;
  onDeleteClick: (item: FavoriteEntry, e: any, isRecentTab: boolean) => void;
}> = React.memo(({ collectList, onItemClick, onDeleteClick }) => {
  const memoizedList = useMemo(() => collectList, [collectList]);

  const handleItemClick = useCallback(
    (item: FavoriteEntry) => {
      onItemClick(item.bot);
    },
    [onItemClick]
  );

  const handleDeleteClick = useCallback(
    (item: FavoriteEntry, e: React.MouseEvent) => {
      onDeleteClick(item, e, false);
    },
    [onDeleteClick]
  );

  if (memoizedList?.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      {memoizedList?.length > 0 &&
        memoizedList.map((item, index) => (
          <div
            key={`favorite-${index}`}
            onClick={() => handleItemClick(item)}
            className={styles.itemBox}
          >
            <div className={styles.itemHead}>
              <img className={styles.headImg} src={item.bot.avatar} alt="" />
              <div title={item.bot.botName} className={styles.headTitle}>
                {item.bot.botName}
              </div>
            </div>
            <div title={item.bot.botDesc} className={styles.headDesc}>
              {item.bot.botDesc}
            </div>
            <div className={styles.itemInfo}>
              <img className={styles.actImg} src={act} alt="" />
              <div className={styles.actText}>
                {item.bot.creatorName || '@讯飞星火'}
              </div>
              <img className={styles.fireImg} src={fire} alt="" />
              <div className={styles.fireText}>{item.bot.hotNum || 0}</div>
            </div>
            <div
              onClick={e => handleDeleteClick(item, e)}
              className={styles.delete}
            />
          </div>
        ))}
    </>
  );
});

const PersonalCenterHeader: FC<{
  showInput: boolean;
  setShowInput: (showInput: boolean) => void;
}> = ({ showInput, setShowInput }) => {
  const { t } = useTranslation();
  const userInfo = useUserStore((state: any) => state.user);
  const [infoName, setInfoName] = useState(userInfo.nickname || userInfo.login);

  return (
    <div className={styles.header}>
      <div>
        <UploadAvatar
          coverUrl={userInfo.avatar}
          setCoverUrl={url => {
            updateUserInfo({
              nickname: infoName,
              avatar: url,
            }).then(res => {
              message.success(t('commonModal.update.success'));
              useUserStore.setState({
                user: {
                  ...userInfo,
                  avatar: url,
                },
              });
            });
          }}
          flag={true}
        />
      </div>
      <div>
        <div className={styles.flexTitle}>
          {showInput ? (
            <>
              <Input
                value={infoName}
                placeholder="请输入昵称"
                showCount
                maxLength={20}
                onChange={e => {
                  setInfoName(e.target.value);
                }}
              />
              <img
                onClick={() => {
                  setShowInput(false);
                }}
                className={styles.noBotton}
                src={no}
                alt=""
              />
              <img
                onClick={() => {
                  updateUserInfo({
                    nickname: infoName,
                    avatar: userInfo.avatar,
                  })
                    .then(res => {
                      message.success(t('commonModal.update.success'));
                      // 更新用户信息
                      useUserStore.setState({
                        user: {
                          ...userInfo,
                          nickname: infoName,
                        },
                      });
                      setShowInput(false);
                    })
                    .catch(err => {
                      message.error(err.msg);
                    });
                }}
                className={styles.yesBotton}
                src={yes}
                alt=""
              />
            </>
          ) : (
            <>
              <div
                title={userInfo.nickname || userInfo.login}
                className={styles.header_name}
              >
                {userInfo.nickname || userInfo.login}
              </div>
              <img
                onClick={() => {
                  setShowInput(true);
                  setInfoName(userInfo.nickname || userInfo.login);
                }}
                className={styles.editBotton}
                src={edit}
                alt=""
              />
            </>
          )}
        </div>
        <div className={styles.flexInfo}>
          <img src={user} alt="" />
          <div className={styles.uid}>用户名：{userInfo?.username}</div>
          <img
            onClick={() => {
              copyText({
                text: `${userInfo?.username}`,
                successText: '复制成功',
              });
            }}
            className={styles.copy}
            src={copy}
            alt=""
          />
        </div>
      </div>
    </div>
  );
};

const PersonalCenter: FC<PersonalCenterProps> = ({
  open,
  onCancel,
  mixedChatList,
  favoriteBotList,
  onRefreshData,
  onRefreshRecentData,
  onRefreshFavoriteData,
}) => {
  const [showInput, setShowInput] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemIdToDelete, setItemIdToDelete] = useState<number | null>(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleToChat = useCallback((item: any) => {
    navigate(`/chat/${item.botId}`);
  }, []);

  const handleDeleteFavorite = useCallback((botId: number) => {
    cancelFavorite({
      botId,
    }).then(res => {
      message.success(t('commonModal.agentDelete.success'));
      eventBus.emit('favoriteChange', botId);
      onRefreshFavoriteData?.();
    });
  }, []);

  const handleDeleteChat = useCallback((chatListId: number) => {
    deleteChatList({
      chatListId,
    })
      .then((res: any) => {
        setDeleteOpen(false);
        message.success(t('commonModal.agentDelete.success'));
        // Refresh data after successful deletion
        onRefreshRecentData?.();
      })
      .catch((err: any) => {
        console.log(err);
        setDeleteOpen(false);
        message.error(t('commonModal.agentDelete.failed'));
      });
  }, []);

  const handleDelete = useCallback(
    (item: any, e: React.MouseEvent, isRecentTab: boolean) => {
      e.stopPropagation();
      console.log('item', item);
      // Extract ID based on tab type
      const itemId = isRecentTab ? item?.id : item?.bot?.botId;
      setItemIdToDelete(itemId);
      setDeleteOpen(true);
    },
    []
  );

  const handleDeleteChatConfirm = useCallback(() => {
    if (!itemIdToDelete) return;

    if (activeIndex === 0) {
      handleDeleteChat(itemIdToDelete);
    } else {
      handleDeleteFavorite(itemIdToDelete);
    }
    setDeleteOpen(false);
    setItemIdToDelete(null);
  }, [
    activeIndex,
    itemIdToDelete,
    handleDeleteChat,
    handleDeleteFavorite,
    onRefreshData,
  ]);

  const handleTabChange = useCallback(
    (index: number) => {
      setActiveIndex(index);
      // Refresh specific data based on the active tab
      if (index === 0) {
        // Recent Used tab - refresh recent chat data
        onRefreshRecentData();
      } else if (index === 1) {
        // My Favorites tab - refresh favorite data
        onRefreshFavoriteData();
      }
    },
    [onRefreshRecentData, onRefreshFavoriteData]
  );

  return (
    <Modal
      wrapClassName={styles.open_source_modal}
      width={837}
      open={open}
      centered
      onCancel={onCancel}
      destroyOnClose
      maskClosable={false}
      footer={null}
    >
      <div className={styles.modal_content}>
        <PersonalCenterHeader
          showInput={showInput}
          setShowInput={setShowInput}
        />
        <div className={styles.content}>
          <TabsHeader
            tabs={tabs}
            activeIndex={activeIndex}
            onTabChange={handleTabChange}
          />
          <div className={styles.contentBox}>
            <Modal
              open={deleteOpen}
              onCancel={() => {
                setDeleteOpen(false);
                setItemIdToDelete(null);
              }}
              closeIcon={null}
              wrapClassName={styles.delete_mode}
              centered
              width={352}
              maskClosable={false}
              onOk={handleDeleteChatConfirm}
            >
              <div className={styles.delete_mode_title}>
                <img
                  src={require('@/assets/imgs/sidebar/warning.svg')}
                  alt=""
                />
                <span>
                  {activeIndex === 0
                    ? '确定移除该智能体对话？'
                    : '确定移除该收藏？'}
                </span>
              </div>
            </Modal>
            {activeIndex === 0 && (
              <RecentUsedList
                recentList={mixedChatList}
                onItemClick={handleToChat}
                onDeleteClick={handleDelete}
              />
            )}
            {activeIndex === 1 && (
              <FavoritesList
                collectList={favoriteBotList}
                onItemClick={handleToChat}
                onDeleteClick={handleDelete}
              />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PersonalCenter;
