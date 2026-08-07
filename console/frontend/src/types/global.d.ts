import { AxiosResponse } from 'axios';
//define the pagination data of response
type ResponseResultPage<T = unknown> = {
  pageData: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
// define the interface response result
type ResponseResult<T = unknown> = {
  code: number;
  message: string;
  data: T;
  desc?: string; //统一后可去掉，目前暂时保留，方便联调
};
//define custom response business error
type ResponseBusinessError = {
  code: number;
  message: number;
};

// Performance API 类型定义
declare global {
  interface Performance {
    now(): number;
  }

  const performance: Performance;
}

declare module 'js-base64' {
  // 明确声明模块名，与导入的包名一致
  export class Base64 {
    static encode(str: string): string;
    static decode(str: string): string;
  }
}

export type { ResponseResult, ResponseResultPage, ResponseBusinessError };
