import React, { useState, useEffect } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import Dialog from "@/components/Dialog";
import Button from "@/components/Button";
import CustomInput from "@/components/CustomInput";
import Loader from "@/components/Loader";
import {
  FiTruck,
  FiPlus,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiFileText,
  FiSearch,
  FiPhone,
  FiMail,
  FiShield,
  FiCheck
} from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

export default function ThreePLVendorManagementModal({ isOpen, onClose, onVendorSelected, moduleUniqueId = "ADM_WAREHOUSES" }) {
  const dispatch = useDispatch();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list"); // 'list' | 'add' | 'verify'
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // New Vendor Form
  const [formData, setFormData] = useState({
    company_name: "",
    vendor_type: "private_limited",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    contact_designation: "Logistics Head",
    gstin: "",
    pan_number: "",
    address_line: "",
    state: "Gujarat",
    district: "Ahmedabad",
    pincode: "380001",
    bank_account_name: "",
    bank_account_number: "",
    bank_name: "",
    bank_ifsc: "",
    service_agreement_url: ""
  });

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const uniqueId = moduleUniqueId || "ADM_WAREHOUSES";
      const res = await axios.get(
        `${API}/3pl-vendors?unique_id=${uniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setVendors(res.data.vendors || []);
      }
    } catch (err) {
      console.error("Failed to fetch 3PL vendors", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVendors();
      setActiveTab("list");
    }
  }, [isOpen]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.company_name || !formData.contact_name || !formData.contact_email || !formData.contact_phone) {
      dispatch(setAlert({ type: "warning", message: "Please fill in all mandatory company and contact fields." }));
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        company_name: formData.company_name,
        vendor_type: formData.vendor_type,
        contact_person: {
          name: formData.contact_name,
          email: formData.contact_email,
          phone: formData.contact_phone,
          designation: formData.contact_designation
        },
        gstin: formData.gstin,
        pan_number: formData.pan_number,
        registered_address: {
          address_line: formData.address_line,
          state: formData.state,
          district: formData.district,
          pincode: formData.pincode
        },
        bank_details: formData.bank_account_number?.trim() ? {
          account_name: (formData.bank_account_name || formData.company_name)?.trim(),
          account_number: formData.bank_account_number?.trim(),
          bank_name: formData.bank_name?.trim() || null,
          ifsc_code: formData.bank_ifsc?.trim() || null
        } : undefined,
        documents: {
          service_agreement: {
            url: formData.service_agreement_url || "https://solarkits.in/agreements/sample-3pl-agreement.pdf",
            status: "approved"
          }
        }
      };

      const res = await axios.post(
        `${API}/3pl-vendors/register?unique_id=${moduleUniqueId}&req_for=add`,
        payload,
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(setAlert({
          type: "success",
          message: res.data.message || "3PL Vendor registered successfully!"
        }));
        fetchVendors();
        setActiveTab("list");
      }
    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to register 3PL vendor."
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveVendor = async (vendorId) => {
    try {
      const res = await axios.post(
        `${API}/3pl-vendors/${vendorId}/change-status?unique_id=${moduleUniqueId}&req_for=edit`,
        { status: "approved", remarks: "Verified all KYC and legal logistics agreement." },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "3PL Vendor Approved successfully!" }));
        fetchVendors();
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to approve vendor." }));
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.vendor_code?.toLowerCase().includes(search.toLowerCase()) ||
    v.contact_person?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="3PL Logistics – Vendor Onboarding & Verification"
      size="3xl"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${activeTab === "list"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface-elevated text-text-secondary hover:text-text-primary"
                }`}
            >
              Registered Vendors ({vendors.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("add")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${activeTab === "add"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface-elevated text-text-secondary hover:text-text-primary"
                }`}
            >
              <FiPlus className="w-3.5 h-3.5" />
              Onboard New Vendor
            </button>
          </div>

          {activeTab === "list" && (
            <div className="relative w-56">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Vendor List */}
        {activeTab === "list" && (
          <div className="space-y-3">
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader text="Loading 3PL vendors..." />
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="py-12 text-center text-text-muted space-y-3">
                <FiTruck className="w-10 h-10 mx-auto opacity-30 text-primary" />
                <p className="text-sm font-semibold">No 3PL Vendors registered yet.</p>
                <Button variant="primary" size="sm" onClick={() => setActiveTab("add")}>
                  Onboard First 3PL Partner
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="p-4 rounded-xl border border-border bg-surface hover:border-primary/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-text-primary">
                          {vendor.company_name}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted border border-border">
                          {vendor.vendor_code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${vendor.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}>
                          {vendor.status === "approved" ? "Approved" : "Pending Verification"}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1">
                          <FiPhone className="w-3 h-3" />
                          {vendor.contact_person?.name} ({vendor.contact_person?.phone})
                        </span>
                        <span className="flex items-center gap-1">
                          <FiMail className="w-3 h-3" />
                          {vendor.contact_person?.email}
                        </span>
                        <span>
                          Warehouses: <strong className="text-text-primary">{vendor.total_warehouses || 0}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {vendor.status !== "approved" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleApproveVendor(vendor.id)}
                          className="text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30"
                        >
                          <FiCheck className="w-3.5 h-3.5 mr-1" />
                          Approve KYC
                        </Button>
                      )}

                      {onVendorSelected && vendor.status === "approved" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            onVendorSelected(vendor);
                            onClose();
                          }}
                          className="text-xs"
                        >
                          Select for Warehouse
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Onboard New Vendor */}
        {activeTab === "add" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomInput
                label="Registered Company Name *"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="e.g. ABC Solar Logistics Pvt Ltd"
                required
              />

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                  Business Entity Type *
                </label>
                <select
                  value={formData.vendor_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendor_type: e.target.value }))}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="private_limited">Private Limited (Pvt Ltd)</option>
                  <option value="llp">Limited Liability Partnership (LLP)</option>
                  <option value="partnership">Partnership Firm</option>
                  <option value="proprietorship">Sole Proprietorship</option>
                  <option value="public_limited">Public Limited</option>
                </select>
              </div>
            </div>

            {/* Contact Person */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <CustomInput
                label="Authorized Contact Person *"
                value={formData.contact_name}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                placeholder="Full Name"
                required
              />
              <CustomInput
                label="Business Email *"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                placeholder="logistics@abc.com"
                required
              />
              <CustomInput
                label="Mobile Number *"
                value={formData.contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="9876543210"
                required
              />
            </div>

            {/* Tax & Legal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <CustomInput
                label="GSTIN Number"
                value={formData.gstin}
                onChange={(e) => setFormData(prev => ({ ...prev, gstin: e.target.value }))}
                placeholder="24AAAAA0000A1Z5"
              />
              <CustomInput
                label="Business PAN"
                value={formData.pan_number}
                onChange={(e) => setFormData(prev => ({ ...prev, pan_number: e.target.value }))}
                placeholder="AAAAA0000A"
              />
            </div>

            {/* Registered Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="md:col-span-3">
                <CustomInput
                  label="Registered Business Address *"
                  value={formData.address_line}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_line: e.target.value }))}
                  placeholder="Plot No. 12, Logistics Park, Phase II"
                  required
                />
              </div>
              <CustomInput
                label="State"
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
              />
              <CustomInput
                label="District"
                value={formData.district}
                onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
              />
              <CustomInput
                label="Pincode"
                value={formData.pincode}
                onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
              />
            </div>

            {/* Bank Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 border-t border-border pt-3">
              <CustomInput
                label="Bank Name"
                value={formData.bank_name}
                onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                placeholder="HDFC Bank"
              />
              <CustomInput
                label="Account Number"
                value={formData.bank_account_number}
                onChange={(e) => setFormData(prev => ({ ...prev, bank_account_number: e.target.value }))}
                placeholder="502000000000"
              />
              <CustomInput
                label="IFSC Code"
                value={formData.bank_ifsc}
                onChange={(e) => setFormData(prev => ({ ...prev, bank_ifsc: e.target.value }))}
                placeholder="HDFC0000123"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <Button variant="outline" size="sm" type="button" onClick={() => setActiveTab("list")}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={submitting}>
                {submitting ? "Registering..." : "Register & Submit for Verification"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
