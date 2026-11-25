import { FaExclamationTriangle, FaPlus, FaBan, FaClock } from "react-icons/fa";
import { HiOutlineLocationMarker } from "react-icons/hi";
import Button from "@/components/Button";

export default function OutsideBoundaryPoints({
    nearPoints,
    selectedRow,
    onPointClick,
    onIncludeNear,
    onExcludeCity
}) {
    if (nearPoints.length === 0) return null;

    return (
        <div className="card hover:shadow-xl transition-all duration-300">
            <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-amber-500 to-amber-600 text-white">
                            <FaExclamationTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-primary">Outside Boundary</h3>
                            <p className="text-text-secondary text-xs">Points requiring review</p>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                        {nearPoints.length} points
                    </span>
                </div>

                <div className="space-y-3 max-h-100 overflow-y-auto pr-1">
                    {nearPoints.map((p, i) => {
                        const isFar = p.status === 'far';
                        const isSelected = selectedRow?.type === 'outside' && selectedRow?.index === i;
                        return (
                            <div
                                key={i}
                                onClick={() => onPointClick(p, i)}
                                className={`p-3 bg-white border rounded-lg transition-all cursor-pointer ${isSelected
                                    ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                                    : 'border-border hover:border-amber-500/50 hover:bg-amber-50/30'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                                <HiOutlineLocationMarker className="text-primary text-xs" />
                                            </div>
                                            <span className="font-medium text-text-primary truncate text-sm">
                                                {p.city_name || `Point ${i + 1}`}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${isFar ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {isFar ? 'Far' : 'Near'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-text-secondary ml-8">
                                            ~{p.distanceMeters}m from border
                                        </div>
                                    </div>
                                    <div className="flex gap-1 ml-1 shrink-0">
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onIncludeNear(i);
                                            }}
                                            size="sm"
                                            variant="success"
                                            leftIcon={<FaPlus className="text-xs" />}
                                            title="Include in list"
                                            className="text-xs bg-green-500 hover:bg-green-600"
                                        >
                                            Include
                                        </Button>
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onExcludeCity(p.city_name, p.lat, p.lng);
                                            }}
                                            size="sm"
                                            variant="warning"
                                            leftIcon={<FaBan className="text-xs" />}
                                            title="Exclude from district"
                                            className="text-xs bg-amber-500 hover:bg-amber-600"
                                        >
                                            Exclude
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}