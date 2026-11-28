import { Route, Routes, useLocation, useNavigate, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import Header from "../../admin/components/Header";
import Drawer from "../../admin/components/Drawer";
import Loader from "../../admin/components/Loader";

import {
  FaHome,
  FaBullhorn,
  FaEnvelope,
  FaWhatsapp,
  FaUsers,
  FaMousePointer,
  FaGlobe,
  FaBolt,
  FaBell,
  FaChartBar,
  FaHistory,
  FaFileAlt,
  FaComments,
  FaPlus,
  FaChartLine,
  FaMapMarkedAlt,
  FaGift
} from "react-icons/fa";

/* ===================== EPC Marketing Module Pages ===================== */
const MarketingDashboard = lazy(() => import("../../admin/pages/marketing/MarketingDashboard"));
const IndiaCampaignMap = lazy(() => import("../../admin/pages/marketing/IndiaCampaignMap"));
const CampaignsListPage = lazy(() => import("../../admin/pages/marketing/CampaignsListPage"));
const CreateCampaignWizard = lazy(() => import("../../admin/pages/marketing/CreateCampaignWizard"));
const SeasonalCouponsPage = lazy(() => import("../../admin/pages/marketing/SeasonalCouponsPage"));
const EmailSettingsPage = lazy(() => import("../../admin/pages/marketing/EmailSettingsPage"));
const EmailTemplatesPage = lazy(() => import("../../admin/pages/marketing/EmailTemplatesPage"));
const WhatsAppSettingsPage = lazy(() => import("../../admin/pages/marketing/WhatsAppSettingsPage"));
const WhatsAppTemplatesPage = lazy(() => import("../../admin/pages/marketing/WhatsAppTemplatesPage"));
const AudienceManagementPage = lazy(() => import("../../admin/pages/marketing/AudienceManagementPage"));
const WebsiteFormMappingPage = lazy(() => import("../../admin/pages/marketing/WebsiteFormMappingPage"));
const UtmTrackingPage = lazy(() => import("../../admin/pages/marketing/UtmTrackingPage"));
const AutomationsPage = lazy(() => import("../../admin/pages/marketing/AutomationsPage"));
const CampaignNotificationsPage = lazy(() => import("../../admin/pages/marketing/CampaignNotificationsPage"));
const MarketingReportsPage = lazy(() => import("../../admin/pages/marketing/MarketingReportsPage"));
const ActivityLogsPage = lazy(() => import("../../admin/pages/marketing/ActivityLogsPage"));

/* ===================== BOSS PRD SECTION 10: MARKETING MENU ===================== */
const menus = [
  [
    {
      name: "EPC Marketing Dashboard",
      icon: <FaChartLine />,
      path: "/marketing-panel/dashboard",
      unique_id: "MKT_DASH_OVERVIEW"
    },
    {
      name: "Live Territory Campaign Map",
      icon: <FaMapMarkedAlt />,
      path: "/marketing-panel/campaign-map",
      unique_id: "MKT_MAP"
    },
    {
      name: "Campaign Management",
      icon: <FaBullhorn />,
      path: "/marketing-panel/campaigns",
      unique_id: "MKT_CAMP"
    },
    {
      name: "Seasonal Coupons & Offers",
      icon: <FaGift />,
      path: "/marketing-panel/seasonal-coupons",
      unique_id: "MKT_SEASONAL"
    },
    {
      name: "Create New Campaign",
      icon: <FaPlus />,
      path: "/marketing-panel/create-campaign",
      unique_id: "MKT_CREATE"
    }
  ],
  [
    {
      name: "Email Account Settings",
      icon: <FaEnvelope />,
      path: "/marketing-panel/email-settings",
      unique_id: "MKT_EML_SET"
    },
    {
      name: "Email Templates",
      icon: <FaFileAlt />,
      path: "/marketing-panel/email-templates",
      unique_id: "MKT_EML_TPL"
    },
    {
      name: "WhatsApp Account Settings",
      icon: <FaWhatsapp />,
      path: "/marketing-panel/whatsapp-settings",
      unique_id: "MKT_WA_SET"
    },
    {
      name: "WhatsApp Templates",
      icon: <FaComments />,
      path: "/marketing-panel/whatsapp-templates",
      unique_id: "MKT_WA_TPL"
    }
  ],
  [
    {
      name: "Contact & Audience Management",
      icon: <FaUsers />,
      path: "/marketing-panel/audience",
      unique_id: "MKT_AUDIENCE"
    },
    {
      name: "Website Form Mapping",
      icon: <FaMousePointer />,
      path: "/marketing-panel/form-mapping",
      unique_id: "MKT_FORMS"
    },
    {
      name: "Campaign URL & UTM Tracking",
      icon: <FaGlobe />,
      path: "/marketing-panel/utm-tracking",
      unique_id: "MKT_UTM"
    },
    {
      name: "Automation & Follow-ups",
      icon: <FaBolt />,
      path: "/marketing-panel/automations",
      unique_id: "MKT_AUTO"
    },
    {
      name: "Campaign Notifications",
      icon: <FaBell />,
      path: "/marketing-panel/notifications",
      unique_id: "MKT_NOTIF"
    },
    {
      name: "Campaign Reports",
      icon: <FaChartBar />,
      path: "/marketing-panel/reports",
      unique_id: "MKT_REP"
    },
    {
      name: "Campaign Activity Logs",
      icon: <FaHistory />,
      path: "/marketing-panel/activity-logs",
      unique_id: "MKT_LOGS"
    }
  ]
];

export default function MarketingDashboardPortal() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const normalized = location.pathname.replace(/\/$/, "");
    if (normalized === "/marketing-panel" || normalized === "") {
      navigate("/marketing-panel/dashboard", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setIsOpen(false);
      else setIsOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden font-sans antialiased">
      {/* Dedicated Marketing Sidebar with only Boss's Tabs */}
      <Drawer
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        isMobile={isMobile}
        menuItems={menus}
        menus={menus}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          isMobile={isMobile}
        />

        <main className="flex-1 overflow-y-auto bg-surface-subtle p-3 md:p-6 transition-all duration-200">
          <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <Routes>
                  <Route path="/" element={<Navigate to="/marketing-panel/dashboard" replace />} />
                  <Route path="/dashboard" element={<Suspense fallback={<Loader text="Loading EPC Marketing Dashboard..." />}><MarketingDashboard /></Suspense>} />
                  <Route path="/campaign-map" element={<Suspense fallback={<Loader text="Loading Live India Campaign Map..." />}><IndiaCampaignMap /></Suspense>} />
                  <Route path="/campaigns" element={<Suspense fallback={<Loader text="Loading Campaigns..." />}><CampaignsListPage /></Suspense>} />
                  <Route path="/seasonal-coupons" element={<Suspense fallback={<Loader text="Loading Seasonal Coupons..." />}><SeasonalCouponsPage /></Suspense>} />
                  <Route path="/create-campaign" element={<Suspense fallback={<Loader text="Loading Campaign Setup..." />}><CreateCampaignWizard /></Suspense>} />
                  <Route path="/email-settings" element={<Suspense fallback={<Loader text="Loading Email Settings..." />}><EmailSettingsPage /></Suspense>} />
                  <Route path="/email-templates" element={<Suspense fallback={<Loader text="Loading Email Templates..." />}><EmailTemplatesPage /></Suspense>} />
                  <Route path="/whatsapp-settings" element={<Suspense fallback={<Loader text="Loading WhatsApp Settings..." />}><WhatsAppSettingsPage /></Suspense>} />
                  <Route path="/whatsapp-templates" element={<Suspense fallback={<Loader text="Loading WhatsApp Templates..." />}><WhatsAppTemplatesPage /></Suspense>} />
                  <Route path="/audience" element={<Suspense fallback={<Loader text="Loading Audience Management..." />}><AudienceManagementPage /></Suspense>} />
                  <Route path="/form-mapping" element={<Suspense fallback={<Loader text="Loading Website Form Mappings..." />}><WebsiteFormMappingPage /></Suspense>} />
                  <Route path="/utm-tracking" element={<Suspense fallback={<Loader text="Loading UTM Tracking..." />}><UtmTrackingPage /></Suspense>} />
                  <Route path="/automations" element={<Suspense fallback={<Loader text="Loading Automation Rules..." />}><AutomationsPage /></Suspense>} />
                  <Route path="/notifications" element={<Suspense fallback={<Loader text="Loading Notifications Engine..." />}><CampaignNotificationsPage /></Suspense>} />
                  <Route path="/reports" element={<Suspense fallback={<Loader text="Loading Marketing Reports..." />}><MarketingReportsPage /></Suspense>} />
                  <Route path="/activity-logs" element={<Suspense fallback={<Loader text="Loading Activity Logs..." />}><ActivityLogsPage /></Suspense>} />
                  <Route path="*" element={<Navigate to="/marketing-panel/dashboard" replace />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
