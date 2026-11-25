import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaTools } from 'react-icons/fa';
import PageHeader from '../../components/PageHeader';
import NewOrdersDeliveryManager from './NewOrdersDeliveryManager';

export default function BosKitAssemblyPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigateToOutward = (ord) => {
    const prefix = location.pathname.startsWith('/warehouse-management-panel')
      ? '/warehouse-management-panel'
      : '/warehouse';
    navigate(`${prefix}/out-for-delivery`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="BOS Kit Assembly & Preparation Workstation"
        subtitle="Manage warehouse kit preparation, BOM component picking, QC inspection, unique barcode labeling, and staging for dispatch."
        icon={FaTools}
      />

      <NewOrdersDeliveryManager
        onNavigateToOutward={handleNavigateToOutward}
        defaultTab="boskit_station"
        standaloneBoskit={true}
      />
    </div>
  );
}
