import http from '../utils/http';

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  templateCode: string | null;
  payload: string;
  creatorUid: string;
  createdAt: string;
  expireAt: string | null;
  meta: any | null;
  isRead: boolean;
  readAt: string | null;
  receivedAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  unreadCount: number;
  notificationsByType: Record<string, Notification[]>;
}

/**
 * 获取全部消息
 * @param params  消息分类
 * @returns
 */
export const getAllMessage = (params: {
  type: string;
  unreadOnly: boolean;
  pageIndex: number;
  pageSize: number;
  offset: number;
}): Promise<NotificationResponse> => {
  return http.get(`/notifications/list`, { params });
};

/**
 * 修改消息状态已读
 * @param params  消息id
 * @returns
 */
export const changeMessageStatus = (params: {
  notificationIds: number[];
  markAll: boolean;
}): Promise<any> => {
  return http.post(`/notifications/mark-read`, params);
};

/**
 * 获取维度消息数量
 * @param params 消息分类
 * @returns
 */
export const getMessageCountApi = (): Promise<number> => {
  return http.get(`/notifications/unread-count`);
};

export const deleteMessage = (notificationId: number): Promise<any> => {
  return http.delete(`/notifications/${notificationId}`);
};
