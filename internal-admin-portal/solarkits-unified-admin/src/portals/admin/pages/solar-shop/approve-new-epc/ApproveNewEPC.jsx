// components/ApproveNewEPC.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ReactCountryFlag from "react-country-flag";
import { FaBuilding, FaGlobe, FaCheckCircle, FaUsers, FaUserCheck } from "react-icons/fa";
import ApproveNewEPCIndia from "./ApproveNewEPCIndia";
import WebsiteEpcLeads from "../../dashboard/website-configuration/WebsiteEpcLeads";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export default function ApproveNewEPC({ moduleUniqueId }) {
  const { countryName } = useParams();
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countryDetails, setCountryDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("website_leads"); // Default to Website Leads

  // Fetch active countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: { ...authHeaderObj() } }
        );

        if (response.data.status === "success") {
          const fetched = response.data.countries || [];

          // Find the matching country based on the countryName from route params
          if (countryName) {
            const matched = fetched.find(c => c.name.toLowerCase() === countryName.toLowerCase());
            if (matched) {
              setSelectedCountry(matched.id);
              setCountryDetails(matched);
            } else {
              setSelectedCountry(null);
              setCountryDetails(null);
            }
          } else if (fetched.length > 0) {
            const activeCountriesNames = fetched.map(c => c.name.toLowerCase());
            const storedCountry = localStorage.getItem('selected_country_solar-shop');
            const defaultCountry = (storedCountry && activeCountriesNames.includes(storedCountry.toLowerCase()))
              ? storedCountry.toLowerCase()
              : fetched[0].name.toLowerCase();

            navigate(`/admin-panel/solar-shop/${defaultCountry}/approve-new-epc`, { replace: true });
          }
        }
      } catch (error) {
        console.error("Error fetching countries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, [moduleUniqueId, countryName, navigate]);

  // Check if selected country is India
  const isIndiaSelected = countryDetails?.iso2?.toUpperCase() === "IN";

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative rounded-2xl bg-linear-120 from-primary to-primary-end shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]"></div>
        
        <div className="relative px-6 py-8 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <FaBuilding className="text-white text-3xl" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  EPC Management & Approvals
                </h1>
                <p className="text-white/90 mt-1">
                  Manage incoming website bulk kit leads, assign BDEs, and verify EPC contractor registrations
                </p>
              </div>
            </div>
            
            {/* Active Market / Pending Approvals */}
            <div className="flex items-center gap-3">
              {countryDetails && (
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30 flex items-center gap-2">
                  <ReactCountryFlag
                    countryCode={countryDetails.iso2}
                    svg
                    className="w-5 h-5 rounded-sm object-cover"
                  />
                  <span className="text-white text-xs font-bold uppercase tracking-wider">
                    {countryDetails.name} Market
                  </span>
                </div>
              )}
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
                <span className="text-white text-sm font-medium flex items-center gap-2">
                  <FaCheckCircle className="text-green-300" />
                  Live Leads Queue
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Website EPC Leads (Form) vs Contractor Verification (KYC) */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("website_leads")}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === "website_leads"
              ? "bg-primary text-white shadow-lg shadow-primary/25 scale-[1.01]"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <FaUsers className="text-base" />
          <span>Website EPC Leads & Inquiries</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-400 text-slate-900 font-extrabold shadow-sm">
            Form Leads
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("contractor_kyc")}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === "contractor_kyc"
              ? "bg-primary text-white shadow-lg shadow-primary/25 scale-[1.01]"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <FaUserCheck className="text-base" />
          <span>Contractor Verification Queue (KYC)</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "website_leads" ? (
        <WebsiteEpcLeads />
      ) : loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading market details...</p>
        </div>
      ) : selectedCountry ? (
        isIndiaSelected ? (
          <ApproveNewEPCIndia moduleUniqueId={moduleUniqueId} countryId={selectedCountry} />
        ) : (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaBuilding className="text-primary text-3xl" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Coming Soon
            </h3>
            <p className="text-text-secondary max-w-md mx-auto">
              EPC approval management for {countryDetails?.name} will be available soon.
              Currently only available for India.
            </p>
          </div>
        )
      ) : (
        <div className="card p-12 text-center">
          <FaGlobe className="mx-auto text-5xl text-text-secondary mb-4" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">No Active Market Country Found</h3>
          <p className="text-text-secondary max-w-md mx-auto">
            Please select an active market country from the header dropdown to manage EPC approvals.
          </p>
        </div>
      )}
    </div>
  );
}
