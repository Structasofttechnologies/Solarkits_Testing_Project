import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FaTag, FaPlus, FaTrash, FaEdit, FaCalendarAlt,
  FaCoins, FaInfoCircle, FaCheckCircle, FaPercent, FaRegTimesCircle,
  FaMapMarkerAlt
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import CustomInput from "@/components/CustomInput";
import Dropdown from "@/components/Dropdown";
import ToggleButton from "@/components/ToggleButton";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export default function OffersManagement() {
  const { countryName } = useParams();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const todayStr = new Date().toISOString().split('T')[0];

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Geolocation & Filter State
  const [activeCountries, setActiveCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [comboKits, setComboKits] = useState([]);
  const [stateFilter, setStateFilter] = useState("");
  const [clusterFilter, setClusterFilter] = useState("");
  const moduleUniqueId = "ADM_ORDER_SETTINGS";

  // Form modal visibility
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    offer_name: "",
    offer_type: "discount",
    discount_type: "flat",
    discount_value: "",
    start_date: "",
    end_date: "",
    customer_category: "all",
    coupon_code: "",
    priority: 4,
    stackable: false,
    is_active: true,
    max_qty: "",
    products_applicable: []
  });

  // 1. Fetch countries and states on mount/country change
  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        const countriesRes = await axios.get(
          `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        const countriesList = countriesRes.data?.countries || [];
        setActiveCountries(countriesList);

        const currentCountryObj = countriesList.find(
          c => c.name.toLowerCase() === (countryName || "india").toLowerCase()
        );

        if (currentCountryObj) {
          const statesRes = await axios.post(
            `${API_URL}/geolocation/active-states?unique_id=${moduleUniqueId}&req_for=view`,
            { country_id: currentCountryObj.id },
            { headers: authHeaderObj() }
          );
          setStates(statesRes.data?.states || []);
        }
      } catch (err) {
        console.error("Error fetching geo data in offers:", err);
      }
    };
    if (token) {
      fetchGeoData();
      setStateFilter("");
      setClusterFilter("");
    }
  }, [token, countryName]);

  // 2. Fetch clusters when stateFilter changes
  useEffect(() => {
    const fetchClustersForFilter = async () => {
      if (!stateFilter) {
        setClusters([]);
        setClusterFilter("");
        return;
      }
      try {
        const res = await axios.get(
          `${API_URL}/geolocation/clusters/${stateFilter}?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        setClusters(res.data?.clusters || []);
        setClusterFilter("");
      } catch (err) {
        console.error("Error fetching clusters:", err);
      }
    };
    if (token) {
      fetchClustersForFilter();
    }
  }, [stateFilter, token]);

  // 3. Fetch combo kits for the selected country
  useEffect(() => {
    const fetchKits = async () => {
      const currentCountryObj = activeCountries.find(
        c => c.name.toLowerCase() === (countryName || "india").toLowerCase()
      );
      if (!currentCountryObj) return;
      try {
        const isIndia = currentCountryObj.iso2?.toLowerCase() === "in";
        const kitEndpoint = isIndia ? "combo-kits/india/get-kits" : "combo-kits/get-kits";
        const res = await axios.get(
          `${API_URL}/${kitEndpoint}?unique_id=${moduleUniqueId}&req_for=view&is_custom=false&country_id=${currentCountryObj.id}${clusterFilter ? `&cluster_id=${clusterFilter}` : ""}`,
          { headers: authHeaderObj() }
        );
        if (res.data?.status === "success") {
          setComboKits(res.data.data || []);
        }
      } catch (err) {
        console.error("Error loading combo kits in offers:", err);
      }
    };

    if (activeCountries.length > 0) {
      fetchKits();
    }
  }, [activeCountries, countryName, clusterFilter]);

  const fetchOffers = async () => {
    if (!clusterFilter) {
      setOffers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/solarshop/offers?req_for=view&unique_id=${moduleUniqueId}&cluster_id=${clusterFilter}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setOffers(res.data.data || []);
      }
    } catch (error) {
      console.error("Error loading offers:", error);
      dispatch(setAlert({ type: "error", message: "Failed to load offers." }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && clusterFilter) {
      fetchOffers();
    } else {
      setOffers([]);
    }
  }, [token, clusterFilter]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      offer_name: "",
      offer_type: "discount",
      discount_type: "flat",
      discount_value: "",
      start_date: "",
      end_date: "",
      customer_category: "all",
      coupon_code: "",
      priority: 4,
      stackable: false,
      is_active: true,
      max_qty: "",
      products_applicable: []
    });
    setShowModal(true);
  };

  const handleOpenEdit = (offer) => {
    setEditingId(offer.id || offer._id);
    setFormData({
      offer_name: offer.offer_name,
      offer_type: offer.offer_type,
      discount_type: offer.discount_type || "flat",
      discount_value: offer.discount_value,
      start_date: offer.start_date ? new Date(offer.start_date).toISOString().split('T')[0] : "",
      end_date: offer.end_date ? new Date(offer.end_date).toISOString().split('T')[0] : "",
      customer_category: offer.customer_category || "all",
      coupon_code: offer.coupon_code || "",
      priority: offer.priority,
      stackable: offer.stackable || false,
      is_active: offer.is_active !== undefined ? offer.is_active : true,
      max_qty: offer.max_qty || "",
      products_applicable: offer.products_applicable || []
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.offer_name || !formData.discount_value || !formData.start_date || !formData.end_date) {
      dispatch(setAlert({ type: "warning", message: "Please fill in all required fields." }));
      return;
    }
    if (formData.offer_type === 'coupon' && !formData.coupon_code) {
      dispatch(setAlert({ type: "warning", message: "Coupon code is required for Coupon Code offer type." }));
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (formData.start_date < todayStr) {
      dispatch(setAlert({ type: "warning", message: "Start date must be today or a future date." }));
      return;
    }
    if (formData.end_date <= formData.start_date) {
      dispatch(setAlert({ type: "warning", message: "End date must be after the start date." }));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        cluster_id: clusterFilter,
        discount_value: Number(formData.discount_value),
        priority: Number(formData.priority),
        max_qty: formData.max_qty ? Number(formData.max_qty) : null
      };

      if (editingId) {
        await axios.put(`${API_URL}/solarshop/offers/${editingId}?req_for=edit&unique_id=ADM_ORDER_SETTINGS`, payload, { headers: authHeaderObj() });
        dispatch(setAlert({ type: "success", message: "Offer updated successfully!" }));
      } else {
        await axios.post(`${API_URL}/solarshop/offers?req_for=add&unique_id=ADM_ORDER_SETTINGS`, payload, { headers: authHeaderObj() });
        dispatch(setAlert({ type: "success", message: "Offer created successfully!" }));
      }
      setShowModal(false);
      fetchOffers();
    } catch (error) {
      console.error("Error saving offer:", error);
      dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Failed to save offer." }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      await axios.delete(`${API_URL}/solarshop/offers/${id}?req_for=delete&unique_id=ADM_ORDER_SETTINGS`, { headers: authHeaderObj() });
      dispatch(setAlert({ type: "success", message: "Offer deleted successfully!" }));
      fetchOffers();
    } catch (error) {
      console.error("Error deleting offer:", error);
      dispatch(setAlert({ type: "error", message: "Failed to delete offer." }));
    }
  };

  const getPriorityLabel = (priority) => {
    switch (Number(priority)) {
      case 1: return "1 - Flash Sale (Highest)";
      case 2: return "2 - Buy Pack Offer";
      case 3: return "3 - Coupon Code";
      case 4: return "4 - Standard Discount (Lowest)";
      default: return `${priority}`;
    }
  };

  const getOfferNameLabel = () => {
    if (formData.offer_type === "sales_day") return "Sale Name *";
    return "Offer Name *";
  };

  const getDiscountValueLabel = () => {
    if (formData.offer_type === "bundle") return "Discount Value (per kW) *";
    return "Discount Value *";
  };

  const getMaxQtyLabel = () => {
    if (formData.offer_type === "sales_day") return "Maximum Quantity";
    return "Sales Day Max Quantity Limit";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-surface p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FaTag className="text-primary" /> Offers & Promotions Master
          </h2>
          <p className="text-text-secondary text-sm">
            Manage flash sales, coupon codes, bulk discounts, and kit offers for the Solar Shop.
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          variant="primary"
          leftIcon={<FaPlus />}
          disabled={!clusterFilter}
          title={!clusterFilter ? "Please select a state and cluster first" : ""}
        >
          Create Offer
        </Button>
      </div>

      {/* Location Filter */}
      <div className="flex flex-wrap items-center gap-4 bg-surface p-4 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-2 text-text-secondary text-sm font-semibold">
          <FaMapMarkerAlt /> Filter By Location:
        </div>

        <div className="w-48">
          <Dropdown
            placeholder="Select State"
            options={states.map(s => ({ text: s.name, value: s.id }))}
            value={stateFilter}
            onChange={(val) => setStateFilter(val)}
          />
        </div>

        <div className="w-48">
          <Dropdown
            placeholder="Select Cluster"
            options={clusters.map(c => ({ text: c.name, value: c.id }))}
            value={clusterFilter}
            onChange={(val) => setClusterFilter(val)}
            disabled={!stateFilter}
          />
        </div>
      </div>

      {loading ? (
        <Loader text="Loading offers..." />
      ) : (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-hover border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-4">Offer Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Discount</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Validity</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {!clusterFilter ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-text-secondary">
                      Please select a State and Cluster first to view and manage promotional offers.
                    </td>
                  </tr>
                ) : offers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-text-secondary">
                      No active offers configured for this cluster. Click "Create Offer" to add one.
                    </td>
                  </tr>
                ) : (
                  offers.map((offer) => (
                    <tr key={offer.id || offer._id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-text-primary">{offer.offer_name}</div>
                        {offer.coupon_code && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-mono font-bold bg-primary-soft text-primary rounded border border-primary/20">
                            {offer.coupon_code}
                          </span>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {offer.products_applicable && offer.products_applicable.length > 0 ? (
                            offer.products_applicable.map(pId => {
                              const kit = comboKits.find(k => (k.id || k._id).toString() === pId.toString());
                              return kit ? (
                                <span key={pId} className="px-1.5 py-0.5 text-[10px] font-semibold bg-surface-hover text-text-secondary rounded border border-border">
                                  {kit.name}
                                </span>
                              ) : null;
                            })
                          ) : (
                            <span className="text-[10px] text-text-muted italic">All Kits Eligible</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize px-2.5 py-1 text-xs font-semibold rounded-full bg-surface border border-border">
                          {offer.offer_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-text-primary">
                        {offer.discount_type === 'percent' ? `${offer.discount_value}%` : `₹${offer.discount_value}`} OFF
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-text-secondary">
                        {getPriorityLabel(offer.priority)}
                      </td>
                      <td className="px-6 py-4 text-xs text-text-muted">
                        <div className="flex items-center gap-1">
                          <FaCalendarAlt />
                          {new Date(offer.start_date).toLocaleDateString()} - {new Date(offer.end_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${offer.is_active
                            ? 'bg-success-soft text-success border border-success/20'
                            : 'bg-danger-soft text-danger border border-danger/20'
                          }`}>
                          {offer.is_active ? <FaCheckCircle size={10} /> : <FaRegTimesCircle size={10} />}
                          {offer.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(offer)}
                            className="p-2 text-text-secondary hover:text-primary transition-colors hover:bg-surface rounded-lg border border-transparent hover:border-border"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(offer.id || offer._id)}
                            className="p-2 text-text-secondary hover:text-danger transition-colors hover:bg-surface rounded-lg border border-transparent hover:border-border"
                          >
                            <FaTrash size={14} />
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

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="gradient-primary px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-lg text-text-inverse">
                {editingId ? "Edit Promotion Offer" : "Create New Promotion Offer"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-text-inverse/80 hover:text-text-inverse text-xl"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <CustomInput
                label={getOfferNameLabel()}
                type="text"
                name="offer_name"
                value={formData.offer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, offer_name: e.target.value }))}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Dropdown
                  label="Offer Type *"
                  disabled={!!editingId}
                  options={[
                    { text: "Discount Kit", value: "discount" },
                    { text: "Sales Day Offer", value: "sales_day" },
                    { text: "Buy Pack Offer", value: "bundle" },
                    { text: "Coupon Code", value: "coupon" }
                  ]}
                  value={formData.offer_type}
                  onChange={(val) => {
                    let priority = 4;
                    let discount_type = formData.discount_type;
                    if (val === 'sales_day') priority = 1;
                    else if (val === 'bundle') {
                      priority = 2;
                      discount_type = 'flat';
                    }
                    else if (val === 'coupon') priority = 3;

                    setFormData(prev => ({
                      ...prev,
                      offer_type: val,
                      priority,
                      discount_type
                    }));
                  }}
                />

                {formData.offer_type !== 'bundle' && (
                  <Dropdown
                    label="Discount Unit *"
                    options={[
                      { text: "Flat Rate (₹)", value: "flat" },
                      { text: "Percentage (%)", value: "percent" }
                    ]}
                    value={formData.discount_type}
                    onChange={(val) => setFormData(prev => ({ ...prev, discount_type: val }))}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CustomInput
                  label={getDiscountValueLabel()}
                  type="number"
                  name="discount_value"
                  value={formData.discount_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                  required
                />

                {formData.offer_type === 'coupon' && (
                  <CustomInput
                    label="Coupon Code *"
                    type="text"
                    name="coupon_code"
                    value={formData.coupon_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, coupon_code: e.target.value.toUpperCase() }))}
                    placeholder="SOLAR500"
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CustomInput
                  label="Start Date *"
                  type="date"
                  name="start_date"
                  min={todayStr}
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  required
                />
                <CustomInput
                  label="End Date *"
                  type="date"
                  name="end_date"
                  min={formData.start_date || todayStr}
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <MultiSelectDropdownWithSearchInput
                  label="Products Applicable (Leave empty for all kits)"
                  placeholder="Select applicable combo kits..."
                  options={comboKits.map(kit => ({
                    text: kit.name,
                    value: kit.id || kit._id
                  }))}
                  values={formData.products_applicable || []}
                  onChange={(selectedValues) => {
                    setFormData(prev => ({
                      ...prev,
                      products_applicable: selectedValues
                    }));
                  }}
                />
              </div>

              {(formData.offer_type === 'sales_day' || formData.offer_type === 'bundle') && (
                <div className="grid grid-cols-2 gap-4">
                  {formData.offer_type === 'sales_day' && (
                    <CustomInput
                      label={getMaxQtyLabel()}
                      type="number"
                      name="max_qty"
                      value={formData.max_qty}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_qty: e.target.value }))}
                      placeholder="No Limit"
                    />
                  )}

                  {formData.offer_type === 'bundle' && (
                    <CustomInput
                      label="Minimum Quantity to Buy *"
                      type="number"
                      name="max_qty"
                      value={formData.max_qty || 5}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_qty: e.target.value }))}
                      required
                    />
                  )}
                </div>
              )}

              <div className="flex items-center gap-8 pt-2">
                 <div className="flex items-center gap-2">
                   <ToggleButton
                     checked={formData.is_active}
                     onChange={(val) => setFormData(prev => ({ ...prev, is_active: val }))}
                   />
                   <span className="text-sm font-medium text-text-primary">Enable Offer</span>
                 </div>
               </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <Button onClick={() => setShowModal(false)} variant="secondary">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={saving}>
                  {editingId ? "Save Changes" : "Create Offer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
