import { FaMapMarkerAlt, FaTimes, FaClock } from "react-icons/fa";
import { HiOutlineLocationMarker } from "react-icons/hi";
import UniversalMap from "@/components/UniversalMap";

export default function MapSection({
    isLoaded,
    boundaryFetched,
    markers,
    boundaries,
    mapCenter,
    excelData,
    nearPoints,
    excludedForDistrict,
    selectedMarker,
    setSelectedMarker
}) {
    if (!isLoaded || !boundaryFetched) return null;

    return (
        <div className="card hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="p-5">
                {/* Last updated badge */}
                <div className="flex justify-end mb-4">
                    <span className="text-xs bg-linear-120 from-primary/5 to-primary/15 text-text-secondary px-2 py-1 rounded-full flex items-center gap-1">
                        <FaClock size={10} />
                        Interactive map
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
                            <FaMapMarkerAlt className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-primary">Map Visualization</h3>
                            <p className="text-text-secondary text-sm">Visual representation of all points</p>
                        </div>
                    </div>

                    {/* Map Stats */}
                    <div className="flex gap-3 bg-primary/5 px-4 py-2 rounded-lg">
                        <div className="text-center">
                            <div className="text-xs text-text-secondary">Inside</div>
                            <div className="text-lg font-bold text-success">{excelData.length}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-text-secondary">Nearby</div>
                            <div className="text-lg font-bold text-warning">{nearPoints.filter(p => p.status === 'near').length}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-text-secondary">Excluded</div>
                            <div className="text-lg font-bold text-danger">{excludedForDistrict.length}</div>
                        </div>
                    </div>
                </div>

                <div className="h-100 rounded-lg overflow-hidden border border-border">
                    <UniversalMap
                        markers={markers}
                        boundaries={boundaries}
                        center={mapCenter || (excelData[0] ? { lat: +excelData[0].lat, lng: +excelData[0].lng } : { lat: 20.5937, lng: 78.9629 })}
                        zoom={mapCenter ? 11 : 5}
                        containerStyle={{ width: '100%', height: '100%' }}
                    />
                </div>

                {/* SELECTED MARKER POPUP */}
                {selectedMarker && (
                    <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <HiOutlineLocationMarker className="text-primary shrink-0 text-lg" />
                                <div className="min-w-0">
                                    <h4 className="text-lg font-semibold text-text-primary truncate">{selectedMarker.name}</h4>
                                    <p className="text-xs text-text-secondary mt-1">{selectedMarker.type}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMarker(null)}
                                className="p-1.5 hover:bg-primary/20 rounded-lg transition-colors shrink-0 text-text-secondary hover:text-primary"
                            >
                                <FaTimes className="text-lg" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="p-2 bg-white rounded border border-border">
                                <span className="text-text-secondary text-xs">Latitude</span>
                                <p className="font-mono text-text-primary font-semibold">{selectedMarker.lat}</p>
                            </div>
                            <div className="p-2 bg-white rounded border border-border">
                                <span className="text-text-secondary text-xs">Longitude</span>
                                <p className="font-mono text-text-primary font-semibold">{selectedMarker.lng}</p>
                            </div>
                            {selectedMarker.distance && (
                                <div className="p-2 bg-amber-50 rounded border border-amber-200 sm:col-span-2">
                                    <span className="text-text-secondary text-xs">Distance from Border</span>
                                    <p className="font-semibold text-amber-600">{selectedMarker.distance}</p>
                                </div>
                            )}
                            <div className="p-2 bg-white rounded border border-border sm:col-span-2">
                                <span className="text-text-secondary text-xs">Status</span>
                                <p className={`font-semibold capitalize ${
                                    selectedMarker.status === 'included' ? 'text-success' :
                                    selectedMarker.status === 'excluded' ? 'text-danger' :
                                    'text-warning'
                                }`}>
                                    {selectedMarker.status}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}