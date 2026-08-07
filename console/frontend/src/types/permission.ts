// 空间类型
export enum SpaceType {
  PERSONAL = 'personal', // 个人空间
  ENTERPRISE = 'team', // 企业空间
}

export enum EnterpriseServiceType {
  ENTERPRISE = 'ENTERPRISE', // 企业版
  TEAM = 'TEAM', // 团队版
  NONE = 'NONE', // 个人版
}

// 角色类型
export enum RoleType {
  OWNER = 'owner', // 所有者
  ADMIN = 'admin', // 管理者
  MEMBER = 'member', // 成员
  VISITOR = 'visitor', // 访客
  SUPER_ADMIN = 'super_admin', // 超级管理员
  SPACE_ADMIN = 'space_admin', // 管理员
}

// 1. 模块枚举
export enum ModuleType {
  SPACE = 'space', // 空间权限
  AGENT = 'agent', // 智能体
  PROMPT_TOOLS = 'prompt_tools', // prompt工具
  EFFECT_EVALUATION = 'effect_evaluation', // 效果测评
  PUBLISH_MANAGEMENT = 'publish_management', // 发布管理
  MODEL_MANAGEMENT = 'model_management', // 模型管理
  RESOURCE_MANAGEMENT = 'resource_management', // 资源管理
  API_MANAGEMENT = 'api_management', // API管理
  SPACE_SETTINGS = 'space_settings', // 空间设置
}

// 2. 操作权限枚举
export enum OperationType {
  VIEW = 'view', // 查看
  CREATE = 'create', // 创建
  EDIT = 'edit', // 编辑
  DELETE = 'delete', // 删除
  PUBLISH = 'publish', // 发布
  USE = 'use', // 使用
  MANAGE = 'manage', // 管理（包含所有操作）
  // 空间权限相关操作
  CREATE_DELETE = 'create_delete', // 空间创建&删除
  SPACE_SETTINGS = 'settings', // 空间设置-信息编辑
  SPACE_DELETE = 'space_delete', // 空间设置-删除
  SPACE_TRANSFER = 'space_transfer', // 空间设置-转让空间
  MODIFY_MEMBER_PERMISSIONS = 'modify_member_permissions', // 修改成员权限
  ADD_MEMBERS = 'add_members', // 添加成员
  REMOVE_MEMBERS = 'remove_members', // 删除成员
  ALL_RESOURCES_ACCESS = 'all_resources_access', // 所有资源和权益访问
  REVOKE_INVITATION = 'revoke_invitation', // 撤回邀请
  INVITATION_MANAGE = 'invitation_manage', // 邀请管理
  APPLY_MANAGE = 'apply_manage', // 申请管理
  ENTERPRISE_EDIT = 'enterprise_edit', // 团队编辑
  LEAVE_ENTERPRISE = 'leave_enterprise', // 离开团队
}

// 3. 模块权限配置接口
export interface ModulePermission {
  module: ModuleType;
  operations: OperationType[];
  restrictions?: {
    // 可以添加额外限制，比如只能操作自己创建的资源
    ownResourcesOnly?: boolean;
    // 资源数量限制
    resourceLimit?: number;
    // 其他业务限制
    [key: string]: unknown;
  };
}

// 4. 角色权限配置接口
export interface RolePermissionConfig {
  spaceType: SpaceType;
  roleType: RoleType;
  modulePermissions: ModulePermission[];
}

// 5. 路由权限配置接口
export interface RoutePermissionConfig {
  path: string;
  module: ModuleType;
  operation: OperationType;
  exact?: boolean; // 是否精确匹配路径
}
