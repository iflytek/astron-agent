// 主配置文件 - 重新导出其他配置模块
export const ServerUrl = import.meta.env.VITE_BACKEND_SERVER_URL || '';

// 重新导出 Casdoor 相关配置
export {
  casdoorSdk,
  saveTokenFromResponse,
  isGetTokenSuccessful,
  getLogoutUrl,
  performLogout,
  parseCurrentUserFromToken,
  type ParsedUserInfo,
} from './casdoor';
