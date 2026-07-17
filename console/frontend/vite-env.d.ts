/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string;
  // 可以添加其他自定义环境变量
  readonly VITE_APP_ENV?: string;
  readonly CONSOLE_API_URL?: string;
  readonly CONSOLE_CASDOOR_URL?: string;
  readonly CONSOLE_CASDOOR_ID?: string;
  readonly CONSOLE_CASDOOR_APP?: string;
  readonly CONSOLE_CASDOOR_ORG?: string;
  readonly VITE_BASE_URL?: string;
  readonly VITE_CASDOOR_CLIENT_ID?: string;
  readonly VITE_CASDOOR_APP_NAME?: string;
  readonly VITE_CASDOOR_ORG_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface AppRuntimeConfig {
  BASE_URL?: string;
  CASDOOR_URL?: string;
  CASDOOR_ID?: string;
  CASDOOR_APP?: string;
  CASDOOR_ORG?: string;
}

interface Window {
  __APP_CONFIG__?: AppRuntimeConfig;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}
