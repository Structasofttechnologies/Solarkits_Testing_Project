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
import { HiUser } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Button from "./Button";
import IconButton from "./IconButton";
import { logout } from "@/features/auth.slice";
import { setSelectedScope } from "@/features/user.slice";
import { FaClock } from "react-icons/fa";
import { HiSun, HiMoon } from "react-icons/hi2";
import useTheme from "@/hooks/useTheme";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import DropdownWithSearchInput from "./DropdownWithSearchInput";

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
        { icon: <HiUser />, name: "Profile", action: () => { navigate('/operation-management-panel/profile') } },
        { icon: <MdSettings />, name: "Account Settings", action: () => { navigate('/operation-management-panel/account-settings') } },
        {
            icon: <MdLogout />, name: "Logout", action: () => {
                dispatch(logout())
                window.location.href = '/login';
            }
        },
    ]

    const { user, selectedScope } = useSelector((state) => state.user_slice);

    // Geographic Hierarchy Selection
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [clusters, setClusters] = useState([]);

    const SYSTEM_LEVELS = [
        { name: 'global', priority: 1 },
        { name: 'country', priority: 2 },
        { name: 'state', priority: 3 },
        { name: 'cluster', priority: 4 },
        { name: 'district', priority: 5 },
        { name: 'urban city', priority: 6 },
        { name: 'rural city', priority: 7 }
    ];

    const userLevel = user?.level?.toLowerCase() || 'cluster';
    const userLevelObj = SYSTEM_LEVELS.find(l => l.name === userLevel);
    const userLevelPriority = userLevelObj ? userLevelObj.priority : 4;
    const availableLevels = SYSTEM_LEVELS.filter(l => l.priority >= userLevelPriority);

    const activeLevel = (selectedScope?.level || userLevel).toLowerCase();
    const activeLevelObj = SYSTEM_LEVELS.find(l => l.name === activeLevel);
    const activeLevelPriority = activeLevelObj ? activeLevelObj.priority : 4;

    // Load Countries (global/country-level users)
    useEffect(() => {
        if (!user) return;
        if (userLevel === 'global' || userLevel === 'country') {
            axios.get(`${import.meta.env.VITE_OPERATION_API_URL || import.meta.env.VITE_API_URL}/geography/countries`, { headers: authHeaderObj() })
                .then(res => { if (res.data?.success) setCountries(res.data.data); })
                .catch(err => console.error('Error fetching countries:', err));
        }
    }, [user, userLevel]);

    // Load States when country selected or for state-level users
    useEffect(() => {
        if (!user) return;
        if (userLevel === 'global' || userLevel === 'country') {
            if (countries.length === 0) return;
            const activeCountryId = (selectedScope?.country && countries.some(c => c.id === selectedScope.country))
                ? selectedScope.country : countries[0].id;
            axios.get(`${import.meta.env.VITE_OPERATION_API_URL || import.meta.env.VITE_API_URL}/geography/states/${activeCountryId}`, { headers: authHeaderObj() })
                .then(res => { if (res.data?.success) setStates(res.data.data); })
                .catch(err => console.error('Error fetching states:', err));
        } else if (userLevel === 'state') {
            axios.get(`${import.meta.env.VITE_OPERATION_API_URL || import.meta.env.VITE_API_URL}/geography/states`, { headers: authHeaderObj() })
                .then(res => { if (res.data?.success) setStates(res.data.data); })
                .catch(err => console.error('Error fetching states for state user:', err));
        }
    }, [user, userLevel, countries, selectedScope?.country]);

    // Load Clusters when state selected or for cluster-level users
    useEffect(() => {
        if (!user) return;
        if (userLevel === 'global' || userLevel === 'country' || userLevel === 'state') {
            if (states.length === 0) { setClusters([]); return; }
            const activeStateId = (selectedScope?.state && states.some(s => s.id === selectedScope.state))
                ? selectedScope.state : states[0].id;
            axios.get(`${import.meta.env.VITE_OPERATION_API_URL || import.meta.env.VITE_API_URL}/geography/clusters/${activeStateId}`, { headers: authHeaderObj() })
                .then(res => { if (res.data?.success) setClusters(res.data.data); })
                .catch(err => console.error('Error fetching clusters:', err));
        } else if (userLevel === 'cluster') {
            axios.get(`${import.meta.env.VITE_OPERATION_API_URL || import.meta.env.VITE_API_URL}/geography/assigned-clusters`, { headers: authHeaderObj() })
                .then(res => { if (res.data?.success) setClusters(res.data.data); })
                .catch(err => console.error('Error fetching assigned clusters:', err));
        }
    }, [user, userLevel, states, selectedScope?.state]);

    // Synchronize Redux selectedScope with loaded geo data
    useEffect(() => {
        if (!user) return;
        let targetCountry = null, targetState = null, targetCluster = null;
        if (userLevel === 'global' || userLevel === 'country') {
            if (countries.length === 0 || states.length === 0 || clusters.length === 0) return;
            targetCountry = (selectedScope?.country && countries.some(c => c.id === selectedScope.country)) ? selectedScope.country : countries[0].id;
            const countryStates = states.filter(s => s.country_id === targetCountry);
            targetState = (selectedScope?.state && states.some(s => s.id === selectedScope.state && s.country_id === targetCountry)) ? selectedScope.state : (countryStates[0]?.id || states[0].id);
            const stateClusters = clusters.filter(c => c.state_id === targetState);
            targetCluster = (selectedScope?.cluster && clusters.some(c => c.id === selectedScope.cluster && c.state_id === targetState)) ? selectedScope.cluster : (stateClusters[0]?.id || clusters[0].id);
        } else if (userLevel === 'state') {
            if (states.length === 0 || clusters.length === 0) return;
            targetState = (selectedScope?.state && states.some(s => s.id === selectedScope.state)) ? selectedScope.state : states[0].id;
            const stateClusters = clusters.filter(c => c.state_id === targetState);
            targetCluster = (selectedScope?.cluster && clusters.some(c => c.id === selectedScope.cluster && c.state_id === targetState)) ? selectedScope.cluster : (stateClusters[0]?.id || clusters[0].id);
        } else if (userLevel === 'cluster') {
            if (clusters.length === 0) return;
            targetCluster = (selectedScope?.cluster && clusters.some(c => c.id === selectedScope.cluster)) ? selectedScope.cluster : clusters[0].id;
        }
        const countryObj = countries.find(c => c.id === targetCountry);
        const stateObj = states.find(s => s.id === targetState);
        const clusterObj = clusters.find(c => c.id === targetCluster);
        const targetLevel = selectedScope?.level || userLevel;
        if (targetCountry !== selectedScope?.country || targetState !== selectedScope?.state ||
            targetCluster !== selectedScope?.cluster || selectedScope?.level !== targetLevel ||
            selectedScope?.clusterName !== (clusterObj?.name || null)) {
            dispatch(setSelectedScope({
                level: targetLevel,
                country: targetCountry, countryName: countryObj?.name || null,
                state: targetState, stateName: stateObj?.name || null,
                cluster: targetCluster, clusterName: clusterObj?.name || null
            }));
        }
    }, [user, userLevel, countries, states, clusters, selectedScope]);

    const handleCountryChange = (val) => {
        const cObj = countries.find(c => c.id === val);
        dispatch(setSelectedScope({ ...selectedScope, country: val, countryName: cObj?.name || null, state: null, stateName: null, cluster: null, clusterName: null }));
    };
    const handleStateChange = (val) => {
        const sObj = states.find(s => s.id === val);
        dispatch(setSelectedScope({ ...selectedScope, country: selectedScope.country, countryName: selectedScope.countryName, state: val, stateName: sObj?.name || null, cluster: null, clusterName: null }));
    };
    const handleClusterChange = (val) => {
        const cObj = clusters.find(c => c.id === val);
        dispatch(setSelectedScope({ ...selectedScope, cluster: val, clusterName: cObj?.name || null }));
    };
    const handleLevelChange = (val) => {
        const newLevelObj = SYSTEM_LEVELS.find(l => l.name === val);
        const newLevelPriority = newLevelObj ? newLevelObj.priority : 4;
        dispatch(setSelectedScope({
            level: val,
            country: newLevelPriority >= 2 ? selectedScope?.country : null,
            countryName: newLevelPriority >= 2 ? selectedScope?.countryName : null,
            state: newLevelPriority >= 3 ? selectedScope?.state : null,
            stateName: newLevelPriority >= 3 ? selectedScope?.stateName : null,
            cluster: newLevelPriority >= 4 ? selectedScope?.cluster : null,
            clusterName: newLevelPriority >= 4 ? selectedScope?.clusterName : null
        }));
    };

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
                {/* Geographic Hierarchy Selectors */}
                <div className="flex items-center gap-1.5 sm:gap-2 mr-1 sm:mr-2">
                    {/* Level Selector */}
                    {availableLevels.length > 1 && (
                        <div className="flex-shrink-0 w-28 sm:w-36">
                            <DropdownWithSearchInput
                                value={activeLevel || ""}
                                onChange={handleLevelChange}
                                options={availableLevels.map(l => ({ value: l.name, text: l.name.toUpperCase() }))}
                                placeholder="Select Level"
                                searchPlaceholder="Search level..."
                                className="w-full"
                            />
                        </div>
                    )}
                    {/* Country Selector */}
                    {activeLevelPriority >= 2 && countries.length > 0 && (
                        <div className="flex-shrink-0 w-28 sm:w-36">
                            <DropdownWithSearchInput
                                value={selectedScope?.country || ""}
                                onChange={handleCountryChange}
                                options={countries.map(c => ({ value: c.id, text: c.name }))}
                                placeholder="Select Country"
                                searchPlaceholder="Search country..."
                                className="w-full"
                            />
                        </div>
                    )}
                    {/* State Selector */}
                    {activeLevelPriority >= 3 && states.length > 0 && (
                        <div className="flex-shrink-0 w-28 sm:w-36">
                            <DropdownWithSearchInput
                                value={selectedScope?.state || ""}
                                onChange={handleStateChange}
                                options={states.map(s => ({ value: s.id, text: s.name }))}
                                placeholder="Select State"
                                searchPlaceholder="Search state..."
                                className="w-full"
                            />
                        </div>
                    )}
                    {/* Cluster Selector */}
                    {activeLevelPriority >= 4 && clusters.length > 0 && (
                        <div className="flex-shrink-0 w-28 sm:w-36">
                            <DropdownWithSearchInput
                                value={selectedScope?.cluster || ""}
                                onChange={handleClusterChange}
                                options={clusters.map(c => ({ value: c.id, text: c.name }))}
                                placeholder="Select Cluster"
                                searchPlaceholder="Search cluster..."
                                className="w-full"
                            />
                        </div>
                    )}
                </div>
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
                                {typeof user?.role === 'object' ? user?.role?.name : (user?.role || 'Operations')}
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