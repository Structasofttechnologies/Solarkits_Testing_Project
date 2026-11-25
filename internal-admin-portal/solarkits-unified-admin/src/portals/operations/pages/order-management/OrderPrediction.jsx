import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaBrain, FaChartLine, FaRobot, FaCalendarAlt, FaSun, FaCloudShowersHeavy, FaMoneyCheckAlt, FaBuilding, FaPlus } from "react-icons/fa";

import Button from "../../components/Button";
import CustomInput from "../../components/CustomInput";
import Dropdown from "../../components/Dropdown";

const brandOptions = [
  { value: 'Tata Solar', text: 'Tata Solar' },
  { value: 'Waaree', text: 'Waaree' },
  { value: 'Adani Solar', text: 'Adani Solar' },
  { value: 'Solis', text: 'Solis' }
];

const regionOptions = [
  { value: 'Rajasthan', text: 'Rajasthan' },
  { value: 'Gujarat', text: 'Gujarat' },
  { value: 'Maharashtra', text: 'Maharashtra' },
  { value: 'Karnataka', text: 'Karnataka' }
];

const techOptions = [
  { value: 'TOPCon', text: 'TOPCon' },
  { value: 'Mono PERC', text: 'Mono PERC' },
  { value: 'Bifacial', text: 'Bifacial' },
  { value: 'N-Type', text: 'N-Type' }
];

const seasonOptions = [
  { value: 'Summer Peak', text: 'Summer Peak' },
  { value: 'Monsoon Slowdown', text: 'Monsoon Slowdown' },
  { value: 'Subsidy Rush Season', text: 'Subsidy Rush Season' },
  { value: 'Commercial Peak Period', text: 'Commercial Peak Period' }
];

export default function OrderPrediction() {
  const [brand, setBrand] = useState('Tata Solar');
  const [region, setRegion] = useState('Rajasthan');
  const [tech, setTech] = useState('TOPCon');
  const [season, setSeason] = useState('Summer Peak');
  const [historicalSales, setHistoricalSales] = useState('120');

  // Predictions output state
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictions, setPredictions] = useState(null);

  const handlePredict = (e) => {
    e.preventDefault();
    setIsPredicting(true);
    setTimeout(() => {
      // Simulate AI predictions
      const multiplier = season === 'Summer Peak' ? 1.45 : season === 'Monsoon Slowdown' ? 0.75 : 1.25;
      const baseKws = parseFloat(historicalSales) || 100;
      const expectedKws = Math.round(baseKws * multiplier * 4.5);
      
      setPredictions({
        expectedKws,
        suggestedProcure: Math.round(expectedKws * 1.15),
        confidence: (88 + Math.random() * 8).toFixed(1),
        brandGrowth: brand === 'Tata Solar' ? '+18%' : brand === 'Waaree' ? '+12%' : '+15%',
        recommendation: `Recommended order placement: Purchase ${Math.round(expectedKws * 1.15)} KW of ${tech} modules for the ${region} logistics hub to offset the upcoming ${season} demand peak.`
      });
      setIsPredicting(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">AI Order Demand Prediction</h1>
        <p className="text-text-secondary">Predict upcoming quarterly solar capacity installation runs and plan stock procurements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Forecast Engine Inputs Form */}
        <div className="card p-6 space-y-4">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border pb-3">
            <FaBrain className="text-primary" />
            AI Demand Input Parameters
          </h3>
          <form onSubmit={handlePredict} className="space-y-4">
            <Dropdown
              label="Target Solar Brand"
              value={brand}
              onChange={(val) => setBrand(val)}
              options={brandOptions}
              className="w-full"
            />

            <div className="grid grid-cols-2 gap-4">
              <Dropdown
                label="Region State"
                value={region}
                onChange={(val) => setRegion(val)}
                options={regionOptions}
                className="w-full"
              />
              <Dropdown
                label="Technology Type"
                value={tech}
                onChange={(val) => setTech(val)}
                options={techOptions}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Dropdown
                label="Forecast Season"
                value={season}
                onChange={(val) => setSeason(val)}
                options={seasonOptions}
                className="w-full"
              />
              <CustomInput
                label="Hist Monthly Sales (KW)"
                type="number"
                value={historicalSales}
                onChange={(e) => setHistoricalSales(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={isPredicting}
              loading={isPredicting}
              variant="primary"
              fullWidth
              leftIcon={<FaRobot />}
            >
              Run Demand Forecast
            </Button>
          </form>
        </div>

        {/* Prediction Results & Recommendations */}
        <div className="card p-6 md:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border pb-3">
              <FaChartLine className="text-primary" />
              Forecast Engine Output
            </h3>

            {predictions ? (
              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                    <span className="text-[10px] text-text-secondary font-bold uppercase block">Predicted KW Demand</span>
                    <h4 className="text-2xl font-bold text-primary mt-1">{predictions.expectedKws} kW</h4>
                  </div>
                  <div className="p-4 bg-success/5 border border-success/10 rounded-xl">
                    <span className="text-[10px] text-text-secondary font-bold uppercase block">Suggested Procurement</span>
                    <h4 className="text-2xl font-bold text-success mt-1">{predictions.suggestedProcure} kW</h4>
                  </div>
                  <div className="p-4 bg-warning/5 border border-warning/10 rounded-xl">
                    <span className="text-[10px] text-text-secondary font-bold uppercase block">AI Confidence Score</span>
                    <h4 className="text-2xl font-bold text-warning mt-1">{predictions.confidence}%</h4>
                  </div>
                </div>

                <div className="p-4 bg-bg border border-border rounded-xl space-y-2">
                  <span className="text-[10px] text-text-muted font-bold uppercase block">Procurement Recommendation</span>
                  <p className="text-xs text-text-secondary leading-relaxed font-semibold">
                    {predictions.recommendation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-text-muted text-xs italic space-y-2">
                <FaRobot className="mx-auto text-3xl opacity-30" />
                <p>Run the AI Demand model using configuration parameters to view forecasting insights.</p>
              </div>
            )}
          </div>

          {/* Seasonal Trends Quick Card */}
          <div className="mt-6 border-t border-border pt-4">
            <h4 className="text-xs font-bold text-text-primary mb-3 uppercase tracking-wider">AI Seasonal Trend Insights</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[10px] font-bold text-text-secondary">
              <div className="p-2.5 bg-warning/5 border border-warning/15 rounded-lg flex flex-col items-center gap-1">
                <FaSun className="text-warning text-sm" />
                <span>Summer Peak</span>
                <span className="text-success">+35% Sales</span>
              </div>
              <div className="p-2.5 bg-primary/5 border border-primary/15 rounded-lg flex flex-col items-center gap-1">
                <FaCloudShowersHeavy className="text-primary text-sm" />
                <span>Monsoon Slowdown</span>
                <span className="text-danger">-15% Sales</span>
              </div>
              <div className="p-2.5 bg-success/5 border border-success/15 rounded-lg flex flex-col items-center gap-1">
                <FaMoneyCheckAlt className="text-success text-sm" />
                <span>Subsidy Season</span>
                <span className="text-success">+50% Sales</span>
              </div>
              <div className="p-2.5 bg-card border border-border rounded-lg flex flex-col items-center gap-1">
                <FaBuilding className="text-primary text-sm" />
                <span>Commercial Peak</span>
                <span className="text-success">+25% Sales</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
