import {
  SpaceType,
  RoleType,
  ModuleType,
  OperationType,
  RolePermissionConfig,
} from '@/types/permission';

export const SHARE_PERMISSIONS: RolePermissionConfig[] = [
  // 共享空间 - 所有者
  {
    spaceType: SpaceType.PERSONAL,
    roleType: RoleType.OWNER,
    modulePermissions: [
      // 空间权限
      {
        module: ModuleType.SPACE,
        operations: [
          OperationType.MANAGE,
          OperationType.DELETE,
          OperationType.VIEW,
          OperationType.SPACE_SETTINGS,
          OperationType.ADD_MEMBERS,
          OperationType.REMOVE_MEMBERS,
          OperationType.INVITATION_MANAGE,
          OperationType.MODIFY_MEMBER_PERMISSIONS,
          OperationType.SPACE_DELETE,
          // OperationType.ALL_RESOURCES_ACCESS, // 所有资源和权益
        ],
        restrictions: {
          ownResourcesOnly: true,
        },
      },
    ],
  },

  // 共享空间 - 管理者
  {
    spaceType: SpaceType.PERSONAL,
    roleType: RoleType.ADMIN,
    modulePermissions: [
      // 空间权限
      {
        module: ModuleType.SPACE,
        operations: [
          OperationType.MANAGE,
          OperationType.DELETE,
          OperationType.VIEW,
          OperationType.ADD_MEMBERS,
          OperationType.REMOVE_MEMBERS,
          OperationType.INVITATION_MANAGE,
          OperationType.MODIFY_MEMBER_PERMISSIONS,
          OperationType.SPACE_DELETE,
          // OperationType.ALL_RESOURCES_ACCESS, // 所有资源和权益
        ],
        restrictions: {
          ownResourcesOnly: true,
        },
      },
    ],
  },

  // 共享空间 - 成员
  {
    spaceType: SpaceType.PERSONAL,
    roleType: RoleType.MEMBER,
    modulePermissions: [
      // 空间权限 (成员无特殊空间权限)
      {
        module: ModuleType.SPACE,
        operations: [
          OperationType.MANAGE,
          OperationType.VIEW,
          OperationType.SPACE_DELETE,
          // OperationType.ALL_RESOURCES_ACCESS, // 所有资源和权益
        ],
      },
    ],
  },
];
