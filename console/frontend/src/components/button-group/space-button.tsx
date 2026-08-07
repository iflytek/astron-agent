import React from 'react';
import { Button, Tooltip } from 'antd';
import classNames from 'classnames';
import {
  hasModulePermission,
  checkResourceRestrictions,
} from '@/permissions/utils';
import type { ButtonConfig, UserRole } from './types';
import { ModuleType, OperationType, PermissionFailureBehavior } from './types';
import styles from './space-button.module.scss';
import { useUserStoreHook } from '@/hooks/use-user-store';
import { useTranslation } from 'react-i18next';
// SpaceButton 组件属性接口
export interface SpaceButtonProps {
  // 按钮配置
  config: ButtonConfig;

  // 用户角色信息（用于权限控制）
  userRole?: UserRole;

  // 自定义样式
  className?: string;
  style?: React.CSSProperties;

  // 大小
  size?: 'large' | 'middle' | 'small';

  // 点击事件处理
  onClick?: (key: string, event: React.MouseEvent) => void;

  // 是否在按钮组中（影响样式）
  inGroup?: boolean;

  // 默认权限失败行为（如果按钮配置中没有指定）
  defaultPermissionFailureBehavior?: PermissionFailureBehavior;
}

const SpaceButton: React.FC<SpaceButtonProps> = ({
  config,
  userRole,
  className,
  style,
  size,
  onClick,
  inGroup = false,
  defaultPermissionFailureBehavior = PermissionFailureBehavior.DISABLE,
}) => {
  const { permissionParams } = useUserStoreHook();
  const { t } = useTranslation();
  // 优先使用传入的 userRole，如果没有则从 userStore 获取
  let effectiveUserRole: UserRole | undefined = userRole;
  if (!effectiveUserRole) {
    effectiveUserRole = permissionParams;
  }

  const {
    key,
    text,
    icon,
    type = 'default',
    size: configSize,
    disabled = false,
    tooltip,
    danger = false,
    loading = false,
    permission,
    visible,
  } = config;
  // 检查按钮权限
  const checkButtonPermission = (): boolean => {
    if (!permission || !effectiveUserRole) {
      return true; // 没有权限配置或用户角色，默认有权限
    }

    // 自定义权限检查函数
    if (permission.customCheck) {
      return permission.customCheck(effectiveUserRole);
    }

    // 模块权限检查
    if (permission.module && permission.operation) {
      const hasPermission = hasModulePermission(
        effectiveUserRole,
        permission.module,
        permission.operation
      );

      if (!hasPermission) {
        return false;
      }

      // 资源权限检查
      if (permission.resourceOwnerId && permission.currentUserId) {
        return checkResourceRestrictions(
          effectiveUserRole,
          permission.module,
          permission.resourceOwnerId,
          permission.currentUserId
        );
      }
    }

    return true;
  };

  // 检查按钮是否可见
  const checkButtonVisible = (): boolean => {
    if (visible === undefined) {
      return true; // 默认可见
    }

    if (typeof visible === 'boolean') {
      return visible;
    }

    if (typeof visible === 'function' && effectiveUserRole) {
      return visible(effectiveUserRole);
    }

    return true;
  };

  // 权限检查结果
  const hasPermission = checkButtonPermission();
  const isVisible = checkButtonVisible();

  // 如果不可见，直接返回null
  if (!isVisible) {
    return null;
  }

  // 获取权限失败行为（优先使用按钮配置，然后使用默认配置）
  const failureBehavior =
    permission?.failureBehavior || defaultPermissionFailureBehavior;

  // 如果没有权限，根据失败行为决定处理方式
  if (!hasPermission) {
    // 如果配置为隐藏，返回null
    if (failureBehavior === PermissionFailureBehavior.HIDE) {
      return null;
    }

    // 如果配置为禁用，继续渲染但设置为禁用状态
    // 这种情况下，disabled 会在后面的逻辑中设置为 true
  }

  // 计算最终的 disabled 状态
  const isDisabled =
    disabled ||
    loading ||
    (!hasPermission && failureBehavior === PermissionFailureBehavior.DISABLE);

  // 处理按钮点击事件
  const handleClick = (event: React.MouseEvent) => {
    if (isDisabled) return;

    // 优先使用按钮配置中的onClick
    if (config.onClick) {
      config.onClick(key, event);
    } else if (onClick) {
      onClick(key, event);
    }
  };

  // 计算按钮样式类名
  const buttonClassName = classNames(
    styles.spaceButton,
    inGroup && styles.inGroup,
    !inGroup && styles.standalone,
    !!icon && styles.withIcon,
    loading && styles.loading,
    danger && styles.danger,
    type && styles[`ant-btn-${type}`],
    styles[`size-${configSize || size || 'middle'}`],
    type === 'primary' && styles.addMemberBtn,
    className
  );
  // 翻译按钮文本（如果文本包含 '.' 且不是纯数字，则认为是 i18n key）
  const getButtonText = (text: string) => {
    if (!text) return '';
    // 如果包含 '.' 且不是 IP 地址或数字，则认为是 i18n key
    if (text.includes('.') && !/^\d+\.\d+/.test(text)) {
      return t(text);
    }
    return text;
  };

  // 创建按钮元素
  const button = (
    <Button
      key={key}
      type={type}
      icon={icon}
      disabled={isDisabled}
      danger={danger}
      loading={loading}
      onClick={handleClick}
      className={buttonClassName}
      style={style}
    >
      {getButtonText(text)}
    </Button>
  );

  // 如果有tooltip，包装在Tooltip中
  if (tooltip) {
    return (
      <Tooltip
        title={tooltip}
        placement="top"
        overlayClassName={styles.tooltip}
        mouseEnterDelay={0.3}
        mouseLeaveDelay={0.1}
      >
        {button}
      </Tooltip>
    );
  }

  return button;
};

export default SpaceButton;
