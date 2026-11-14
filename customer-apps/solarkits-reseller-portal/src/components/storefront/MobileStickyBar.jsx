import { FiPackage, FiMapPin, FiAward, FiMessageSquare, FiZap } from "react-icons/fi";

export default function MobileStickyBar({ onOpenLeadModal }) {
  const handleWhatsApp = () => {
    window.open("https://wa.me/917777939842?text=Hello%20SolarKits,%20I%20want%20to%20inquire%20about%20Solarkits%20and%20Franchise.", "_blank");
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl py-2 px-3">
      <div className="grid grid-cols-5 gap-1 text-center">
        {/* 1. Browse Kits */}
        <a
          href="#catalog-browser"
          className="flex flex-col items-center justify-center py-1 text-slate-700 hover:text-[#253880]"
        >
          <FiPackage size={17} className="text-[#253880]" />
          <span className="text-[9px] font-bold mt-0.5 whitespace-nowrap">Browse Kits</span>
        </a>

        {/* 2. Store Availability */}
        <a
          href="#store-availability"
          className="flex flex-col items-center justify-center py-1 text-slate-700 hover:text-[#253880]"
        >
          <FiMapPin size={17} className="text-[#F49222]" />
          <span className="text-[9px] font-bold mt-0.5 whitespace-nowrap">Territory</span>
        </a>

        {/* 3. Check Eligibility */}
        <a
          href="#eligibility-checker"
          className="flex flex-col items-center justify-center py-1 text-slate-700 hover:text-[#253880]"
        >
          <FiAward size={17} className="text-emerald-600" />
          <span className="text-[9px] font-bold mt-0.5 whitespace-nowrap">Eligibility</span>
        </a>

        {/* 4. WhatsApp */}
        <button
          onClick={handleWhatsApp}
          className="flex flex-col items-center justify-center py-1 text-slate-700 hover:text-emerald-700 cursor-pointer"
        >
          <FiMessageSquare size={17} className="text-emerald-600" />
          <span className="text-[9px] font-bold mt-0.5 whitespace-nowrap">WhatsApp</span>
        </button>

        {/* 5. Apply Now */}
        <button
          onClick={() => onOpenLeadModal && onOpenLeadModal({ requiredConfig: "Mobile Fast Application" }, "franchise_apply")}
          className="flex flex-col items-center justify-center py-1 px-1 rounded-xl bg-gradient-to-r from-[#253880] to-[#1d2c66] text-white shadow-xs cursor-pointer"
        >
          <FiZap size={15} />
          <span className="text-[9px] font-black uppercase mt-0.5 whitespace-nowrap">Apply Now</span>
        </button>
      </div>
    </div>
  );
}
