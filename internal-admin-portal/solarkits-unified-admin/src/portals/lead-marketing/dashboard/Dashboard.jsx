import { Route, Routes, useLocation, useNavigate, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
const MotionDiv = motion.div;
import Header from "../../admin/components/Header";
import Drawer from "../../admin/components/Drawer";
import Loader from "../../admin/components/Loader";
import {
  FaChartLine,
  FaDatabase,
  FaStore,
  FaUserPlus,
  FaShoppingCart,
  FaFileUpload,
  FaGlobeAsia,
  FaEnvelopeOpenText,
  FaBullseye,
  FaMapMarkedAlt,
  FaTrophy,
  FaUserTie,
  FaFileExport,
  FaCog
} from "react-icons/fa";

const LeadOverviewPage = lazy(() => import("../pages/LeadOverviewPage"));
const CentralLeadDatabasePage = lazy(() => import("../pages/CentralLeadDatabasePage"));
const SegmentDashboardPage = lazy(() => import("../pages/SegmentDashboardPage"));
const DynamicLeadUploadPage = lazy(() => import("../pages/DynamicLeadUploadPage"));
const GeographicalLeadMapPage = lazy(() => import("../pages/GeographicalLeadMapPage"));
const LeadEmailCampaignsPage = lazy(() => import("../pages/LeadEmailCampaignsPage"));
const CampaignAnalyticsAndGeoPage = lazy(() => import("../pages/CampaignAnalyticsAndGeoPage"));
const OverallConversionDashboardPage = lazy(() => import("../pages/OverallConversionDashboardPage"));
const BdeFollowUpTrackingPage = lazy(() => import("../pages/BdeFollowUpTrackingPage"));
const LeadReportsExportPage = lazy(() => import("../pages/LeadReportsExportPage"));
const LeadMarketingSettingsPage = lazy(() => import("../pages/LeadMarketingSettingsPage"));

/* Complete 14-Module Admin Sidebar Menu (FRD Section 3) */
const menus = [
  [
    {
      name: "01 Marketing Overview",
      icon: <FaChartLine />,
      path: "/lead-marketing-panel/dashboard",
      unique_id: "LM_OVERVIEW"
    },
    {
      name: "02 Central Lead Database",
      icon: <FaDatabase />,
      path: "/lead-marketing-panel/leads",
      unique_id: "LM_CENTRAL_DB"
    },
    {
      name: "03 Franchisee Leads",
      icon: <FaStore />,
      path: "/lead-marketing-panel/franchisee-leads",
      unique_id: "LM_FRANCHISEE"
    },
    {
      name: "04 EPC Signup Leads",
      icon: <FaUserPlus />,
      path: "/lead-marketing-panel/epc-signup-leads",
      unique_id: "LM_EPC_SIGNUP"
    },
    {
      name: "05 EPC Sales Leads",
      icon: <FaShoppingCart />,
      path: "/lead-marketing-panel/epc-sales-leads",
      unique_id: "LM_EPC_SALES"
    },
    {
      name: "06 Dynamic Lead Upload",
      icon: <FaFileUpload />,
      path: "/lead-marketing-panel/upload",
      unique_id: "LM_UPLOAD"
    },
    {
      name: "07 Geographical Lead Map",
      icon: <FaGlobeAsia />,
      path: "/lead-marketing-panel/geo-map",
      unique_id: "LM_GEO_MAP"
    }
  ],
  [
    {
      name: "08 Email Campaigns",
      icon: <FaEnvelopeOpenText />,
      path: "/lead-marketing-panel/campaigns",
      unique_id: "LM_CAMPAIGNS"
    },
    {
      name: "09 Individual Campaign Analytics",
      icon: <FaBullseye />,
      path: "/lead-marketing-panel/campaign-analytics",
      unique_id: "LM_INDIV_ANALYTICS"
    },
    {
      name: "10 Campaign Geo Analytics",
      icon: <FaMapMarkedAlt />,
      path: "/lead-marketing-panel/geo-analytics",
      unique_id: "LM_GEO_ANALYTICS"
    },
    {
      name: "11 Overall Conversion Dashboard",
      icon: <FaTrophy />,
      path: "/lead-marketing-panel/conversions",
      unique_id: "LM_OVERALL_CONV"
    }
  ],
  [
    {
      name: "12 BDE Follow-up Tracking",
      icon: <FaUserTie />,
      path: "/lead-marketing-panel/bde-tracking",
      unique_id: "LM_BDE_TRACK"
    },
    {
      name: "13 Reports & Export",
      icon: <FaFileExport />,
      path: "/lead-marketing-panel/reports",
      unique_id: "LM_REPORTS"
    },
    {
      name: "14 Marketing Settings",
      icon: <FaCog />,
      path: "/lead-marketing-panel/settings",
      unique_id: "LM_SETTINGS"
    }
  ]
];

export default function LeadMarketingDashboardPortal() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 1024 : false
  );
  const [isOpen, setIsOpen] = useState(
    typeof window !== "undefined" ? window.innerWidth > 1024 : true
  );

  useEffect(() => {
    const normalized = location.pathname.replace(/\/+$/, "");
    if (normalized === "/lead-marketing-panel" || normalized === "") {
      navigate("/lead-marketing-panel/dashboard", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile) setIsOpen(false);
      else setIsOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden font-sans antialiased">
      <Drawer
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        isMobile={isMobile}
        menuItems={menus}
        menus={menus}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header isOpen={isOpen} setIsOpen={setIsOpen} isMobile={isMobile} />

        <main className="flex-1 overflow-y-auto bg-surface-subtle p-3 md:p-6 transition-all duration-200">
          <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <MotionDiv
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <Routes>
                  <Route path="/" element={<Navigate to="/lead-marketing-panel/dashboard" replace />} />
                  <Route
                    path="/dashboard"
                    element={<Suspense fallback={<Loader text="Loading Overview..." />}><LeadOverviewPage /></Suspense>}
                  />
                  <Route
                    path="/leads"
                    element={<Suspense fallback={<Loader text="Loading Central Lead DB..." />}><CentralLeadDatabasePage /></Suspense>}
                  />
                  <Route
                    path="/franchisee-leads"
                    element={
                      <Suspense fallback={<Loader text="Loading Franchisee Leads..." />}>
                        <SegmentDashboardPage key="franchisee_leads" segmentKey="franchisee_leads" />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/epc-signup-leads"
                    element={
                      <Suspense fallback={<Loader text="Loading EPC Signup Leads..." />}>
                        <SegmentDashboardPage key="epc_signup_leads" segmentKey="epc_signup_leads" />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/epc-sales-leads"
                    element={
                      <Suspense fallback={<Loader text="Loading EPC Sales Leads..." />}>
                        <SegmentDashboardPage key="epc_sales_leads" segmentKey="epc_sales_leads" />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/upload"
                    element={<Suspense fallback={<Loader text="Loading Dynamic Lead Upload..." />}><DynamicLeadUploadPage /></Suspense>}
                  />
                  <Route
                    path="/geo-map"
                    element={<Suspense fallback={<Loader text="Loading Geo Lead Map..." />}><GeographicalLeadMapPage /></Suspense>}
                  />
                  <Route
                    path="/campaigns"
                    element={<Suspense fallback={<Loader text="Loading Campaigns..." />}><LeadEmailCampaignsPage /></Suspense>}
                  />
                  <Route
                    path="/campaign-analytics"
                    element={
                      <Suspense fallback={<Loader text="Loading Campaign Analytics..." />}>
                        <CampaignAnalyticsAndGeoPage defaultMode="individual" />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/geo-analytics"
                    element={
                      <Suspense fallback={<Loader text="Loading Geo Analytics..." />}>
                        <CampaignAnalyticsAndGeoPage defaultMode="geo_compare" />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/conversions"
                    element={<Suspense fallback={<Loader text="Loading Overall Conversion..." />}><OverallConversionDashboardPage /></Suspense>}
                  />
                  <Route
                    path="/bde-tracking"
                    element={<Suspense fallback={<Loader text="Loading BDE Follow-ups..." />}><BdeFollowUpTrackingPage /></Suspense>}
                  />
                  <Route
                    path="/reports"
                    element={<Suspense fallback={<Loader text="Loading Reports & Export..." />}><LeadReportsExportPage /></Suspense>}
                  />
                  <Route
                    path="/settings"
                    element={<Suspense fallback={<Loader text="Loading Settings..." />}><LeadMarketingSettingsPage /></Suspense>}
                  />
                  <Route path="*" element={<Navigate to="/lead-marketing-panel/dashboard" replace />} />
                </Routes>
              </MotionDiv>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
