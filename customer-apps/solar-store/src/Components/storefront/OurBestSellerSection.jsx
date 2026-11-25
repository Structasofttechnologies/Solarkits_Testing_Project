import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FaAward } from "react-icons/fa";
import Dialog from "../Dialog";
import SelectedKitCard from "../../Pages/dashboard/components/SelectedKitCard";
import KitCard from "../../Pages/dashboard/components/KitCard";
import axiosInstance from "@/utils/axiosInstance";

export default function OurBestSellerSection() {
  const dispatch = useDispatch();
  const selectedState = useSelector((state) => state.slice?.selectedState);
  const selectedDistrict = useSelector((state) => state.slice?.selectedDistrict);

  const [loading, setLoading] = useState(false);
  const [bestSellers, setBestSellers] = useState([]);
  const [locationInfo, setLocationInfo] = useState({
    state_name: selectedState?.name || "Gujarat",
    district_name: selectedDistrict?.name || "Rajkot",
    is_fallback: false
  });

  // Modal for Viewing Kit Details
  const [selected, setSelected] = useState(null);
  const selectedKit = useMemo(() => {
    if (!selected) return null;
    const kitId = selected.split('-')[0];
    return bestSellers.find((k) => k.id === kitId) || null;
  }, [selected, bestSellers]);

  // Fetch Best Sellers whenever district or state changes
  useEffect(() => {
    let isMounted = true;
    const fetchBestSellers = async () => {
      setLoading(true);
      try {
        const districtId = selectedDistrict?.id || selectedDistrict?._id || "";
        const stateId = selectedState?.id || selectedState?._id || "";
        const params = {};
        if (districtId) params.district_id = districtId;
        if (stateId) params.state_id = stateId;

        const res = await axiosInstance.get("/india/v1/shop/best-sellers", { params });
        const json = res.data;

        if (isMounted && json?.success) {
          setBestSellers(json.data || []);
          if (json.location) {
            setLocationInfo(json.location);
          }
        }
      } catch (err) {
        console.error("Failed to fetch best seller combo kits:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBestSellers();
    return () => { isMounted = false; };
  }, [selectedDistrict?.id, selectedDistrict?._id, selectedState?.id, selectedState?._id]);

  // Current display location string
  const currentRegionText = useMemo(() => {
    const dist = selectedDistrict?.name || locationInfo.district_name || "Rajkot";
    const st = selectedState?.name || locationInfo.state_name || "Gujarat";
    return `${dist}, ${st}`;
  }, [selectedDistrict, selectedState, locationInfo]);

  return (
    <section className="relative mt-12 mb-8 scroll-mt-20" id="our-best-sellers">
      {/* Glow ambient background backdrop */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none rounded-3xl">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-primary/10 dark:bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* SECTION CONTAINER */}
      <div className="bg-gradient-to-b from-surface via-surface/90 to-surface border-2 border-amber-500/30 dark:border-amber-500/20 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl shadow-amber-500/5">
        
        {/* HEADER */}
        <div className="pb-8 border-b border-border/70">
          <div className="space-y-3 max-w-3xl">
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider shadow-xs">
              <FaAward className="text-amber-500 text-sm animate-pulse" />
              <span>Our Best Seller • Region Top Picks</span>
            </div>

            {/* Title with Location Highlight */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-text-primary tracking-tight">
              Our Best Seller Combo Kits{" "}
              <span className="bg-gradient-to-r from-amber-500 via-amber-600 to-primary bg-clip-text text-transparent">
                for {currentRegionText}
              </span>
            </h2>

            {/* Subtitle */}
            <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
              Highest-performing, pre-engineered turnkey solar kits most favored and actively ordered by verified EPC contractors in your district.
            </p>
          </div>
        </div>

        {/* CONTENT / CARDS */}
        <div className="pt-8">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-text-secondary">
                Fetching best seller kits for {currentRegionText}...
              </p>
            </div>
          ) : bestSellers.length > 0 ? (
            <div className="grid xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {bestSellers.map((kit) => (
                <KitCard
                  key={kit.id}
                  kit={kit}
                  selected={selected}
                  setSelected={setSelected}
                  viewMode="grid"
                  activeOffers={[]}
                  isCompared={false}
                  onToggleCompare={null}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-surface-hover/40 rounded-2xl border border-dashed border-border">
              <FaAward size={36} className="mx-auto text-amber-500/50 mb-3" />
              <h4 className="text-base font-bold text-text-primary">
                No Best Sellers Tagged Yet for {currentRegionText}
              </h4>
              <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">
                Admin can configure top-selling turnkey combo kits for this district via Admin Panel &rarr; Solar Kit Configurations &rarr; Best Seller Configuration.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SELECTED KIT DETAIL MODAL */}
      {selectedKit && (
        <Dialog
          isOpen={!!selectedKit}
          title={selectedKit.kitName || selectedKit.name}
          onClose={() => setSelected(null)}
          size="xl"
        >
          <SelectedKitCard
            kit={selectedKit}
            initialVariantIndex={selected ? parseInt(selected.split('-')[1]) || 0 : 0}
            activeOffers={[]}
          />
        </Dialog>
      )}
    </section>
  );
}
