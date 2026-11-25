import React from 'react';
import { FaShippingFast } from 'react-icons/fa';
import PageHeader from '../../components/PageHeader';
import TrackDeliveryHub from './TrackDeliveryHub';

export default function TrackDeliveryPage() {
  return (
    <div className="space-y-6">
      {/* Module C Header */}
      <PageHeader
        title="Track Delivery & POD Hub"
        subtitle="Live tracking of dispatched vehicles, destination proof photos, customer 6-digit OTP confirmation, and complete delivery audit trail."
        icon={FaShippingFast}
      />

      {/* Track Delivery Hub */}
      <TrackDeliveryHub />
    </div>
  );
}
