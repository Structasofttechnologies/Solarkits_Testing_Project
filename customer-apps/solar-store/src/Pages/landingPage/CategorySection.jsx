import { useState } from "react";
import { motion } from "framer-motion";
import {
  FiArrowUpRight,
  FiBox,
  FiGrid,
  FiPackage,
  FiSun,
  FiZap,
  FiLayers
} from "react-icons/fi";
import { MdAgriculture, MdOutlineFactory } from "react-icons/md";
import IndustryKitExplorerModal from "./IndustryKitExplorerModal";

const MASTER_INDUSTRY_CATEGORIES = [
  {
    id: "solar-pv",
    industry_slug: "solar-pv",
    name: "Solar PV Ecosystem",
    desc: "Complete grid-tied, hybrid, and off-grid rooftop solar systems for homes, societies and commercial establishments with net-metering & PM Surya Ghar subsidy.",
    icon: FiSun,
    count: "45+ Kits",
    label: "Solar PV",
    href: "/browse/industry?slug=solar-pv",
    subcategories_preview: "Residential Solar • Commercial & Industrial • Ground-Mount"
  },
  {
    id: "solar-agriculture",
    industry_slug: "solar-agriculture",
    name: "Solar Agriculture",
    desc: "Solar water pumping systems (DC/AC submersible & surface), solar cold storage, and microgrid kits for farms under PM KUSUM Scheme.",
    icon: MdAgriculture,
    icon_type: "agriculture",
    count: "30+ Kits",
    label: "Agro-Solar",
    href: "/browse/industry?slug=solar-agriculture",
    subcategories_preview: "Solar Water Pumps • Cold Storages • Agro-processing Mills"
  },
  {
    id: "solar-ev",
    industry_slug: "solar-ev",
    name: "Solar EV Infrastructure",
    desc: "Solar carports and fast DC / AC EV charging station kits integrated with grid power and battery backup for commercial fleet hubs.",
    icon: FiZap,
    icon_type: "zap",
    count: "20+ Kits",
    label: "EV Mobility",
    href: "/browse/industry?slug=solar-ev",
    subcategories_preview: "Solar Carports • 2W/3W/4W EV Charging Stations"
  },
  {
    id: "energy-storage",
    industry_slug: "energy-storage",
    name: "Energy Storage (BESS)",
    desc: "High-density Lithium Ferro Phosphate (LFP) Battery Energy Storage Systems for 24x7 uninterrupted power, diesel generator replacement and industrial peak shaving.",
    icon: FiPackage,
    icon_type: "package",
    count: "25+ Kits",
    label: "BESS & ESS",
    href: "/browse/industry?slug=energy-storage",
    subcategories_preview: "Residential BESS • Industrial Peak Shaving • Remote Microgrids"
  },
  {
    id: "solar-lighting",
    industry_slug: "solar-lighting",
    name: "Solar Lighting & Security",
    desc: "All-in-one smart solar streetlights, semi-integrated floodlights, and CCTV surveillance combo kits for rural roads and factory campuses.",
    icon: FiGrid,
    icon_type: "grid",
    count: "35+ Kits",
    label: "Smart Lighting",
    href: "/browse/industry?slug=solar-lighting",
    subcategories_preview: "Smart All-in-One Streetlights • Factory Perimeter • Rural Highmasts"
  },
  {
    id: "solar-thermal",
    industry_slug: "solar-thermal",
    name: "Solar Thermal & Heating",
    desc: "High-efficiency pressurized & non-pressurized solar water heating kits and industrial process hot water solutions for institutions.",
    icon: FiSun,
    icon_type: "sun",
    count: "15+ Kits",
    label: "Thermal",
    href: "/browse/industry?slug=solar-thermal",
    subcategories_preview: "Domestic Hot Water • Commercial Boilers • Dairy Heating"
  },
  {
    id: "rural-solar",
    industry_slug: "rural-solar",
    name: "Rural Solar Solutions",
    desc: "Decentralized solar microgrids, off-grid solar home lighting systems, community drinking water pumps, and rural livelihood applications.",
    icon: FiSun,
    icon_type: "sun",
    count: "20+ Kits",
    label: "Rural Solar",
    href: "/browse/industry?slug=rural-solar",
    subcategories_preview: "Solar Home Lighting • Village Microgrids • Community Solar Pumps"
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: "easeOut",
    },
  },
};

function CategoryCard({ category, index, onExplore }) {
  let Icon = category.icon || FiSun;
  const nameLower = (category.name || "").toLowerCase();
  const typeLower = (category.icon_type || "").toLowerCase();

  if (typeLower === "agriculture" || nameLower.includes("agri") || nameLower.includes("pump")) {
    Icon = MdAgriculture;
  } else if (typeLower === "zap" || nameLower.includes("ev") || nameLower.includes("charg")) {
    Icon = FiZap;
  } else if (typeLower === "package" || nameLower.includes("storage") || nameLower.includes("bess")) {
    Icon = FiPackage;
  } else if (typeLower === "grid" || nameLower.includes("light") || nameLower.includes("security")) {
    Icon = FiGrid;
  } else if (nameLower.includes("industrial") || nameLower.includes("commercial")) {
    Icon = MdOutlineFactory;
  }

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onExplore(category)}
      className="group relative isolate flex min-h-[360px] flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-primary-200 hover:shadow-card md:p-7 cursor-pointer"
    >
      {/* Subtle decorative glow on hover */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary-50 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative z-10 flex h-full w-full flex-col">
        {/* Card top */}
        <div className="flex items-start justify-between">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-primary-100 bg-primary-50 text-2xl text-primary-500 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-primary-500 group-hover:text-white">
            <Icon />
          </div>

          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 transition-colors group-hover:border-primary-200 group-hover:bg-primary-50 group-hover:text-primary-600">
            Industry {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Card content */}
        <div className="mt-6">
          <h3 className="font-heading text-xl font-extrabold leading-tight text-navy transition-colors group-hover:text-primary-600 md:text-2xl">
            {category.name}
          </h3>

          <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-gray-500 line-clamp-3">
            {category.desc}
          </p>

          {/* Sub-types Preview Line */}
          {category.subcategories_preview && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-primary-600 bg-primary-50/70 px-2.5 py-1 rounded-lg border border-primary-100/60">
              <FiLayers className="text-primary-500 shrink-0 text-xs" />
              <span className="truncate">{category.subcategories_preview}</span>
            </div>
          )}
        </div>

        {/* Card bottom */}
        <div className="mt-auto flex items-end justify-between border-t border-gray-100 pt-5">
          <div>
            <span className="block font-heading text-xl md:text-2xl font-extrabold text-navy">
              {category.count}
            </span>

            <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
              {category.label}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 py-2 pl-4 pr-2 text-xs font-bold text-primary-600 transition-all duration-300 group-hover:border-primary-500 group-hover:bg-primary-500 group-hover:text-white">
            <span>Explore Kits</span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-primary-600 shadow-sm transition-all duration-300 group-hover:bg-white/20 group-hover:text-white group-hover:rotate-45">
              <FiArrowUpRight className="text-sm" />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CategorySection({ categoriesConfig }) {
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (categoriesConfig && categoriesConfig.enabled === false) return null;

  const badgeText = categoriesConfig?.badge_text || "Browse by Industry & Application";
  const heading = categoriesConfig?.heading || "Find the Right Solar";
  const highlightHeading = categoriesConfig?.highlight_heading || "Kit Solution";
  const subtitle = categoriesConfig?.subtitle || "Explore our certified range of complete solar kits engineered for Residential, Commercial, Agriculture, EV and Industrial power needs.";
  
  // Use configured items or master industry categories
  let items = categoriesConfig?.items && categoriesConfig.items.length > 0 ? categoriesConfig.items : MASTER_INDUSTRY_CATEGORIES;
  
  // Fallback to master industry categories if items contain only legacy generic names
  if (items.some(i => i.name === "On-Grid Solar Kits" && !items.some(x => x.name?.includes("Solar PV")))) {
    items = MASTER_INDUSTRY_CATEGORIES;
  }

  const note1 = categoriesConfig?.quality_note_1 || "All products are quality verified & ALMM certified";
  const note2 = categoriesConfig?.quality_note_2 || "Pan-India delivery, DISCOM approvals & installation support";

  const handleOpenExplore = (industry) => {
    setSelectedIndustry(industry);
    setModalOpen(true);
  };

  return (
    <section
      id="categories"
      className="relative overflow-hidden bg-white py-16 md:py-24"
    >
      {/* Section background */}
      <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-primary-50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-orange-50 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end"
        >
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-600">
              <FiBox />
              {badgeText}
            </span>

            <h2 className="max-w-2xl font-heading text-3xl font-extrabold leading-tight text-navy md:text-4xl lg:text-5xl">
              {heading}{" "}
              <span className="text-primary-500">{highlightHeading}</span>
            </h2>
          </div>

          <p className="max-w-md text-sm leading-7 text-gray-500 md:text-base">
            {subtitle}
          </p>
        </motion.div>

        {/* Category cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.12 }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((category, index) => (
            <CategoryCard
              key={category.id || category.industry_slug || index}
              category={category}
              index={index}
              onExplore={handleOpenExplore}
            />
          ))}
        </motion.div>

        {/* Bottom information */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 text-center sm:flex-row"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {note1}
          </span>

          <span className="hidden text-gray-300 sm:block">•</span>

          <span className="text-sm font-medium text-gray-500">
            {note2}
          </span>
        </motion.div>
      </div>

      {/* Interactive Industry & Kit Explorer Modal */}
      <IndustryKitExplorerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        industry={selectedIndustry}
      />
    </section>
  );
}
