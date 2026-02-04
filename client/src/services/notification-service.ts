import { api } from './api';
import type { Notification, ApiResponse, PaginatedResponse } from '@mtg-binder/shared';

export interface NotificationListParams {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

export interface NotificationListResponse extends PaginatedResponse<Notification> {
  unreadCount: number;
}

export const notificationService = {
  async getNotifications(params: NotificationListParams = {}): Promise<NotificationListResponse> {
    const { page = 1, pageSize = 20, unreadOnly = false } = params;
    const response = await api.get<NotificationListResponse>('/notifications', {
      params: { page, pageSize, unreadOnly },
    });
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count');
    return response.data.data?.unreadCount ?? 0;
  },

  async markAsRead(id: string): Promise<Notification> {
    const response = await api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
    return response.data.data!;
  },

  async markAllAsRead(): Promise<number> {
    const response = await api.patch<ApiResponse<{ count: number }>>('/notifications/read-all');
    return response.data.data?.count ?? 0;
  },

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};
