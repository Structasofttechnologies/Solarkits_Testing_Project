import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useBdeAuth } from '../context/BdeAuthContext';
import api from '../services/api';
import logoImg from '../assets/logo.png';
import {
  LayoutDashboard,
  Users,
  Store,
  Target,
  ShoppingBag,
  ShoppingCart,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  MapPin,
  ChevronRight,
  SunMedium,
  Zap,
  Package,
  Award,
  FileText,
  CalendarCheck,
  BarChart3,
} from 'lucide-react';

export default function BdeLayout() {
  const { user, profile, logout, canOnboardEpc, canOnboardFranchise } = useBdeAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarCounts, setSidebarCounts] = useState({ unread_notifications: 0, epc_leads: 0, franchisee_leads: 0 });

  const fetchCounts = async () => {
    try {
      const [notifRes, countsRes] = await Promise.all([
        api.get('/notifications').catch(() => null),
        api.get('/sidebar-counts').catch(() => null),
      ]);
      const notifs = notifRes?.data?.unread_count || countsRes?.data?.counts?.unread_notifications || 0;
      setUnreadCount(notifs);
      if (countsRes?.data?.counts) {
        setSidebarCounts(countsRes.data.counts);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCounts();

    const handleUpdate = () => {
      fetchCounts();
    };

    window.addEventListener('bde_notifications_updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    const interval = setInterval(fetchCounts, 30000);

    return () => {
      window.removeEventListener('bde_notifications_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    ...(canOnboardFranchise !== false
      ? [{ name: 'Franchisee Leads', path: '/leads', icon: Users }]
      : []),
    ...(canOnboardEpc !== false
      ? [
        { name: 'EPC Leads', path: '/epc-leads', icon: Zap },
        { name: 'EPC Onboarding', path: '/epc-onboarding', icon: ShieldCheck },
        { name: 'EPC Quotes', path: '/epc-quotes', icon: FileText },
        { name: 'Quote Follow-ups', path: '/epc-quote-followups', icon: CalendarCheck },
      ]
      : []),
    { name: 'Purchase Orders (PO)', path: '/purchase-orders', icon: ShoppingCart },
    ...(canOnboardEpc !== false
      ? [{ name: 'EPC Analytics', path: '/epc-analytics', icon: BarChart3 }]
      : []),
    { name: 'Order History & Kits', path: '/order-history', icon: Package },
    { name: 'Leaderboard Ranking', path: '/ranking', icon: Award },
    ...(canOnboardFranchise !== false
      ? [{ name: 'Store Setup', path: '/store-setup', icon: ShoppingBag }]
      : []),
    { name: 'Notifications', path: '/notifications', icon: Bell },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-4 md:px-6 h-16">
          {/* Brand & Mobile Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 md:hidden rounded-lg hover:bg-slate-100 transition"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <img src={logoImg} alt="SolarKits" className="h-9 w-auto object-contain" />
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider border border-amber-200 shadow-xs">
                BDE PORTAL
              </span>
            </div>
          </div>

          {/* Territory & User Info */}
          <div className="flex items-center gap-3">
            {/* Territory Pill */}
            {profile?.territory && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-full text-xs font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {profile.territory.state_name}
                  {(() => {
                    const dList = profile.territory.district_names || profile.territory.districts || [];
                    if (dList.length === 0) return '';
                    if (dList.length <= 2) return ` (${dList.join(', ')})`;
                    return ` (${dList.length} Districts)`;
                  })()}
                </span>
              </div>
            )}

            {/* KYC Status Pill */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>KYC Verified</span>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => navigate('/notifications')}
              className="p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-xl transition relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-black leading-none text-white bg-blue-600 rounded-full ring-2 ring-white flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl hover:bg-slate-100 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden">
                  {user?.profile_photo ? (
                    <img src={user.profile_photo} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    user?.full_name?.charAt(0) || 'B'
                  )}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{user?.full_name || 'BDE Officer'}</p>
                  <p className="text-[10px] font-mono text-blue-600 font-semibold">{user?.bde_id || 'BDE-OFFICER'}</p>
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user?.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-slate-400" /> View Profile & KYC
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 text-red-500" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside
          className={`fixed md:sticky top-16 z-30 h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="p-4 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Field Portal Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {(() => {
                    let badgeCount = 0;
                    let badgeColor = "bg-blue-600 text-white";
                    if (item.path === '/notifications' && unreadCount > 0) {
                      badgeCount = unreadCount;
                    } else if (item.path === '/epc-leads' && sidebarCounts.epc_leads > 0) {
                      badgeCount = sidebarCounts.epc_leads;
                      badgeColor = "bg-amber-500 text-white font-bold";
                    } else if (item.path === '/leads' && sidebarCounts.franchisee_leads > 0) {
                      badgeCount = sidebarCounts.franchisee_leads;
                      badgeColor = "bg-blue-600 text-white";
                    }

                    if (badgeCount > 0) {
                      return (
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-full leading-none shadow-xs ${badgeColor}`}>
                          {badgeCount}
                        </span>
                      );
                    }
                    return <ChevronRight className="w-3.5 h-3.5 opacity-40" />;
                  })()}
                </NavLink>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold text-slate-700">
                <span>Solarkits v2.0</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">BDE v1</span>
              </div>
              <p className="text-[11px] text-slate-500">Business Development Platform</p>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-black/40 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
