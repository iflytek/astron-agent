import { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import classNames from 'classnames';
import { Tooltip } from 'antd';
import { enterpriseMenuItems, PAGE_TITLES } from '../config';
import styles from './index.module.scss';
import useEnterpriseStore from '@/store/enterprise-store';

export default function EnterpriseSpaceLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeKey, setActiveKey] = useState('');
  const {
    info: { avatarUrl, name, officerName, roleTypeText, serviceType },
  } = useEnterpriseStore();
  const [avatar, setAvatar] = useState(avatarUrl);

  // 根据当前路径设置激活的菜单项
  useEffect(() => {
    const currentPath = location.pathname;
    const activeItem = enterpriseMenuItems.find(item =>
      currentPath.includes(item.key)
    );
    if (activeItem) {
      setActiveKey(activeItem.key);
    }
  }, [location.pathname]);

  useEffect(() => {
    setAvatar(avatarUrl);
    console.log(avatarUrl, '=========== avatarUrl ============');
  }, [avatarUrl]);

  // 处理菜单点击
  const handleMenuClick = (item: (typeof enterpriseMenuItems)[0]) => {
    setActiveKey(item.key);
    navigate(item.path);
  };

  return (
    <div className={styles.enterpriseSpaceLayout}>
      {/* 左侧菜单 */}
      <div className={styles.sidebar}>
        {/* 头部标题 */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.avatar}>
              <img src={avatar} alt="企业空间头像" />
            </div>
            <div className={styles.title}>
              <Tooltip title={name}>{name}</Tooltip>
            </div>
            <div className={styles.roleTag}>{roleTypeText}</div>
          </div>
        </div>

        {/* 菜单列表 */}
        <div className={styles.menuList}>
          {enterpriseMenuItems.map(item => (
            <div
              key={item.key}
              className={classNames(
                styles.menuItem,
                activeKey === item.key && styles.active
              )}
              onClick={() => handleMenuClick(item)}
            >
              <item.icon className={styles.icon} />
              <span className={styles.text}>{item.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧内容区域 */}
      <div className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
