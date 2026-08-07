import http from '@/utils/http';
import type { AxiosResponse } from 'axios';
import type { User } from '@/store/user-store';

export interface CheckAccountParams {
  username: string;
  password: string;
  [key: string]: unknown;
}

/**
 * 插件验证
 */
export async function plugValidate(): Promise<AxiosResponse> {
  return http.get('/xingchen-api/plug/validate');
}

/**
 * @description: 用户登出
 * @return {*}
 */

export async function logOutAPI(): Promise<AxiosResponse> {
  const response = await http.get('/api/v1/auth/userLogout');
  if (response?.data?.code !== 0) {
    throw new Error(response.data.message);
  }
  return response.data.data;
}

export async function getUserInfoMe(): Promise<User> {
  const response: User = await http.get('/user-info/me');
  return response;
}
