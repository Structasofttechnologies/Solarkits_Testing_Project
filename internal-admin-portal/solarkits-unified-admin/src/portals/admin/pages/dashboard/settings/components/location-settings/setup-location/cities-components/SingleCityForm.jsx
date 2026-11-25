import { useEffect, useState } from "react";
import axios from "axios";
import { FaCity, FaMapMarkerAlt, FaPlusCircle, FaSpinner, FaClock } from "react-icons/fa";
import Button from "@/components/Button";

export default function SingleCityForm({
    isAdding,
    singleCity,
    setSingleCity,
    onAddCity,
    country,
    stateData,
    district
}) {
    const [geocoding, setGeocoding] = useState(false);
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        if (singleCity.city_name && !singleCity.lat && !singleCity.lng) {
            const handler = setTimeout(() => {
                handleGeocode(singleCity.city_name);
            }, 1000);

            return () => {
                clearTimeout(handler);
            };
        }
    }, [singleCity.city_name]);

    const handleGeocode = async (cityName) => {
        if (!cityName) return;

        setGeocoding(true);
        try {
            const addressString = [
                cityName,
                district?.name,
                stateData?.name,
                country?.name
            ].filter(Boolean).join('|');

            const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
                params: {
                    address: addressString,
                    key: GOOGLE_MAPS_API_KEY
                }
            });

            if (response.data.results && response.data.results.length > 0) {
                const { lat, lng } = response.data.results[0].geometry.location;
                setSingleCity(prev => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
            }
        } catch (error) {
            console.error("Geocoding error:", error);
        } finally {
            setGeocoding(false);
        }
    };

    return (
        <div className="card hover:shadow-xl transition-all duration-300">
            <div className="p-5">
                {/* Last updated badge */}
                <div className="flex justify-end mb-4">
                    <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
                        <FaClock size={10} />
                        Add single city
                    </span>
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
                        <FaCity className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-text-primary">Add Single City</h3>
                        <p className="text-text-secondary text-sm">Manually add a city with coordinates</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                City Name
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Enter city name"
                                    value={singleCity.city_name}
                                    onChange={(e) => setSingleCity(prev => ({ ...prev, city_name: e.target.value, lat: '', lng: '' }))}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                                />
                                {geocoding && <FaSpinner className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary" />}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Latitude
                            </label>
                            <input
                                type="text"
                                placeholder="Latitude"
                                value={singleCity.lat}
                                onChange={(e) => setSingleCity(prev => ({ ...prev, lat: e.target.value }))}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Longitude
                            </label>
                            <input
                                type="text"
                                placeholder="Longitude"
                                value={singleCity.lng}
                                onChange={(e) => setSingleCity(prev => ({ ...prev, lng: e.target.value }))}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-3">
                        <Button
                            onClick={onAddCity}
                            disabled={isAdding}
                            loading={isAdding}
                            className="w-full bg-linear-120 from-primary to-primary-end"
                            leftIcon={isAdding ? null : <FaPlusCircle />}
                        >
                            {isAdding ? 'Adding...' : 'Add City to List'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}