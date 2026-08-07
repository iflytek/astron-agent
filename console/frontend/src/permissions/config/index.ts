import { SHARE_PERMISSIONS } from './share-permissions';
import { ENTERPRISE_PERMISSIONS } from './enterprise-permissions';

// 所有权限配置
export const PERMISSIONS = [...SHARE_PERMISSIONS, ...ENTERPRISE_PERMISSIONS];

// 路由权限配置
export { ROUTE_PERMISSIONS } from './route-permissions';

// 重新导出权限工具函数（从utils.ts引入）
export {
  getRoleConfig,
  hasModulePermission,
  getModulePermissions,
  getAccessibleModules,
  checkResourceRestrictions,
} from '../utils';
