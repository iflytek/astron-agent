/**
 * 配置权限数据
 */
import {
  SpaceType,
  RoleType,
  ModuleType,
  OperationType,
  RolePermissionConfig,
} from '@/types/permission';

export const ENTERPRISE_PERMISSIONS: RolePermissionConfig[] = [
  // 企业空间 - 超级管理员
  {
    spaceType: SpaceType.ENTERPRISE,
    roleType: RoleType.SUPER_ADMIN,
    modulePermissions: [
      // 空间权限
      {
        module: ModuleType.SPACE,
        operations: [
          OperationType.MANAGE, // 空间管理
          OperationType.VIEW, // 空间查看
          OperationType.CREATE, // 空间创建

          OperationType.ENTERPRISE_EDIT, // 团队编辑
          OperationType.DELETE, // 空间删除
          OperationType.SPACE_SETTINGS, // 空间设置
          OperationType.SPACE_TRANSFER, // 空间转让
          OperationType.SPACE_DELETE, // 删除/离开空间

          OperationType.MODIFY_MEMBER_PERMISSIONS, // 整体人员权限管理
          OperationType.ADD_MEMBERS, // 添加成员
          OperationType.REMOVE_MEMBERS, // 删除成员
          OperationType.ALL_RESOURCES_ACCESS, // 所有资源和权益
          OperationType.INVITATION_MANAGE, // 邀请管理
          OperationType.APPLY_MANAGE, // 申请管理
        ],
        restrictions: {
          ownResourcesOnly: true,
        },
      },
    ],
  },

  // 企业空间 - 管理员
  {
    spaceType: SpaceType.ENTERPRISE,
    roleType: RoleType.ADMIN,
    modulePermissions: [
      // 空间权限
      {
        module: ModuleType.SPACE,
        operations: [
          OperationType.MANAGE,
          OperationType.VIEW,
          OperationType.CREATE,
          OperationType.SPACE_DELETE,

          OperationType.MODIFY_MEMBER_PERMISSIONS, // 修改成员权限
          OperationType.ADD_MEMBERS, // 添加成员
          OperationType.REMOVE_MEMBERS, // 删除成员
          OperationType.ALL_RESOURCES_ACCESS, // 所有资源和权益
          OperationType.INVITATION_MANAGE, // 邀请管理
          OperationType.APPLY_MANAGE, // 申请管理
          OperationType.LEAVE_ENTERPRISE, // 离开团队
        ],
        restrictions: {
          ownResourcesOnly: true,
        },
      },
    ],
  },

  // 企业空间 - 成员
  {
    spaceType: SpaceType.ENTERPRISE,
    roleType: RoleType.MEMBER,
    modulePermissions: [
      // 空间权限
      {
        module: ModuleType.SPACE,
        operations: [
          OperationType.MANAGE, // 空间管理
          OperationType.VIEW, // 空间查看
          OperationType.SPACE_DELETE,
          OperationType.LEAVE_ENTERPRISE, // 离开团队

          OperationType.ALL_RESOURCES_ACCESS, // 所有资源和权益
        ],
      },
    ],
  },
];
