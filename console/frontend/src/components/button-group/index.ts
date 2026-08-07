// 导出主组件
export { default } from './button-group';

// 导出SpaceButton组件
export { default as SpaceButton } from './space-button';

// 导出所有类型定义
export type {
  ButtonConfig,
  UserRole,
  ButtonGroupProps,
  PermissionConfig,
  ButtonClickHandler,
  PermissionChecker,
  VisibilityChecker,
} from './types';

// 导出权限相关枚举（方便使用）
export {
  SpaceType,
  RoleType,
  ModuleType,
  OperationType,
  PermissionFailureBehavior,
} from './types';
