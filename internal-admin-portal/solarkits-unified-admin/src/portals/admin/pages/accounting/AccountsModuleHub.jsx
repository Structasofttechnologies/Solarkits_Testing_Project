import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import Loader from '@/components/Loader';

// Lazy-loaded sub-modules
const InvoiceDoSettings = lazy(() => import('../solar-shop/order-management-settings/InvoiceDoSettings'));
const AccountingOverview = lazy(() => import('./AccountingOverview'));

export default function AccountsModuleHub() {
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  return (
    <div className="w-full">
      <Suspense fallback={<Loader text="Loading Accounts Module..." />}>
        {currentTab === 'overview' ? <AccountingOverview /> : <InvoiceDoSettings />}
      </Suspense>
    </div>
  );
}
