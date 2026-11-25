import axios from 'axios';
import { authHeaderObj } from '@/app/authHeader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Fetch paginated admin notifications
 */
export const fetchNotifications = async ({ page = 1, limit = 30, unread = false, category = 'all' } = {}) => {
  const params = new URLSearchParams();
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  if (unread) params.append('unread', 'true');
  if (category && category !== 'all') params.append('category', category);

  const res = await axios.get(`${API_BASE}/notifications?${params.toString()}`, {
    headers: authHeaderObj(),
  });
  return res.data?.data || { notifications: [], total: 0, unread_count: 0 };
};

/**
 * Fetch unread notifications count
 */
export const fetchUnreadCount = async () => {
  const res = await axios.get(`${API_BASE}/notifications/unread-count`, {
    headers: authHeaderObj(),
  });
  return res.data?.data?.unread_count ?? 0;
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (id) => {
  const res = await axios.patch(`${API_BASE}/notifications/${id}/read`, {}, {
    headers: authHeaderObj(),
  });
  return res.data?.data;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async () => {
  const res = await axios.post(`${API_BASE}/notifications/mark-all-read`, {}, {
    headers: authHeaderObj(),
  });
  return res.data;
};

/**
 * Delete a notification
 */
export const deleteNotification = async (id) => {
  const res = await axios.delete(`${API_BASE}/notifications/${id}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = async () => {
  const res = await axios.delete(`${API_BASE}/notifications/clear-all`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

/**
 * Get SSE stream URL for notifications
 */
export const getNotificationStreamUrl = () => {
  return `${API_BASE}/notifications/stream`;
};
