import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FaUserEdit,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationCircle,
} from 'react-icons/fa';
import { bdeApi } from '../../../api/bdeApi';
import Loader from '../../../components/Loader';

export default function EditBde({ moduleUniqueId = 'ADM_BDE_MGMT' }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    profile_photo: '',
    mobile_number: '',
    email: '',
    address: '',
    state_id: '',
    state_name: '',
    district_id: '',
    district_name: '',
    joining_date: '',
    pin: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [statesRes, bdeRes] = await Promise.all([
        bdeApi.getStates(),
        bdeApi.getBdeDetail(id, moduleUniqueId),
      ]);

      const stateList = statesRes.states || statesRes.data || [];
      setStates(stateList);

      const bde = bdeRes.data;
      if (bde) {
        setFormData({
          full_name: bde.full_name || '',
          profile_photo: bde.profile_photo || '',
          mobile_number: bde.mobile_number || '',
          email: bde.email || '',
          address: bde.address || '',
          state_id: bde.state_id || '',
          state_name: bde.state_name || '',
          district_id: bde.district_id || '',
          district_name: bde.district_name || '',
          joining_date: bde.joining_date ? new Date(bde.joining_date).toISOString().split('T')[0] : '',
        });

        if (bde.state_id) {
          const distRes = await bdeApi.getDistricts(bde.state_id);
          setDistricts(distRes.districts || distRes.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load BDE detail', err);
      setError(err.message || 'Failed to load BDE');
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = async (e) => {
    const sId = e.target.value;
    const sObj = states.find(s => (s._id || s.id) === sId);
    setFormData(prev => ({
      ...prev,
      state_id: sId,
      state_name: sObj ? sObj.name : '',
      district_id: '',
      district_name: '',
    }));

    if (sId) {
      try {
        const res = await bdeApi.getDistricts(sId);
        setDistricts(res.districts || res.data || []);
      } catch (err) {
        console.error('Failed to load districts', err);
      }
    } else {
      setDistricts([]);
    }
  };

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanPin = formData.pin ? String(formData.pin).trim() : '';
    if (cleanPin && !/^\d{4}$/.test(cleanPin)) {
      setError('4-digit PIN must be exactly 4 numeric digits (0-9).');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...formData,
        pin: cleanPin || undefined,
        new_pin: cleanPin || undefined,
      };
      await bdeApi.updateBde(id, payload, moduleUniqueId);
      setSuccess('BDE profile updated successfully!');
      setTimeout(() => {
        navigate(`/admin-panel/bde-management/profile/${id}`);
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update BDE');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Loading BDE details..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-900 font-sans">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(`/admin-panel/bde-management/profile/${id}`)}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          <FaArrowLeft /> Back to Profile
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-slate-50 to-white">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-blue-100 text-[#0575B8] rounded-2xl shadow-xs">
              <FaUserEdit className="text-2xl" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Edit BDE Profile</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Update personal and contact details</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 text-xs">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5 font-semibold">
              <FaExclamationCircle className="text-lg text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 font-bold">
              <FaCheckCircle className="text-lg text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Full Name *</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Mobile Number *</label>
              <input
                type="tel"
                required
                maxLength={10}
                value={formData.mobile_number}
                onChange={(e) => handleChange('mobile_number', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-[#0575B8] focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Profile Photo URL</label>
              <input
                type="url"
                value={formData.profile_photo}
                onChange={(e) => handleChange('profile_photo', e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#0575B8] focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Primary State</label>
              <select
                value={formData.state_id}
                onChange={handleStateChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white"
              >
                <option value="">Select State</option>
                {states.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Primary District</label>
              <select
                value={formData.district_id}
                onChange={(e) => {
                  const dId = e.target.value;
                  const dObj = districts.find(d => (d._id || d.id) === dId);
                  setFormData(prev => ({ ...prev, district_id: dId, district_name: dObj ? dObj.name : '' }));
                }}
                disabled={!formData.state_id || districts.length === 0}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white disabled:opacity-50"
              >
                <option value="">Select District</option>
                {districts.map(d => (
                  <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#0575B8] focus:bg-white resize-none font-medium"
              />
            </div>

            {/* Optional 4-Digit PIN Update */}
            <div className="space-y-1.5 md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                Update 4-Digit Login PIN <span className="text-slate-400 font-normal tracking-normal">(Leave blank to keep current PIN unchanged)</span>
              </label>
              <input
                type="text"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.pin}
                onChange={(e) => handleChange('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Enter new 4-digit PIN (e.g. 1234)"
                className="w-full max-w-xs px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-base tracking-[0.25em] focus:outline-none focus:border-[#0575B8]"
              />
              <p className="text-[11px] text-slate-500 font-medium">
                Changing this will update the BDE's login PIN immediately and terminate active sessions.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate(`/admin-panel/bde-management/profile/${id}`)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 rounded-xl bg-[#0575B8] hover:bg-[#045D93] text-white font-bold transition text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
