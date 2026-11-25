import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ArrowRight,
  ExternalLink,
  Zap,
  Users,
  Store,
  Target,
  MapPin,
  ShieldCheck,
  Calendar,
  Filter,
} from 'lucide-react';

export default function BdeNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'LEADS' | 'GOALS'
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      const list = res.data.data || [];
      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, is_read: true } : n))
      );
      window.dispatchEvent(new CustomEvent('bde_notifications_updated'));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new CustomEvent('bde_notifications_updated'));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const resolveLink = (n) => {
    if (n.link) return n.link;
    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    const type = (n.type || '').toLowerCase();

    if (type === 'epc_lead' || title.includes('epc') || msg.includes('epc') || title.includes('contractor')) {
      return '/epc-leads';
    }
    if (type === 'lead' || title.includes('franchisee') || msg.includes('franchisee') || title.includes('lead')) {
      return '/leads';
    }
    if (type === 'epc_quote' || title.includes('quote') || msg.includes('quote')) {
      return '/epc-quotes';
    }
    if (type === 'follow_up' || title.includes('follow-up') || msg.includes('follow-up')) {
      return '/epc-leads';
    }
    if (type === 'order' || title.includes('order') || msg.includes('order') || title.includes('po')) {
      return '/purchase-orders';
    }
    if (title.includes('goal') || title.includes('target') || msg.includes('target') || msg.includes('signups')) {
      return '/goals';
    }
    if (title.includes('territory') || msg.includes('territory')) {
      return '/';
    }
    if (title.includes('kyc') || title.includes('welcome') || msg.includes('kyc')) {
      return '/profile';
    }
    return '/epc-leads';
  };

  const getActionLabel = (n) => {
    if (n.action_label) return n.action_label;
    const link = resolveLink(n);
    if (link === '/epc-leads') return 'Open EPC Pipeline';
    if (link === '/leads') return 'Open Lead Pipeline';
    if (link === '/epc-quotes') return 'View Quotes';
    if (link === '/purchase-orders') return 'View Orders';
    if (link === '/goals') return 'View Targets & Goals';
    if (link === '/profile') return 'View Profile / KYC';
    return 'View Details';
  };

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      markAsRead(n._id);
    }
    const targetLink = resolveLink(n);
    if (targetLink) {
      navigate(targetLink);
    }
  };

  const getIconForNotification = (n) => {
    const title = (n.title || '').toLowerCase();
    const type = (n.type || '').toLowerCase();

    if (type === 'follow_up' || title.includes('follow-up')) {
      return { icon: Calendar, bg: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    if (type === 'epc_lead' || title.includes('epc')) {
      return { icon: Zap, bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }
    if (type === 'lead' || title.includes('franchisee') || title.includes('lead')) {
      return { icon: Users, bg: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
    }
    if (title.includes('goal') || title.includes('target')) {
      return { icon: Target, bg: 'bg-purple-100 text-purple-700 border-purple-200' };
    }
    if (title.includes('territory')) {
      return { icon: MapPin, bg: 'bg-blue-100 text-blue-700 border-blue-200' };
    }
    if (title.includes('kyc')) {
      return { icon: ShieldCheck, bg: 'bg-teal-100 text-teal-700 border-teal-200' };
    }
    return { icon: Bell, bg: 'bg-blue-100 text-blue-700 border-blue-200' };
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read;
    if (filter === 'LEADS') {
      const link = resolveLink(n);
      return link === '/epc-leads' || link === '/leads' || n.type === 'lead' || n.type === 'epc_lead';
    }
    if (filter === 'GOALS') {
      const title = (n.title || '').toLowerCase();
      return title.includes('goal') || title.includes('target') || title.includes('territory') || title.includes('kyc');
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with Title & Mark All as Read */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Notifications & Announcements
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-xs">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Stay updated with lead assignments, follow-up deadlines, target goals, and territory movements.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="self-start sm:self-auto px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition shadow-xs flex items-center gap-2 disabled:opacity-60"
          >
            <CheckCheck className="w-4 h-4 text-blue-600" />
            <span>{markingAll ? 'Updating...' : 'Mark All as Read'}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200/80">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${filter === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
        >
          <span>All Notifications</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'ALL' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {notifications.length}
          </span>
        </button>

        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${filter === 'UNREAD'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-black">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setFilter('LEADS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${filter === 'LEADS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Leads & EPC Movements</span>
        </button>

        <button
          onClick={() => setFilter('GOALS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${filter === 'GOALS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Goals & Admin</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading your notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Bell className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No notifications found</p>
            <p className="text-xs text-slate-400">
              {filter === 'UNREAD' ? 'You have read all your notifications!' : 'You are completely caught up!'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const { icon: NotificationIcon, bg: iconStyle } = getIconForNotification(n);
            const targetLink = resolveLink(n);
            const actionLabel = getActionLabel(n);
            const timeAgo = formatRelativeTime(n.created_at || n.createdAt);

            return (
              <div
                key={n._id}
                onClick={() => handleNotificationClick(n)}
                className={`p-5 flex flex-col sm:flex-row items-start justify-between gap-4 transition cursor-pointer group ${n.is_read ? 'bg-white hover:bg-slate-50/80' : 'bg-blue-50/50 hover:bg-blue-50/80'
                  }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Category Icon */}
                  <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 border ${iconStyle} shadow-xs`}>
                    <NotificationIcon className="w-4 h-4" />
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition">
                        {n.title}
                      </h3>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block ring-2 ring-white" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                      {n.message}
                    </p>

                    {/* Footer Row: Timestamp & Interactive Direct Link */}
                    <div className="flex flex-wrap items-center gap-4 pt-1.5">
                      {timeAgo && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>{timeAgo}</span>
                        </span>
                      )}

                      {/* Working Link Button */}
                      {targetLink && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(n);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-100/70 hover:bg-blue-200/80 px-2.5 py-1 rounded-lg transition"
                        >
                          <span>{actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mark As Read Button */}
                {!n.is_read && (
                  <button
                    onClick={(e) => markAsRead(n._id, e)}
                    className="self-end sm:self-center px-3 py-1.5 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-700 rounded-xl text-xs font-semibold shrink-0 transition shadow-2xs flex items-center gap-1.5"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Mark read</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
