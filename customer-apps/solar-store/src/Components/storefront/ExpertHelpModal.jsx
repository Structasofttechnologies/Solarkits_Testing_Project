import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiX,
  FiPhoneCall,
  FiCheckCircle,
  FiSend,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiZap
} from "react-icons/fi";
import { setAlert } from "@/features/alert.slice";
import Button from "../Button";
import IconButton from "../IconButton";

export default function ExpertHelpModal({ isOpen, onClose, preselectedKit = null }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth_slice);
  const selectedState = useSelector((state) => state.slice.selectedState);
  const selectedDistrict = useSelector((state) => state.slice.selectedDistrict);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.mobile || "",
    pincode: "",
    propertyType: "Residential Rooftop",
    requiredCapacity: preselectedKit?.capacityKW ? `${preselectedKit.capacityKW} kW` : "3 kW",
    notes: preselectedKit ? `Inquiry regarding ${preselectedKit.kitName}` : ""
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      dispatch(setAlert({ type: "error", message: "Please provide your name and contact phone number." }));
      return;
    }

    setLoading(true);
    // Simulate submission
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      dispatch(setAlert({ type: "success", message: "Your solar consultation request has been submitted. A solar specialist will call you shortly!" }));
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-surface rounded-3xl border border-border shadow-2xl w-full max-w-lg overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-secondary text-white flex items-center justify-center font-bold text-sm">
              <FiPhoneCall size={16} />
            </div>
            <div>
              <h3 className="text-base font-black text-text-primary">Talk to a Solar Expert</h3>
              <p className="text-[11px] text-text-secondary">Free engineering consultation & solar feasibility advice</p>
            </div>
          </div>
          <IconButton
            variant="ghost"
            size="md"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <FiX size={18} />
          </IconButton>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <FiCheckCircle size={36} />
              </div>
              <h4 className="text-xl font-bold text-text-primary">Consultation Request Received!</h4>
              <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                Thank you, <strong>{formData.name}</strong>. Our certified solar engineering team has received your request and will call you on <strong>{formData.phone}</strong> within 2 business hours.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="mt-4 font-bold"
              >
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-text-secondary uppercase mb-1">Your Full Name *</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Mobile Number *</label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Email Address</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Target Capacity (kW)</label>
                  <select
                    value={formData.requiredCapacity}
                    onChange={(e) => setFormData({ ...formData, requiredCapacity: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary"
                  >
                    <option value="1 kW">1 kW Complete Kit</option>
                    <option value="2 kW">2 kW Complete Kit</option>
                    <option value="3 kW">3 kW Complete Kit</option>
                    <option value="5 kW">5 kW Complete Kit</option>
                    <option value="10 kW">10 kW Complete Kit</option>
                    <option value="15 kW+">15 kW+ Commercial System</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Installation District / PIN</label>
                  <div className="relative">
                    <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                    <input
                      type="text"
                      placeholder={selectedDistrict?.name ? `${selectedDistrict.name}` : "Enter PIN / District"}
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-text-secondary uppercase mb-1">Your Requirements / Questions</label>
                <textarea
                  rows={3}
                  placeholder="E.g., Which kit is best for 2 ACs? Can I get net-metering assistance in Maharashtra?"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary resize-none"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  rightIcon={<FiSend size={15} />}
                  className="font-bold py-3 rounded-xl shadow-md"
                >
                  Submit Consultation Request
                </Button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
