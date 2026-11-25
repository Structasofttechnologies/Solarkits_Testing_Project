import { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addCustomKitToCart, setShowAuthDialog, fetchShopHierarchy } from "@/features/slice";
import Dropdown from "@/Components/Dropdown";
import Button from "@/Components/Button";
import { FiRefreshCw, FiInfo, FiShoppingCart } from"react-icons/fi";
import { FaCalculator } from"react-icons/fa";

export default function CustomComboKit() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth_slice);
  const shopHierarchy = useSelector((state) => state.slice?.shopHierarchy || []);
  const [formData, setFormData] = useState({
    industryType: 'all',
    category: 'all',
    subCategory: 'all',
    projectType: 'all',
    subProjectType: 'all',
    technology: 'all',
    panelWattage: 'all',
    numberOfPanels: 'all',
    systemCapacity: 'all',
    panelBrand: 'all',
    inverter: 'all',
    bosKits: 'all'
  });

  useEffect(() => {
    if (!shopHierarchy || shopHierarchy.length === 0) {
      dispatch(fetchShopHierarchy());
    }
  }, [dispatch, shopHierarchy]);

  const [calculated, setCalculated] = useState(null);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const industryTypeOptions = useMemo(() => {
    const list = [];
    if (shopHierarchy && shopHierarchy.length > 0) {
      shopHierarchy.forEach((ind) => {
        if (ind.name) {
          list.push({ text: ind.name, value: ind.name.toLowerCase() });
        }
      });
    } else {
      list.push(
        { text:"Residential Solar", value: 'residential solar' },
        { text:"Commercial & Industrial (C&I)", value: 'commercial & industrial (c&i)' },
        { text:"Agriculture & Solar Pumps", value: 'agriculture & solar pumps' },
        { text:"Utility Scale & Ground Mount", value: 'utility scale & ground mount' }
      );
    }
    return [
      { text:"All Industry Types", value: 'all' },
      ...list
    ];
  }, [shopHierarchy]);

  const categoryOptions = useMemo(() => {
    const catMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (formData.industryType && formData.industryType !== 'all') {
        relevantInds = shopHierarchy.filter(ind =>
          ind.name?.toLowerCase() === formData.industryType.toLowerCase() ||
          String(ind.id) === String(formData.industryType)
        );
      }
      relevantInds.forEach(ind => {
        (ind.categories || []).forEach(cat => {
          if (cat.name && !catMap.has(cat.name.toLowerCase())) {
            catMap.set(cat.name.toLowerCase(), { text: cat.name, value: cat.name.toLowerCase() });
          }
        });
      });
    }
    return [
      { text:"All Categories", value: 'all' },
      ...Array.from(catMap.values())
    ];
  }, [shopHierarchy, formData.industryType]);

  const subCategoryOptions = useMemo(() => {
    const subsMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (formData.industryType && formData.industryType !== 'all') {
        relevantInds = shopHierarchy.filter(ind =>
          ind.name?.toLowerCase() === formData.industryType.toLowerCase() ||
          String(ind.id) === String(formData.industryType)
        );
      }
      relevantInds.forEach(ind => {
        (ind.categories || []).forEach(cat => {
          if (formData.category === 'all' || cat.name?.toLowerCase() === formData.category?.toLowerCase()) {
            (cat.subcategories || []).forEach(sub => {
              if (sub.name && !subsMap.has(sub.name.toLowerCase())) {
                subsMap.set(sub.name.toLowerCase(), { text: sub.name, value: sub.name.toLowerCase() });
              }
            });
          }
        });
      });
    }
    return [
      { text:"All Sub-Categories", value: 'all' },
      ...Array.from(subsMap.values())
    ];
  }, [shopHierarchy, formData.industryType, formData.category]);

  const projectTypeOptions = useMemo(() => {
    const typesMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (formData.industryType && formData.industryType !== 'all') {
        relevantInds = shopHierarchy.filter(ind =>
          ind.name?.toLowerCase() === formData.industryType.toLowerCase() ||
          String(ind.id) === String(formData.industryType)
        );
      }
      relevantInds.forEach(ind => {
        (ind.categories || []).forEach(cat => {
          if (formData.category === 'all' || cat.name?.toLowerCase() === formData.category?.toLowerCase()) {
            (cat.subcategories || []).forEach(sub => {
              if (formData.subCategory === 'all' || sub.name?.toLowerCase() === formData.subCategory?.toLowerCase()) {
                (sub.mappedTypes || []).forEach(mt => {
                  if (mt.name && !typesMap.has(mt.name.toLowerCase())) {
                    typesMap.set(mt.name.toLowerCase(), { text: mt.name, value: mt.name.toLowerCase() });
                  }
                });
              }
            });
          }
        });
      });
    }
    if (typesMap.size === 0) {
      typesMap.set('on-grid', { text: "On-Grid", value: 'on-grid' });
      typesMap.set('off-grid', { text: "Off-Grid", value: 'off-grid' });
      typesMap.set('hybrid', { text: "Hybrid", value: 'hybrid' });
    }
    return [
      { text:"All Project Types", value: 'all' },
      ...Array.from(typesMap.values())
    ];
  }, [shopHierarchy, formData.industryType, formData.category, formData.subCategory]);

  const handleCalculate = () => {
    // Simulate calculation based on input choices
    const capacityStr = formData.systemCapacity !== 'all' ? formData.systemCapacity : '3 kW';
    const panelsStr = formData.numberOfPanels !== 'all' ? formData.numberOfPanels : '12 panels';
    const capVal = parseFloat(capacityStr) || 3;
    const cost = capVal * 80000; // ₹80,000 per kW estimate
    
    setCalculated({
      estimatedOutput:`${(capVal * 4.5).toFixed(1)} kWh/day`,
      panelsRequired: panelsStr,
      totalCost:`₹${cost.toLocaleString('en-IN')}`,
      savings:`₹${(capVal * 15000).toLocaleString('en-IN')}/year`,
      roi: '5.5 years'
    });
  };

  const handleAddToCart = () => {
    if (!calculated) return;
    if (!isAuthenticated) {
      dispatch(setShowAuthDialog(true));
      return;
    }
    const costNum = parseFloat(calculated.totalCost.replace(/[^\d]/g, '')) || 240000;
    const capacityVal = parseFloat(formData.systemCapacity) || 3;
    const panelsVal = parseInt(formData.numberOfPanels) || 12;
    const wattVal = parseInt(formData.panelWattage) || 440;
    
    dispatch(addCustomKitToCart({
      id:`custom-${Date.now()}`,
      cartItemId:`custom-${Date.now()}`,
      kitName:`Custom Combo Kit (${formData.panelBrand.toUpperCase()} + ${formData.inverter.toUpperCase()})`,
      capacityKW: capacityVal,
      qty: 1,
      ourPrice: costNum,
      marketPrice: Math.round(costNum * 1.15),
      is_custom: true,
      productTier:"Customized",
      usageType: formData.subCategory !== 'all' ? formData.subCategory :"Residential",
      panelBrand: formData.panelBrand,
      inverter: formData.inverter,
      bosKits: formData.bosKits,
      numberOfPanels: panelsVal,
      panelWattage: wattVal,
      availableStock: 999,
      inStock: true
    }));
  };

  const handleReset = () => {
    setFormData({
      industryType: 'all',
      category: 'all',
      subCategory: 'all',
      projectType: 'all',
      subProjectType: 'all',
      technology: 'all',
      panelWattage: 'all',
      numberOfPanels: 'all',
      systemCapacity: 'all',
      panelBrand: 'all',
      inverter: 'all',
      bosKits: 'all'
    });
    setCalculated(null);
  };

  return (
    <div className="min-h-screen">
      <div className="bg-surface shadow-sm rounded-xl border border-border overflow-hidden">
        {/* Header with Gradient */}
        <div className="gradient-primary px-6 py-4">
          <h1 className="font-bold text-2xl text-text-inverse">Customize Your Solar Kit</h1>
          <p className="text-text-inverse/80 text-sm mt-1">
            Build your perfect solar solution with our customization tool
          </p>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section - Takes 2/3 on large screens */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1: Basic Configuration */}
              <div className="bg-surface-hover p-5 rounded-xl border border-border">
                <h3 className="font-semibold text-text-primary dark:text-info mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 gradient-primary rounded-full"></span>
                  Basic Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Dropdown
                    label="Industry Type"
                    className="w-full"
                    options={industryTypeOptions}
                    value={formData.industryType}
                    onChange={(val) => handleChange('industryType', val)}
                  />
                  <Dropdown
                    label="Category"
                    className="w-full"
                    options={categoryOptions}
                    value={formData.category}
                    onChange={(val) => handleChange('category', val)}
                  />
                  <Dropdown
                    label="Sub-Category"
                    className="w-full"
                    options={subCategoryOptions}
                    value={formData.subCategory}
                    onChange={(val) => handleChange('subCategory', val)}
                  />
                  <Dropdown
                    label="Project Type"
                    className="w-full"
                    options={projectTypeOptions}
                    value={formData.projectType}
                    onChange={(val) => handleChange('projectType', val)}
                  />
                  <Dropdown
                    label="Sub Project Type"
                    className="w-full"
                    options={[
                      { text:"Residential Net Metering", value: 'residential net metering' },
                      { text:"Commercial Net Metering", value: 'Commercial Net Metering' },
                      { text:"Gross Metering", value: 'gross metering' }
                    ]}
                    value={formData.subProjectType}
                    onChange={(val) => handleChange('subProjectType', val)}
                  />
                </div>
              </div>

              {/* Section 2: Panel Configuration */}
              <div className="bg-surface-hover p-5 rounded-xl border border-border">
                <h3 className="font-semibold text-text-primary dark:text-info mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 gradient-primary rounded-full"></span>
                  Panel Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Dropdown
                    label="Technology"
                    className="w-full"
                    options={[
                      { text:"TopCon", value: 'topcon' },
                      { text:"Bifacial", value: 'bifacial' },
                      { text:"Mono PERC", value: 'mono perc' },
                      { text:"Polycrystalline", value: 'poly' }
                    ]}
                    value={formData.technology}
                    onChange={(val) => handleChange('technology', val)}
                  />
                  <Dropdown
                    label="Panel Wattage"
                    className="w-full"
                    options={[
                      { text:"370 Watt", value: '370 watt' },
                      { text:"440 Watt", value: '440 watt' },
                      { text:"540 Watt", value: '540 watt' },
                      { text:"570 Watt", value: '570 watt' }
                    ]}
                    value={formData.panelWattage}
                    onChange={(val) => handleChange('panelWattage', val)}
                  />
                  <Dropdown
                    label="Number of Panels"
                    className="w-full"
                    options={[
                      { text:"4 Panels", value: '4 panels' },
                      { text:"6 Panels", value: '6 panels' },
                      { text:"8 Panels", value: '8 panels' },
                      { text:"10 Panels", value: '10 panels' },
                      { text:"12 Panels", value: '12 panels' }
                    ]}
                    value={formData.numberOfPanels}
                    onChange={(val) => handleChange('numberOfPanels', val)}
                  />
                  <Dropdown
                    label="System Capacity"
                    className="w-full"
                    options={[
                      { text:"1 kW", value: '1 kW' },
                      { text:"2 kW", value: '2 kW' },
                      { text:"3 kW", value: '3 kW' },
                      { text:"5 kW", value: '5 kW' },
                      { text:"10 kW", value: '10 kW' }
                    ]}
                    value={formData.systemCapacity}
                    onChange={(val) => handleChange('systemCapacity', val)}
                  />
                </div>
              </div>

              {/* Section 3: Component Selection */}
              <div className="bg-surface-hover p-5 rounded-xl border border-border">
                <h3 className="font-semibold text-text-primary dark:text-info mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 gradient-primary rounded-full"></span>
                  Component Selection
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Dropdown
                    label="Panel Brand"
                    className="w-full"
                    options={[
                      { text:"Adani", value: 'adani' },
                      { text:"Vikram Solar", value: 'vikram solar' },
                      { text:"Waaree", value: 'waaree' },
                      { text:"Luminous", value: 'luminous' }
                    ]}
                    value={formData.panelBrand}
                    onChange={(val) => handleChange('panelBrand', val)}
                  />
                  <Dropdown
                    label="Inverter Type"
                    className="w-full"
                    options={[
                      { text:"On-grid", value: 'on-grid' },
                      { text:"Off-grid", value: 'Off-grid' },
                      { text:"Hybrid", value: 'Hybrid' }
                    ]}
                    value={formData.inverter}
                    onChange={(val) => handleChange('inverter', val)}
                  />
                  <Dropdown
                    label="BOS Kits"
                    className="w-full"
                    options={[
                      { text:"1 kW Kit", value: '1 kW' },
                      { text:"2 kW Kit", value: '2 kW' },
                      { text:"3 kW Kit", value: '3 kW' },
                      { text:"5 kW Kit", value: '5 kW' }
                    ]}
                    value={formData.bosKits}
                    onChange={(val) => handleChange('bosKits', val)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleCalculate}
                  variant="primary"
                  size="md"
                  leftIcon={<FaCalculator size={18} />}
                >
                  Calculate Estimate
                </Button>
                <Button
                  onClick={handleReset}
                  variant="secondary"
                  size="md"
                  leftIcon={<FiRefreshCw size={18} />}
                >
                  Reset All
                </Button>
              </div>
            </div>

            {/* Results Section - Takes 1/3 on large screens */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-bg-subtle rounded-xl border border-border p-5 sticky top-4">
                <h3 className="font-semibold text-text-primary dark:text-info mb-4 flex items-center gap-2">
                  <FiInfo className="text-primary dark:text-info" size={18} />
                  Estimated Results
                </h3>

                {calculated ? (
                  <div className="space-y-4">
                    <div className="bg-surface p-4 rounded-lg border border-border">
                      <p className="text-sm text-text-secondary">Daily Output</p>
                      <p className="text-2xl font-bold text-primary dark:text-info">{calculated.estimatedOutput}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface p-3 rounded-lg border border-border">
                        <p className="text-xs text-text-secondary">Panels</p>
                        <p className="text-lg font-semibold text-text-primary dark:text-info">{calculated.panelsRequired}</p>
                      </div>
                      <div className="bg-surface p-3 rounded-lg border border-border">
                        <p className="text-xs text-text-secondary">Total Cost</p>
                        <p className="text-lg font-semibold text-primary dark:text-info">{calculated.totalCost}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-success-soft p-3 rounded-lg border border-success/20">
                        <p className="text-xs text-success">Yearly Savings</p>
                        <p className="text-lg font-semibold text-success">{calculated.savings}</p>
                      </div>
                      <div className="bg-warning-soft p-3 rounded-lg border border-warning/20">
                        <p className="text-xs text-warning">ROI Period</p>
                        <p className="text-lg font-semibold text-warning">{calculated.roi}</p>
                      </div>
                    </div>

                    <Button
                      onClick={handleAddToCart}
                      variant="primary"
                      size="lg"
                      fullWidth
                      leftIcon={<FiShoppingCart size={18} />}
                      className="mt-2"
                    >
                      Add to Cart
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 gradient-primary-soft rounded-full flex items-center justify-center mx-auto mb-3">
                      <FaCalculator size={24} className="text-primary dark:text-info" />
                    </div>
                    <p className="text-text-secondary text-sm">
                      Configure your kit and click"Calculate" to see estimated results
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
