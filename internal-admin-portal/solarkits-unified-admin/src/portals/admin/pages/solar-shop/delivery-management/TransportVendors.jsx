import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setAlert } from '../../../features/alert.slice';
import { FaBuilding, FaPlus, FaEdit, FaTrash, FaTruck, FaPhone, FaMapMarkerAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import PageHeader from '../../../components/PageHeader';
import Button from '../../../components/Button';
import CustomInput from '../../../components/CustomInput';
import Drawer from '../../../components/Drawer';
import Dialog from '../../../components/Dialog';
import Loader from '../../../components/Loader';
import { deliveryApi } from '../../../api/deliveryApi';

export default function TransportVendors() {
  const dispatch = useDispatch();
  const [providers, setProviders] = useState([]);
  const [vehicleMasters, setVehicleMasters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);

  // Vehicle Onboarding Modal state
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [selectedProviderForVehicle, setSelectedProviderForVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_master_id: '',
    registration_number: '',
    load_capacity_kg: '',
    current_status: 'Available',
    assigned_driver_name: '',
    assigned_driver_mobile: '',
    assigned_driver_license: '',
  });

  const initialProviderForm = {
    name: '',
    owner_name: '',
    mobile_number: '',
    customer_service_number: '',
    email: '',
    gst_number: '',
    registered_address: '',
    status: 'Active',
  };
  const [providerForm, setProviderForm] = useState(initialProviderForm);

  const showAlert = (message, type = 'success') => {
    dispatch(setAlert({ type, message }));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, vRes] = await Promise.all([
        deliveryApi.getServiceProviders(),
        deliveryApi.getVehicleMasters(),
      ]);
      if (pRes.status === 'success') setProviders(pRes.data || []);
      if (vRes.status === 'success') setVehicleMasters(vRes.data || []);
    } catch (err) {
      console.error(err);
      showAlert('Failed to load transport vendors', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenProviderDrawer = (p = null) => {
    if (p) {
      setEditingProvider(p);
      setProviderForm({
        name: p.name,
        owner_name: p.owner_name,
        mobile_number: p.mobile_number,
        customer_service_number: p.customer_service_number || '',
        email: p.email || '',
        gst_number: p.gst_number || '',
        registered_address: p.registered_address || '',
        status: p.status || 'Active',
      });
    } else {
      setEditingProvider(null);
      setProviderForm(initialProviderForm);
    }
    setDrawerOpen(true);
  };

  const handleSubmitProvider = async (e) => {
    e.preventDefault();
    if (!providerForm.name || !providerForm.owner_name || !providerForm.mobile_number) {
      showAlert('Please enter Name, Contact Person and Mobile Number.', 'error');
      return;
    }

    try {
      if (editingProvider) {
        await deliveryApi.updateServiceProvider(editingProvider._id, providerForm);
        showAlert('Service Provider updated.');
      } else {
        await deliveryApi.createServiceProvider(providerForm);
        showAlert('Service Provider onboarded successfully.');
      }
      setDrawerOpen(false);
      loadData();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save provider', 'error');
    }
  };

  const handleDeleteProvider = async (id) => {
    if (!window.confirm('Deactivate this transport service provider?')) return;
    try {
      await deliveryApi.deleteServiceProvider(id);
      showAlert('Provider deactivated.');
      loadData();
    } catch (err) {
      showAlert('Failed to deactivate provider', 'error');
    }
  };

  // Vehicle Onboarding Under Provider
  const handleOpenOnboardModal = (provider) => {
    setSelectedProviderForVehicle(provider);
    setVehicleForm({
      vehicle_master_id: vehicleMasters[0]?._id || '',
      registration_number: '',
      load_capacity_kg: vehicleMasters[0]?.max_load_kg || '',
      current_status: 'Available',
      assigned_driver_name: '',
      assigned_driver_mobile: '',
      assigned_driver_license: '',
    });
    setOnboardModalOpen(true);
  };

  const handleVehicleMasterSelect = (masterId) => {
    const selected = vehicleMasters.find((v) => v._id === masterId);
    setVehicleForm({
      ...vehicleForm,
      vehicle_master_id: masterId,
      load_capacity_kg: selected ? selected.max_load_kg : '',
    });
  };

  const handleOnboardVehicleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleForm.vehicle_master_id || !vehicleForm.registration_number || !vehicleForm.load_capacity_kg) {
      showAlert('Please choose Vehicle Master, enter Registration # and Capacity.', 'error');
      return;
    }

    try {
      await deliveryApi.createFleetVehicle({
        service_provider_id: selectedProviderForVehicle._id,
        vehicle_master_id: vehicleForm.vehicle_master_id,
        registration_number: vehicleForm.registration_number,
        load_capacity_kg: Number(vehicleForm.load_capacity_kg),
        current_status: vehicleForm.current_status,
        assigned_driver: {
          name: vehicleForm.assigned_driver_name,
          mobile: vehicleForm.assigned_driver_mobile,
          license_number: vehicleForm.assigned_driver_license,
        },
      });

      showAlert(`Vehicle ${vehicleForm.registration_number.toUpperCase()} onboarded to ${selectedProviderForVehicle.name}.`);
      setOnboardModalOpen(false);
      loadData();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to onboard vehicle', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Transport Vendor Onboarding"
        subtitle="Manage Delivery Service Providers, contact details, GST, and onboard actual physical vehicles."
        icon={FaBuilding}
        actions={
          <Button
            onClick={() => handleOpenProviderDrawer()}
            className="flex items-center gap-2 bg-white text-blue-700 hover:bg-white/90 font-semibold shadow-md px-4 py-2.5 rounded-xl text-sm transition-all"
          >
            <FaPlus /> Onboard Service Provider
          </Button>
        }
      />

      {loading ? (
        <Loader text="Loading transport providers..." />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase text-xs">
                <tr>
                  <th className="py-3 px-4">Provider Code</th>
                  <th className="py-3 px-4">Provider Name</th>
                  <th className="py-3 px-4">Owner / Contact</th>
                  <th className="py-3 px-4">Phone / Care</th>
                  <th className="py-3 px-4">GST Number</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Add Vehicle</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-slate-500">
                      No transport providers onboarded yet.
                    </td>
                  </tr>
                ) : (
                  providers.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-blue-600">{p.provider_code}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 text-slate-700">{p.owner_name}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{p.mobile_number}</div>
                        {p.customer_service_number ? (
                          <div className="text-xs text-slate-400">Care: {p.customer_service_number}</div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{p.gst_number || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.status === 'Active' ? <FaCheckCircle className="text-emerald-500 text-[10px]" /> : <FaTimesCircle className="text-slate-400 text-[10px]" />}
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          onClick={() => handleOpenOnboardModal(p)}
                          className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1"
                        >
                          <FaTruck className="text-xs" /> + Onboard Vehicle
                        </Button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenProviderDrawer(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteProvider(p._id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Deactivate"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provider Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingProvider ? 'Edit Transport Provider' : 'Onboard Service Provider'}
        width="max-w-xl"
      >
        <form onSubmit={handleSubmitProvider} className="p-6 space-y-4">
          <CustomInput
            label="Service Provider Name *"
            placeholder="e.g. VRL Logistics, SafeX Transporters"
            value={providerForm.name}
            onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <CustomInput
              label="Owner / Contact Person *"
              placeholder="e.g. Rajesh Patil"
              value={providerForm.owner_name}
              onChange={(e) => setProviderForm({ ...providerForm, owner_name: e.target.value })}
              required
            />
            <CustomInput
              label="Mobile Number *"
              placeholder="e.g. 9876543210"
              value={providerForm.mobile_number}
              onChange={(e) => setProviderForm({ ...providerForm, mobile_number: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CustomInput
              label="Customer Service Number"
              placeholder="e.g. 1800-123-4567"
              value={providerForm.customer_service_number}
              onChange={(e) => setProviderForm({ ...providerForm, customer_service_number: e.target.value })}
            />
            <CustomInput
              label="Email"
              type="email"
              placeholder="e.g. dispatch@vrllogistics.com"
              value={providerForm.email}
              onChange={(e) => setProviderForm({ ...providerForm, email: e.target.value })}
            />
          </div>

          <CustomInput
            label="GST Number"
            placeholder="e.g. 27AABCV1234F1Z5"
            value={providerForm.gst_number}
            onChange={(e) => setProviderForm({ ...providerForm, gst_number: e.target.value.toUpperCase() })}
          />

          <CustomInput
            label="Registered Address"
            placeholder="Street address, city, state, pincode"
            value={providerForm.registered_address}
            onChange={(e) => setProviderForm({ ...providerForm, registered_address: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={providerForm.status}
              onChange={(e) => setProviderForm({ ...providerForm, status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" onClick={() => setDrawerOpen(false)} className="bg-slate-100 text-slate-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 text-white">
              {editingProvider ? 'Update Provider' : 'Onboard Provider'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Onboard Physical Vehicle Modal (Section 2 Vehicle Onboarding Flow) */}
      <Dialog
        isOpen={onboardModalOpen}
        onClose={() => setOnboardModalOpen(false)}
        title={`Onboard Vehicle to ${selectedProviderForVehicle?.name || 'Provider'}`}
        width="max-w-lg"
      >
        <form onSubmit={handleOnboardVehicleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Select an existing specification from <strong>Vehicle Master</strong> rather than defining vehicle dimensions from scratch.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Vehicle from Vehicle Master *</label>
            <select
              value={vehicleForm.vehicle_master_id}
              onChange={(e) => handleVehicleMasterSelect(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {vehicleMasters.map((vm) => (
                <option key={vm._id} value={vm._id}>
                  {vm.name} ({vm.brand_make} • {vm.max_load_kg.toLocaleString()} KG)
                </option>
              ))}
            </select>
          </div>

          <CustomInput
            label="Registration Number *"
            placeholder="e.g. MH-12-AB-1234"
            value={vehicleForm.registration_number}
            onChange={(e) => setVehicleForm({ ...vehicleForm, registration_number: e.target.value.toUpperCase() })}
            required
          />

          <CustomInput
            label="Vehicle Load Capacity (KG) *"
            type="number"
            value={vehicleForm.load_capacity_kg}
            onChange={(e) => setVehicleForm({ ...vehicleForm, load_capacity_kg: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Initial Status</label>
            <select
              value={vehicleForm.current_status}
              onChange={(e) => setVehicleForm({ ...vehicleForm, current_status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Available">Available</option>
              <option value="Unavailable">Unavailable</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-semibold text-slate-700 uppercase mb-2">Assigned Driver (Optional)</h4>
            <div className="grid grid-cols-2 gap-3">
              <CustomInput
                label="Driver Name"
                placeholder="Driver full name"
                value={vehicleForm.assigned_driver_name}
                onChange={(e) => setVehicleForm({ ...vehicleForm, assigned_driver_name: e.target.value })}
              />
              <CustomInput
                label="Driver Mobile"
                placeholder="Mobile number"
                value={vehicleForm.assigned_driver_mobile}
                onChange={(e) => setVehicleForm({ ...vehicleForm, assigned_driver_mobile: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" onClick={() => setOnboardModalOpen(false)} className="bg-slate-100 text-slate-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 text-white">
              Save & Register Vehicle
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
