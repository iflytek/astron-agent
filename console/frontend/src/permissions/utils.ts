import {
  SpaceType,
  RoleType,
  ModuleType,
  OperationType,
  RolePermissionConfig,
} from '@/types/permission';
import { PERMISSIONS } from './config';

// ==================== 权限检查工具函数 ====================

/**
 * 获取角色配置
 */
export function getRoleConfig(
  spaceType: SpaceType,
  roleType: RoleType
): RolePermissionConfig | undefined {
  return PERMISSIONS.find(
    config => config.spaceType === spaceType && config.roleType === roleType
  );
}

/**
 * 检查用户是否有特定模块的特定操作权限
 */
export function hasModulePermission(
  userRole: { spaceType: SpaceType; roleType: RoleType },
  module: ModuleType,
  operation: OperationType
): boolean {
  const config = getRoleConfig(userRole.spaceType, userRole.roleType);
  if (!config) return false;

  const modulePermission = config.modulePermissions.find(
    mp => mp.module === module
  );
  if (!modulePermission) return false;
  return modulePermission.operations.includes(operation);
}

/**
 * 获取用户在特定模块的所有权限
 */
export function getModulePermissions(
  userRole: { spaceType: SpaceType; roleType: RoleType },
  module: ModuleType
): OperationType[] {
  const config = getRoleConfig(userRole.spaceType, userRole.roleType);
  if (!config) return [];

  const modulePermission = config.modulePermissions.find(
    mp => mp.module === module
  );
  return modulePermission?.operations || [];
}

/**
 * 获取用户可访问的所有模块
 */
export function getAccessibleModules(userRole: {
  spaceType: SpaceType;
  roleType: RoleType;
}): ModuleType[] {
  const config = getRoleConfig(userRole.spaceType, userRole.roleType);
  if (!config) return [];

  return config.modulePermissions.map(mp => mp.module);
}

/**
 * 检查资源限制
 */
export function checkResourceRestrictions(
  userRole: { spaceType: SpaceType; roleType: RoleType },
  module: ModuleType,
  resourceOwnerId?: string,
  currentUserId?: string
): boolean {
  const config = getRoleConfig(userRole.spaceType, userRole.roleType);
  if (!config) return false;

  const modulePermission = config.modulePermissions.find(
    mp => mp.module === module
  );
  if (!modulePermission?.restrictions) return true;

  // 检查是否只能操作自己的资源
  if (modulePermission.restrictions.ownResourcesOnly) {
    return resourceOwnerId === currentUserId;
  }

  return true;
}
