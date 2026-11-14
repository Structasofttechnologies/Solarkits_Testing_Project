import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BdeAuthProvider } from './context/BdeAuthContext';
import BdeProtectedRoute from './components/BdeProtectedRoute';
import BdeLayout from './components/BdeLayout';
import BdeLogin from './pages/BdeLogin';
import BdeDashboard from './pages/BdeDashboard';
import BdeLeads from './pages/BdeLeads';
import BdeEpcLeads from './pages/BdeEpcLeads';
import BdeEpcOnboardingWizard from './pages/BdeEpcOnboardingWizard';
import BdeFranchisees from './pages/BdeFranchisees';
import BdeOrderHistoryAndKits from './pages/BdeOrderHistoryAndKits';
import BdePerformanceRanking from './pages/BdePerformanceRanking';
import BdeGoals from './pages/BdeGoals';
import BdeStoreSetup from './pages/BdeStoreSetup';
import BdeNotifications from './pages/BdeNotifications';
import BdeProfile from './pages/BdeProfile';
import BdeEpcQuotes from './pages/BdeEpcQuotes';
import BdeCreateEpcQuote from './pages/BdeCreateEpcQuote';
import BdeEpcQuoteDetail from './pages/BdeEpcQuoteDetail';
import BdeEpcQuoteFollowupList from './pages/BdeEpcQuoteFollowupList';
import BdePoOrders from './pages/BdePoOrders';
import BdeEpcAnalytics from './pages/BdeEpcAnalytics';

export default function App() {
  return (
    <BrowserRouter>
      <BdeAuthProvider>
        <Routes>
          <Route path="/login" element={<BdeLogin />} />

          <Route element={<BdeProtectedRoute />}>
            <Route element={<BdeLayout />}>
              <Route path="/" element={<BdeDashboard />} />
              <Route path="/leads" element={<BdeLeads />} />
              <Route path="/franchisee-leads" element={<BdeLeads />} />
              <Route path="/epc-leads" element={<BdeEpcLeads />} />
              <Route path="/epc-onboarding" element={<BdeEpcOnboardingWizard />} />
              <Route path="/epc-management" element={<BdeEpcOnboardingWizard />} />
              <Route path="/purchase-orders" element={<BdePoOrders />} />
              <Route path="/po-orders" element={<BdePoOrders />} />
              <Route path="/epc-analytics" element={<BdeEpcAnalytics />} />
              <Route path="/epc-quotes" element={<BdeEpcQuotes />} />
              <Route path="/epc-quotes/create" element={<BdeCreateEpcQuote />} />
              <Route path="/epc-quotes/:id" element={<BdeEpcQuoteDetail />} />
              <Route path="/epc-quote-followups" element={<BdeEpcQuoteFollowupList />} />
              <Route path="/franchisees" element={<Navigate to="/#franchisee-goals-section" replace />} />
              <Route path="/order-history" element={<BdeOrderHistoryAndKits />} />
              <Route path="/ranking" element={<BdePerformanceRanking />} />
              <Route path="/goals" element={<BdeGoals />} />
              <Route path="/store-setup" element={<BdeStoreSetup />} />
              <Route path="/notifications" element={<BdeNotifications />} />
              <Route path="/profile" element={<BdeProfile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BdeAuthProvider>
    </BrowserRouter>
  );
}