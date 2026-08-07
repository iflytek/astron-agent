import React, { useState } from 'react';
import classNames from 'classnames';
import { hasModulePermission } from '@/permissions/utils';
import {
  SpaceType,
  RoleType,
  ModuleType,
  OperationType,
} from '@/types/permission';
import styles from './index.module.scss';

import { useUserStoreHook } from '@/hooks/use-user-store';

// 用户角色接口
interface UserRole {
  spaceType: SpaceType;
  roleType: RoleType;
}

// 权限配置接口
interface PermissionConfig {
  // 模块权限检查
  module?: ModuleType;
  operation?: OperationType;

  // 自定义权限检查函数
  customCheck?: (userRole: UserRole) => boolean;
}

export interface TabOption {
  key: string;
  label: string;
  content?: React.ReactNode;
  permission?: PermissionConfig;
  visible?: boolean | ((userRole: UserRole) => boolean);
}

interface SpaceTabProps {
  options: TabOption[];
  activeKey?: string;
  onChange?: (key: string) => void;
  showContent?: boolean; // 是否显示面板内容
  className?: string;
  children?: React.ReactNode; // 右侧插槽内容
  tabContent?: React.ReactNode; // 下方展示容器内容
  userRole?: UserRole; // 添加用户角色属性
}

const SpaceTab: React.FC<SpaceTabProps> = ({
  options,
  activeKey: externalActiveKey,
  onChange,
  showContent = false,
  className,
  children,
  tabContent,
  userRole,
}) => {
  const { permissionParams } = useUserStoreHook();

  // 优先使用传入的 userRole，如果没有则从 userStore 获取
  let effectiveUserRole: UserRole | undefined = userRole;
  if (!effectiveUserRole) {
    const storeUserRole = permissionParams;
    if (storeUserRole) {
      effectiveUserRole = {
        spaceType: storeUserRole.spaceType,
        roleType: storeUserRole.roleType,
      };
    }
  }

  const [internalActiveKey, setInternalActiveKey] = useState(
    options[0]?.key || ''
  );

  // 使用外部传入的activeKey或内部状态
  const activeKey =
    externalActiveKey !== undefined ? externalActiveKey : internalActiveKey;

  // 检查选项权限
  const checkTabPermission = (option: TabOption): boolean => {
    if (!option.permission || !effectiveUserRole) {
      return true; // 没有权限配置或用户角色，默认有权限
    }

    // 自定义权限检查函数
    if (option.permission.customCheck) {
      return option.permission.customCheck(effectiveUserRole);
    }

    // 模块权限检查
    if (option.permission.module && option.permission.operation) {
      return hasModulePermission(
        effectiveUserRole,
        option.permission.module,
        option.permission.operation
      );
    }

    return true;
  };

  // 检查选项是否可见
  const checkTabVisible = (option: TabOption): boolean => {
    if (option.visible === undefined) {
      return true; // 默认可见
    }

    if (typeof option.visible === 'boolean') {
      return option.visible;
    }

    if (typeof option.visible === 'function' && effectiveUserRole) {
      return option.visible(effectiveUserRole);
    }

    return true;
  };

  const handleTabClick = (key: string): void => {
    if (externalActiveKey === undefined) {
      setInternalActiveKey(key);
    }
    onChange?.(key);
  };

  // 过滤掉没有权限或不可见的选项
  const filteredOptions = options.filter(
    option => checkTabPermission(option) && checkTabVisible(option)
  );

  const activeTab = filteredOptions.find(option => option.key === activeKey);
  const activeContent = activeTab?.content;

  // 如果没有可显示的选项，返回null
  if (filteredOptions.length === 0) {
    return null;
  }

  return (
    <div className={classNames(styles.spaceTab, className)}>
      {/* 上部分：左右布局 */}
      <div className={styles.tabHeader}>
        <div className={styles.tabList}>
          {filteredOptions.map(option => (
            <div
              key={option.key}
              className={classNames(
                styles.tabItem,
                option.key === activeKey && styles.active
              )}
              onClick={() => handleTabClick(option.key)}
            >
              <span className={styles.tabLabel}>{option.label}</span>
            </div>
          ))}
        </div>

        {children && <div className={styles.tabActions}>{children}</div>}
      </div>

      {/* 下部分：展示容器 */}
      {tabContent && <div className={styles.tabContent}>{tabContent}</div>}

      {/* 兼容原有的showContent模式 */}
      {showContent && activeContent && (
        <div className={styles.tabContent}>{activeContent}</div>
      )}
    </div>
  );
};

export default SpaceTab;
