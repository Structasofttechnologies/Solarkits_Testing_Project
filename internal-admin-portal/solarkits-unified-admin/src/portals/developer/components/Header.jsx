import { useState, useEffect, useRef } from "react";
import {
    MdMenu,
    MdSettings,
    MdLogout,
    MdNotifications,
    MdNotificationsNone,
    MdCheckCircle,
    MdDelete,
    MdApps,
    MdExpandMore
} from "react-icons/md";
import { HiUser, HiUserAdd } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Button from "./Button";
import IconButton from "./IconButton";
import { logout } from "@/features/auth.slice";
import { FaClock } from "react-icons/fa";
import { HiSun, HiMoon } from "react-icons/hi2";
import useTheme from "@/hooks/useTheme";

export default function Header({ isOpen, setIsOpen, isMobile, title = "Dashboard" }) {
    const { theme, toggleTheme } = useTheme();
    const [showPopup, setShowPopup] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, title: "New Message", message: "You have received a new message from John", time: "2 min ago", read: false },
        { id: 2, title: "System Update", message: "System maintenance scheduled for tomorrow", time: "1 hour ago", read: true },
        { id: 3, title: "Payment Received", message: "Payment of $500 has been processed", time: "3 hours ago", read: false },
        { id: 4, title: "Welcome", message: "Welcome to the dashboard! Get started with our guide", time: "1 day ago", read: true },
    ]);

    const popupRef = useRef(null);
    const notificationsRef = useRef(null);
    const switcherRef = useRef(null);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [showSwitcher, setShowSwitcher] = useState(false);

    const menuItems = [
        { icon: <HiUser />, name: "Profile", action: () => { navigate('/developer-panel/profile') } },
        { icon: <MdSettings />, name: "Account Settings", action: () => { navigate('/developer-panel/account-settings') } },
        {
            icon: <MdLogout />, name: "Logout", action: () => {
                dispatch(logout())
                window.location.href = '/login';
            }
        },
    ]

    const { user } = useSelector((state) => state.user_slice);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setShowPopup(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (switcherRef.current && !switcherRef.current.contains(event.target)) {
                setShowSwitcher(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id) => {
        setNotifications(notifications.map(notif =>
            notif.id === id ? { ...notif, read: true } : notif
        ));
    };

    const markAllAsRead = () => {
        setNotifications(notifications.map(notif => ({ ...notif, read: true })));
    };

    const deleteNotification = (id) => {
        setNotifications(notifications.filter(notif => notif.id !== id));
    };

    // Resolve active panel name from allowed panels or fallback based on pathname
    const getActivePanelName = () => {
        if (user?.allowed_panels && user.allowed_panels.length > 0) {
            const matched = user.allowed_panels.find(p => window.location.pathname.startsWith(p.url_prefix));
            if (matched) return matched.name;
        }
        const path = window.location.pathname;
        if (path.startsWith('/admin-panel')) return 'Admin Panel';
        if (path.startsWith('/developer-panel')) return 'Developer Panel';
        if (path.startsWith('/operation-management-panel')) return 'Operation Management Panel';
        if (path.startsWith('/warehouse-management-panel')) return 'Warehouse Management Panel';
        return 'Dashboard';
    };

    const currentPanelName = getActivePanelName();

    // Generate avatar URL with primary gradient colors (#263880 to #3a56c9)
    const getAvatarUrl = (name, size = 40) => {
        return `https://ui-avatars.com/api/?background=263880&color=fff&name=${encodeURIComponent(name || 'User')}&bold=true&size=${size}`;
    };

    return (
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-surface border-b border-border shadow-md">
            {/* Left side - Mobile Menu Toggle & Title */}
            <div className="flex gap-1.5 sm:gap-3 items-center min-w-0">
                {isMobile && (
                    <IconButton
                        variant="ghost"
                        size="md"
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1.5 sm:p-2 hover:bg-primary/10 transition-colors flex-shrink-0"
                    >
                        <MdMenu className="text-lg sm:text-xl text-text-secondary hover:text-primary transition-colors" />
                    </IconButton>
                )}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 bg-linear-120 from-primary to-primary-end rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                        <span className="text-white text-sm font-bold">{(title || currentPanelName).charAt(0)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        {title && title !== currentPanelName ? (
                            <>
                                <span className="text-xs sm:text-sm md:text-[15px] font-semibold text-text-muted hidden md:inline-block truncate max-w-[100px] lg:max-w-none">
                                    {currentPanelName}
                                </span>
                                <span className="text-text-muted/40 font-normal hidden md:inline-block flex-shrink-0">/</span>
                                <h1 className="text-sm sm:text-base md:text-lg font-bold text-text-primary truncate max-w-[120px] min-[400px]:max-w-[180px] sm:max-w-none">
                                    {title}
                                </h1>
                            </>
                        ) : (
                            <h1 className="text-sm sm:text-base md:text-lg font-bold text-text-primary truncate max-w-[140px] min-[400px]:max-w-[200px] sm:max-w-none">
                                {currentPanelName}
                            </h1>
                        )}
                    </div>
                </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 flex-shrink-0">
                {/* Panel Switcher Dropdown */}
                {user?.allowed_panels && (
                    user.allowed_panels.length > 1 ||
                    user.allowed_panels.some(p => p.saas_products && p.saas_products.length > 0)
                ) && (
                    <div className="relative" ref={switcherRef}>
                        <button
                            onClick={() => setShowSwitcher(!showSwitcher)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl transition-all duration-200 text-xs sm:text-[13px] font-bold text-primary group"
                        >
                            <MdApps className="text-primary text-base sm:text-lg group-hover:rotate-45 transition-transform duration-300" />
                            <span className="hidden md:inline">Switch Panel / Product</span>
                            <MdExpandMore size={16} className={`transition-transform duration-200 ${showSwitcher ? 'rotate-180' : ''}`} />
                        </button>

                        {showSwitcher && (
                            <div className="absolute right-[-110px] sm:right-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-72 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-4 py-1.5 border-b border-border mb-1.5">
                                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Switch System Panel / Product</span>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto scrollbar-hover">
                                    {user.allowed_panels.map((p) => {
                                        const isPanelActive = window.location.pathname === p.url_prefix || window.location.pathname === p.url_prefix + '/';
                                        
                                        const resolvePanelUrl = (urlPrefix, path = '') => {
                                            const cleanPath = path ? path : '/';
                                            return `${urlPrefix}${cleanPath}`;
                                        };

                                        return (
                                            <div key={p.id} className="border-b border-border/50 last:border-b-0 py-1">
                                                {/* Panel root */}
                                                <a
                                                    href={resolvePanelUrl(p.url_prefix)}
                                                    onClick={() => {
                                                        setShowSwitcher(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-xs font-bold flex items-center justify-between transition-colors ${
                                                        isPanelActive
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'text-text-primary hover:text-primary hover:bg-primary/5'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isPanelActive ? 'bg-primary' : 'bg-transparent'}`} />
                                                        {p.name}
                                                    </div>
                                                    <span className="text-[10px] text-text-muted font-normal bg-surface-hover px-1.5 py-0.5 rounded border border-border/50">Root</span>
                                                </a>

                                                {/* SaaS Products */}
                                                {p.saas_products && p.saas_products.length > 0 && (
                                                    <div className="pl-6 pr-2 py-1 space-y-1 bg-surface-hover/10">
                                                        {p.saas_products.map((prod) => {
                                                            const isProdActive = window.location.pathname.includes(`${p.url_prefix}/${prod.slug}`);
                                                            return (
                                                                 <a
                                                                    key={prod.id}
                                                                    href={resolvePanelUrl(p.url_prefix, `/${prod.slug}`)}
                                                                    onClick={() => {
                                                                        setShowSwitcher(false);
                                                                    }}
                                                                    className={`w-full text-left px-3 py-1.5 text-[11px] font-semibold flex items-center gap-2 rounded-lg transition-all ${
                                                                        isProdActive
                                                                            ? 'text-primary bg-primary/10 shadow-sm'
                                                                            : 'text-text-secondary hover:text-primary hover:bg-primary/5'
                                                                    }`}
                                                                 >
                                                                    <span className={`w-1 h-1 rounded-full ${isProdActive ? 'bg-primary' : 'bg-text-muted/40'}`} />
                                                                    <span className="truncate">{prod.name}</span>
                                                                 </a>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Theme Toggle */}
                <IconButton
                    variant="ghost"
                    size="md"
                    onClick={toggleTheme}
                    className="p-1.5 sm:p-2 text-text-secondary hover:text-primary transition-all duration-300 group flex-shrink-0"
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? (
                        <HiSun className="text-lg sm:text-xl group-hover:rotate-45 transition-transform" />
                    ) : (
                        <HiMoon className="text-lg sm:text-xl group-hover:-rotate-12 transition-transform" />
                    )}
                </IconButton>

                {/* Notifications */}
                <div className="relative" ref={notificationsRef}>
                    <IconButton
                        variant="ghost"
                        size="md"
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-1.5 sm:p-2 relative hover:bg-primary/10 transition-colors flex-shrink-0"
                    >
                        {unreadCount > 0 ? (
                            <MdNotifications className="text-lg sm:text-xl text-primary" />
                        ) : (
                            <MdNotificationsNone className="text-lg sm:text-xl text-text-secondary hover:text-primary transition-colors" />
                        )}
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-linear-120 from-danger to-danger/80 text-white text-[10px] font-semibold rounded-full w-4.5 h-4.5 flex items-center justify-center animate-pulse shadow-lg">
                                {unreadCount}
                            </span>
                        )}
                    </IconButton>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-[-60px] sm:right-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-80 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                            <div className="relative bg-linear-120 from-primary to-primary-end p-4">
                                <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]"></div>
                                <div className="relative flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-white text-sm sm:text-base">Notifications</h3>
                                        <p className="text-[10px] sm:text-xs text-white/80">{unreadCount} unread</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={markAllAsRead}
                                        className="text-[10px] sm:text-xs bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm px-2 py-1"
                                        disabled={unreadCount === 0}
                                    >
                                        Mark all read
                                    </Button>
                                </div>
                            </div>

                            <div className="max-h-80 sm:max-h-96 overflow-y-auto scrollbar-hover">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-linear-120 from-primary/10 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <MdNotificationsNone className="text-2xl sm:text-3xl text-primary/40" />
                                        </div>
                                        <p className="text-xs sm:text-sm text-text-secondary">No notifications</p>
                                    </div>
                                ) : (
                                    notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-3 sm:p-4 border-b border-border hover:bg-linear-120 hover:from-primary/5 hover:to-primary/10 transition-all duration-200 ${!notification.read ? 'bg-linear-120 from-primary/5 to-primary/10' : ''
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-medium text-text-primary text-xs sm:text-sm truncate">
                                                            {notification.title}
                                                        </h4>
                                                        {!notification.read && (
                                                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse flex-shrink-0"></span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-text-secondary mb-2 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-text-muted">
                                                        <FaClock size={10} />
                                                        {notification.time}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 ml-2 flex-shrink-0">
                                                    {!notification.read && (
                                                        <IconButton
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => markAsRead(notification.id)}
                                                            className="p-1 hover:bg-success/10 hover:text-success transition-colors"
                                                            title="Mark as read"
                                                        >
                                                            <MdCheckCircle className="text-success text-xs sm:text-sm" />
                                                        </IconButton>
                                                    )}
                                                    <IconButton
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => deleteNotification(notification.id)}
                                                        className="p-1 hover:bg-danger/10 hover:text-danger transition-colors"
                                                        title="Delete"
                                                    >
                                                        <MdDelete className="text-danger text-xs sm:text-sm" />
                                                    </IconButton>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {notifications.length > 0 && (
                                <div className="p-2 sm:p-3 border-t border-border bg-linear-120 from-primary/5 to-primary/10">
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => navigate('/notifications')}
                                        className="w-full justify-center text-xs sm:text-sm text-primary hover:text-primary-hover font-medium"
                                    >
                                        View all notifications
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* User Info */}
                <div className="relative" ref={popupRef}>
                    <button
                        onClick={() => setShowPopup(!showPopup)}
                        className="flex items-center gap-1.5 sm:gap-3 p-1 rounded-xl hover:bg-linear-120 hover:from-primary/5 hover:to-primary/10 transition-all duration-200 group"
                    >
                        {/* User Avatar with Primary Gradient Background */}
                        <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden flex items-center justify-center border-2 border-white shadow-lg bg-linear-120 from-primary to-primary-end">
                                <img
                                    src={getAvatarUrl(user?.name, 40)}
                                    alt={user?.name || 'User'}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-linear-120 from-success to-success/80 rounded-full border-2 border-white shadow-sm"></div>
                        </div>

                        <div className="hidden sm:block text-left">
                            <p className="text-sm font-semibold text-text-primary leading-tight">{user?.name}</p>
                            <p className="text-[10px] sm:text-xs bg-linear-120 from-primary/10 to-primary/5 text-primary px-2 py-0.5 rounded-full inline-block mt-0.5">
                                {typeof user?.role === 'object' ? user?.role?.name : (user?.role || 'Developer')}
                            </p>
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {showPopup && (
                        <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-32px)] bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                            {/* User Info Header */}
                            <div className="relative bg-linear-120 from-primary to-primary-end p-4">
                                <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]"></div>
                                <div className="relative flex items-center gap-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg bg-white/20 backdrop-blur-sm flex-shrink-0">
                                        <img
                                            src={getAvatarUrl(user?.name, 48)}
                                            alt={user?.name || 'User'}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-white text-sm sm:text-base truncate">{user?.name}</p>
                                        <p className="text-[10px] sm:text-xs text-white/80 truncate">{user?.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Items */}
                            <div className="py-2">
                                {menuItems.map((item, idx) => (
                                    <Button
                                        key={idx}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            item.action();
                                            setShowPopup(false);
                                        }}
                                        className="w-full justify-start px-4 py-2.5 sm:py-3 rounded-none text-text-secondary hover:text-primary hover:bg-linear-120 hover:from-primary/5 hover:to-primary/10 transition-all duration-200 text-xs sm:text-sm"
                                        leftIcon={<span className="text-primary group-hover:scale-110 transition-transform">{item.icon}</span>}
                                    >
                                        {item.name}
                                    </Button>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="p-3 border-t border-border bg-linear-120 from-primary/5 to-primary/10">
                                <div className="flex justify-between text-xs">
                                    <span className="text-text-muted">Status:</span>
                                    <span className="text-success font-medium flex items-center gap-1">
                                        <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                                        Online
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}