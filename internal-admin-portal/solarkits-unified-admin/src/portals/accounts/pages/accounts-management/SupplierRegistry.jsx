import { useState, useEffect } from "react";
import { 
  FaUsers, FaPlus, FaEnvelope, FaPhone, FaBuilding, 
  FaClock, FaTimesCircle, FaCheckCircle, 
  FaInfoCircle, FaSearch, FaSpinner, FaExchangeAlt, FaShieldAlt, FaTrashAlt
} from "react-icons/fa";
import { useSelector } from "react-redux";
import { 
  getSuppliers, registerSupplier, verifyGst, gstGenerateOtp, gstSubmitOtp, getCountries, getStates 
} from "../../api/accounts";
import PageHeader from "../../components/PageHeader";
import Button from "../../components/Button";
import CustomTable from "../../components/CustomTable";
import Dialog from "../../components/Dialog";
import CustomInput from "../../components/CustomInput";
import DropdownWithSearchInput from "../../components/DropdownWithSearchInput";

const STATUS_BADGE = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-danger/10 text-danger border-danger/20",
};

const formatPhoneCode = (code) => {
  if (!code) return '';
  const trimmed = code.trim();
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
};

export default function SupplierRegistry() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { selectedScope } = useSelector((state) => state.user_slice);

  // Dialog / Form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    brand_name: "",
    email: "",
    phone_code: "+91",
    phone: "",
    gst_number: "",
    pan_number: "",
    country_id: "",
    state_id: "",
    address: "",
    brand_logo: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const [countriesList, setCountriesList] = useState([]);
  const [statesList, setStatesList] = useState([]);

  // GST Verification state
  const [gstVerified, setGstVerified] = useState(false);
  const [gstVerifying, setGstVerifying] = useState(false);
  const [gstOtpSent, setGstOtpSent] = useState(false);
  const [gstOtp, setGstOtp] = useState("");
  const [gstRequestId, setGstRequestId] = useState("");
  const [gstError, setGstError] = useState(null);
  const [gstData, setGstData] = useState(null);

  useEffect(() => {
    fetchSuppliers();
    fetchCountries();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSuppliers();
      if (res && res.status === "success") {
        setSuppliers(res.data || []);
      } else {
        setSuppliers([]);
      }
    } catch (err) {
      console.error("fetchSuppliers error:", err);
      setError("Failed to fetch registered suppliers list.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const res = await getCountries();
      if (res && res.success) {
        setCountriesList(res.data || []);
      }
    } catch (err) {
      console.error("fetchCountries error:", err);
    }
  };

  const handleCountryChange = async (countryId, list = countriesList) => {
    const selectedCountry = list.find(c => c.id === countryId);
    setFormData(prev => ({
      ...prev,
      country_id: countryId,
      phone_code: selectedCountry ? formatPhoneCode(selectedCountry.phone_code) : "+91",
      state_id: "",
      address: "",
      company_name: "",
      brand_name: "",
      email: "",
      phone: "",
      gst_number: "",
      pan_number: "",
      brand_logo: "",
    }));
    setGstVerified(false);
    setGstOtpSent(false);
    setGstOtp("");
    setGstRequestId("");
    setGstError(null);
    setStatesList([]);

    if (countryId) {
      try {
        const res = await getStates(countryId);
        if (res && res.success) {
          setStatesList(res.data || []);
        }
      } catch (err) {
        console.error("Error fetching states:", err);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGstVerify = async () => {
    const gstin = formData.gst_number.trim().toUpperCase();
    if (gstin.length !== 15) {
      setGstError("Please enter a valid 15-character alphanumeric GSTIN (e.g. 24ABCDE1234A1ZN).");
      return;
    }
    setGstVerifying(true);
    setGstError(null);
    try {
      const res = await verifyGst(gstin);
      if (res && res.status === "success" && res.data) {
        const verified = res.data;
        setGstData(verified);
        setGstVerified(true);
        setGstOtpSent(false);

        // Match state ID with statesList
        let matchedStateId = verified.state_id || "";
        if (!matchedStateId && verified.state_name && statesList.length > 0) {
          const normState = verified.state_name.toLowerCase().replace(/[^a-z0-9]/g, "");
          const found = statesList.find(s => s.name.toLowerCase().replace(/[^a-z0-9]/g, "") === normState);
          if (found) {
            matchedStateId = found.id;
          }
        }

        const phoneVal = String(verified.phone || "");
        let phoneCodeVal = formData.phone_code || "+91";
        let phoneNumVal = phoneVal;
        if (phoneVal.startsWith("+91") && phoneVal.length > 3) {
          phoneCodeVal = "+91";
          phoneNumVal = phoneVal.substring(3);
        } else if (phoneVal.startsWith("91") && phoneVal.length > 10) {
          phoneCodeVal = "+91";
          phoneNumVal = phoneVal.substring(2);
        }

        setFormData((prev) => ({
          ...prev,
          gst_number: gstin,
          company_name: verified.company_name || prev.company_name,
          brand_name: prev.brand_name || verified.brand_name || verified.company_name,
          pan_number: verified.pan_number || gstin.substring(2, 12),
          state_id: matchedStateId || prev.state_id,
          address: verified.address || prev.address,
          email: prev.email || verified.email || "",
          phone: phoneNumVal || prev.phone,
          phone_code: phoneCodeVal,
        }));
      } else {
        setGstError(res?.message || "GSTIN verification failed.");
      }
    } catch (err) {
      console.error("verifyGst error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to verify GSTIN via QuickeKYC. Please try again.";
      setGstError(msg);
    } finally {
      setGstVerifying(false);
    }
  };

  const handleGstVerifyInit = async () => {
    const gstin = formData.gst_number.trim().toUpperCase();
    if (gstin.length !== 15) {
      setGstError("Please enter a valid 15-character GSTIN.");
      return;
    }
    setGstVerifying(true);
    setGstError(null);
    try {
      const res = await gstGenerateOtp(gstin);
      if (res && res.status === "success") {
        setGstOtpSent(true);
        setGstRequestId(res.request_id || (res.data && res.data.request_id) || `mock_${Date.now()}`);
      } else {
        setGstError(res.message || "Failed to send OTP.");
      }
    } catch (err) {
      console.error("gstGenerateOtp error:", err);
      setGstError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setGstVerifying(false);
    }
  };

  const handleGstVerifySubmit = async () => {
    const gstin = formData.gst_number.trim().toUpperCase();
    if (!gstOtp || gstOtp.length < 6) {
      setGstError("Please enter the 6-digit OTP code.");
      return;
    }
    setGstVerifying(true);
    setGstError(null);
    try {
      const res = await gstSubmitOtp(gstRequestId, gstOtp, gstin);
      if (res && res.status === "success") {
        const verifiedGst = res.data;
        const emailVal = verifiedGst.email_id || 'test110@gmail.com';
        const phoneVal = String(verifiedGst.mobile_no || '1234567890');
        const addressVal = res.address || verifiedGst.address || 'Ahmedabad, Gujarat';
        const stateVal = res.state || verifiedGst.state || 'Gujarat';

        // Find state ID
        const matchedState = statesList.find(s => 
          s.name.toLowerCase().replace(/[^a-z0-9]/g, '') === stateVal.toLowerCase().replace(/[^a-z0-9]/g, '')
        );
        const stateId = matchedState ? matchedState.id : '';

        // Format phone
        let phoneCodeVal = formData.phone_code || '+91';
        let phoneNumVal = phoneVal;
        if (phoneVal.startsWith('+91') && phoneVal.length > 3) {
          phoneCodeVal = '+91';
          phoneNumVal = phoneVal.substring(3);
        } else if (phoneVal.startsWith('91') && phoneVal.length > 10) {
          phoneCodeVal = '+91';
          phoneNumVal = phoneVal.substring(2);
        }

        setGstVerified(true);
        setGstOtpSent(false);
        setFormData((prev) => ({
          ...prev,
          company_name: verifiedGst.legal_name || verifiedGst.business_name || "",
          pan_number: verifiedGst.pan_number || "",
          email: emailVal,
          phone: phoneNumVal,
          phone_code: phoneCodeVal,
          state_id: stateId,
          address: addressVal,
        }));
      } else {
        setGstError(res.message || "OTP verification failed.");
      }
    } catch (err) {
      console.error("gstSubmitOtp error:", err);
      setGstError(err.response?.data?.message || "OTP verification failed. Please try again.");
    } finally {
      setGstVerifying(false);
    }
  };

  const resetGst = () => {
    setGstVerified(false);
    setGstOtpSent(false);
    setGstOtp("");
    setGstRequestId("");
    setGstError(null);
    setGstData(null);
    setFormData((prev) => ({
      ...prev,
      gst_number: "",
      pan_number: "",
      company_name: "",
      brand_name: "",
      address: "",
      state_id: "",
      email: "",
      phone: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedCountry = countriesList.find(c => c.id === formData.country_id);
    const isIndia = selectedCountry?.name?.toLowerCase() === 'india' || selectedCountry?.iso2?.toLowerCase() === 'in';

    if (isIndia && !gstVerified) {
      setFormError("Please verify the GSTIN before registering the supplier.");
      return;
    }
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(false);

    const verifiedGsts = isIndia ? [{
      gst_number: formData.gst_number.trim().toUpperCase(),
      pan_number: formData.pan_number,
      state: formData.state_id || null,
      is_verified: true
    }] : [];

    const address = formData.address.trim();

    const payload = {
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      phone_code: formData.phone_code.trim(),
      country_id: formData.country_id,
      company_name: formData.company_name.trim(),
      brand_name: formData.brand_name.trim(),
      brand_logo: formData.brand_logo || null,
      gst_number: isIndia ? formData.gst_number.trim().toUpperCase() : null,
      pan_number: isIndia ? formData.pan_number.trim().toUpperCase() : null,
      states: formData.state_id ? [formData.state_id] : [],
      office_location: address ? {
        type: 'Point',
        coordinates: [0, 0],
        address
      } : { type: 'Point', coordinates: [0, 0], address: '' },
      office_locations: address ? [{
        address,
        state: formData.state_id || null,
        lat: 0,
        lng: 0
      }] : [],
      gst_list: verifiedGsts,
    };

    try {
      const res = await registerSupplier(payload);
      if (res && res.status === "success") {
        setFormSuccess(true);
        setFormData({
          company_name: "",
          brand_name: "",
          email: "",
          phone_code: "+91",
          phone: "",
          gst_number: "",
          pan_number: "",
          country_id: formData.country_id,
          state_id: "",
          address: "",
          brand_logo: "",
        });
        setGstVerified(false);
        fetchSuppliers();
        setTimeout(() => {
          setIsAddOpen(false);
          setFormSuccess(false);
        }, 2000);
      } else {
        setFormError(res.message || "Failed to register supplier.");
      }
    } catch (err) {
      console.error("registerSupplier error:", err);
      setFormError(err.response?.data?.message || "Failed to register supplier. Please check fields.");
    } finally {
      setFormLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      s.company_name?.toLowerCase().includes(query) ||
      s.brand_name?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.phone?.includes(query) ||
      s.gst_number?.toLowerCase().includes(query) ||
      s.pan_number?.toLowerCase().includes(query)
    );
  });

  const selectedCountry = countriesList.find(c => c.id === formData.country_id);
  const isIndia = selectedCountry?.name?.toLowerCase() === 'india' || selectedCountry?.iso2?.toLowerCase() === 'in';

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Supplier Registry"
        subtitle="Manage and onboard new suppliers for the SolarKits ecosystem."
        icon={FaUsers}
        actions={
          <Button
            variant="primary"
            leftIcon={<FaPlus />}
            onClick={() => {
              setIsAddOpen(true);
              setFormError(null);
              setFormSuccess(false);
              resetGst();
              
              // Automatically sync dialog country with header scope selection
              if (selectedScope?.country && countriesList.length > 0) {
                handleCountryChange(selectedScope.country, countriesList);
              } else if (countriesList.length > 0) {
                const india = countriesList.find(c => c.name.toLowerCase() === 'india' || c.iso2?.toLowerCase() === 'in');
                if (india) {
                  handleCountryChange(india.id, countriesList);
                } else {
                  handleCountryChange(countriesList[0].id, countriesList);
                }
              }
            }}
          >
            Add New Supplier
          </Button>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 text-danger text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Toolbar / Search */}
      <div className="card p-5 bg-surface border-border flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="space-y-1 w-full md:w-auto">
          <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <FaSearch className="text-primary text-xs" />
            Search Suppliers
          </h4>
          <p className="text-[11px] text-text-secondary">
            Filter the registry by company, brand, email, phone, GSTIN or PAN.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search by company, GSTIN, PAN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:border-primary/50 transition-colors"
          />
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
        </div>
      </div>

      {/* Supplier Table */}
      <div className="card bg-surface border border-border">
        <div className="overflow-x-auto px-6 pb-6 pt-2">
          <CustomTable
            headers={[
              { key: "company_name", label: "Company / Brand" },
              { key: "contact", label: "Contact Info" },
              { key: "gst_pan", label: "GSTIN / PAN" },
              { key: "activation", label: "Passcode & Verification" },
              { key: "status", label: "Approval Status" },
            ]}
            data={filteredSuppliers}
            loading={loading}
            renderRow={(s) => (
              <>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg">
                      <FaBuilding />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">
                        {s.company_name}
                      </h3>
                      <p className="text-[10px] text-text-muted font-bold uppercase mt-0.5">
                        Brand: {s.brand_name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-text-secondary">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FaEnvelope className="text-primary opacity-60 text-[10px]" />
                      <span>{s.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaPhone className="text-success opacity-60 text-[10px]" />
                      <span>{s.phone_code} {s.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-text-secondary">
                  <div className="space-y-1 font-mono">
                    <div>GSTIN: <span className="font-bold text-text-primary">{s.gst_number || "—"}</span></div>
                    <div>PAN: <span className="font-bold text-text-primary">{s.pan_number || "—"}</span></div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-semibold">
                  {s.is_verified ? (
                    <div className="flex items-center gap-1.5 text-success">
                      <FaCheckCircle className="text-success" />
                      <span>Verified & Passcode Set</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-warning">
                      <FaClock className="text-warning animate-pulse" />
                      <span>Unverified (Pending Activation)</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest ${STATUS_BADGE[s.status] || ""}`}>
                    {s.status}
                  </span>
                </td>
              </>
            )}
            emptyMessage="No suppliers registered in the system."
          />
        </div>
      </div>

      {/* Add Supplier Popup Dialog */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => !formLoading && !gstVerifying && setIsAddOpen(false)}
        title="Add New Supplier"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 text-danger text-xs font-semibold animate-fade-in">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="p-4 rounded-xl bg-success/5 border border-success/20 text-success text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <FaCheckCircle />
              Supplier registered successfully! Closing form...
            </div>
          )}

          {/* Country Selection - Read-only from Header Selection */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between text-xs font-semibold">
            <span className="text-text-secondary font-bold uppercase tracking-widest text-[10px]">Onboarding Country (Linked to Header)</span>
            <span className="text-primary font-black uppercase text-sm">
              {countriesList.find(c => c.id === formData.country_id)?.name || "Not Selected"}
            </span>
          </div>

          {/* India specific GST verification */}
          {isIndia && (
            <div className="p-5 rounded-2xl bg-surface-hover border border-border space-y-4">
              <h4 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-2">
                <FaShieldAlt className="text-primary" /> Tax / GST Identification
              </h4>

              {gstError && (
                <div className="p-3 rounded-xl bg-danger/5 border border-danger/20 text-danger text-xs font-semibold animate-fade-in">
                  {gstError}
                </div>
              )}

              {!gstVerified ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <CustomInput
                        name="gst_number"
                        label="GSTIN Number *"
                        placeholder="e.g. 24ABCDE1234A1ZN"
                        value={formData.gst_number}
                        onChange={(e) => {
                          handleInputChange(e);
                          setGstError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (formData.gst_number.trim().length === 15 && !gstVerifying) {
                              handleGstVerify();
                            }
                          }
                        }}
                        maxLength={15}
                        disabled={gstVerifying || gstOtpSent}
                      />
                    </div>
                    {!gstOtpSent && (
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleGstVerify}
                        loading={gstVerifying}
                        disabled={formData.gst_number.trim().length !== 15 || gstVerifying}
                        className="h-12 px-6 font-bold text-xs uppercase tracking-wider"
                      >
                        Verify GST
                      </Button>
                    )}
                  </div>

                  {gstOtpSent && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col gap-3 animate-fade-in">
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                          Enter 6-digit GST Portal OTP
                        </p>
                        <p className="text-[9px] text-text-muted mt-0.5">
                          In development/mock mode, type <strong>000000</strong> to verify.
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          value={gstOtp}
                          onChange={(e) => setGstOtp(e.target.value.replace(/\D/g, ""))}
                          className="w-32 h-11 bg-surface border border-border rounded-xl text-center font-mono text-base font-bold outline-none focus:border-primary transition-colors"
                          disabled={gstVerifying}
                        />
                        <Button
                          type="button"
                          onClick={handleGstVerifySubmit}
                          loading={gstVerifying}
                          disabled={gstOtp.length !== 6 || gstVerifying}
                          className="h-11 px-5 text-xs font-bold"
                        >
                          Submit OTP
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={resetGst}
                          disabled={gstVerifying}
                          className="h-11 px-3 text-xs font-bold"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                      <FaCheckCircle className="text-base" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          QuickeKYC Verified
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase">
                          {gstData?.gstin_status || "Active"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-text-primary mt-1">
                        {formData.company_name}
                      </p>
                      <p className="text-[10px] font-mono text-text-muted mt-0.5">
                        GSTIN: <span className="font-bold text-text-secondary">{formData.gst_number}</span> &bull; PAN: <span className="font-bold text-text-secondary">{formData.pan_number}</span>
                      </p>
                      {gstData?.state_name && (
                        <p className="text-[10px] text-text-secondary mt-0.5">
                          State: <span className="font-semibold">{gstData.state_name}</span> {gstData.district_name ? `(${gstData.district_name})` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline-primary"
                    onClick={resetGst}
                    className="self-end sm:self-center rounded-xl text-[10px] px-3 py-1.5 uppercase font-bold border-danger/30 text-danger hover:bg-danger/10 shrink-0"
                  >
                    Change GST
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Password Notice */}
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3 text-xs text-text-secondary leading-relaxed items-start">
            <FaInfoCircle className="text-primary text-base shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-text-primary uppercase block tracking-wider mb-1">Password Credentials</span>
              The passcode/password is <strong>not</strong> set here. When this supplier logs into the <strong>Supplier Panel</strong> for the first time, they will activate their account securely via email OTP verification and choose their passcode.
            </div>
          </div>

          {/* India Fields (Locked after verification) */}
          {isIndia && gstVerified && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomInput
                  name="company_name"
                  label="Company Legal Name"
                  value={formData.company_name}
                  disabled
                />
                <CustomInput
                  name="brand_name"
                  label="Brand Name *"
                  placeholder="e.g. Acme Solar"
                  value={formData.brand_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomInput
                  name="email"
                  type="email"
                  label="Corporate Email address *"
                  placeholder="e.g. supplier@company.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
                <CustomInput
                  name="pan_number"
                  label="PAN Number"
                  value={formData.pan_number}
                  disabled
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <CustomInput
                    name="phone_code"
                    label="Dial Code *"
                    value={formData.phone_code}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <CustomInput
                    name="phone"
                    label="Phone Number *"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomInput
                  label="Registered State"
                  value={statesList.find(s => s.id === formData.state_id)?.name || gstData?.state_name || ''}
                  disabled
                />
                <CustomInput
                  name="address"
                  label="Registered Office Address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>

              {/* Brand Logo Upload */}
              <div className="flex flex-col">
                <label className="text-text-secondary mb-2 font-bold uppercase tracking-widest text-[10px]">Brand Logo</label>
                <div className="flex items-center gap-3">
                  {formData.brand_logo ? (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-border bg-surface flex items-center justify-center group/logo">
                      <img src={formData.brand_logo} alt="Logo Preview" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, brand_logo: "" }))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer border-none"
                      >
                        <FaTrashAlt size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="w-12 h-12 rounded-xl border border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center cursor-pointer bg-surface-hover/20">
                      <FaPlus className="text-text-muted hover:text-primary" size={14} />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData(prev => ({ ...prev, brand_logo: reader.result }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                  <div className="flex-1 text-xs text-text-muted font-medium">
                    {formData.brand_logo ? "Logo uploaded" : "Upload company or brand logo"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* International Fields (Editable) */}
          {formData.country_id && !isIndia && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomInput
                  name="company_name"
                  label="Company Legal Name *"
                  placeholder="e.g. Acme Solar International"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  required
                  disabled={formLoading || formSuccess}
                />
                <CustomInput
                  name="brand_name"
                  label="Brand Name *"
                  placeholder="e.g. Acme Solar"
                  value={formData.brand_name}
                  onChange={handleInputChange}
                  required
                  disabled={formLoading || formSuccess}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomInput
                  name="email"
                  type="email"
                  label="Corporate Email address *"
                  placeholder="e.g. info@acmesolar.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={formLoading || formSuccess}
                />
                <div className="flex flex-col w-full">
                  <label className="text-text-secondary mb-2 font-bold uppercase tracking-widest text-[10px]">Select State / Province *</label>
                  <DropdownWithSearchInput
                    options={statesList.map(s => ({ value: s.id, text: s.name }))}
                    value={formData.state_id}
                    onChange={val => setFormData(prev => ({ ...prev, state_id: val }))}
                    placeholder="Select state..."
                    className="w-full"
                    disabled={formLoading || formSuccess || statesList.length === 0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <CustomInput
                    name="phone_code"
                    label="Dial Code *"
                    placeholder="+1"
                    value={formData.phone_code}
                    onChange={handleInputChange}
                    required
                    disabled={formLoading || formSuccess}
                  />
                </div>
                <div className="col-span-2">
                  <CustomInput
                    name="phone"
                    type="tel"
                    label="Phone Number *"
                    placeholder="123456789"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    disabled={formLoading || formSuccess}
                  />
                </div>
              </div>

              <CustomInput
                name="address"
                label="Registered Office Address *"
                placeholder="e.g. 123 Main St, New York, NY"
                value={formData.address}
                onChange={handleInputChange}
                required
                disabled={formLoading || formSuccess}
              />

              {/* Brand Logo Upload */}
              <div className="flex flex-col">
                <label className="text-text-secondary mb-2 font-bold uppercase tracking-widest text-[10px]">Brand Logo</label>
                <div className="flex items-center gap-3">
                  {formData.brand_logo ? (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-border bg-surface flex items-center justify-center group/logo">
                      <img src={formData.brand_logo} alt="Logo Preview" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, brand_logo: "" }))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer border-none"
                      >
                        <FaTrashAlt size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="w-12 h-12 rounded-xl border border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center cursor-pointer bg-surface-hover/20">
                      <FaPlus className="text-text-muted hover:text-primary" size={14} />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData(prev => ({ ...prev, brand_logo: reader.result }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                  <div className="flex-1 text-xs text-text-muted font-medium">
                    {formData.brand_logo ? "Logo uploaded" : "Upload company or brand logo"}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsAddOpen(false)}
              disabled={formLoading || formSuccess}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={formLoading}
              disabled={formSuccess || (isIndia && !gstVerified)}
            >
              Register Supplier
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
