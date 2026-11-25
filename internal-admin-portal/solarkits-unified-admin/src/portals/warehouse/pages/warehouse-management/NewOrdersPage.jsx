import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBoxes } from 'react-icons/fa';
import PageHeader from '../../components/PageHeader';
import NewOrdersDeliveryManager from './NewOrdersDeliveryManager';

export default function NewOrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const prefix = location.pathname.startsWith('/warehouse-management-panel')
    ? '/warehouse-management-panel'
    : '/warehouse';

  const handleNavigateToBosKit = (ord) => {
    navigate(`${prefix}/bos-kit-assembly${ord?._id ? `?orderId=${ord._id}` : ''}`);
  };

  const handleNavigateToOutward = (ord) => {
    navigate(`${prefix}/out-for-delivery`);
  };

  return (
    <div className="space-y-6">
      {/* Module A Header */}
      <PageHeader
        title="New Orders (Procurement Fulfillment)"
        subtitle="Review sales orders confirmed by Account Manager with verified payment, monitor inward progress, and dispatch to BOS Kit Assembly once inwarding is complete."
        icon={FaBoxes}
      />

      {/* Main Delivery Manager Module */}
      <NewOrdersDeliveryManager
        onNavigateToBosKit={handleNavigateToBosKit}
        onNavigateToOutward={handleNavigateToOutward}
      />
    </div>
  );
}
