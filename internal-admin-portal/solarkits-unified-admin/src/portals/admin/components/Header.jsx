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
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import ReactCountryFlag from "react-country-flag";
import DropdownWithSearchInput from "./DropdownWithSearchInput";
import { getAuthPortalUrl } from "@/utils/resolveApiUrl";
import useAdminNotifications from "../hooks/useAdminNotifications";

const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

const getCategoryBadge = (category) => {
    switch (category) {
        case 'configuration':
            return { label: 'Config', color: 'bg-amber-500/10 text-amber-600 border border-amber-500/20' };
        case 'orders':
            return { label: 'Order', color: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' };
        case 'payments':
            return { label: 'Payment', color: 'bg-blue-500/10 text-blue-600 border border-blue-500/20' };
        case 'service_tickets':
            return { label: 'Ticket', color: 'bg-rose-500/10 text-rose-600 border border-rose-500/20' };
        default:
            return { label: 'System', color: 'bg-purple-500/10 text-purple-600 border border-purple-500/20' };
    }
};


export default function Header({ isOpen, setIsOpen, isMobile, title = "Dashboard" }) {
    const { theme, toggleTheme } = useTheme();
    const [showPopup, setShowPopup] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const {
        notifications,
        unreadCount,
        filter: notifFilter,
        setFilter: setNotifFilter,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll: clearAllNotifications,
    } = useAdminNotifications();

    const popupRef = useRef(null);
    const notificationsRef = useRef(null);
    const switcherRef = useRef(null);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [showSwitcher, setShowSwitcher] = useState(false);

    const menuItems = [
        { icon: <HiUser />, name: "Profile", action: () => { navigate('/admin-panel/profile') } },
        { icon: <HiUserAdd />, name: "Create Users", action: () => { navigate('/admin-panel/create-users') } },
        { icon: <MdSettings />, name: "Account Settings", action: () => { navigate('/admin-panel/account-settings') } },
        {
            icon: <MdLogout />, name: "Logout", action: () => {
                dispatch(logout())
                window.location.href = getAuthPortalUrl();
            }
        },
    ]

    const { user } = useSelector((state) => state.user_slice);

    // Active product and country selection logic (sort by length descending to match specific slugs like solar-shop-bos-kits before solar-shop)
    const activeProduct = user?.allowed_panels
        ?.flatMap(p => p.saas_products || [])
        ?.slice()
        ?.sort((a, b) => (b.slug?.length || 0) - (a.slug?.length || 0))
        ?.find(prod => window.location.pathname.includes(prod.slug));

    const getSelectedCountryFromPath = (pathname, productSlug) => {
        if (!productSlug) return null;
        const parts = pathname.split('/');
        const slugIndex = parts.findIndex(part => part === productSlug);
        if (slugIndex !== -1 && parts[slugIndex + 1]) {
            const nextSegment = parts[slugIndex + 1];
            if (nextSegment && nextSegment !== 'home' && nextSegment !== 'approve-new-epc') {
                return decodeURIComponent(nextSegment);
            }
        }
        return null;
    };

    const pathCountry = getSelectedCountryFromPath(window.location.pathname, activeProduct?.slug);

    const [activeCountries, setActiveCountries] = useState(() => {
        const stored = localStorage.getItem('selected_country_admin');
        if (stored) {
            return [{ name: stored, iso2: stored === 'india' ? 'IN' : stored === 'australia' ? 'AU' : 'IN', is_active: true }];
        }
        return [{ name: 'india', iso2: 'IN', is_active: true }];
    });

    useEffect(() => {
        if (!activeProduct) {
            setActiveCountries([]);
            return;
        }

        const fetchCountries = async () => {
            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/saas-products/company-products?unique_id=ADM_SAAS_PRODS&req_for=view`,
                    { headers: authHeaderObj() }
                );
                if (res.data?.status === "success") {
                    const allProducts = res.data.data.products || [];
                    const foundProduct = allProducts.find(p => String(p.slug) === String(activeProduct.slug));
                    if (foundProduct) {
                        const activeOnes = (foundProduct.countries || []).filter(c => c.is_active);
                        if (activeOnes.length > 0) {
                            setActiveCountries(activeOnes);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching active product countries in Header:", error);
            }
        };

        fetchCountries();
    }, [activeProduct?.slug]);

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

    const handleNotificationClick = (notification) => {
        const id = notification._id || notification.id;
        if (!notification.is_read) {
            markAsRead(id);
        }
        setShowNotifications(false);
        if (notification.action_url) {
            navigate(notification.action_url);
        }
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

    const countryOptions = activeCountries.map(c => ({
        value: c.name.toLowerCase(),
        text: (
            <span className="flex items-center gap-2">
                <ReactCountryFlag
                    countryCode={c.iso2}
                    svg
                />
                <span className="font-bold capitalize">{c.name}</span>
            </span>
        )
    }));

    const selectedOptionVal = pathCountry?.toLowerCase() || "";

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
                {/* Active Country Selector */}
                {activeProduct && activeCountries.length > 0 && (
                    <div className="flex-shrink-0 w-32 sm:w-40 mr-1 sm:mr-2">
                        <DropdownWithSearchInput
                            value={selectedOptionVal}
                            onChange={(val) => {
                                const matched = activeCountries.find(c => c.name.toLowerCase() === val.toLowerCase());
                                if (matched) {
                                    const currentPath = window.location.pathname;
                                    const slug = activeProduct.slug;
                                    const parts = currentPath.split('/');
                                    const slugIndex = parts.indexOf(slug);
                                    if (slugIndex !== -1) {
                                        const nextSegment = parts[slugIndex + 1];
                                        const activeCountriesLower = activeCountries.map(ac => ac.name.toLowerCase());
                                        const isCountrySegment = nextSegment && activeCountriesLower.includes(nextSegment.toLowerCase());
                                        
                                        let subPathParts = [];
                                        if (isCountrySegment) {
                                            subPathParts = parts.slice(slugIndex + 2);
                                        } else {
                                            subPathParts = parts.slice(slugIndex + 1);
                                        }
                                        
                                        const subPath = subPathParts.join('/');
                                        navigate(`/admin-panel/${slug}/${matched.name.toLowerCase()}${subPath ? '/' + subPath : ''}`);
                                    } else {
                                        navigate(`/admin-panel/${slug}/${matched.name.toLowerCase()}`);
                                    }
                                }
                            }}
                            options={countryOptions}
                            placeholder="Select Market"
                            searchPlaceholder="Search market..."
                            className="w-full"
                            size="sm"
                        />
                    </div>
                )}
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
                        className="p-1.5 sm:p-2 relative hover:bg-primary/10 transition-colors flex-shrink-0 cursor-pointer"
                        title={unreadCount > 0 ? `${unreadCount} unread notification(s)` : "Notifications"}
                    >
                        {unreadCount > 0 ? (
                            <MdNotifications className="text-xl sm:text-2xl text-primary" />
                        ) : (
                            <MdNotificationsNone className="text-xl sm:text-2xl text-text-secondary hover:text-primary transition-colors" />
                        )}
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-bold rounded-full min-w-4.5 h-4.5 px-1 flex items-center justify-center animate-pulse shadow-md shadow-red-500/30">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </IconButton>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-[-60px] sm:right-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-96 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            {/* Dropdown Header */}
                            <div className="relative bg-gradient-to-r from-primary to-primary-end p-4 text-white">
                                <div className="flex justify-between items-center mb-2.5">
                                    <div>
                                        <h3 className="font-bold text-sm sm:text-base tracking-tight">Notifications</h3>
                                        <p className="text-[11px] text-white/80 font-medium">
                                            {unreadCount > 0 ? `${unreadCount} unread update(s)` : "All caught up"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="text-[11px] font-medium bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                        {notifications.length > 0 && (
                                            <button
                                                onClick={clearAllNotifications}
                                                className="text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                                title="Clear all"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Filter Tabs */}
                                <div className="flex items-center gap-2 pt-1 border-t border-white/15">
                                    <button
                                        onClick={() => setNotifFilter('all')}
                                        className={`px-3 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                                            notifFilter === 'all'
                                                ? 'bg-white text-primary shadow-sm'
                                                : 'text-white/80 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        All ({notifications.length})
                                    </button>
                                    <button
                                        onClick={() => setNotifFilter('unread')}
                                        className={`px-3 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                                            notifFilter === 'unread'
                                                ? 'bg-white text-primary shadow-sm'
                                                : 'text-white/80 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        Unread ({unreadCount})
                                    </button>
                                </div>
                            </div>

                            {/* Notifications List */}
                            <div className="max-h-80 sm:max-h-96 overflow-y-auto scrollbar-hover divide-y divide-border/60">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <MdNotificationsNone className="text-3xl text-primary/60" />
                                        </div>
                                        <p className="text-sm font-semibold text-text-primary">No notifications</p>
                                        <p className="text-xs text-text-muted mt-1">You are all caught up with the latest system updates.</p>
                                    </div>
                                ) : (
                                    notifications.map((notification) => {
                                        const notifId = notification._id || notification.id;
                                        const badge = getCategoryBadge(notification.category);
                                        const isUnread = !notification.is_read;

                                        return (
                                            <div
                                                key={notifId}
                                                onClick={() => handleNotificationClick(notification)}
                                                className={`p-3.5 transition-all duration-200 cursor-pointer flex gap-3 items-start group ${
                                                    isUnread
                                                        ? 'bg-primary/5 hover:bg-primary/10'
                                                        : 'hover:bg-surface-hover/80 bg-surface'
                                                }`}
                                            >
                                                {/* Left dot/indicator */}
                                                <div className="pt-1 shrink-0">
                                                    {isUnread ? (
                                                        <span className="w-2.5 h-2.5 rounded-full bg-primary flex items-center justify-center animate-pulse" />
                                                    ) : (
                                                        <span className="w-2 h-2 rounded-full bg-border" />
                                                    )}
                                                </div>

                                                {/* Notification Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${badge.color}`}>
                                                            {badge.label}
                                                        </span>
                                                        <h4 className="font-semibold text-xs text-text-primary truncate flex-1">
                                                            {notification.title}
                                                        </h4>
                                                    </div>
                                                    <p className="text-xs text-text-secondary leading-snug line-clamp-2 mb-1.5">
                                                        {notification.message}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                                                        <FaClock size={10} />
                                                        <span>{formatTimeAgo(notification.created_at)}</span>
                                                        {notification.action_url && (
                                                            <span className="ml-auto text-primary font-semibold group-hover:underline text-[10.5px]">
                                                                Open →
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div
                                                    className="flex flex-col gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {isUnread && (
                                                        <button
                                                            onClick={() => markAsRead(notifId)}
                                                            className="p-1 rounded-md hover:bg-emerald-500/10 text-emerald-600 transition-colors cursor-pointer"
                                                            title="Mark as read"
                                                        >
                                                            <MdCheckCircle size={15} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => removeNotification(notifId)}
                                                        className="p-1 rounded-md hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                                                        title="Delete"
                                                    >
                                                        <MdDelete size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Dropdown Footer */}
                            {notifications.length > 0 && (
                                <div className="p-2.5 border-t border-border bg-surface-hover/30 text-center">
                                    <span className="text-[11px] text-text-muted">
                                        Clicking a notification navigates directly to the action
                                    </span>
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
                                {typeof user?.role === 'object' ? user?.role?.name : (user?.role || 'Admin')}
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