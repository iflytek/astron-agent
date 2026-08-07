/*
 * @Author: snoopyYang
 * @Date: 2025-09-23 10:07:40
 * @LastEditors: snoopyYang
 * @LastEditTime: 2025-09-23 10:07:51
 * @Description: 插件广场相关接口
 */
import http from '@/utils/http';
import type { Classify } from '@/types/plugin-store';

export async function getTags(flag: string): Promise<Classify[]> {
  return await http.get(`/config-info/tags?flag=${flag}`);
}
