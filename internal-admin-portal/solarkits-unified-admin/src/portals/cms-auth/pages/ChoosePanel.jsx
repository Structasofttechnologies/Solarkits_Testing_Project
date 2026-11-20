// pages/ChoosePanel.jsx — Premium Portal Selection
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { 
  HiBriefcase, 
  HiInboxStack, 
  HiGlobeAlt, 
  HiArrowLeftOnRectangle, 
  HiSun, 
  HiMoon, 
  HiUserCircle,
  HiCpuChip,
  HiArrowRight,
  HiSparkles,
  HiMegaphone
} from 'react-icons/hi2';
import useTheme from "../hooks/useTheme";
import { logoutUser } from "../features/auth.slice";
import Button from "../components/Button";

export default function ChoosePanel() {
  const { allowed_panels, user, isAuthenticated } = useSelector((state) => state.auth);
  const { theme, toggleTheme } = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const isExternalPanel = (url_prefix) => {
    return url_prefix?.startsWith('/epc-panel') || 
           url_prefix?.startsWith('/solarshop-india') || 
           url_prefix?.startsWith('/supplier-panel');
  };

  const handleSelectPanel = (url_prefix) => {
    if (isExternalPanel(url_prefix)) {
      window.location.href = getPanelUrl(url_prefix);
    } else {
      navigate(`${url_prefix}/`);
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  // Map panel slug to beautiful colors and icons
  const getPanelMeta = (slug) => {
    const defaultMeta = {
      icon: <HiBriefcase className="w-8 h-8" />,
      color: "from-emerald-500/10 to-teal-600/10 dark:from-emerald-500/20 dark:to-teal-600/20 border-emerald-500/20 dark:border-emerald-400/30 text-emerald-600 dark:text-emerald-400 hover:shadow-emerald-500/10",
      btnColor: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-emerald-500/20",
      desc: "Comprehensive operations control, geo-jurisdiction management, and user roles setup."
    };

    switch (slug) {
      case 'marketing-panel':
        return {
          icon: <HiMegaphone className="w-8 h-8" />,
          color: "from-indigo-500/10 to-violet-600/10 dark:from-indigo-500/20 dark:to-violet-600/20 border-indigo-500/20 dark:border-indigo-400/30 text-indigo-600 dark:text-indigo-400 hover:shadow-indigo-500/10",
          btnColor: "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-indigo-500/20",
          desc: "Email & WhatsApp marketing campaigns, EPC audience segmentation, website form tracking, and MIS conversion analytics."
        };
      case 'developer-panel':
        return {
          icon: <HiCpuChip className="w-8 h-8" />,
          color: "from-purple-500/10 to-indigo-600/10 dark:from-purple-500/20 dark:to-indigo-600/20 border-purple-500/20 dark:border-purple-400/30 text-purple-600 dark:text-purple-400 hover:shadow-purple-500/10",
          btnColor: "bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 shadow-purple-500/20",
          desc: "System configuration, panel registries, DB health monitors, and raw access controllers."
        };
      case 'admin-panel':
        return {
          icon: <HiBriefcase className="w-8 h-8" />,
          color: "from-emerald-500/10 to-teal-600/10 dark:from-emerald-500/20 dark:to-teal-600/20 border-emerald-500/20 dark:border-emerald-400/30 text-emerald-600 dark:text-emerald-400 hover:shadow-emerald-500/10",
          btnColor: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-emerald-500/20",
          desc: "Main administrative dashboard. Oversee organizational units, users, and general geolocations."
        };
      case 'operation-management-panel':
        return {
          icon: <HiGlobeAlt className="w-8 h-8" />,
          color: "from-amber-500/10 to-orange-600/10 dark:from-amber-500/20 dark:to-orange-600/20 border-amber-500/20 dark:border-amber-400/30 text-amber-600 dark:text-amber-400 hover:shadow-amber-500/10",
          btnColor: "bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 shadow-amber-500/20",
          desc: "Customer relationship pipelines, operational logistics, and task orchestration."
        };
      case 'account-panel':
        return {
          icon: <HiUserCircle className="w-8 h-8" />,
          color: "from-blue-500/10 to-sky-600/10 dark:from-blue-500/20 dark:to-sky-600/20 border-blue-500/20 dark:border-blue-400/30 text-blue-600 dark:text-blue-400 hover:shadow-blue-500/10",
          btnColor: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-blue-500/20",
          desc: "Manage your personal profile, set up security passcode credentials, view notification feeds, and view session logs."
        };
      default:
        return defaultMeta;
    }
  };

  const getPanelUrl = (url_prefix) => {
    // External/Customer panels running on separate apps/ports:
    const externalPortMap = {
      '/epc-panel': 5176,
      '/solarshop-india': 5177,
      '/supplier-panel': 5181,
    };

    const hostname = window.location.hostname;
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && externalPortMap[url_prefix]) {
      return `http://${hostname}:${externalPortMap[url_prefix]}${url_prefix}/`;
    }

    return `${url_prefix}/`;
  };

  return (
    <div className="min-h-screen gradient-bg-subtle auth-pattern flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300">
      
      {/* Theme Selector */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-2.5 rounded-2xl bg-surface/80 backdrop-blur-sm border border-border/50 text-text-secondary hover:text-primary hover:border-primary/30 transition-all duration-300 cursor-pointer shadow-sm"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <HiSun className="w-5 h-5" /> : <HiMoon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-5xl flex flex-col items-center">
        {/* Header Section */}
        <div className="text-center mb-8 md:mb-12 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4 animate-pulse">
            <HiSparkles className="w-3.5 h-3.5" />
            <span>Multi-Portal Gateway</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black gradient-text-primary tracking-tight mb-3">
            Choose Your Platform
          </h1>
          <p className="text-text-secondary text-sm md:text-base font-medium">
            Welcome back, <span className="text-text-primary font-bold">{user?.name || 'Administrator'}</span>. 
            Select one of your authorized SolarKits administrative panels below to begin.
          </p>

          {/* User Profile Summary Card */}
          {user && (
            <div className="mt-4 inline-flex items-center gap-3 px-4 py-2.5 bg-surface border border-border/80 rounded-2xl shadow-sm transition-colors text-left">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-md shadow-primary/10">
                {user.name ? user.name.split(' ').map(n=>n[0]).join('') : <HiUserCircle className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary">{user.name}</h4>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  {user.role?.name || 'User'} • {user.role?.department?.name || 'No Dept'} ({user.role?.department?.level || 'Global'})
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Panel Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {(() => {
            const panels = [...(allowed_panels || [])];
            if (!panels.some(p => p.slug === 'marketing-panel')) {
              panels.push({
                id: 'marketing-panel-gateway',
                name: 'Marketing Management Panel',
                slug: 'marketing-panel',
                url_prefix: '/marketing-panel',
                products: [
                  { id: 'mk-prod-1', name: 'Email Campaigns' },
                  { id: 'mk-prod-2', name: 'WhatsApp Business' },
                  { id: 'mk-prod-3', name: 'MIS Conversions' }
                ]
              });
            }
            return panels.map((panel) => {
            const meta = getPanelMeta(panel.slug);
            return (
              <div
                key={panel.id || panel.slug}
                onClick={() => handleSelectPanel(panel.url_prefix)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectPanel(panel.url_prefix)}
                className="group relative cursor-pointer flex flex-col justify-between p-6 md:p-8 rounded-3xl card-glass border border-border/40 hover:border-primary/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1.5 overflow-hidden"
              >
                {/* Background decorative gradient */}
                <div className={`absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity bg-gradient-to-br ${meta.color}`} />

                <div>
                  {/* Icon & Label */}
                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br border flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-sm ${meta.color}`}>
                      {meta.icon}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted bg-surface-hover/80 px-2.5 py-1 rounded-md border border-border/50">
                      {panel.slug.split('-').slice(0, -1).join(' ') || 'Marketing'}
                    </span>
                  </div>

                  {/* Panel Title & Desc */}
                  <h3 className="text-xl font-extrabold text-text-primary mb-2 group-hover:text-primary transition-colors">
                    {panel.name}
                  </h3>
                  <p className="text-sm text-text-secondary font-medium leading-relaxed mb-6">
                    {meta.desc}
                  </p>
                </div>

                {/* Footer: SaaS Product Badges & Enter Button */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  {panel.products && panel.products.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">
                        Active Products
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {panel.products.map(prod => (
                          <span 
                            key={prod.id} 
                            className="text-[9px] font-bold text-text-secondary bg-surface-hover border border-border px-2 py-0.5 rounded-full"
                          >
                            {prod.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-muted group-hover:text-primary transition-colors flex items-center gap-1">
                      Access Panel <HiArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all shadow-md ${meta.btnColor}`}>
                      <HiArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            );
          });
          })()}
        </div>

        {/* Footer Actions */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="md"
            className="group hover:bg-danger/10 hover:text-danger hover:border-danger/20 transition-all duration-300"
            leftIcon={<HiArrowLeftOnRectangle className="w-4 h-4 group-hover:scale-115 transition-transform" />}
          >
            Sign Out & Switch Account
          </Button>

          <p className="text-xs text-text-muted font-medium">
            Protected by SolarKits Enterprise-Grade Security Gateway
          </p>
        </div>
      </div>

      {/* Dynamic Background Blurs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full gradient-primary-soft opacity-30 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full gradient-secondary opacity-15 blur-3xl"></div>
      </div>
    </div>
  );
}
