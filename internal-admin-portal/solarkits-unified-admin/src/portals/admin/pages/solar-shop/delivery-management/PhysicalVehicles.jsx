import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setAlert } from '../../../features/alert.slice';
import { FaTruckLoading, FaUser, FaPhone, FaCheckCircle, FaExclamationTriangle, FaFilter } from 'react-icons/fa';
import PageHeader from '../../../components/PageHeader';
import Loader from '../../../components/Loader';
import { deliveryApi } from '../../../api/deliveryApi';

const STATUS_BADGES = {
  Available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Reserved: 'bg-amber-50 text-amber-700 border-amber-200',
  Assigned: 'bg-blue-50 text-blue-700 border-blue-200',
  Loading: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'In Transit': 'bg-purple-50 text-purple-700 border-purple-200',
  Delivered: 'bg-teal-50 text-teal-700 border-teal-200',
  Unavailable: 'bg-slate-100 text-slate-600 border-slate-200',
  Maintenance: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function PhysicalVehicles() {
  const dispatch = useDispatch();
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  const showAlert = (message, type = 'success') => {
    dispatch(setAlert({ type, message }));
  };

  const loadFleet = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      const res = await deliveryApi.getFleetVehicles(params);
      if (res.status === 'success') {
        setFleet(res.data || []);
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to load physical vehicle fleet', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleet();
  }, [statusFilter]);

  const handleStatusChange = async (vehicleId, newStatus) => {
    try {
      await deliveryApi.updateFleetVehicle(vehicleId, { current_status: newStatus });
      showAlert(`Vehicle status updated to ${newStatus}`);
      loadFleet();
    } catch (err) {
      showAlert('Failed to update status', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Vehicle Database – Live Fleet"
        subtitle="Live physical vehicles, real-time availability, driver assignments, and active delivery concurrency."
        icon={FaTruckLoading}
        actions={
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-xs border border-white/25 px-3 py-1.5 rounded-xl">
            <FaFilter className="text-white/70 text-xs" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer [&>option]:text-slate-800"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Assigned">Assigned</option>
              <option value="Loading">Loading</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Unavailable">Unavailable</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        }
      />

      {loading ? (
        <Loader text="Loading fleet database..." />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase text-xs">
                <tr>
                  <th className="py-3 px-4">Registration #</th>
                  <th className="py-3 px-4">Vehicle Type & Make</th>
                  <th className="py-3 px-4">Service Provider</th>
                  <th className="py-3 px-4">Capacity (KG)</th>
                  <th className="py-3 px-4">Assigned Driver</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Active Delivery</th>
                  <th className="py-3 px-4 text-right">Change Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fleet.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-slate-500">
                      No vehicles found matching filter.
                    </td>
                  </tr>
                ) : (
                  fleet.map((v) => {
                    const isBusy = ['Assigned', 'Loading', 'In Transit'].includes(v.current_status);
                    return (
                      <tr key={v._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{v.registration_number}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{v.vehicle_master_id?.name || 'Custom'}</div>
                          <div className="text-xs text-slate-400">{v.vehicle_master_id?.brand_make} • {v.vehicle_master_id?.model}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {v.service_provider_id?.name || 'In-House'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {v.load_capacity_kg.toLocaleString()} KG
                        </td>
                        <td className="py-3 px-4">
                          {v.assigned_driver?.name ? (
                            <div className="text-slate-800 flex items-center gap-1">
                              <FaUser className="text-slate-400 text-xs" />
                              <span>{v.assigned_driver.name}</span>
                              {v.assigned_driver.mobile ? (
                                <span className="text-xs text-slate-500">({v.assigned_driver.mobile})</span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            STATUS_BADGES[v.current_status] || 'bg-slate-100 text-slate-600'
                          }`}>
                            {isBusy ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            ) : null}
                            {v.current_status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {v.current_delivery_id ? (
                            <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              Active Trip
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select
                            value={v.current_status}
                            onChange={(e) => handleStatusChange(v._id, e.target.value)}
                            className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Available">Available</option>
                            <option value="Reserved">Reserved</option>
                            <option value="Assigned">Assigned</option>
                            <option value="Loading">Loading</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Unavailable">Unavailable</option>
                            <option value="Maintenance">Maintenance</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
