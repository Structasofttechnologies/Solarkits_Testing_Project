import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setAlert } from '@/features/alert.slice';
import { authHeaderObj } from '@/app/authHeader';
import {
  FiUsers,
  FiPlus,
  FiSearch,
  FiLayers,
  FiAward,
  FiCheckCircle,
  FiMapPin,
  FiPhone,
  FiMail,
  FiEdit,
  FiX,
  FiInfo,
} from 'react-icons/fi';
import Button from '@/components/Button';
import Loader from '@/components/Loader';

export default function BdeClusterManagement() {
  const dispatch = useDispatch();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Masters
  const [clusters, setClusters] = useState([]);
  const [bdes, setBdes] = useState([]);

  // Assignment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClusterId, setSelectedClusterId] = useState('');
  const [selectedPrimaryBde, setSelectedPrimaryBde] = useState('');
  const [selectedSupportBdes, setSelectedSupportBdes] = useState([]);
  const [assignReason, setAssignReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMappings();
    fetchMasters();
  }, []);

  const fetchMasters = async () => {
    try {
      const [cluRes, bdeRes] = await Promise.all([
        axios.get(`${API_URL}/franchise-clusters/list`, authHeaderObj()).catch(() => ({ data: { data: [] } })),
        axios
          .get(`${API_URL}/franchise-clusters/bdes`, authHeaderObj())
          .catch(() => axios.get(`${API_URL}/franchise-clusters/bde/mappings`, authHeaderObj()))
          .catch(() => axios.get(`${API_URL}/store-management/bde/list?unique_id=RSL_MGMT&req_for=view`, authHeaderObj()))
          .catch(() => axios.get(`${API_URL}/bde/list?unique_id=ADM_BDE_MGMT&req_for=view&limit=500`, authHeaderObj())),
      ]);
      if (cluRes?.data?.data) setClusters(cluRes.data.data);
      const bdeList = bdeRes?.data?.data || bdeRes?.data?.bdes || [];
      if (Array.isArray(bdeList)) setBdes(bdeList);
    } catch (err) {
      console.error('Error loading masters for BDE mapping:', err);
    }
  };

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/franchise-clusters/bde/mappings`, authHeaderObj());
      if (res.data?.status === 'success') {
        setMappings(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loading BDE mappings:', err);
      dispatch(setAlert({ title: 'Error', message: 'Failed to load BDE cluster mappings', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // Submit BDE Assignment
  const handleAssignBde = async (e) => {
    e.preventDefault();
    if (!selectedClusterId) {
      dispatch(setAlert({ title: 'Validation', message: 'Please select a Cluster', type: 'error' }));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        cluster_id: selectedClusterId,
        primary_bde_id: selectedPrimaryBde || null,
        support_bde_ids: selectedSupportBdes,
        reason: assignReason.trim() || 'Admin mapped BDE to cluster',
      };

      await axios.post(`${API_URL}/franchise-clusters/bde/assign-cluster`, payload, authHeaderObj());
      dispatch(setAlert({ title: 'Success', message: 'BDE successfully assigned to cluster', type: 'success' }));
      setIsModalOpen(false);
      setAssignReason('');
      fetchMappings();
    } catch (err) {
      console.error('Error assigning BDE to cluster:', err);
      dispatch(setAlert({ title: 'Error', message: err.response?.data?.message || err.message, type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered mappings
  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.full_name?.toLowerCase().includes(q) ||
        m.bde_code?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.mobile_number?.includes(q)
      );
    });
  }, [mappings, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FiAward size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">BDE Cluster Assignment & Management</h1>
            <p className="text-xs font-semibold text-slate-500">
              Assign primary and support BDEs to franchisee clusters for territory business development
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setSelectedClusterId('');
            setSelectedPrimaryBde('');
            setSelectedSupportBdes([]);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
        >
          <FiPlus size={16} /> Assign BDE to Cluster
        </Button>
      </div>

      {/* Filter / Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <FiSearch className="absolute left-3.5 top-3 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search BDE name, ID, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="text-xs font-bold text-slate-500">
          Total BDEs: <span className="text-purple-600 font-extrabold">{mappings.length}</span>
        </div>
      </div>

      {/* BDE Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader text="Loading BDE Cluster Mappings..." />
          </div>
        ) : filteredMappings.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <FiUsers size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No BDE Mappings Found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">BDE Officer</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Primary Assigned Clusters</th>
                  <th className="px-5 py-4">Support Clusters</th>
                  <th className="px-5 py-4 text-center">Mapped Stores</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMappings.map((m) => (
                  <tr key={m.bde_id} className="hover:bg-slate-50/70 transition-colors">
                    {/* BDE Name & ID */}
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-900">{m.full_name}</div>
                      <div className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded mt-0.5">
                        {m.bde_code}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-4">
                      <div className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
                        <FiPhone size={12} className="text-slate-400" /> {m.mobile_number}
                      </div>
                      <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                        <FiMail size={12} className="text-slate-400" /> {m.email}
                      </div>
                    </td>

                    {/* Primary Clusters */}
                    <td className="px-5 py-4">
                      {m.primary_clusters.length === 0 ? (
                        <span className="text-xs italic text-slate-400">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {m.primary_clusters.map((c) => (
                            <span
                              key={c.id}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800"
                              title={`${c.state_name}: ${(c.district_names || []).join(', ')}`}
                            >
                              {c.cluster_name} <span className="text-purple-600">({c.cluster_code})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Support Clusters */}
                    <td className="px-5 py-4">
                      {m.support_clusters.length === 0 ? (
                        <span className="text-xs italic text-slate-400">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {m.support_clusters.map((c) => (
                            <span
                              key={c.id}
                              className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600"
                            >
                              {c.cluster_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Total Stores Mapped */}
                    <td className="px-5 py-4 text-center">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800">
                        {m.total_franchisees_count} Franchisees
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedPrimaryBde(m.bde_id);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-bold text-xs"
                      >
                        Assign Cluster
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ASSIGN BDE MODAL ────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-base">Assign BDE to Franchisee Cluster</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignBde} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold">Select Cluster *</label>
                <select
                  required
                  value={selectedClusterId}
                  onChange={(e) => {
                    setSelectedClusterId(e.target.value);
                    const clu = clusters.find((c) => c._id === e.target.value);
                    if (clu?.primary_bde_id?._id) setSelectedPrimaryBde(clu.primary_bde_id._id);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                >
                  <option value="">Choose Cluster</option>
                  {clusters.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.cluster_name} ({c.cluster_code}) - {c.state_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold">Primary BDE *</label>
                <select
                  required
                  value={selectedPrimaryBde}
                  onChange={(e) => setSelectedPrimaryBde(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                >
                  <option value="">Select Primary BDE</option>
                  {bdes.map((b) => (
                    <option key={b._id || b.id || b.bde_id} value={b._id || b.id || b.bde_id}>
                      {b.full_name || b.name} ({b.bde_id || b.bde_code || b.employee_id || 'BDE'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  Main point of contact for franchisee operations & EPC targets
                </p>
              </div>

              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold">Assignment Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Territory realignment, onboarding support..."
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg font-bold text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg font-bold"
                >
                  {submitting ? 'Saving...' : 'Confirm Assignment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
