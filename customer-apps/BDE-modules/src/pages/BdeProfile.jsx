import React, { useState } from 'react';
import { useBdeAuth } from '../context/BdeAuthContext';
import {
  User,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function BdeProfile() {
  const { user, profile, updateProfile } = useBdeAuth();

  // Address edit state
  const [address, setAddress] = useState(user?.address || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);

  const kyc = profile?.kyc || {};
  const territory = profile?.territory || {};

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfileLoading(true);

    try {
      await updateProfile({
        address,
        profile_photo: profilePhoto || undefined,
      });
      setProfileSuccess('Profile updated successfully!');
    } catch (err) {
      setProfileError(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Profile Header */}
      <div className="p-6 md:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center font-bold text-3xl shadow-lg shadow-blue-600/20 overflow-hidden shrink-0">
            {user?.profile_photo ? (
              <img src={user.profile_photo} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              user?.full_name?.charAt(0) || 'B'
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900">{user?.full_name}</h1>
              <span className="font-mono px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold">
                {user?.bde_id}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span>{user?.email}</span> • <span className="font-mono">{user?.mobile_number}</span>
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> KYC Verified
              </span>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold uppercase">
                Status: Active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KYC Verification Details */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Verified KYC Information</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Aadhaar Number (Masked)</span>
              <p className="font-mono font-bold text-slate-900 text-sm">{kyc.aadhaar_masked || 'XXXXXXXXXXXX'}</p>
              {kyc.aadhaar_document_url && (
                <a
                  href={kyc.aadhaar_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold text-[11px] pt-1"
                >
                  <ExternalLink className="w-3 h-3" /> View Verified Aadhaar Document
                </a>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">PAN Number (Masked)</span>
              <p className="font-mono font-bold text-slate-900 text-sm uppercase">{kyc.pan_masked || 'XXXXXXXXXX'}</p>
              {kyc.pan_document_url && (
                <a
                  href={kyc.pan_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold text-[11px] pt-1"
                >
                  <ExternalLink className="w-3 h-3" /> View Verified PAN Document
                </a>
              )}
            </div>

            {kyc.kyc_remarks && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Verification Notes</span>
                <p className="text-slate-700 mt-0.5">{kyc.kyc_remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Territory & Details */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">Territory Jurisdiction</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500 font-semibold">Primary State:</span>
              <span className="font-bold text-slate-900 text-sm">{territory.state_name || 'Assigned State'}</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                Assigned Districts ({territory.district_names?.length || 0})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {territory.district_names?.map((dName, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold"
                  >
                    {dName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Address & Photo */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Update Profile Details</h2>
          </div>

          {profileError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {profileError}
            </div>
          )}

          {profileSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {profileSuccess}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 uppercase">Profile Photo URL</label>
              <input
                type="url"
                value={profilePhoto}
                onChange={(e) => setProfilePhoto(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 uppercase">Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="Residential address..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-600 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50"
            >
              {profileLoading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Login Security Information */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Lock className="w-5 h-5 text-[#0575B8]" />
              <h2 className="text-base font-bold text-slate-900">Login Security</h2>
            </div>

            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2">
              <div className="flex items-center gap-2 text-[#0575B8] font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>4-Digit PIN Authentication</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your BDE account uses a secure 4-digit PIN for instant access across web and mobile.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">PIN Management</span>
              <p className="text-slate-700 leading-relaxed">
                For field compliance and central security, your 4-digit login PIN is managed by your regional Solarkits Administrator in Admin BDE Management.
              </p>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>To reset or update your 4-digit PIN, contact your Administrator.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
