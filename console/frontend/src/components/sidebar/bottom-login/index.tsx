import React, { ReactElement, useState, useEffect } from 'react';
import loginAvatar from '@/assets/imgs/sidebar/avator.png';
import navDropDown from '@/assets/imgs/sidebar/icon_nav_dropdown.png';
import useUserStore from '@/store/user-store';
import { parseCurrentUserFromToken } from '@/config/casdoor';
import { handleLoginRedirect } from '@/utils/auth';
import ControlModal from '../control-modal';
import OrderTypeDisplay from '../order-type-display';
import { Popover } from 'antd';
import styles from './index.module.scss';

interface User {
  nickname?: string;
  login?: string;
  avatar?: string;
  uid?: string;
}

interface BottomLoginProps {
  isCollapsed: boolean;
  isPersonCenterOpen: boolean;
  setIsPersonCenterOpen: (visible: boolean) => void;
}

// Extracted components to reduce complexity
interface UserSectionProps {
  user?: User;
  isCollapsed: boolean;
  internalShowModal: boolean;
  handleAvatarClick: (e: React.MouseEvent) => void;
  OrderTypeComponent?: ReactElement;
}

const UserSection: React.FC<UserSectionProps> = ({
  user,
  isCollapsed,
  internalShowModal,
  handleAvatarClick,
  OrderTypeComponent,
}) => {
  return (
    <>
      <img
        src={getUserAvatar(user)}
        className="w-7 h-7 cursor-pointer rounded-full"
        alt=""
        onClick={handleAvatarClick}
      />

      {!isCollapsed && (
        <>
          <div className="ml-2.5 cursor-pointer flex items-center relative flex-1 min-w-0">
            <span
              className="text-ellipsis overflow-hidden text-sm text-[#333333]"
              title={getUserDisplayName(user)}
            >
              {getUserDisplayName(user)}
            </span>

            <div className="relative">
              <img
                src={navDropDown}
                className={`
                  w-4 h-4 ml-2 transition-transform duration-300
                  ${internalShowModal ? 'rotate-180' : ''}
                `}
                alt=""
              />
            </div>
          </div>

          {OrderTypeComponent}
        </>
      )}
    </>
  );
};

interface LoginButtonProps {
  loginText: string;
  onLoginClick?: () => void;
}

const LoginButton: React.FC<LoginButtonProps> = ({
  loginText,
  onLoginClick,
}) => (
  <div
    className="flex-1 text-center ml-[-10px] cursor-pointer hover:opacity-70 transition-opacity"
    onClick={onLoginClick}
  >
    {loginText}
  </div>
);

// Helper functions to reduce complexity
const getUserDisplayName = (user?: User): string => {
  const tokenUser = parseCurrentUserFromToken();
  return user?.nickname || user?.login || tokenUser?.nickname || '';
};

const getUserAvatar = (user?: User): string => {
  const tokenUser = parseCurrentUserFromToken();
  return user?.avatar || tokenUser?.avatar || loginAvatar;
};

const BottomLogin = ({
  isCollapsed,
  isPersonCenterOpen,
  setIsPersonCenterOpen,
}: BottomLoginProps): ReactElement => {
  const [internalShowModal, setInternalShowModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { user } = useUserStore();

  // 检查认证状态
  useEffect(() => {
    const checkAuth = (): void => {
      const token = localStorage.getItem('accessToken');
      setIsAuthenticated(Boolean(token));
    };

    checkAuth();

    // 监听storage变化来实时更新认证状态
    const handleStorageChange = (): void => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);

    // 也可以设置定时器定期检查
    const interval = window.setInterval(checkAuth, 5000);

    return (): void => {
      window.removeEventListener('storage', handleStorageChange);
      window.clearInterval(interval);
    };
  }, []);

  // 优先使用实际认证状态，fallback到传入的props
  const isLogin = isAuthenticated;

  // 登出处理函数
  const handleLogout = async (): Promise<void> => {
    try {
      setIsAuthenticated(false);
      setInternalShowModal(false);
    } finally {
      handleLogout();
    }
  };

  const handleBottomLogin = (e: React.MouseEvent): void => {
    e.stopPropagation();

    if (!isLogin) {
      handleLoginRedirect();
      return;
    }

    // Toggle modal for authenticated users
    const newShowState = !internalShowModal;
    setInternalShowModal(newShowState);
  };

  const handleAvatarClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (!isLogin) {
      handleLoginRedirect();
    }
  };

  return (
    <div className="mt-6 flex flex-col gap-2.5 pt-4 border-t border-[#E2E8FF]">
      <Popover
        content={
          <ControlModal
            onClose={() => {
              setInternalShowModal(false);
            }}
            isPersonCenterOpen={isPersonCenterOpen}
            setIsPersonCenterOpen={setIsPersonCenterOpen}
          />
        }
        placement="top"
        title={null}
        arrow={false}
        trigger="click"
        forceRender={true}
        open={isLogin && internalShowModal}
        overlayClassName={styles.control_modal_popover}
        onOpenChange={visible => {
          setInternalShowModal(visible);
        }}
      >
        <div className={styles.bottomLogin} onClick={handleBottomLogin}>
          {isLogin ? (
            <>
              <img
                src={user?.avatar || loginAvatar}
                className="w-[28px] h-[28px] cursor-pointer rounded-full"
                alt=""
                onClick={() => {
                  if (isLogin) return false;
                  handleLoginRedirect();
                }}
              />
              {!isCollapsed && (
                <div className="flex items-center flex-1 overflow-hidden">
                  <div className="ml-2.5 cursor-pointer flex items-center relative flex-1 min-w-0">
                    <span
                      className=" text-overflow text-[14px] text-[#333333] flex-1"
                      title={user?.nickname}
                    >
                      {user?.nickname}
                    </span>

                    <div className="relative">
                      <img
                        src={navDropDown}
                        className={`w-4 h-4 ml-2 ${styles['rotate-arrow']} ${
                          internalShowModal ? styles.up : ''
                        }`}
                        alt=""
                      />
                    </div>
                  </div>

                  {/* 升级入口 */}
                  <OrderTypeDisplay />
                </div>
              )}
            </>
          ) : (
            <div className={styles.login_btn} onClick={handleLoginRedirect}>
              点击登录
            </div>
          )}
        </div>
      </Popover>
    </div>
  );
};

export default BottomLogin;
