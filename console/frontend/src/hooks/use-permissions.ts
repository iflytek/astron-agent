import { useMemo, useCallback, useRef } from 'react';
import {
  SpaceType,
  RoleType,
  ModuleType,
  OperationType,
  RolePermissionConfig,
} from '@/types/permission';
import {
  getRoleConfig,
  hasModulePermission,
  getModulePermissions,
  getAccessibleModules,
  checkResourceRestrictions,
} from '@/permissions/utils';
import useUserStore from '@/store/user-store';

// ==================== 类型定义 ====================

export interface UserRole {
  spaceType: SpaceType;
  roleType: RoleType;
  spaceId?: string;
  userId?: string;
}

export interface PermissionChecks {
  // 模块权限检查
  canView: (module: ModuleType) => boolean;
  canCreate: (module: ModuleType) => boolean;
  canEdit: (module: ModuleType) => boolean;
  canDelete: (module: ModuleType) => boolean;
  canRemoveMembers: (module: ModuleType) => boolean;
  canPublish: (module: ModuleType) => boolean;
  canUse: (module: ModuleType) => boolean;
  canManage: (module: ModuleType) => boolean;

  // 自定义权限检查
  hasModulePermission: (
    module: ModuleType,
    operation: OperationType
  ) => boolean;

  // 资源权限检查
  canEditResource: (module: ModuleType, resourceOwnerId?: string) => boolean;
  canDeleteResource: (module: ModuleType, resourceOwnerId?: string) => boolean;

  // 批量权限检查
  checkMultiplePermissions: (
    checks: Array<{ module: ModuleType; operation: OperationType }>
  ) => Record<string, boolean>;
}

export interface UserPermissionInfo {
  // 基础信息
  userRole: UserRole;
  isAdminLevel: boolean;
  canManageUsers: boolean;

  // 权限信息
  accessibleModules: ModuleType[];
  modulePermissions: Array<{
    module: ModuleType;
    operations: OperationType[];
  }>;

  // 权限检查方法
  checks: PermissionChecks;

  // 设置当前用户ID
  setCurrentUserId: (userId: string) => void;
}

/**
 * 权限管理Hook - 直接从userStore获取用户角色信息
 * @returns 用户权限信息和检查方法
 */
export function usePermissions(): UserPermissionInfo | null {
  const { getUserRole } = useUserStore();
  const userRole = getUserRole();
  const currentUserIdRef = useRef<string | undefined>(userRole?.userId);

  // 获取角色配置
  const roleConfig = useMemo(() => {
    if (!userRole) return null;
    return getRoleConfig(userRole.spaceType, userRole.roleType);
  }, [userRole?.spaceType, userRole?.roleType]);

  // 权限检查方法
  const checks = useMemo((): PermissionChecks => {
    if (!userRole) {
      // 返回所有权限都为false的检查方法
      const noPermission = () => false;
      return {
        canView: noPermission,
        canCreate: noPermission,
        canEdit: noPermission,
        canDelete: noPermission,
        canRemoveMembers: noPermission,
        canPublish: noPermission,
        canUse: noPermission,
        canManage: noPermission,
        hasModulePermission: noPermission,
        canEditResource: noPermission,
        canDeleteResource: noPermission,
        checkMultiplePermissions: () => ({}),
      };
    }

    return {
      // 基础模块权限检查
      canView: (module: ModuleType) =>
        hasModulePermission(userRole, module, OperationType.VIEW),
      canCreate: (module: ModuleType) =>
        hasModulePermission(userRole, module, OperationType.CREATE),
      canEdit: (module: ModuleType) =>
        hasModulePermission(userRole, module, OperationType.EDIT),
      canDelete: (module: ModuleType) =>
        hasModulePermission(userRole, module, OperationType.DELETE),
      canRemoveMembers: (module: ModuleType) =>
        hasModulePermission(userRole, module, OperationType.REMOVE_MEMBERS),
      canPublish: (module: ModuleType) =>
        hasModulePermission(userRole, module, OperationType.PUBLISH),
      canUse: (module: ModuleType) =>
        hasModulePermission(userRole, module, OperationType.USE),
      canManage: (module: ModuleType) =>
        hasModulePermission(userRole, module, OperationType.MANAGE),

      // 自定义权限检查
      hasModulePermission: (module: ModuleType, operation: OperationType) =>
        hasModulePermission(userRole, module, operation),

      // 资源权限检查
      canEditResource: (module: ModuleType, resourceOwnerId?: string) => {
        if (!hasModulePermission(userRole, module, OperationType.EDIT))
          return false;
        return checkResourceRestrictions(
          userRole,
          module,
          resourceOwnerId,
          currentUserIdRef.current
        );
      },
      canDeleteResource: (module: ModuleType, resourceOwnerId?: string) => {
        return checkResourceRestrictions(
          userRole,
          module,
          resourceOwnerId,
          currentUserIdRef.current
        );
      },

      // 批量权限检查
      checkMultiplePermissions: (
        checks: Array<{ module: ModuleType; operation: OperationType }>
      ) => {
        const result: Record<string, boolean> = {};
        checks.forEach(({ module, operation }) => {
          const key = `${module}_${operation}`;
          result[key] = hasModulePermission(userRole, module, operation);
        });
        return result;
      },
    };
  }, [userRole]);

  // 用户权限信息
  const permissionInfo = useMemo(() => {
    if (!userRole || !roleConfig) return null;

    const isAdminLevel = [
      RoleType.OWNER,
      RoleType.ADMIN,
      RoleType.SUPER_ADMIN,
    ].includes(userRole.roleType);
    const canManageUsers =
      hasModulePermission(
        userRole,
        ModuleType.SPACE,
        OperationType.MODIFY_MEMBER_PERMISSIONS
      ) ||
      hasModulePermission(
        userRole,
        ModuleType.SPACE,
        OperationType.ADD_MEMBERS
      );

    return {
      userRole,
      isAdminLevel,
      canManageUsers,
      accessibleModules: getAccessibleModules(userRole),
      modulePermissions: roleConfig.modulePermissions.map(mp => ({
        module: mp.module,
        operations: mp.operations,
      })),
    };
  }, [userRole, roleConfig]);

  // 设置当前用户ID（用于资源权限检查）
  const setCurrentUserId = useCallback((userId: string) => {
    currentUserIdRef.current = userId;
  }, []);

  // 如果用户角色或权限信息为空，返回null
  if (!userRole || !permissionInfo) {
    return null;
  }

  return {
    ...permissionInfo,
    checks,
    setCurrentUserId,
  };
}
