import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaTruckLoading } from 'react-icons/fa';
import PageHeader from '../../components/PageHeader';
import OutForDeliveryStation from './OutForDeliveryStation';

export default function OutForDeliveryPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigateToTracking = (order) => {
    const prefix = location.pathname.startsWith('/warehouse-management-panel')
      ? '/warehouse-management-panel'
      : '/warehouse';
    navigate(`${prefix}/track-delivery`);
  };

  return (
    <div className="space-y-6">
      {/* Module B Header */}
      <PageHeader
        title="Out for Delivery (Dispatch Gate)"
        subtitle="Configure vehicle and transporter details, submit E-Way Bill requests to Account Manager, upload vehicle rear loading photos and delivery challans for gate clearance."
        icon={FaTruckLoading}
      />

      {/* Dispatch Preparation Station */}
      <OutForDeliveryStation onNavigateToTracking={handleNavigateToTracking} />
    </div>
  );
}
