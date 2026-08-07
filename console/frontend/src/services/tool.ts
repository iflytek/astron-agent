/*
 * @Author: snoopyYang
 * @Date: 2025-09-23 10:08:13
 * @LastEditors: snoopyYang
 * @LastEditTime: 2025-09-23 10:08:24
 * @Description: 插件广场相关接口
 */
import http from '@/utils/http';
import { message } from 'antd';
import {
  ListToolSquareParams,
  EnableToolFavoriteParams,
  GetToolDetailParams,
} from '@/types/plugin-store';
import type { ResponseResultPage } from '@/types/global';
import type { Tool, ToolDetail } from '@/types/plugin-store';
/**
 * 获取插件列表
 * @param params 请求参数
 * @returns 插件列表
 */
export function listToolSquare(
  params: ListToolSquareParams
): Promise<ResponseResultPage<Tool>> {
  return http.post('/tool/list-tool-square', params);
}

/**
 * 收藏插件
 * @param params 请求参数
 * @returns 收藏结果
 */
export async function enableToolFavorite(
  params: EnableToolFavoriteParams
): Promise<number> {
  return await http.get('/tool/favorite', { params });
}

/**
 * 获取插件详情
 * @param params 请求参数
 * @returns 插件详情
 */
export async function getToolDetail(
  params: GetToolDetailParams
): Promise<ToolDetail> {
  try {
    const response = await http.get('/tool/detail', {
      params,
    });
    return response as unknown as ToolDetail;
  } catch (error) {
    message.error(error instanceof Error ? error.message : '获取插件详情失败');
    throw error;
  }
}
