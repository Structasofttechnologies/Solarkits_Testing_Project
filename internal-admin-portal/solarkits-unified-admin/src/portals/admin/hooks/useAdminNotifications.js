import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationStreamUrl,
} from '../api/notificationsApi';

export default function useAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const eventSourceRef = useRef(null);
  const pollTimerRef = useRef(null);

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const data = await fetchNotifications({
        unread: filter === 'unread',
        limit: 40,
      });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count ?? 0);
    } catch (err) {
      console.warn('[useAdminNotifications] Load failed:', err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [filter]);

  // Initial load and filter change
  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // SSE Real-Time Listener
  useEffect(() => {
    const streamUrl = getNotificationStreamUrl();
    let es;

    try {
      es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);

          if (parsed.type === 'NEW_NOTIFICATION') {
            const newNotif = parsed.data?.notification;
            const updatedCount = parsed.data?.unread_count;

            if (newNotif) {
              setNotifications((prev) => {
                const exists = prev.some((n) => (n._id || n.id) === (newNotif._id || newNotif.id));
                if (exists) return prev;
                return [newNotif, ...prev];
              });
            }

            if (typeof updatedCount === 'number') {
              setUnreadCount(updatedCount);
            } else {
              setUnreadCount((c) => c + 1);
            }
          } else if (parsed.type === 'UNREAD_COUNT_UPDATE') {
            const count = parsed.data?.unread_count;
            if (typeof count === 'number') {
              setUnreadCount(count);
            }
          }
        } catch {
          // ignore non-JSON messages like heartbeat
        }
      };

      es.onerror = () => {
        // SSE disconnected or errored, close and let fallback polling handle it
        if (es) {
          es.close();
        }
      };
    } catch (err) {
      console.warn('[useAdminNotifications] SSE failed to initialize:', err.message);
    }

    // Fallback sync polling every 45s
    pollTimerRef.current = setInterval(() => {
      fetchUnreadCount()
        .then((count) => setUnreadCount(count))
        .catch(() => {});
    }, 45000);

    return () => {
      if (es) es.close();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Mark single as read
  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => ((n._id || n.id) === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await markNotificationAsRead(id);
    } catch (err) {
      console.warn('Failed to mark read:', err);
      loadData(false);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead();
    } catch (err) {
      console.warn('Failed to mark all read:', err);
      loadData(false);
    }
  };

  // Delete notification
  const removeNotification = async (id) => {
    const target = notifications.find((n) => (n._id || n.id) === id);
    setNotifications((prev) => prev.filter((n) => (n._id || n.id) !== id));
    if (target && !target.is_read) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    try {
      await deleteNotification(id);
    } catch (err) {
      console.warn('Failed to delete notification:', err);
      loadData(false);
    }
  };

  // Clear all
  const clearAll = async () => {
    setNotifications([]);
    setUnreadCount(0);

    try {
      await clearAllNotifications();
    } catch (err) {
      console.warn('Failed to clear notifications:', err);
      loadData(false);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    filter,
    setFilter,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    reload: () => loadData(false),
  };
}
