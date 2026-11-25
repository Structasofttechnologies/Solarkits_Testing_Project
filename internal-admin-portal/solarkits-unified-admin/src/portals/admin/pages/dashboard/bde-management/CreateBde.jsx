import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUserTie,
  FaArrowLeft,
  FaShieldAlt,
  FaIdCard,
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaCloudUploadAlt,
  FaFilePdf,
  FaTrashAlt,
  FaCamera,
} from 'react-icons/fa';
import { bdeApi } from '../../../api/bdeApi';

export default function CreateBde({ moduleUniqueId = 'ADM_BDE_MGMT' }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    bde_id: '',
    mobile_number: '',
    email: '',
    address: '',
    state_id: '',
    state_name: '',
    district_id: '',
    district_name: '',
    joining_date: new Date().toISOString().split('T')[0],
    profile_photo: '',
    // KYC
    aadhaar_number: '',
    aadhaar_document_url: '',
    pan_number: '',
    pan_document_url: '',
    kyc_remarks: '',
    // Credentials
    pin: '1234',
    initial_password: '1234',
  });

  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [aadhaarPreview, setAadhaarPreview] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [panPreview, setPanPreview] = useState(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);

  const [aadhaarDragOver, setAadhaarDragOver] = useState(false);
  const [panDragOver, setPanDragOver] = useState(false);

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchStates();
  }, []);

  useEffect(() => {
    return () => {
      if (aadhaarPreview && aadhaarPreview.startsWith('blob:')) URL.revokeObjectURL(aadhaarPreview);
      if (panPreview && panPreview.startsWith('blob:')) URL.revokeObjectURL(panPreview);
      if (profilePhotoPreview && profilePhotoPreview.startsWith('blob:')) URL.revokeObjectURL(profilePhotoPreview);
    };
  }, [aadhaarPreview, panPreview, profilePhotoPreview]);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDocumentSelect = (type, file) => {
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setValidationErrors(prev => ({
        ...prev,
        [type === 'aadhaar' ? 'aadhaar_document' : 'pan_document']: 'File size exceeds 10MB limit',
      }));
      return;
    }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type) && !/\.(jpe?g|png|webp|pdf)$/i.test(file.name)) {
      setValidationErrors(prev => ({
        ...prev,
        [type === 'aadhaar' ? 'aadhaar_document' : 'pan_document']: 'Only JPG, PNG, WEBP and PDF files are allowed',
      }));
      return;
    }

    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
    const previewUrl = isImage ? URL.createObjectURL(file) : null;

    if (type === 'aadhaar') {
      if (aadhaarPreview && aadhaarPreview.startsWith('blob:')) URL.revokeObjectURL(aadhaarPreview);
      setAadhaarFile(file);
      setAadhaarPreview(previewUrl);
      setValidationErrors(prev => ({ ...prev, aadhaar_document: null }));
    } else if (type === 'pan') {
      if (panPreview && panPreview.startsWith('blob:')) URL.revokeObjectURL(panPreview);
      setPanFile(file);
      setPanPreview(previewUrl);
      setValidationErrors(prev => ({ ...prev, pan_document: null }));
    }
  };

  const handleProfilePhotoSelect = (file) => {
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setValidationErrors(prev => ({ ...prev, profile_photo: 'Photo size exceeds 5MB limit' }));
      return;
    }
    if (!file.type.startsWith('image/')) {
      setValidationErrors(prev => ({ ...prev, profile_photo: 'Only image files are allowed for profile photo' }));
      return;
    }
    if (profilePhotoPreview && profilePhotoPreview.startsWith('blob:')) URL.revokeObjectURL(profilePhotoPreview);
    setProfilePhotoFile(file);
    setProfilePhotoPreview(URL.createObjectURL(file));
    setValidationErrors(prev => ({ ...prev, profile_photo: null }));
  };

  const fetchStates = async () => {
    try {
      const res = await bdeApi.getStates();
      setStates(res.states || res.data || []);
    } catch (err) {
      console.error('Failed to fetch states', err);
    }
  };

  const fetchDistricts = async (stateId) => {
    try {
      const res = await bdeApi.getDistricts(stateId);
      setDistricts(res.districts || res.data || []);
    } catch (err) {
      console.error('Failed to fetch districts', err);
    }
  };

  const handleStateChange = (e) => {
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
      fetchDistricts(sId);
    } else {
      setDistricts([]);
    }
  };

  const handleDistrictChange = (e) => {
    const dId = e.target.value;
    const dObj = districts.find(d => (d._id || d.id) === dId);
    setFormData(prev => ({
      ...prev,
      district_id: dId,
      district_name: dObj ? dObj.name : '',
    }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.full_name.trim()) errs.full_name = 'Full name is required';
    if (!formData.mobile_number.trim() || !/^[6-9]\d{9}$/.test(formData.mobile_number)) {
      errs.mobile_number = 'Valid 10-digit Indian mobile number is required';
    }
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      errs.email = 'Valid email address is required';
    }
    if (!formData.aadhaar_number.trim() || !/^\d{12}$/.test(formData.aadhaar_number)) {
      errs.aadhaar_number = '12-digit Aadhaar number is required';
    }
    if (!formData.pan_number.trim() || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toUpperCase())) {
      errs.pan_number = 'Valid 10-character PAN number (e.g. ABCDE1234F) is required';
    }
    if (!aadhaarFile && !formData.aadhaar_document_url.trim()) {
      errs.aadhaar_document = 'Aadhaar document photo or PDF is required';
    }
    if (!panFile && !formData.pan_document_url.trim()) {
      errs.pan_document = 'PAN document photo or PDF is required';
    }
    if (!formData.pin || !/^\d{4}$/.test(String(formData.pin).trim())) {
      errs.pin = '4-digit numeric PIN is required (0-9)';
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const cleanPin = String(formData.pin || '1234').trim();
      const postData = new FormData();
      postData.append('full_name', formData.full_name.trim());
      if (formData.bde_id && formData.bde_id.trim()) {
        postData.append('bde_id', formData.bde_id.trim());
      }
      postData.append('mobile_number', formData.mobile_number.trim());
      postData.append('email', formData.email.trim().toLowerCase());
      postData.append('address', formData.address.trim());
      if (formData.state_id) postData.append('state_id', formData.state_id);
      if (formData.state_name) postData.append('state_name', formData.state_name);
      if (formData.district_id) postData.append('district_id', formData.district_id);
      if (formData.district_name) postData.append('district_name', formData.district_name);
      postData.append('joining_date', formData.joining_date);

      if (profilePhotoFile) {
        postData.append('profile_photo', profilePhotoFile);
      } else if (formData.profile_photo.trim()) {
        postData.append('profile_photo', formData.profile_photo.trim());
      }

      postData.append('aadhaar_number', formData.aadhaar_number.trim());
      postData.append('pan_number', formData.pan_number.trim().toUpperCase());

      if (aadhaarFile) {
        postData.append('aadhaar_document', aadhaarFile);
      } else if (formData.aadhaar_document_url.trim()) {
        postData.append('aadhaar_document_url', formData.aadhaar_document_url.trim());
      }

      if (panFile) {
        postData.append('pan_document', panFile);
      } else if (formData.pan_document_url.trim()) {
        postData.append('pan_document_url', formData.pan_document_url.trim());
      }

      if (formData.kyc_remarks.trim()) {
        postData.append('kyc_remarks', formData.kyc_remarks.trim());
      }
      postData.append('pin', cleanPin);
      postData.append('initial_pin', cleanPin);
      postData.append('initial_password', cleanPin);

      const res = await bdeApi.createBde(postData, moduleUniqueId);
      setSuccess(`BDE profile created successfully with ID: ${res.data?.bde?.bde_id || res.data?.bde_id}`);
      setTimeout(() => {
        navigate('/admin-panel/bde-management/all');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create BDE profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-slate-900 font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin-panel/bde-management/all')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          <FaArrowLeft /> Back to BDE List
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Title Banner */}
        <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-slate-50 to-white">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-blue-100 text-[#0575B8] rounded-2xl shadow-xs">
              <FaUserTie className="text-2xl" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Create Business Development Executive</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Register a new BDE field representative with personal details and mandatory KYC verification records.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8 text-xs">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5 font-semibold">
              <FaExclamationCircle className="text-lg text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 font-bold">
              <FaCheckCircle className="text-lg text-emerald-600 shrink-0" />
              <span>{success} Redirecting to BDE master list...</span>
            </div>
          )}

          {/* Section 1: Personal Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <FaIdCard className="text-[#0575B8]" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">1. Personal & Employment Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="e.g. Vikram Sharma"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white ${validationErrors.full_name ? 'border-rose-500' : 'border-slate-300'
                    }`}
                />
                {validationErrors.full_name && (
                  <p className="text-[11px] text-rose-600 font-bold">{validationErrors.full_name}</p>
                )}
              </div>

              {/* Custom BDE ID */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                  Employee / BDE ID <span className="text-slate-400 font-normal">(Leave blank to auto-generate)</span>
                </label>
                <input
                  type="text"
                  value={formData.bde_id}
                  onChange={(e) => handleChange('bde_id', e.target.value)}
                  placeholder="Auto-generated e.g. BDE-2026-0001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-[#0575B8] focus:bg-white uppercase"
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={formData.mobile_number}
                  onChange={(e) => handleChange('mobile_number', e.target.value)}
                  placeholder="10-digit Indian mobile number (e.g. 9876543210)"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-[#0575B8] focus:bg-white ${validationErrors.mobile_number ? 'border-rose-500' : 'border-slate-300'
                    }`}
                />
                {validationErrors.mobile_number && (
                  <p className="text-[11px] text-rose-600 font-bold">{validationErrors.mobile_number}</p>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="e.g. vikram.bde@solarkits.com"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white ${validationErrors.email ? 'border-rose-500' : 'border-slate-300'
                    }`}
                />
                {validationErrors.email && (
                  <p className="text-[11px] text-rose-600 font-bold">{validationErrors.email}</p>
                )}
              </div>

              {/* Profile Photo */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Profile Photo (Optional)</label>
                <div className="flex items-center gap-3">
                  {profilePhotoPreview ? (
                    <div className="relative group shrink-0">
                      <img
                        src={profilePhotoPreview}
                        alt="Profile preview"
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#0575B8] shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (profilePhotoPreview.startsWith('blob:')) URL.revokeObjectURL(profilePhotoPreview);
                          setProfilePhotoFile(null);
                          setProfilePhotoPreview(null);
                        }}
                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 text-[8px] hover:bg-rose-600 transition"
                        title="Remove photo"
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  ) : (
                    <label className="w-10 h-10 rounded-full bg-slate-100 hover:bg-blue-50 border-2 border-dashed border-slate-300 hover:border-[#0575B8] flex items-center justify-center text-slate-500 hover:text-[#0575B8] cursor-pointer transition shrink-0" title="Click to upload avatar">
                      <FaCamera className="text-xs" />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleProfilePhotoSelect(e.target.files[0])}
                      />
                    </label>
                  )}
                  <input
                    type="url"
                    value={formData.profile_photo}
                    onChange={(e) => handleChange('profile_photo', e.target.value)}
                    placeholder="Upload photo or enter URL (Optional)"
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#0575B8] focus:bg-white"
                  />
                </div>
                {validationErrors.profile_photo && (
                  <p className="text-[11px] text-rose-600 font-bold">{validationErrors.profile_photo}</p>
                )}
              </div>

              {/* Joining Date */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Joining Date *</label>
                <input
                  type="date"
                  required
                  value={formData.joining_date}
                  onChange={(e) => handleChange('joining_date', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white"
                />
              </div>
            </div>

            {/* State & District */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
                  onChange={handleDistrictChange}
                  disabled={!formData.state_id || districts.length === 0}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white disabled:opacity-50"
                >
                  <option value="">Select District</option>
                  {districts.map(d => (
                    <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Residential / Office Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Full address details..."
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#0575B8] focus:bg-white resize-none font-medium"
              />
            </div>
          </div>

          {/* Section 2: KYC Details */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <FaShieldAlt className="text-emerald-600" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">2. KYC Verification Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Aadhaar Number */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Aadhaar Number (12 Digits) *</label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  value={formData.aadhaar_number}
                  onChange={(e) => handleChange('aadhaar_number', e.target.value)}
                  placeholder="12-digit Aadhaar number"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-[#0575B8] focus:bg-white ${validationErrors.aadhaar_number ? 'border-rose-500' : 'border-slate-300'
                    }`}
                />
                {validationErrors.aadhaar_number && (
                  <p className="text-[11px] text-rose-600 font-bold">{validationErrors.aadhaar_number}</p>
                )}
              </div>

              {/* PAN Number */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">PAN Number (10 Characters) *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={formData.pan_number}
                  onChange={(e) => handleChange('pan_number', e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-[#0575B8] focus:bg-white uppercase ${validationErrors.pan_number ? 'border-rose-500' : 'border-slate-300'
                    }`}
                />
                {validationErrors.pan_number && (
                  <p className="text-[11px] text-rose-600 font-bold">{validationErrors.pan_number}</p>
                )}
              </div>

              {/* Aadhaar Document Upload */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                    Aadhaar Document Photo / PDF *
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Front & back / e-Aadhaar</span>
                </div>

                {aadhaarFile ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {aadhaarPreview ? (
                        <img
                          src={aadhaarPreview}
                          alt="Aadhaar preview"
                          className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0 bg-white"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0 border border-rose-200">
                          <FaFilePdf className="text-2xl" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{aadhaarFile.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold text-slate-500">{formatFileSize(aadhaarFile.size)}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200 flex items-center gap-1">
                            <FaCheckCircle className="text-[8px]" /> Ready to upload
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="px-3 py-1.5 text-xs font-bold text-[#0575B8] bg-blue-50 hover:bg-blue-100 rounded-xl cursor-pointer transition">
                        Change
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleDocumentSelect('aadhaar', e.target.files[0])}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (aadhaarPreview && aadhaarPreview.startsWith('blob:')) URL.revokeObjectURL(aadhaarPreview);
                          setAadhaarFile(null);
                          setAadhaarPreview(null);
                        }}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Remove file"
                      >
                        <FaTrashAlt className="text-xs" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setAadhaarDragOver(true); }}
                    onDragLeave={() => setAadhaarDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setAadhaarDragOver(false);
                      if (e.dataTransfer.files?.[0]) handleDocumentSelect('aadhaar', e.dataTransfer.files[0]);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer ${aadhaarDragOver
                        ? 'border-[#0575B8] bg-blue-50/40'
                        : validationErrors.aadhaar_document
                          ? 'border-rose-400 bg-rose-50/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60 hover:border-[#0575B8]'
                      }`}
                  >
                    <div className="p-2.5 bg-blue-50 text-[#0575B8] rounded-xl">
                      <FaCloudUploadAlt className="text-xl" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Click to upload or drag & drop Aadhaar
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        JPG, PNG, WEBP or PDF (max 10MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleDocumentSelect('aadhaar', e.target.files[0])}
                    />
                  </label>
                )}
                {validationErrors.aadhaar_document && (
                  <p className="text-[11px] text-rose-600 font-bold">{validationErrors.aadhaar_document}</p>
                )}
              </div>

              {/* PAN Document Upload */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                    PAN Document Photo / PDF *
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Signed PAN card copy</span>
                </div>

                {panFile ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {panPreview ? (
                        <img
                          src={panPreview}
                          alt="PAN preview"
                          className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0 bg-white"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0 border border-rose-200">
                          <FaFilePdf className="text-2xl" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{panFile.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold text-slate-500">{formatFileSize(panFile.size)}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200 flex items-center gap-1">
                            <FaCheckCircle className="text-[8px]" /> Ready to upload
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="px-3 py-1.5 text-xs font-bold text-[#0575B8] bg-blue-50 hover:bg-blue-100 rounded-xl cursor-pointer transition">
                        Change
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleDocumentSelect('pan', e.target.files[0])}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (panPreview && panPreview.startsWith('blob:')) URL.revokeObjectURL(panPreview);
                          setPanFile(null);
                          setPanPreview(null);
                        }}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Remove file"
                      >
                        <FaTrashAlt className="text-xs" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setPanDragOver(true); }}
                    onDragLeave={() => setPanDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setPanDragOver(false);
                      if (e.dataTransfer.files?.[0]) handleDocumentSelect('pan', e.dataTransfer.files[0]);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer ${panDragOver
                        ? 'border-[#0575B8] bg-blue-50/40'
                        : validationErrors.pan_document
                          ? 'border-rose-400 bg-rose-50/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60 hover:border-[#0575B8]'
                      }`}
                  >
                    <div className="p-2.5 bg-blue-50 text-[#0575B8] rounded-xl">
                      <FaCloudUploadAlt className="text-xl" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Click to upload or drag & drop PAN
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        JPG, PNG, WEBP or PDF (max 10MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleDocumentSelect('pan', e.target.files[0])}
                    />
                  </label>
                )}
                {validationErrors.pan_document && (
                  <p className="text-[11px] text-rose-600 font-bold">{validationErrors.pan_document}</p>
                )}
              </div>
            </div>

            {/* KYC Remarks */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">KYC Remarks / Notes (Optional)</label>
              <textarea
                value={formData.kyc_remarks}
                onChange={(e) => handleChange('kyc_remarks', e.target.value)}
                placeholder="Notes for verifier..."
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#0575B8] focus:bg-white resize-none font-medium"
              />
            </div>
          </div>

          {/* Section 3: Initial Credentials */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <FaInfoCircle className="text-[#0575B8]" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">3. Login Credentials (4-Digit PIN)</h2>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                  4-Digit Login PIN *
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.pin}
                  onChange={(e) => handleChange('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  className={`w-full max-w-xs px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 font-mono text-base tracking-[0.25em] font-bold focus:outline-none focus:border-[#0575B8] ${validationErrors.pin ? 'border-rose-500' : 'border-slate-300'
                    }`}
                />
                {validationErrors.pin && (
                  <p className="text-[11px] text-rose-600 font-bold">{validationErrors.pin}</p>
                )}
                <p className="text-xs text-slate-500 font-medium">
                  The BDE will use their registered Email/Mobile number and this 4-digit PIN to sign in to the BDE portal.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/admin-panel/bde-management/all')}
              className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 rounded-xl bg-[#0575B8] hover:bg-[#045D93] text-white font-bold transition text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating BDE Profile...' : 'Save & Register BDE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
