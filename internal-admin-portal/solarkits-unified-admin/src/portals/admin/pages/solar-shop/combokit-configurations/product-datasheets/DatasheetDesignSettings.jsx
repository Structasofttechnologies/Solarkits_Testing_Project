import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import {
  FaPalette,
  FaFont,
  FaColumns,
  FaEye,
  FaSave,
  FaUndo,
  FaCheck,
  FaDesktop,
  FaMobileAlt,
  FaFilePdf,
  FaSolarPanel,
  FaBolt,
  FaBoxOpen,
  FaSlidersH
} from "react-icons/fa";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

const SAMPLE_PREVIEW_DATA = {
  kitName: "SOLARKITS 3 kW On-Grid Solar ComboKit",
  capacity: 3,
  components: [
    {
      category: "Solar Panel",
      productName: "Redren 600 Wp TOPCon Bifacial",
      brand: "Redren",
      quantity: 5,
      specifications: [
        { specification: "Brand / Manufacturer", value: "Redren" },
        { specification: "Model / Rated Power", value: "600 Wp" },
        { specification: "Module Efficiency", value: "22.6 %" },
        { specification: "Max Power Voltage (Vmp)", value: "42.50 V" },
        { specification: "Open Circuit Voltage (Voc)", value: "51.20 V" },
        { specification: "Short Circuit Current (Isc)", value: "14.25 A" }
      ]
    },
    {
      category: "Solar Inverter",
      productName: "SolarKits 3 kW On-Grid Microinverter",
      brand: "SolarKits",
      quantity: 1,
      specifications: [
        { specification: "Inverter Type", value: "On-Grid String / Micro" },
        { specification: "Rated AC Capacity", value: "3 kW" },
        { specification: "Max Efficiency", value: "97.8 %" },
        { specification: "Phase / Voltage", value: "Single Phase / 230 V" },
        { specification: "MPPT Trackers", value: "2 Trackers" },
        { specification: "Protection Rating", value: "IP65 Weatherproof" }
      ]
    },
    {
      category: "BOS Kit",
      productName: "SOLARKITS Residential 3 kW BOS Kit",
      brand: "Polycab Solar / Certified",
      quantity: 1,
      specifications: [
        { specification: "Kit Type", value: "Residential Rooftop BOS" },
        { specification: "Application", value: "3 kW On-Grid Rooftop" },
        { specification: "Solar DC Cable", value: "4 sq.mm Tinned Copper" },
        { specification: "AC Distribution Box", value: "Single Phase ACDB with SPD" },
        { specification: "Earthing Rod", value: "Chemical Compound 2m Rod" }
      ]
    }
  ]
};

const FONT_OPTIONS = [
  { label: "Inter (Modern Clean)", value: "Inter" },
  { label: "Roboto (Engineered)", value: "Roboto" },
  { label: "Outfit (Premium Tech)", value: "Outfit" },
  { label: "Poppins (Friendly Geometric)", value: "Poppins" },
  { label: "Montserrat (Classic Architecture)", value: "Montserrat" },
  { label: "System UI (Native OS)", value: "system-ui" }
];

export default function DatasheetDesignSettings() {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState("theme"); // theme | typography | layout | columns
  const [previewDevice, setPreviewDevice] = useState("desktop"); // desktop | mobile

  // Settings State
  const [settings, setSettings] = useState({
    table_header_bg: "#1E3A8A",
    table_header_text: "#FFFFFF",
    table_bg: "#FFFFFF",
    alternate_row_bg: "#F8FAFC",
    text_color: "#1E293B",
    border_color: "#E2E8F0",
    border_thickness: "1px",
    border_radius: "12px",
    font_family: "Inter",
    font_size: "13px",
    heading_size: "15px",
    cell_padding: "normal",
    table_width: "100%",
    section_header_bg: "#F1F5F9",
    section_heading_style: "accent-bar",
    column_headings: {
      component: "Component Category",
      specification: "Technical Specification",
      value: "Value / Details"
    },
    column_visibility: {
      component: true,
      specification: true,
      value: true
    },
    column_order: ["component", "specification", "value"],
    component_section_order: ["Solar Panel", "Solar Inverter", "BOS Kit"],
    show_section_title: true,
    show_product_name: true,
    show_brand_name: true,
    show_download_button: true
  });

  // Fetch Settings on mount
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/datasheet-settings`, { headers: authHeaderObj() });
      if (res.data?.status === "success" && res.data?.data) {
        setSettings(prev => ({ ...prev, ...res.data.data }));
      }
    } catch (err) {
      console.error("Error fetching datasheet settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  // Save Settings
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put(
        `${API_URL}/datasheet-settings`,
        settings,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Datasheet design settings saved and published to Solar Store!" }));
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to save settings." }));
      }
    } catch (err) {
      console.error(err);
      dispatch(setAlert({ type: "error", message: "Failed to save design settings." }));
    } finally {
      setSaving(false);
    }
  };

  // Reset to Defaults
  const handleReset = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/datasheet-settings/reset`,
        {},
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setSettings(res.data.data);
        dispatch(setAlert({ type: "success", message: "Design settings reset to default SOLARKITS styling." }));
      }
    } catch (err) {
      console.error(err);
      dispatch(setAlert({ type: "error", message: "Failed to reset settings." }));
    }
  };

  // Compute padding styles
  const getPaddingClass = () => {
    switch (settings.cell_padding) {
      case "compact": return "py-1.5 px-3";
      case "relaxed": return "py-3.5 px-5";
      default: return "py-2.5 px-4";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-black tracking-widest bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-400/30 text-blue-200">
            Interactive Visual Styler
          </span>
          <h2 className="text-xl font-black mt-1">Datasheet Table Design Settings</h2>
          <p className="text-xs text-blue-200 max-w-xl">
            Configure fonts, brand colors, table borders, alternating striping, and column visibility.
            Changes apply instantly to the Live Preview and dynamically style the Solar Store and combined PDFs.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button variant="secondary" onClick={handleReset} className="text-xs flex items-center gap-1.5">
            <FaUndo size={11} /> Reset Defaults
          </Button>
          <Button
            variant="success"
            onClick={handleSave}
            isLoading={saving}
            className="text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30"
          >
            <FaSave size={12} /> Save & Apply Design
          </Button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Config Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Navigation Accordion Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-surface-hover/60 rounded-xl border border-border text-center">
            {[
              { id: "theme", label: "Colors", icon: FaPalette },
              { id: "typography", label: "Type & Size", icon: FaFont },
              { id: "layout", label: "Layout", icon: FaSlidersH },
              { id: "columns", label: "Columns", icon: FaColumns }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveAccordion(tab.id)}
                className={`py-2 px-1 text-xs font-bold rounded-lg flex flex-col items-center gap-1 transition-all ${
                  activeAccordion === tab.id
                    ? "bg-surface text-primary shadow-xs border border-border"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <tab.icon size={13} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab 1: Colors & Theme */}
          {activeAccordion === "theme" && (
            <div className="p-5 bg-surface rounded-2xl border border-border shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
                <FaPalette className="text-primary" /> Table Color Palette
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-secondary">Table Header Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.table_header_bg}
                      onChange={(e) => handleChange("table_header_bg", e.target.value)}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.table_header_bg}
                      onChange={(e) => handleChange("table_header_bg", e.target.value)}
                      className="w-20 text-xs font-mono uppercase px-2 py-1 bg-surface border border-border rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-secondary">Header Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.table_header_text}
                      onChange={(e) => handleChange("table_header_text", e.target.value)}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.table_header_text}
                      onChange={(e) => handleChange("table_header_text", e.target.value)}
                      className="w-20 text-xs font-mono uppercase px-2 py-1 bg-surface border border-border rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-secondary">Section Header Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.section_header_bg}
                      onChange={(e) => handleChange("section_header_bg", e.target.value)}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.section_header_bg}
                      onChange={(e) => handleChange("section_header_bg", e.target.value)}
                      className="w-20 text-xs font-mono uppercase px-2 py-1 bg-surface border border-border rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-secondary">Table Body Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.table_bg}
                      onChange={(e) => handleChange("table_bg", e.target.value)}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.table_bg}
                      onChange={(e) => handleChange("table_bg", e.target.value)}
                      className="w-20 text-xs font-mono uppercase px-2 py-1 bg-surface border border-border rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-secondary">Alternate Row Striping</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.alternate_row_bg}
                      onChange={(e) => handleChange("alternate_row_bg", e.target.value)}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.alternate_row_bg}
                      onChange={(e) => handleChange("alternate_row_bg", e.target.value)}
                      className="w-20 text-xs font-mono uppercase px-2 py-1 bg-surface border border-border rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-secondary">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.text_color}
                      onChange={(e) => handleChange("text_color", e.target.value)}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.text_color}
                      onChange={(e) => handleChange("text_color", e.target.value)}
                      className="w-20 text-xs font-mono uppercase px-2 py-1 bg-surface border border-border rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-secondary">Border Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.border_color}
                      onChange={(e) => handleChange("border_color", e.target.value)}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.border_color}
                      onChange={(e) => handleChange("border_color", e.target.value)}
                      className="w-20 text-xs font-mono uppercase px-2 py-1 bg-surface border border-border rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Typography & Sizing */}
          {activeAccordion === "typography" && (
            <div className="p-5 bg-surface rounded-2xl border border-border shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
                <FaFont className="text-primary" /> Typography & Dimensions
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-text-secondary block mb-1">Font Family</label>
                  <select
                    value={settings.font_family}
                    onChange={(e) => handleChange("font_family", e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg"
                  >
                    {FONT_OPTIONS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-text-secondary block mb-1">Body Font Size</label>
                    <select
                      value={settings.font_size}
                      onChange={(e) => handleChange("font_size", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg"
                    >
                      <option value="11px">11px (Compact)</option>
                      <option value="12px">12px (Small)</option>
                      <option value="13px">13px (Default)</option>
                      <option value="14px">14px (Medium)</option>
                      <option value="15px">15px (Large)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary block mb-1">Heading Size</label>
                    <select
                      value={settings.heading_size}
                      onChange={(e) => handleChange("heading_size", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg"
                    >
                      <option value="13px">13px</option>
                      <option value="14px">14px</option>
                      <option value="15px">15px (Default)</option>
                      <option value="16px">16px</option>
                      <option value="18px">18px (Prominent)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-text-secondary block mb-1">Cell Padding</label>
                    <select
                      value={settings.cell_padding}
                      onChange={(e) => handleChange("cell_padding", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg"
                    >
                      <option value="compact">Compact (6px)</option>
                      <option value="normal">Normal (10px)</option>
                      <option value="relaxed">Relaxed (14px)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary block mb-1">Border Radius</label>
                    <select
                      value={settings.border_radius}
                      onChange={(e) => handleChange("border_radius", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg"
                    >
                      <option value="0px">None (Square 0px)</option>
                      <option value="6px">Subtle (6px)</option>
                      <option value="12px">Rounded (12px)</option>
                      <option value="16px">Pill / Soft (16px)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-text-secondary block mb-1">Border Thickness</label>
                    <select
                      value={settings.border_thickness}
                      onChange={(e) => handleChange("border_thickness", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg"
                    >
                      <option value="1px">1px (Subtle)</option>
                      <option value="2px">2px (Defined)</option>
                      <option value="0px">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary block mb-1">Section Style</label>
                    <select
                      value={settings.section_heading_style}
                      onChange={(e) => handleChange("section_heading_style", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg"
                    >
                      <option value="accent-bar">Accent Bar</option>
                      <option value="bold">Bold Solid</option>
                      <option value="uppercase">Uppercase Badge</option>
                      <option value="pill">Pill Tag</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Layout & Section Settings */}
          {activeAccordion === "layout" && (
            <div className="p-5 bg-surface rounded-2xl border border-border shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
                <FaSlidersH className="text-primary" /> Layout & Component Visibility
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-surface-hover/50 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-text-primary">Show Section Titles</p>
                    <p className="text-[10px] text-text-secondary">Display category headers (e.g. Solar Panel)</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.show_section_title}
                    onChange={(e) => handleChange("show_section_title", e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-surface-hover/50 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-text-primary">Show Product Name</p>
                    <p className="text-[10px] text-text-secondary">Display mapped product model title</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.show_product_name}
                    onChange={(e) => handleChange("show_product_name", e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-surface-hover/50 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-text-primary">Show Brand Name</p>
                    <p className="text-[10px] text-text-secondary">Display manufacturer brand tag</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.show_brand_name}
                    onChange={(e) => handleChange("show_brand_name", e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-surface-hover/50 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-text-primary">Show Download PDF Button</p>
                    <p className="text-[10px] text-text-secondary">Allow customers to download combined PDF</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.show_download_button}
                    onChange={(e) => handleChange("show_download_button", e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Column Customization */}
          {activeAccordion === "columns" && (
            <div className="p-5 bg-surface rounded-2xl border border-border shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
                <FaColumns className="text-primary" /> Table Column Headings & Visibility
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-surface-hover/40 rounded-xl border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary">Component Category Column</span>
                    <label className="text-[10px] font-semibold flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.column_visibility?.component ?? true}
                        onChange={(e) => handleNestedChange("column_visibility", "component", e.target.checked)}
                        className="rounded"
                      /> Visible
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.column_headings?.component || ""}
                    onChange={(e) => handleNestedChange("column_headings", "component", e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-surface border border-border rounded-lg"
                    placeholder="Component Category"
                  />
                </div>

                <div className="p-3 bg-surface-hover/40 rounded-xl border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary">Specification Name Column</span>
                    <label className="text-[10px] font-semibold flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.column_visibility?.specification ?? true}
                        onChange={(e) => handleNestedChange("column_visibility", "specification", e.target.checked)}
                        className="rounded"
                      /> Visible
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.column_headings?.specification || ""}
                    onChange={(e) => handleNestedChange("column_headings", "specification", e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-surface border border-border rounded-lg"
                    placeholder="Technical Specification"
                  />
                </div>

                <div className="p-3 bg-surface-hover/40 rounded-xl border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary">Value Details Column</span>
                    <label className="text-[10px] font-semibold flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.column_visibility?.value ?? true}
                        onChange={(e) => handleNestedChange("column_visibility", "value", e.target.checked)}
                        className="rounded"
                      /> Visible
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.column_headings?.value || ""}
                    onChange={(e) => handleNestedChange("column_headings", "value", e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-surface border border-border rounded-lg"
                    placeholder="Value / Details"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Interactive Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                Live Storefront Preview
              </h3>
            </div>

            {/* Device Switcher */}
            <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                  previewDevice === "desktop" ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"
                }`}
              >
                <FaDesktop size={11} /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                  previewDevice === "mobile" ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"
                }`}
              >
                <FaMobileAlt size={11} /> Mobile
              </button>
            </div>
          </div>

          {/* Preview Container Frame */}
          <div
            className={`transition-all duration-300 mx-auto ${
              previewDevice === "mobile" ? "max-w-sm border-8 border-slate-700 rounded-3xl p-3 shadow-2xl bg-slate-50" : "w-full"
            }`}
          >
            <div
              className="rounded-2xl border border-border bg-white shadow-xs p-4 sm:p-6 space-y-4"
              style={{ fontFamily: settings.font_family }}
            >
              {/* Header inside preview */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {SAMPLE_PREVIEW_DATA.capacity} kW Solar ComboKit
                  </span>
                  <h4 className="text-sm sm:text-base font-black text-text-primary mt-1">
                    {SAMPLE_PREVIEW_DATA.kitName}
                  </h4>
                  <p className="text-[11px] text-text-secondary">
                    Technical Specifications & Combined Engineering Datasheet
                  </p>
                </div>

                {settings.show_download_button && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-lg text-xs font-bold border border-red-500/20 flex items-center gap-1.5"
                    >
                      <FaFilePdf size={11} /> Download PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Styled Table Frame */}
              <div
                className="overflow-hidden overflow-x-auto shadow-xs"
                style={{
                  borderRadius: settings.border_radius,
                  border: `${settings.border_thickness} solid ${settings.border_color}`,
                  backgroundColor: settings.table_bg
                }}
              >
                <table className="w-full text-left" style={{ fontSize: settings.font_size, color: settings.text_color }}>
                  {/* Table Header */}
                  <thead>
                    <tr
                      style={{
                        backgroundColor: settings.table_header_bg,
                        color: settings.table_header_text,
                        fontSize: settings.heading_size
                      }}
                    >
                      {settings.column_visibility?.component && (
                        <th className={`font-bold ${getPaddingClass()}`}>
                          {settings.column_headings?.component || "Component"}
                        </th>
                      )}
                      {settings.column_visibility?.specification && (
                        <th className={`font-bold ${getPaddingClass()}`}>
                          {settings.column_headings?.specification || "Specification"}
                        </th>
                      )}
                      {settings.column_visibility?.value && (
                        <th className={`font-bold ${getPaddingClass()}`}>
                          {settings.column_headings?.value || "Value"}
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {SAMPLE_PREVIEW_DATA.components.map((comp, cIdx) => (
                      <React.Fragment key={cIdx}>
                        {/* Section Header */}
                        {settings.show_section_title && (
                          <tr
                            style={{
                              backgroundColor: settings.section_header_bg,
                              borderBottom: `${settings.border_thickness} solid ${settings.border_color}`
                            }}
                          >
                            <td
                              colSpan={3}
                              className={`font-black uppercase tracking-wider text-[11px] ${getPaddingClass()}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {settings.section_heading_style === "accent-bar" && (
                                    <span className="w-1.5 h-3.5 bg-primary rounded-full" />
                                  )}
                                  <span>{comp.category}</span>
                                  {settings.show_product_name && (
                                    <span className="text-text-muted font-normal lowercase">
                                      — {comp.productName}
                                    </span>
                                  )}
                                </div>
                                {settings.show_brand_name && (
                                  <span className="text-[10px] font-bold bg-white/80 px-2 py-0.5 rounded border border-border">
                                    Brand: {comp.brand}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Specs Rows */}
                        {comp.specifications.map((spec, rIdx) => {
                          const isAlt = rIdx % 2 === 1;
                          const rowBg = isAlt ? settings.alternate_row_bg : settings.table_bg;
                          return (
                            <tr
                              key={rIdx}
                              style={{
                                backgroundColor: rowBg,
                                borderBottom: `${settings.border_thickness} solid ${settings.border_color}`
                              }}
                            >
                              {settings.column_visibility?.component && (
                                <td className={`text-text-muted text-[11px] font-medium ${getPaddingClass()}`}>
                                  {comp.category}
                                </td>
                              )}
                              {settings.column_visibility?.specification && (
                                <td className={`font-bold ${getPaddingClass()}`}>
                                  {spec.specification}
                                </td>
                              )}
                              {settings.column_visibility?.value && (
                                <td className={getPaddingClass()}>
                                  {spec.value}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-text-muted text-[10px]">
                Preview mode: Live changes update instantly. Save settings above to publish to live store.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
