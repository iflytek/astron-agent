import React, { ReactElement, useState, useEffect } from 'react';
import loginAvatar from '@/assets/imgs/sidebar/avator.png';
import navDropDown from '@/assets/imgs/sidebar/icon_nav_dropdown.png';
import useUserStore from '@/store/user-store';
import { handleLoginRedirect } from '@/utils/auth';
import ControlModal from '../control-modal';
import OrderTypeDisplay from '../order-type-display';
import { Popover } from 'antd';
import styles from './index.module.scss';

interface BottomLoginProps {
  isCollapsed: boolean;
  isPersonCenterOpen: boolean;
  setIsPersonCenterOpen: (visible: boolean) => void;
}

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
                  if (isLogin) return;
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
