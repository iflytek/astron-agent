import React, { useState, useEffect, useRef, useMemo, FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Popover, Modal, message } from 'antd';
import { menuList } from '@/constants';
import useUserStore from '@/store/user-store';
import eventBus from '@/utils/event-bus';
import { jumpToLogin } from '@/utils/http';
import { checkUserInfo } from '@/services/spark-common';
import useChat from '@/hooks/use-chat';
import { useEnterprise } from '@/hooks/use-enterprise';
import useSpaceStore from '@/store/space-store';
import { useTranslation } from 'react-i18next';
import { getCookie } from '@/utils';
import classNames from 'classnames';
import { PersonSpace } from '@/components/space/person-space';
import SpaceModal from '@/components/space/space-modal';
import { useSpaceType } from '@/hooks/use-space-type';
import useEnterpriseStore from '@/store/enterprise-store';
import { MEMBER_ROLE, OWNER_ROLE } from '@/pages/space/config';

// Assets
import spaceMore from '@/assets/imgs/space/space-more.svg';
import createSpaceImg from '@/assets/imgs/space/createSpaceImg.png';
import enterpriseShareCreate from '@/assets/imgs/space/enterpriseShareCreate.png';
import enterpriseSpaceJoin from '@/assets/imgs/space/enterpriseSpaceJoin.png';
import arrowRight from '@/assets/imgs/space/arrowRight.png';
import { deleteChatList } from '@/services/chat';
import { PostChatItem } from '@/types/chat';

// Constants
const getAllMessage = async (params: any) => {
  return { messages: [] };
};

const getUserAuth = async () => {
  return {};
};

// 企业空间空菜单组件类型定义
interface EnterpriseSpaceEmptyMenuProps {
  isCollapsed?: boolean;
}

// EnterpriseSpaceEmptyMenu Component
const EnterpriseSpaceEmptyMenu: FC<EnterpriseSpaceEmptyMenuProps> = ({
  isCollapsed = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { handleTeamSwitch } = useSpaceType(navigate);
  const { joinedEnterpriseList, spaceStatistics } = useEnterpriseStore();
  const { enterpriseId } = useSpaceStore();

  const curEnterprise = useMemo(() => {
    return joinedEnterpriseList.find(item => item.id == enterpriseId);
  }, [enterpriseId, joinedEnterpriseList]);

  const isOwner = useMemo(() => {
    return curEnterprise && curEnterprise?.role == Number(OWNER_ROLE);
  }, [curEnterprise]);

  const isMember = useMemo(() => {
    return curEnterprise && curEnterprise?.role == Number(MEMBER_ROLE);
  }, [curEnterprise]);

  const isShowJoinMenu = useMemo(() => {
    return spaceStatistics.total > 0;
  }, [spaceStatistics]);

  const ownerMenu = useMemo(() => {
    return (
      <div
        className={`flex-shrink-0 h-[300px] flex flex-col justify-center items-center py-1.5 px-9 gap-2 rounded-[10px] bg-[#f0f5ff] relative cursor-pointer ${
          isCollapsed ? 'h-[100px] bg-none p-0' : ''
        }`}
        onClick={() => setShowCreateModal(true)}
      >
        <div
          className={`${isCollapsed ? 'w-[25px] h-[25px]' : 'w-[94px] h-[94px]'} flex items-center justify-center`}
        >
          <img
            src={createSpaceImg}
            alt={t('space.createSpace')}
            className="w-full h-auto"
          />
        </div>
        {!isCollapsed && (
          <div className="w-[162px] h-[43px] flex flex-col justify-center items-center py-2.5 px-5 rounded-[10px] bg-white font-medium text-sm leading-6 text-center text-[#1f1f1f] cursor-pointer hover:text-[#6356EA]">
            {t('space.createSpace')}
          </div>
        )}
        {isCollapsed && (
          <div className="w-auto rounded-lg bg-white shadow-[0px_0px_20px_0px_rgba(0,18,70,0.08)] text-[#333333] whitespace-nowrap py-3 px-5 absolute -top-1.5 left-[54px] z-[3] hidden group-hover:block">
            {t('space.createSpace')}
          </div>
        )}
      </div>
    );
  }, [showCreateModal, setShowCreateModal, handleTeamSwitch, isCollapsed, t]);

  const otherMenuList = useMemo(
    () => [
      {
        key: 'create',
        icon: enterpriseShareCreate,
        desc: t('space.createTeamSharedSpace'),
        btnText: t('space.createNewSpace'),
        onClick: () => {
          setShowCreateModal(true);
        },
      },
      ...(isShowJoinMenu
        ? [
            {
              key: 'join',
              icon: enterpriseSpaceJoin,
              desc: t('space.joinTeamSpace'),
              btnText: t('space.enterSpaceManagement'),
              onClick: () => {
                navigate(`/enterprise/${enterpriseId}/space`);
              },
            },
          ]
        : []),
    ],
    [setShowCreateModal, navigate, enterpriseId, isShowJoinMenu, t]
  );

  const otherMenu = useMemo(() => {
    return (
      <div
        className={`flex-shrink-0 p-3.5 flex flex-col gap-3.5 rounded-[10px] bg-[#f0f5ff] ${isCollapsed ? 'bg-none h-[100px] p-0' : ''}`}
      >
        {otherMenuList.map(item => {
          return (
            <div
              className={`group p-2.5 flex flex-col items-center justify-center gap-1 rounded-[10px] bg-white shadow-[0px_4px_10px_0px_rgba(0,18,70,0.08)] font-medium text-sm leading-6 text-center cursor-pointer relative ${
                isCollapsed ? 'p-0 bg-none shadow-none' : ''
              }`}
              key={item.key}
              onClick={item.onClick}
            >
              <img
                className={`${isCollapsed ? 'w-[25px] h-[25px]' : 'w-[72px] h-[72px]'}`}
                src={item.icon}
                alt=""
              />
              {!isCollapsed && (
                <>
                  <div className="text-[#7f7f7f]">{item.desc}</div>
                  <div className="w-full flex items-center justify-center gap-1 text-[#1f1f1f] group-hover:text-[#6356EA]">
                    {item.btnText}
                    <img
                      className="w-[19px] h-[19px]"
                      src={arrowRight}
                      alt=""
                    />
                  </div>
                </>
              )}
              {isCollapsed && (
                <div className="w-auto rounded-lg bg-white shadow-[0px_0px_20px_0px_rgba(0,18,70,0.08)] text-[#333333] whitespace-nowrap py-3 px-5 absolute -top-1.5 left-[54px] z-[3] hidden group-hover:block">
                  {item.btnText}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [otherMenuList, isCollapsed]);

  return (
    <>
      {isOwner ? ownerMenu : otherMenu}
      <SpaceModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
        }}
        onSuccess={() => {
          handleTeamSwitch(undefined, { isJump: true });
        }}
      />
    </>
  );
};

// 最近使用列表组件Props接口
interface RecentListProps {
  isCollapsed: boolean;
  showRecent: boolean;
  setShowRecent: (show: boolean) => void;
  mixedChatList: any[];
  handleNavigateToChat: (item: any) => void;
  handleDeleteChat: (item: any, e: any) => void;
}

const RecentList: FC<RecentListProps> = ({
  isCollapsed,
  showRecent,
  setShowRecent,
  mixedChatList,
  handleNavigateToChat,
  handleDeleteChat,
}) => {
  const { t } = useTranslation();

  if (isCollapsed) return null;

  return (
    <div className="flex flex-col pt-4 pb-1 mt-1 flex-shrink-0 overflow-hidden border-t border-[#E7E7F0]">
      {/* 最近使用标题 */}
      <div
        className="flex items-center justify-between cursor-pointer px-3 py-[10px] pr-2.5 flex-shrink-0 mb-1"
        onClick={() => setShowRecent(!showRecent)}
      >
        <span
          className="text-xs font-medium text-black/50"
          style={{
            fontFamily: 'PingFang SC',
            fontSize: '12px',
            color: '#676773',
          }}
        >
          {t('sidebar.recentlyUsed')}
        </span>
        <img
          src={require('@/assets/svgs/arrow-top.svg')}
          alt=""
          className={`transition-transform duration-300 ${
            showRecent ? '' : 'rotate-180'
          }`}
        />
      </div>

      {/* 最近使用列表容器 - 固定padding，避免动画 */}
      <div className="w-full pr-2.5 overflow-hidden">
        {/* 内部滚动区域 - 只做高度动画 */}
        <div
          className={`flex flex-col w-full overflow-x-hidden transition-[height,max-height] duration-300 ease-out  ${
            showRecent
              ? 'min-h-[50px] max-h-[300px] overflow-y-auto scrollbar-hide'
              : 'h-0 max-h-0 overflow-hidden'
          }`}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* 内容区域 - 固定间距 */}
          <div
            className={`flex flex-col gap-0.5 w-full ${showRecent ? '' : 'opacity-0'}`}
          >
            {showRecent &&
              mixedChatList?.length > 0 &&
              mixedChatList.map((item: any) => (
                <div
                  key={item.botId}
                  className="group flex items-center cursor-pointer px-3 py-1.5 rounded hover:bg-[rgba(39,94,255,0.05)] flex-shrink-0 w-full"
                  onClick={() => handleNavigateToChat(item)}
                >
                  <img
                    src={item?.botAvatar}
                    alt=""
                    className="w-[18px] h-[18px] rounded-full flex-shrink-0"
                  />
                  <span className="ml-2 text-sm text-[#333] flex-1 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                    {item?.botName}
                  </span>
                  <div
                    className="hidden group-hover:block w-2 h-2 bg-[url('@/assets/imgs/sidebar/close.svg')] bg-no-repeat bg-center hover:bg-[url('@/assets/imgs/sidebar/close-hover.svg')] flex-shrink-0 ml-1"
                    onClick={e => handleDeleteChat(item, e)}
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface MenuListProps {
  isCollapsed: boolean;
  mixedChatList: PostChatItem[];
  onRefreshData?: () => void;
}

// Helper functions for MenuList component
const useMenuListHelpers = (
  t: any,
  user: any,
  setMobile: any,
  checkNeedCreateTeamFn: any,
  setMenuActiveKey: any,
  setIsShowSpacePopover: any,
  spaceButtonRef: any,
  handleToChat: any,
  setChatListId: any,
  setDeleteOpen: any,
  chatListId: string,
  onRefreshData?: () => void
) => {
  // 动态设置 Popover 的最大高度
  const updatePopoverMaxHeight = () => {
    if (spaceButtonRef.current) {
      const rect = spaceButtonRef.current.getBoundingClientRect();
      const topPosition = rect.top;
      document.documentElement.style.setProperty(
        '--popover-top',
        `${topPosition}px`
      );
    }
  };

  const handleShowSpacePopover = () => {
    updatePopoverMaxHeight(); // 更新 CSS 变量
    setIsShowSpacePopover((prev: boolean) => !prev);
  };

  // Chat and favorites management
  const handleNavigateToChat = (item: any) => {
    handleToChat(item?.botId);
  };

  const handleDeleteChat = (item: any, e: any) => {
    e.stopPropagation();
    setChatListId(item?.id);
    setDeleteOpen(true);
  };

  const handleDeleteChatConfirm = () => {
    deleteChatList({
      chatListId: Number(chatListId),
    })
      .then((res: any) => {
        setDeleteOpen(false);
        message.success(t('commonModal.agentDelete.success'));
        // Refresh data after successful deletion
        if (onRefreshData) {
          onRefreshData();
        }
      })
      .catch((err: any) => {
        console.log(err);
        setDeleteOpen(false);
        message.error(t('commonModal.agentDelete.failed'));
      });
  };

  // Get messages/notifications
  const getMessages = async (queryMessageType: string) => {
    const queryParam = {
      typeId: queryMessageType || 0,
      page: 1,
      pageSize: 100,
    };
    await getAllMessage(queryParam);
  };

  // Check login
  const checkLogin = () => {
    // checkUserInfo().then((res: any) => {
    //   checkNeedCreateTeamFn();
    //   setMobile(res?.mobile);
    // });
    checkNeedCreateTeamFn();
    setMobile(user?.mobile);
    getUserAuth();
  };

  // Effects handlers
  const initializeActiveMenu = (location: any) => {
    const path = window.location.pathname.replace(
      '/application-development',
      ''
    );
    menuList.map(item => {
      item.tabs.map(tab => {
        if (path.includes(tab.activeTab)) {
          setMenuActiveKey(tab.activeTab);
        }
      });
    });
  };

  const initializeApp = () => {
    checkLogin();
    getMessages('0');
  };

  return {
    handleShowSpacePopover,
    handleNavigateToChat,
    handleDeleteChat,
    handleDeleteChatConfirm,
    initializeActiveMenu,
    initializeApp,
  };
};

// Helper function for dynamic menu list generation
const useDynamicMenuList = (
  isTeamSpaceEmpty: boolean,
  spaceType: any,
  spaceId: any,
  spaceName: any,
  t: any
) => {
  return useMemo(() => {
    // 无团队空间展示 智能体广场及插件广场
    if (isTeamSpaceEmpty) {
      return menuList.slice(0, 1);
    }

    return menuList.map(menuGroup => ({
      ...menuGroup,
      tabs: menuGroup.tabs.map(tab => {
        // 如果是 '我的智能体' 这个 tab，根据 spaceType 和 spaceId 动态设置 subTitle
        if (tab.activeTab === 'agent') {
          let dynamicSubTitle = t('sidebar.myAgents'); // 默认值
          if ((spaceType === 'personal' && spaceId) || spaceType === 'team') {
            dynamicSubTitle = t('sidebar.myAgentsManagement');
          }
          return {
            ...tab,
            subTitle: dynamicSubTitle,
          };
        }
        return tab;
      }),
    }));
  }, [spaceType, spaceId, spaceName, isTeamSpaceEmpty, t]);
};

// Space Button Component
const SpaceButton: FC<{
  isCollapsed: boolean;
  spaceName: string;
  spaceType: string;
  spaceAvatar: string;
  spaceButtonRef: React.RefObject<HTMLDivElement>;
  isShowSpacePopover: boolean;
  handleShowSpacePopover: () => void;
  setIsShowSpacePopover: (show: boolean) => void;
  t: any;
}> = ({
  isCollapsed,
  spaceName,
  spaceType,
  spaceAvatar,
  spaceButtonRef,
  isShowSpacePopover,
  handleShowSpacePopover,
  setIsShowSpacePopover,
  t,
}) => {
  const [isShowAddSpace, setIsShowAddSpace] = useState(false);

  return (
    <>
      <Popover
        content={<PersonSpace setIsShowAddSpace={setIsShowAddSpace} />}
        title={null}
        trigger="click"
        open={isShowSpacePopover}
        placement="rightTop"
        overlayClassName="[&_.ant-popover-inner]:ml-0 [&_.ant-popover-inner]:p-4 [&_.ant-popover-inner]:rounded-2xl [&_.ant-popover-inner]:max-h-[calc(100vh-var(--popover-top,100px)-20px)] [&_.ant-popover-inner-content]:max-h-[calc(100vh-var(--popover-top,100px)-44px)] [&_.ant-input-affix-wrapper]:py-1.5 [&_.ant-input-affix-wrapper]:px-[7px]"
        arrow={false}
        getPopupContainer={triggerNode =>
          triggerNode.parentElement || document.body
        }
        autoAdjustOverflow={false}
        onOpenChange={visible => {
          if (!visible) {
            setIsShowSpacePopover(false);
          }
        }}
      >
        <div
          className="text-center whitespace-nowrap text-xs py-1.5 px-3 flex cursor-pointer justify-between text-[#1f1f1f] rounded-lg relative before:content-[''] before:absolute before:-top-2 before:left-0 before:w-full before:h-px before:bg-[#E7E7F0] hover:text-[#6356EA] hover:bg-[#f5f8ff] group"
          ref={spaceButtonRef}
          onClick={handleShowSpacePopover}
        >
          <div className="w-full flex items-center justify-between gap-2 text-base font-normal leading-5">
            <div className="flex">
              {isCollapsed && (
                <img
                  src={
                    spaceAvatar ||
                    require('@/assets/imgs/space/contacts-fill.svg')
                  }
                  alt="space"
                  className="w-[18px] h-[18px] rounded-[2px] mr-2"
                />
              )}

              {!isCollapsed && (
                <div
                  className="min-w-[110px] max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap text-left"
                  style={{
                    fontFamily: 'PingFang SC',
                    fontSize: '12px',
                    color: '#676773',
                  }}
                >
                  {spaceName ||
                    (spaceType === 'personal'
                      ? t('sidebar.personalSpace')
                      : t('sidebar.teamSpace'))}
                </div>
              )}
            </div>

            {!isCollapsed && (
              <img src={spaceMore} alt="more" className="w-[18px] h-[18px]" />
            )}
            {isCollapsed && (
              <div className="w-auto rounded-lg bg-white shadow-[0px_0px_20px_0px_rgba(0,18,70,0.08)] text-[#333333] whitespace-nowrap py-3 px-5 absolute -top-1.5 left-[54px] z-[3] hidden group-hover:block">
                {spaceName ||
                  (spaceType === 'personal'
                    ? t('sidebar.personalSpace')
                    : t('sidebar.teamSpace'))}
              </div>
            )}
          </div>
        </div>
      </Popover>
      <SpaceModal
        open={isShowAddSpace}
        mode="create"
        onClose={() => setIsShowAddSpace(false)}
        onSuccess={() => {
          eventBus.emit('spaceList');
        }}
      />
    </>
  );
};

// Menu Tab Component
const MenuTab: FC<{
  tab: any;
  isCollapsed: boolean;
  menuActiveKey: string;
  hoverTab: string;
  setMenuActiveKey: (key: string) => void;
  setHoverTab: (key: string) => void;
  navigate: any;
}> = ({
  tab,
  isCollapsed,
  menuActiveKey,
  hoverTab,
  setMenuActiveKey,
  setHoverTab,
  navigate,
}) => {
  const isActAndHvr = useMemo(
    () => [menuActiveKey, hoverTab].includes(tab.activeTab),
    [menuActiveKey, hoverTab, tab.activeTab]
  );
  const menuTabStyle = useMemo(
    () => ({
      background: isActAndHvr ? 'rgba(99, 86, 234, 0.08)' : '#fff',
      fontWeight: isActAndHvr ? '500' : 'normal',
      color: isActAndHvr ? '#6356ea' : '#262626',
      fontFamily: 'PingFang SC',
    }),
    [isActAndHvr]
  );

  return (
    <div
      key={`${tab?.subTitle}`}
      className={`group relative flex items-center px-3 py-[10px] gap-2 cursor-pointer rounded-[10px]`}
      style={menuTabStyle}
      onClick={() => {
        setMenuActiveKey(tab.activeTab);
        navigate(tab.path);
      }}
      onMouseEnter={() => setHoverTab(tab.activeTab)}
      onMouseLeave={() => setHoverTab('')}
    >
      <img
        src={isActAndHvr ? tab.iconAct : tab.icon}
        className="w-[18px] h-[18px] flex-shrink-0"
        alt=""
      />
      {!isCollapsed && <span className="relative text-sm">{tab.subTitle}</span>}
      {isCollapsed && (
        <div
          className={`rounded-lg bg-white shadow-[0px_0px_20px_0px_rgba(0,18,70,0.08)] text-[#333333] whitespace-nowrap py-3 px-5 absolute -top-1.5 left-[54px] z-[3] ${
            hoverTab === tab.activeTab ? 'block' : 'hidden'
          }`}
        >
          {tab.subTitle}
        </div>
      )}
    </div>
  );
};

// Delete Modal Component
const DeleteModal: FC<{
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  handleDeleteChatConfirm: () => void;
  t: any;
}> = ({ deleteOpen, setDeleteOpen, handleDeleteChatConfirm, t }) => (
  <Modal
    open={deleteOpen}
    onCancel={() => setDeleteOpen(false)}
    closeIcon={null}
    className="[&_.ant-modal-content]:!py-8 [&_.ant-modal-content]:!px-8 [&_.ant-modal-content]:!pb-6 [&_.ant-btn]:mt-3 [&_.ant-btn]:w-[63px] [&_.ant-btn]:h-8"
    centered
    width={352}
    maskClosable={false}
    onOk={handleDeleteChatConfirm}
  >
    <div className="text-black/85 flex items-center gap-2.5 text-base font-medium leading-[1.4] overflow-hidden">
      <img
        src={require('@/assets/imgs/sidebar/warning.svg')}
        alt=""
        className="w-[22px] h-[22px]"
      />
      <span>{t('sidebar.confirmRemove')}</span>
    </div>
  </Modal>
);

const MenuList: FC<MenuListProps> = ({
  isCollapsed,
  mixedChatList,
  onRefreshData,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // User store
  const user = useUserStore((state: any) => state.user);
  const setMobile = useUserStore((state: any) => state.setMobile);

  // Space store
  const {
    isShowSpacePopover,
    spaceName,
    spaceType,
    spaceId,
    spaceAvatar,
    setIsShowSpacePopover,
  } = useSpaceStore();

  // Enterprise hooks
  const { checkNeedCreateTeamFn, isTeamSpaceEmpty } = useEnterprise();

  // Local state - using local state instead of recoil
  const [hoverTab, setHoverTab] = useState('');
  const [menuActiveKey, setMenuActiveKey] = useState('');
  const [showRecent, setShowRecent] = useState(true);
  const [chatListId, setChatListId] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Refs
  const spaceButtonRef = useRef<HTMLDivElement | null>(null);

  // Custom hooks
  const { handleToChat } = useChat();

  // Helper functions
  const {
    handleShowSpacePopover,
    handleNavigateToChat,
    handleDeleteChat,
    handleDeleteChatConfirm,
    initializeActiveMenu,
    initializeApp,
  } = useMenuListHelpers(
    t,
    user,
    setMobile,
    checkNeedCreateTeamFn,
    setMenuActiveKey,
    setIsShowSpacePopover,
    spaceButtonRef,
    handleToChat,
    setChatListId,
    setDeleteOpen,
    chatListId,
    onRefreshData
  );

  // Dynamic menu list
  const getDynamicMenuList = useDynamicMenuList(
    isTeamSpaceEmpty,
    spaceType,
    spaceId,
    spaceName,
    t
  );

  // Effects
  useEffect(() => {
    initializeActiveMenu(location);
  }, [location]);

  useEffect(() => {
    initializeApp();
  }, []);

  return (
    <div
      className={`flex flex-col flex-1 mt-6 gap-4 ${
        isCollapsed
          ? 'overflow-visible'
          : isShowSpacePopover
            ? 'overflow-hidden'
            : 'overflow-auto'
      } scroll-bar-hide-UI scrollbar-none`}
    >
      {getDynamicMenuList.map((item, index) => (
        <div
          key={`${index}-${item?.title}`}
          className="text-gray-500 font-medium flex flex-col gap-1"
        >
          {item.title && (
            <SpaceButton
              isCollapsed={isCollapsed}
              spaceName={spaceName}
              spaceType={spaceType}
              spaceAvatar={spaceAvatar}
              spaceButtonRef={spaceButtonRef}
              isShowSpacePopover={isShowSpacePopover}
              handleShowSpacePopover={handleShowSpacePopover}
              setIsShowSpacePopover={setIsShowSpacePopover}
              t={t}
            />
          )}
          {item.tabs.map((tab: any, i) => (
            <MenuTab
              key={`${i}-${tab?.subTitle}`}
              tab={tab}
              isCollapsed={isCollapsed}
              menuActiveKey={menuActiveKey}
              hoverTab={hoverTab}
              setMenuActiveKey={setMenuActiveKey}
              setHoverTab={setHoverTab}
              navigate={navigate}
            />
          ))}
        </div>
      ))}

      {/* 团队下无空间展示空菜单 */}
      {isTeamSpaceEmpty && (
        <EnterpriseSpaceEmptyMenu isCollapsed={isCollapsed} />
      )}

      <RecentList
        isCollapsed={isCollapsed}
        showRecent={showRecent}
        setShowRecent={setShowRecent}
        mixedChatList={mixedChatList}
        handleNavigateToChat={handleNavigateToChat}
        handleDeleteChat={handleDeleteChat}
      />

      <DeleteModal
        deleteOpen={deleteOpen}
        setDeleteOpen={setDeleteOpen}
        handleDeleteChatConfirm={handleDeleteChatConfirm}
        t={t}
      />
    </div>
  );
};

export default MenuList;
