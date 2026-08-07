/*
 * @Author: snoopyYang
 * @Date: 2025-09-23 10:07:18
 * @LastEditors: snoopyYang
 * @LastEditTime: 2025-09-23 10:07:29
 * @Description: http请求工具
 */
import axios from 'axios';
import { Base64 } from 'js-base64';
import { casdoorSdk } from '@/config';
import qs from 'qs';
import { message } from 'antd';
import packageJson from '../../package.json';
import { zh } from '@/locales/zh';
import { en } from '@/locales/en';
import i18n from '@/locales/i18n';
import eventBus from '@/utils/event-bus';
import useSpaceStore from '@/store/space-store';
import type {
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import type { ResponseResult } from '@/types/global';
import { handleLoginRedirect } from './auth';

/**
 * 获取后端需要的语言代码
 * @returns 语言代码
 */
export const getLanguageCode = (): string => {
  const lang = i18n.language || 'zh';

  // 返回Accept-Language标准格式
  if (lang.toLowerCase().startsWith('zh')) {
    return 'zh-CN';
  } else if (lang.toLowerCase().startsWith('en')) {
    return 'en-US';
  }

  return lang;
};

const localeConfig: {
  [key: string]: Record<string, string>;
} = {
  zh: zh,
  en: en,
} as unknown as {
  [key: string]: Record<string, string>;
};

const getRuntimeBaseURL = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.__APP_CONFIG__?.BASE_URL;
};

const switchPersonal = (): void => {
  useSpaceStore.setState({
    spaceId: '',
    spaceType: 'personal',
    spaceName: '',
    enterpriseId: '',
  });
};

/**
 * 带请求头的文件下载函数 -- a标签使用
 * @param url 下载地址
 * @param filename 文件名
 * @param extraHeaders 额外的请求头
 */
export const downloadFileWithHeaders = (
  url: string,
  filename: string,
  extraHeaders: Record<string, string> = {}
): void => {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);

  // 添加space-id
  const spaceId = useSpaceStore.getState().spaceId;
  if (spaceId) {
    xhr.setRequestHeader('space-id', spaceId);
  }

  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
  }

  // 添加enterprise-id (如果是团队空间)
  const spaceType = useSpaceStore.getState().spaceType;
  if (spaceType === 'team') {
    const enterpriseId = useSpaceStore.getState().enterpriseId;
    if (enterpriseId) {
      xhr.setRequestHeader('enterprise-id', enterpriseId);
    }
  }

  // 添加额外请求头
  Object.entries(extraHeaders).forEach(([key, value]) => {
    xhr.setRequestHeader(key, value);
  });

  // 设置响应类型为blob
  xhr.responseType = 'blob';

  // 加载完成处理
  xhr.onload = function (): void {
    if (xhr.status === 200) {
      // 创建临时URL和a标签触发下载
      const blob = xhr.response;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // 清理
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      message.error(`下载失败: ${xhr.statusText}`);
    }
  };

  // 错误处理
  xhr.onerror = function (): void {
    message.error(`网络错误: ${xhr.statusText}`);
  };

  // 发送请求
  xhr.send();
};

/**
 * 跳转到登录页
 */
export const jumpToLogin = (): void => {
  handleLoginRedirect();
  // eventBus.emit('openLoginModal');
};

/**
 * 初始化服务器返回错误信息
 * @param error 服务器返回错误信息
 * @returns 封装后错误信息
 */
export const initServerError = (
  error: AxiosError
): { code: number; message: string } => {
  const { response, request } = error;
  const currentLang = getLanguageCode();
  if (request?.status === 0) {
    return {
      code: 100,
      message:
        localeConfig?.[currentLang]?.serverWrong || '服务器开小差了~稍后再试',
    };
  }
  // 判断如果是401错误 直接跳转至登录页
  if (response?.status === 401) {
    jumpToLogin();
    return {
      code: 101,
      message: '尚未登录，请重新登录',
    };
  }
  return {
    code: 100,
    message:
      localeConfig?.[currentLang]?.serverWrong || '服务器开小差了~稍后再试',
  };
};
/**
 * 处理各种业务错误
 * @param response 响应对象
 * @param result 响应结果
 * @returns 返回结果
 */
export const initBusinessError = (
  response: AxiosResponse,
  result: ResponseResult
) => {
  if (result?.code !== 0) {
    message.error(result?.message || result?.desc);
  }
  // 添加套餐用量耗尽处理
  if ([11120].includes(result.code)) {
    eventBus.emit('showUsageExhausted', {
      message: result.message || result?.desc,
    });
  }
  if ([80000, 90000].includes(result.code)) {
    switchPersonal();
    // 登陆异常
    if (!specialRouter.includes(window.location.pathname)) {
      jumpToLogin();
    }
    if (
      response.config.url &&
      specialRequestUrl.includes(response.config.url)
    ) {
      jumpToLogin();
    }
  }
  if (
    [80001, 80004].includes(result.code) ||
    result.message === '空间不存在' ||
    result?.desc === '空间不存在'
  ) {
    message.error(result?.desc || '获取信息失败', 3, () => {
      if (result.code === 80004) {
        switchPersonal();
      }
      window.location.href = '/space/agent';
      return;
    });
  }
  // 星火注销
  if (result.code === 99900 && window.location.pathname !== '/spark') {
    window.location.href = '/spark';
  }
  // 永久封禁
  if (result.code === 10004 && window.location.pathname !== '/ban') {
    window.location.href = '/ban';
  }

  // 24小时封禁
  if (result.code === 10003) {
    message.error(result?.desc || '获取信息失败', 5, () => {
      window.location.href = '/spark';
    });
  }

  // ban页面中的特殊处理，业务上需要code码，直接返回result
  if (window.location.pathname === '/ban') {
    return result;
  }
  //这里要reject出去，不然直接返回result跟正常情况下返回的result.data不一致
  return Promise.reject(result);
};

/**
 * 获取cookie
 * @param cookieName  cookie名称
 * @returns cookie值
 */
export function getCookie(cookieName: string): string {
  const name = cookieName + '=';
  const decodedCookie: string = decodeURIComponent(document.cookie);
  const cookieArray: string[] = decodedCookie.split(';');
  for (let i = 0; i < cookieArray.length; i++) {
    let cookie: string = cookieArray[i] || '';
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }

  return '';
}

/**
 * 获取请求key
 * @param config 请求配置
 * @returns 请求key
 * @returns
 */
const generateReqKey = (config: AxiosRequestConfig): string => {
  const { method, url, params, data } = config;
  return [method, url, qs.stringify(params), qs.stringify(data)].join('&');
};

/**
 * 添加请求
 * @param config 请求配置
 */
const addPendingRequest = (config: InternalAxiosRequestConfig): void => {
  const requestKey = generateReqKey(config);
  config.cancelToken =
    config.cancelToken ||
    new axios.CancelToken(cancel => {
      if (!pendingRequest.has(requestKey)) {
        pendingRequest.set(requestKey, cancel);
      }
    });
};

/**
 * 移除请求
 * @param config 请求配置
 */
const removePendingRequest = (config?: AxiosRequestConfig): void => {
  if (!config) {
    return;
  }
  const requestKey = generateReqKey(config);
  if (pendingRequest.has(requestKey)) {
    const cancelToken = pendingRequest.get(requestKey);
    cancelToken(requestKey);
    pendingRequest.delete(requestKey);
  }
};

// 超时时间30s
axios.defaults.timeout = 30000;
// Ajax请求
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['web-v'] = packageJson?.version ?? '0.0.1';

// 设置初始语言头部
axios.defaults.headers.common['Accept-Language'] = getLanguageCode();

// 监听语言变化，更新请求头
i18n.on('languageChanged', () => {
  axios.defaults.headers.common['Accept-Language'] = getLanguageCode();
});

const pendingRequest = new Map(); // 请求对象
const specialRouter = ['/home'];
const specialRequestUrl = [
  '/iflygpt-longcontext/document-operation/web/get-process',
  // NOTE: 首页需要唤起登录弹窗的接口
  '/u/chat-list/v1/create-chat-list',
  '/bot/favorite/create',
  '/agent/getShareKey',
];

// 请求拦截器
let refreshingPromise: Promise<void> | null = null;

const decodeJwtExp = (token: string): number | null => {
  try {
    const payloadPart = token.split('.')[1] || '';
    const json = Base64.decode(
      payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    );
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
};

const isAccessTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  const exp = decodeJwtExp(token);
  if (!exp) return true;
  const nowMs = Date.now();
  return nowMs >= exp * 1000 - 30_000; // 提前30秒刷新
};

axios.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    removePendingRequest(config); // 检查是否存在重复请求，若存在则取消已发的请求
    addPendingRequest(config); // 把当前请求信息添加到pendingRequest对象中
    config.headers = config.headers || {};
    config.headers.clientType = '11'; //手动设置clientType getCookie("clientType")拿到的和星火一样
    config.headers.Channel = getCookie('channel');
    if (useSpaceStore.getState().spaceType === 'team') {
      config.headers['enterprise-id'] = useSpaceStore.getState().enterpriseId;
    }
    config.headers['space-id'] = useSpaceStore.getState().spaceId;
    config.headers.clientType = '11'; //手动设置clientType
    config.headers.Channel = getCookie('channel');
    // 刷新 token（PKCE 模式）
    const currentAccessToken = localStorage.getItem('accessToken');
    const currentRefreshToken = localStorage.getItem('refreshToken');

    if (currentRefreshToken && isAccessTokenExpired(currentAccessToken)) {
      if (!refreshingPromise) {
        refreshingPromise = casdoorSdk
          .refreshAccessToken(currentRefreshToken)
          .then((resp: unknown) => {
            const r = resp as { access_token?: string; refresh_token?: string };
            if (r?.access_token) {
              localStorage.setItem('accessToken', r.access_token);
            }
            if (r?.refresh_token) {
              localStorage.setItem('refreshToken', r.refresh_token);
            }
          })
          .catch(() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          })
          .finally(() => {
            refreshingPromise = null;
          });
      }
      await refreshingPromise;
    }

    const latestAccessToken = localStorage.getItem('accessToken');
    if (latestAccessToken) {
      config.headers['Authorization'] = 'Bearer ' + latestAccessToken;
    }
    // 确保每个请求都使用最新的语言设置
    config.headers['Accept-Language'] = getLanguageCode();

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// 响应拦截器即异常处理
axios.interceptors.response.use(
  (response: AxiosResponse) => {
    removePendingRequest(response.config); // 从pendingRequest对象中移除请求
    const result: ResponseResult<typeof response.data.data> = response.data;
    if (response.config.responseType === 'blob') {
      return response;
    }
    if (result?.code !== 0) {
      return initBusinessError(response, result); //处理各种业务错误
    }
    return result.data;
  },
  (err: AxiosError) => {
    removePendingRequest(err.config || {}); // 从pendingRequest对象中移除请求
    if (axios.isCancel(err)) {
      // eslint-disable-next-line no-console
      console.warn(`已取消的重复请求：${err.message}`);
    }
    return Promise.reject(initServerError(err)); //处理服务器错误如400，401，404等
  }
);

//根据环境设置baseURL：本地localhost走 /xingchen-api，dev环境和test环境分别对应不同服务器
const getBaseURL = (): string => {
  const mode = import.meta.env.MODE;
  const VITE_TEST_URL = import.meta.env.VITE_TEST_URL;
  const VITE_DEV_URL = import.meta.env.VITE_DEV_URL;
  console.log('VITE_TEST_URL', VITE_TEST_URL);
  console.log('VITE_DEV_URL', VITE_DEV_URL);

  if (mode === 'production') {
    return '/console-api';
  }

  const runtimeBaseUrl = getRuntimeBaseURL();
  if (runtimeBaseUrl) {
    return runtimeBaseUrl;
  }

  // 在客户端环境下检查是否为localhost
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    return '/xingchen-api';
  }

  // 从环境变量读取baseURL
  const baseUrlFromEnv =
    import.meta.env.CONSOLE_API_URL || import.meta.env.VITE_BASE_URL;
  if (baseUrlFromEnv) {
    return baseUrlFromEnv;
  }

  // 兜底逻辑：通过import.meta.env.MODE获取构建时的环境模式
  switch (mode) {
    case 'development':
      return 'http://172.29.202.54:8080';
    case 'test':
      return 'http://172.29.201.92:8080';
    default:
      // production和其他环境保持原有逻辑
      return 'http://172.29.201.92:8080';
  }
};

export const baseURL = getBaseURL();

axios.defaults.baseURL = baseURL;
export default axios;
