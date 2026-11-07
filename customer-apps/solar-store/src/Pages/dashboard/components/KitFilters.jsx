import { useEffect, useState, useMemo } from "react";
import Dropdown from "@/Components/Dropdown";
import Button from "@/Components/Button";
import { FiChevronDown, FiChevronUp, FiFilter } from "react-icons/fi";

const options = {
  pricePerKw: [
    { text: "All Price/kW", value: "all" },
    { text: "₹0-25,000/kW", value: "0-25000" },
    { text: "₹25,000-50,000/kW", value: "25000-60000" },
    { text: "₹50,000-75,000/kW", value: "50000-75000" },
    { text: "₹75,000-100,000/kW", value: "75000-100000" },
    { text: "Above ₹100,000/kW", value: "100000+" },
  ],
  popularKits: [
    { text: "All Kits", value: "all" },
    { text: "Popular Kits", value: "popular" },
    { text: "Most Popular", value: "most_popular" },
    { text: "Trending Kits", value: "trending" },
    { text: "Top Rated", value: "top_rated" },
  ],
  frequencyBuyer: [
    { text: "All Buyers", value: "all" },
    { text: "Frequent Buyer", value: "frequent" },
    { text: "Regular Buyer", value: "regular" },
    { text: "High Volume Buyer", value: "high_volume" },
    { text: "Bulk / EPC Buyer", value: "bulk" },
  ],
};

export default function KitFilters({
  availableKits,
  filters,
  setFilters,
  searchTerm = "",
  onSearchChange,
  showSidebar = false,
  clearFilters,
  filterKeys = [],
  expandedSections = { capacity: true, panel: true, inverter: false, battery: false },
  onToggleSection,
}) {
  const [localSearch, setLocalSearch] = useState(searchTerm);

  const dynamicOptions = useMemo(() => {
    const makeUnique = (arr) =>
      Array.from(new Map(arr.map((item) => [item.value, item])).values());

    const parseNumber = (val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number" && !isNaN(val)) return val;
      if (typeof val === "string") {
        const cleaned = val.replace(/,/g, "").match(/[\d.]+/);
        if (cleaned) {
          const num = parseFloat(cleaned[0]);
          return isNaN(num) ? null : num;
        }
      }
      return null;
    };

    const getPanel = (kit) => {
      if (kit.panel) return kit.panel;
      if (Array.isArray(kit.includedComponents)) {
        const found = kit.includedComponents.find((c) =>
          c.actualType === "panel" ||
          c.componentType?.toLowerCase().includes("panel") ||
          c.componentType?.toLowerCase().includes("module") ||
          c.componentType?.toLowerCase().includes("pv") ||
          (c.skuCode && c.skuCode.toUpperCase().startsWith("SOL-")) ||
          (c.name && /panel|module|bifacial|topcon|mono|poly|wp\b/i.test(c.name)) ||
          (c.technologyType && /bifacial|topcon|mono|poly/i.test(c.technologyType))
        );
        if (found) {
          let tech = found.technologyType;
          if (!tech) {
            if (/bifacial/i.test(found.name || "") || /BIFA/i.test(found.skuCode || "")) tech = "Bifacial";
            else if (/topcon/i.test(found.name || "") || /TOPC/i.test(found.skuCode || "")) tech = "TOPCon";
            else if (/mono/i.test(found.name || "") || /MONO/i.test(found.skuCode || "")) tech = "Mono PERC";
            else if (/poly/i.test(found.name || "") || /POLY/i.test(found.skuCode || "")) tech = "Polycrystalline";
          }
          return {
            ...found,
            technologyType: tech || found.technologyType || "Bifacial",
            wattPerPanel: found.wattPerPanel || 500,
            warrantyYears: found.warrantyYears || 25,
            efficiencyPercent: found.efficiencyPercent || 21.5
          };
        }
      }
      return null;
    };

    const getInverter = (kit) => {
      if (kit.inverter) return kit.inverter;
      if (Array.isArray(kit.includedComponents)) {
        const found = kit.includedComponents.find((c) =>
          c.actualType === "inverter" ||
          c.componentType?.toLowerCase().includes("inverter") ||
          (c.skuCode && c.skuCode.toUpperCase().startsWith("INV-")) ||
          (c.name && /inverter/i.test(c.name))
        );
        if (found) {
          let invType = found.type;
          if (!invType || invType === "inverter" || invType === "other") {
            if (/micro/i.test(found.name || "") || /MICR/i.test(found.skuCode || "")) invType = "Microinverter";
            else if (/string/i.test(found.name || "") || /STRI/i.test(found.skuCode || "")) invType = "String Inverter";
            else invType = "On-Grid Inverter";
          }
          let cap = found.capacityKW || kit.capacityKW || kit.capacity;
          if (cap >= 100) cap = cap / 1000;
          return {
            ...found,
            type: invType,
            capacityKW: cap,
            warrantyYears: found.warrantyYears || (invType === "Microinverter" ? 10 : 5),
            efficiencyPercent: found.efficiencyPercent || (invType === "Microinverter" ? 96.7 : 98.2)
          };
        }
      }
      return null;
    };

    const systemCapacitiesSet = new Set();
    const panelTechnologies = [];
    const panelWattagesSet = new Set();
    const panelWarrantiesSet = new Set();
    const panelEfficienciesSet = new Set();

    const inverterTypes = [];
    const inverterCapacitiesSet = new Set();
    const inverterWarrantiesSet = new Set();
    const inverterEfficienciesSet = new Set();

    availableKits?.forEach((kit) => {
      const sysCap = parseNumber(kit.capacityKW) ?? parseNumber(kit.capacity);
      if (sysCap !== null && sysCap > 0) systemCapacitiesSet.add(sysCap);

      const panel = getPanel(kit);
      if (panel) {
        const tech = (panel.technologyType || panel.technology || "").trim();
        if (tech) {
          panelTechnologies.push({ text: tech, value: tech.toLowerCase() });
        }
        const watt = parseNumber(panel.wattPerPanel);
        if (watt !== null && watt > 0) panelWattagesSet.add(watt);

        const warranty = parseNumber(panel.warrantyYears);
        if (warranty !== null && warranty > 0) panelWarrantiesSet.add(warranty);

        const eff = parseNumber(panel.efficiencyPercent);
        if (eff !== null && eff > 0) panelEfficienciesSet.add(eff);
      }

      const inverter = getInverter(kit);
      if (inverter) {
        const type = (inverter.type || inverter.category || "").trim();
        if (type) {
          inverterTypes.push({ text: type, value: type.toLowerCase() });
        }
        let cap = parseNumber(inverter.capacityKW);
        if (cap !== null && cap >= 100) cap = cap / 1000;
        if (!cap) cap = parseNumber(kit.capacityKW) || parseNumber(kit.capacity);
        if (cap !== null && cap > 0) inverterCapacitiesSet.add(cap);

        const warranty = parseNumber(inverter.warrantyYears);
        if (warranty !== null && warranty > 0) inverterWarrantiesSet.add(warranty);

        const eff = parseNumber(inverter.efficiencyPercent);
        if (eff !== null && eff > 0) inverterEfficienciesSet.add(eff);
      }
    });

    const sysCapSorted = Array.from(systemCapacitiesSet).sort((a, b) => a - b);
    const dynamicSystemCapacities = [
      { text: "All Capacities", value: "all" },
      ...sysCapSorted.map((c) => ({ text: `${c} kW`, value: String(c) }))
    ];

    const wattSorted = Array.from(panelWattagesSet).sort((a, b) => a - b);
    const dynamicWatts = [
      { text: "All Wattages", value: "all" },
      ...wattSorted.map((w) => ({ text: `${w}W`, value: String(w) }))
    ];

    const warrantySorted = Array.from(panelWarrantiesSet).sort((a, b) => a - b);
    const dynamicPanelWarranties = [
      { text: "All Warranties", value: "all" },
      ...warrantySorted.map((w) => ({ text: `${w} Years`, value: String(w) }))
    ];

    const panelEffSorted = Array.from(panelEfficienciesSet).sort((a, b) => a - b);
    const dynamicPanelEfficiencies = [
      { text: "All Efficiency", value: "all" },
      ...panelEffSorted.map((e) => ({ text: `${e}%`, value: String(e) }))
    ];

    const capSorted = Array.from(inverterCapacitiesSet).sort((a, b) => a - b);
    const dynamicInverterCapacities = [
      { text: "All Capacities", value: "all" },
      ...capSorted.map((c) => ({ text: `${c} kW`, value: String(c) }))
    ];

    const invWarrantySorted = Array.from(inverterWarrantiesSet).sort((a, b) => a - b);
    const dynamicInverterWarranties = [
      { text: "All Warranties", value: "all" },
      ...invWarrantySorted.map((w) => ({ text: `${w} Years`, value: String(w) }))
    ];

    const invEffSorted = Array.from(inverterEfficienciesSet).sort((a, b) => a - b);
    const dynamicInverterEfficiencies = [
      { text: "All Efficiency", value: "all" },
      ...invEffSorted.map((e) => ({ text: `${e}%`, value: String(e) }))
    ];

    return {
      systemCapacities: dynamicSystemCapacities,
      panelTechnologies: [{ text: "All Technologies", value: "all" }, ...makeUnique(panelTechnologies)],
      panelWattages: dynamicWatts,
      panelWarranties: dynamicPanelWarranties,
      panelEfficiencies: dynamicPanelEfficiencies,
      inverterTypes: [{ text: "All Types", value: "all" }, ...makeUnique(inverterTypes)],
      inverterCapacities: dynamicInverterCapacities,
      inverterWarranties: dynamicInverterWarranties,
      inverterEfficiencies: dynamicInverterEfficiencies,
    };
  }, [availableKits]);

  const getActiveFiltersCount = useMemo(() => {
    const sectionFilters = {
      capacity: ["capacityKW"],
      panel: ["panelTechnology", "panelWattage", "panelWarranty", "panelEfficiency"],
      inverter: ["inverterType", "inverterCapacity", "inverterWarranty", "inverterEfficiency"],
    };
    const counts = {};
    Object.entries(sectionFilters).forEach(([section, keys]) => {
      counts[section] = keys.filter((key) => filters[key] && filters[key] !== "all").length;
    });
    return counts;
  }, [filters]);

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  useEffect(() => setLocalSearch(searchTerm), [searchTerm]);

  useEffect(() => {
    if (onSearchChange) {
      const timeout = setTimeout(() => onSearchChange(localSearch), 300);
      return () => clearTimeout(timeout);
    }
  }, [localSearch, onSearchChange]);

  const filterSections = [
    {
      title: "Capacity",
      key: "capacity",
      filters: [
        { label: "System Capacity (kW)", key: "capacityKW", options: dynamicOptions.systemCapacities },
      ],
    },
    {
      title: "Panel",
      key: "panel",
      filters: [
        { label: "Technology", key: "panelTechnology", options: dynamicOptions.panelTechnologies },
        { label: "Watt per Panel", key: "panelWattage", options: dynamicOptions.panelWattages },
        { label: "Panel Warranty", key: "panelWarranty", options: dynamicOptions.panelWarranties },
        { label: "Efficiency", key: "panelEfficiency", options: dynamicOptions.panelEfficiencies },
      ],
    },
    {
      title: "Inverter",
      key: "inverter",
      filters: [
        { label: "Type", key: "inverterType", options: dynamicOptions.inverterTypes },
        { label: "Capacity", key: "inverterCapacity", options: dynamicOptions.inverterCapacities },
        { label: "Warranty", key: "inverterWarranty", options: dynamicOptions.inverterWarranties },
        { label: "Efficiency", key: "inverterEfficiency", options: dynamicOptions.inverterEfficiencies },
      ],
    },
  ];

  return (
    <div className="space-y-2">
      {filterSections.map((section) => {
        const filtersToRender = section.filters.filter(
          (f) => (!filterKeys.length || filterKeys.includes(f.key)) && f.options && f.options.length > 1
        );
        if (!filtersToRender.length) return null;

        const isExpanded = expandedSections[section.key];
        const activeCount = getActiveFiltersCount[section.key];

        return (
          <div key={section.title} className="border-b border-border last:border-b-0">
            <button
              onClick={() => onToggleSection?.(section.key)}
              className="flex items-center justify-between w-full px-4 py-2 hover:bg-surface-hover transition-colors rounded-lg"
            >
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-text-primary text-left">{section.title}</h4>
                {activeCount > 0 && (
                  <span className="bg-primary text-text-inverse rounded-full w-5 h-5 text-xs flex items-center justify-center font-medium">
                    {activeCount}
                  </span>
                )}
              </div>
              {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-2 space-y-2">
                {filtersToRender.map(({ label, key, options }) => (
                  <Dropdown
                    key={key}
                    label={label}
                    options={options}
                    value={filters[key] || "all"}
                    onChange={(val) => updateFilter(key, val)}
                    className="w-full"
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {clearFilters && (
        <div className="p-4 border-t border-border mt-2">
          <Button onClick={clearFilters} variant="primary" size="md" fullWidth>
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}

export { options };
