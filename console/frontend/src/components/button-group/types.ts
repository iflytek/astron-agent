import React from 'react';
import {
  SpaceType,
  RoleType,
  ModuleType,
  OperationType,
} from '@/types/permission';

// 权限失败时的行为枚举
export enum PermissionFailureBehavior {
  HIDE = 'hide', // 隐藏按钮（默认行为）
  DISABLE = 'disable', // 禁用按钮但仍显示
}

// 用户角色接口
export interface UserRole {
  spaceType: SpaceType;
  roleType: RoleType;
}

// 权限配置接口
export interface PermissionConfig {
  // 模块权限检查
  module?: ModuleType;
  operation?: OperationType;

  // 资源权限检查
  resourceOwnerId?: string;
  currentUserId?: string;

  // 自定义权限检查函数
  customCheck?: (userRole: UserRole) => boolean;

  // 权限失败时的行为
  failureBehavior?: PermissionFailureBehavior;
}

// 按钮配置接口
export interface ButtonConfig {
  key: string;
  text: string;
  icon?: React.ReactNode;
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  size?: 'large' | 'middle' | 'small';
  disabled?: boolean;
  tooltip?: string;
  danger?: boolean;
  loading?: boolean;
  onClick?: (key: string, event: React.MouseEvent) => void;

  // 权限控制配置
  permission?: PermissionConfig;

  // 显示条件
  visible?: boolean | ((userRole: UserRole) => boolean);
}

// 组件属性接口
export interface ButtonGroupProps {
  // 按钮配置列表
  buttons: ButtonConfig[];

  // 用户角色信息
  userRole?: UserRole;

  // 样式配置
  className?: string;
  size?: 'large' | 'middle' | 'small';

  // 统一的点击事件处理（可选，单个按钮的onClick优先级更高）
  onButtonClick?: (buttonKey: string, event: React.MouseEvent) => void;

  // 自定义样式
  style?: React.CSSProperties;

  // 是否垂直排列
  vertical?: boolean;

  // 是否显示分割线
  split?: boolean;

  // 全局权限失败行为（默认为隐藏）
  defaultPermissionFailureBehavior?: PermissionFailureBehavior;
}

// 按钮点击事件类型
export type ButtonClickHandler = (
  buttonKey: string,
  event: React.MouseEvent
) => void;

// 权限检查函数类型
export type PermissionChecker = (userRole: UserRole) => boolean;

// 可见性检查函数类型
export type VisibilityChecker = boolean | ((userRole: UserRole) => boolean);

// 导出常用的枚举
export {
  SpaceType,
  RoleType,
  ModuleType,
  OperationType,
} from '@/types/permission';
