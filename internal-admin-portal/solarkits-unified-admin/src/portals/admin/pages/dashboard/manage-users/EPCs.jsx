// EPCs.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import ReactCountryFlag from "react-country-flag";
import { FaBuilding, FaGlobe } from "react-icons/fa";

import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import EPCsIndia from "./epcs/EPCsIndia";
import { authHeaderObj } from "@/app/authHeader";
import PageHeader from "@/components/PageHeader";


const API_URL = import.meta.env.VITE_API_URL;

export default function EPCs({ moduleUniqueId }) {
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [countryDetails, setCountryDetails] = useState(null);

    // Fetch Countries
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                setLoading(true);
                const res = await axios.get(
                    `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
                    { headers: { ...authHeaderObj() } }
                );

                const formatted = res.data.countries.map((c) => ({
                    text: (
                        <span className="flex items-center gap-2">
                            <ReactCountryFlag
                                countryCode={c.iso2}
                                svg
                                className="w-5 h-5 rounded-sm object-cover"
                            />
                            <span className="">{c.name}</span>
                        </span>
                    ),
                    value: c.id,
                    iso2: c.iso2,
                    name: c.name
                }));

                setCountries(formatted);

                // Auto-select first country if available
                if (formatted.length > 0 && !selectedCountry) {
                    setSelectedCountry(formatted[0].value);
                    setCountryDetails(formatted[0]);
                }
            } catch (err) {
                console.error("Country fetch error", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCountries();
    }, [moduleUniqueId]);

    // Update country details when selection changes
    useEffect(() => {
        if (selectedCountry && countries.length > 0) {
            const details = countries.find(c => c.value === selectedCountry);
            setCountryDetails(details);
        }
    }, [selectedCountry, countries]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="EPC Management"
                subtitle="Manage EPC companies and their email information across different countries."
                icon={FaBuilding}
                stats={[
                    { label: "Active Countries", value: countries.length, description: "With EPC data" }
                ]}
            />

            {/* Country Selection Card */}
            <div className="card shadow-sm p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <FaGlobe size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-primary">Select Country</h3>
                            <p className="text-sm text-text-secondary">Switch between countries to manage local EPCs</p>
                        </div>
                    </div>

                    <div className="max-w-md">
                        <DropdownWithSearchInput
                            value={selectedCountry}
                            onChange={(val) => setSelectedCountry(val)}
                            options={countries}
                            placeholder={loading ? "Loading countries..." : "Select Country"}
                            searchPlaceholder="Search countries..."
                            disabled={loading}
                            className="bg-surface border-border"
                        />
                    </div>

                    {/* Selected Country Info */}
                    {countryDetails && (
                        <div className="mt-6 flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                            <ReactCountryFlag
                                countryCode={countryDetails.iso2}
                                svg
                                className="w-8 h-8 rounded-lg shadow-sm"
                            />
                            <div className="flex-1">
                                <p className="text-xs font-black text-primary uppercase tracking-widest mb-0.5">Active Scope</p>
                                <p className="text-sm font-medium text-text-secondary">
                                    Currently managing EPCs for <strong className="text-text-primary font-black uppercase tracking-tight">{countryDetails.name}</strong>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Country-specific EPC Component */}
            {selectedCountry ? (
                <EPCsIndia
                    moduleUniqueId={moduleUniqueId}
                    countryId={selectedCountry}
                    countryDetails={countryDetails}
                />
            ) : (
                <div className="card shadow-sm p-12 text-center">
                    <FaGlobe className="mx-auto text-5xl text-text-secondary mb-4" />
                    <h3 className="text-xl font-semibold text-text-primary mb-2">No Country Selected</h3>
                    <p className="text-text-secondary max-w-md mx-auto">
                        Please select a country from the dropdown above to start managing EPC companies.
                    </p>
                </div>
            )}
        </div>
    );
}