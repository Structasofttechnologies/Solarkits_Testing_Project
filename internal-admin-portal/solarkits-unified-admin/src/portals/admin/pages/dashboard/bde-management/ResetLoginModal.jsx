import React, { useState, useEffect } from 'react';
import { FaKey, FaTimes, FaCopy, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { bdeApi } from '../../../api/bdeApi';

export default function ResetLoginModal({ isOpen, onClose, bde, onSuccess }) {
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setNewPin('');
      setResult(null);
      setError(null);
      setCopied(false);
      setLoading(false);
    }
  }, [isOpen, bde?._id, bde?.id, bde?.bde_id]);

  if (!isOpen || !bde) return null;

  const handlePinChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setNewPin(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanPin = newPin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      setError('Please enter a valid 4-digit numeric PIN (0-9).');
      return;
    }

    setLoading(true);

    try {
      const targetId = bde._id || bde.id || bde.bde_id;
      const res = await bdeApi.resetLogin(targetId, {
        pin: cleanPin,
        new_pin: cleanPin,
        new_password: cleanPin,
      });
      setResult(res.data || res);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update 4-digit PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const pinToCopy = result?.pin || result?.temporary_password || newPin;
    if (pinToCopy) {
      navigator.clipboard.writeText(pinToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50/80 via-slate-50 to-white">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl shadow-xs">
              <FaKey className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Set / Reset 4-Digit PIN</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {bde.full_name} ({bde.bde_id})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold">
              {error}
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold leading-relaxed">
                ✅ 4-Digit login PIN updated successfully! Any active sessions have been terminated.
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active 4-Digit PIN</span>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 font-mono font-bold text-xl tracking-[0.25em] text-slate-900">
                  <span>{result.pin || result.temporary_password || newPin}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs tracking-normal text-[#0575B8] hover:underline px-2.5 py-1 bg-blue-50 rounded-lg font-bold cursor-pointer"
                  >
                    {copied ? <FaCheck className="text-emerald-600" /> : <FaCopy />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 pt-1 font-medium">
                  The BDE can now sign in using their Mobile/Email and this 4-digit PIN.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-start gap-2.5 font-medium leading-relaxed">
                <FaExclamationTriangle className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Updating the 4-digit PIN will immediately apply to BDE login and invalidate active sessions.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                  Set 4-Digit Login PIN *
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newPin}
                  onChange={handlePinChange}
                  placeholder="Enter 4-digit PIN (e.g. 1234)"
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-xl tracking-[0.3em] text-center placeholder:tracking-normal placeholder:font-normal placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
                <span className="text-[11px] text-slate-400 font-medium block">
                  Must be exactly 4 numeric digits (0-9)
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Updating PIN...' : 'Set 4-Digit PIN'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
