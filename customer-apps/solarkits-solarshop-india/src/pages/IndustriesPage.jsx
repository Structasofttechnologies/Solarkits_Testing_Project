import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./landing/Navbar";
import FooterSection from "./landing/FooterSection";
import IndustrySelectorPills from "../components/industries/IndustrySelectorPills";
import IndustryHeroBanner from "../components/industries/IndustryHeroBanner";
import MediaFilterToolbar from "../components/industries/MediaFilterToolbar";
import MediaCard from "../components/industries/MediaCard";
import MediaLightboxModal from "../components/industries/MediaLightboxModal";
import IndustryInquiryModal from "../components/industries/IndustryInquiryModal";
import {
  getPublicIndustries,
  getPublicIndustryContent,
  getPublicIndustryTheme,
  trackIndustryEvent,
} from "../services/industryContentService";
import {
  FiGrid,
  FiZap,
  FiShield,
  FiAward,
  FiHelpCircle,
  FiRefreshCw,
  FiSearch,
  FiLayers,
  FiArrowRight,
} from "react-icons/fi";
import { MdOutlineFactory } from "react-icons/md";

export default function IndustriesPage() {
  const { industrySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Data states
  const [industries, setIndustries] = useState([]);
  const [selectedIndustryId, setSelectedIndustryId] = useState("ALL");
  const [activeIndustry, setActiveIndustry] = useState(null);
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);

  // Filter states
  const [contentType, setContentType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("featured");
  const [viewMode, setViewMode] = useState("GRID");

  // Modals state
  const [activeLightboxItem, setActiveLightboxItem] = useState(null);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [inquiryTargetIndustry, setInquiryTargetIndustry] = useState(null);

  // 1. Initial load of active Industries
  useEffect(() => {
    document.title = "Industry Solar Solutions & Media Showcase — SolarKits India";

    getPublicIndustries().then((list) => {
      setIndustries(list);

      // Resolve from URL slug if available
      if (industrySlug) {
        const matched = list.find(
          (i) => i.slug === industrySlug || (i.id || i._id) === industrySlug
        );
        if (matched) {
          const id = matched.id || matched._id;
          setSelectedIndustryId(id);
          setActiveIndustry(matched);
        }
      }
      setLoading(false);
    });
  }, [industrySlug]);

  // 2. Fetch Content whenever industry filter, type filter, or sort changes
  const fetchContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const params = {
        content_type: contentType,
        search: searchQuery,
        sort: sortOption,
      };

      if (selectedIndustryId !== "ALL") {
        params.industry_type_id = selectedIndustryId;
      }

      const res = await getPublicIndustryContent(params);
      setContentList(res.items || []);

      // Check if a specific contentId was requested via URL query
      const urlContentId = searchParams.get("contentId");
      if (urlContentId && res.items) {
        const found = res.items.find(
          (i) => (i.id || i._id) === urlContentId
        );
        if (found) setActiveLightboxItem(found);
      }
    } catch (err) {
      console.error("[IndustriesPage] Content fetch error:", err);
    } finally {
      setContentLoading(false);
    }
  }, [selectedIndustryId, contentType, searchQuery, sortOption, searchParams]);

  useEffect(() => {
    if (!loading) {
      fetchContent();
    }
  }, [fetchContent, loading]);

  // Handle Industry Selection
  const handleSelectIndustry = (id, indObj = null) => {
    setSelectedIndustryId(id);
    setActiveIndustry(indObj);

    if (id === "ALL") {
      navigate("/industries", { replace: true });
    } else if (indObj?.slug) {
      navigate(`/industries/${indObj.slug}`, { replace: true });
    }
  };

  // Featured Hero Item: Pick the top featured item or first item of the current industry
  const featuredContent = useMemo(() => {
    if (!contentList || contentList.length === 0) return null;
    return contentList.find((c) => c.is_featured) || contentList[0];
  }, [contentList]);

  // Count items per industry
  const countsByIndustry = useMemo(() => {
    const counts = {};
    contentList.forEach((c) => {
      c.industries?.forEach((ind) => {
        const iid = ind.id || ind._id;
        counts[iid] = (counts[iid] || 0) + 1;
      });
    });
    return counts;
  }, [contentList]);

  // Media Lightbox trigger
  const handleOpenMedia = (item) => {
    setActiveLightboxItem(item);
    trackIndustryEvent({
      content_id: item.id || item._id,
      event_type: "VIEW",
      placement: "SOLARSHOP_SHOWCASE",
    });
  };

  // Inquire Quote trigger
  const handleOpenInquiry = (ind = null) => {
    setInquiryTargetIndustry(ind || activeIndustry);
    setIsInquiryOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Universal Fixed Navigation */}
      <Navbar />

      {/* Main Showcase Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full">
        {/* Breadcrumbs & Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
            <span>SolarKits India</span>
            <span>/</span>
            <span className="text-slate-500">Industry Solutions & Media</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Industry-Specific Solar Kits Solutions
              </h1>
              <p className="text-slate-600 text-sm sm:text-base max-w-3xl mt-2 leading-relaxed">
                Explore high-resolution product posters, technical spec sheets, 4K installation videos, and pre-engineered solar kits tailored for your sector.
              </p>
            </div>

            {/* Inquire CTA Top Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleOpenInquiry()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-600/20 hover:shadow-xl transition-all cursor-pointer self-start md:self-auto whitespace-nowrap"
            >
              <span>Get Industry Proposal</span>
              <FiArrowRight />
            </motion.button>
          </div>
        </div>

        {/* 1. Industry Selector Pills */}
        <div className="mb-8">
          <IndustrySelectorPills
            industries={industries}
            selectedIndustryId={selectedIndustryId}
            onSelectIndustry={handleSelectIndustry}
            countsByIndustry={countsByIndustry}
            totalCount={contentList.length}
          />
        </div>

        {/* 2. Dynamic Featured Hero Spotlight */}
        <IndustryHeroBanner
          featuredContent={featuredContent}
          activeIndustry={activeIndustry}
          onOpenMedia={handleOpenMedia}
          onOpenInquiry={handleOpenInquiry}
        />

        {/* 3. Media Filter Toolbar */}
        <MediaFilterToolbar
          activeType={contentType}
          onSelectType={setContentType}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
          viewMode={viewMode}
          onToggleViewMode={setViewMode}
          totalResults={contentList.length}
        />

        {/* 4. Media Showcase Grid / List */}
        {contentLoading ? (
          /* Loading Skeleton */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm animate-pulse flex flex-col gap-4"
              >
                <div className="aspect-video bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : contentList.length > 0 ? (
          /* Content Cards */
          <div
            className={
              viewMode === "GRID"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                : "flex flex-col gap-4"
            }
          >
            {contentList.map((item) => (
              <MediaCard
                key={item.id || item._id}
                item={item}
                viewMode={viewMode}
                onOpenMedia={handleOpenMedia}
                onOpenInquiry={handleOpenInquiry}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 text-2xl">
              <FiLayers />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">
              No Media Assets Found
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              No posters or videos match your current search or filter criteria. Try resetting filters or choosing another industry.
            </p>
            <button
              onClick={() => {
                setContentType("ALL");
                setSearchQuery("");
                setSelectedIndustryId("ALL");
                setActiveIndustry(null);
                navigate("/industries");
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <FiRefreshCw /> Reset All Filters
            </button>
          </div>
        )}

        {/* 5. Bottom Conversion Callout */}
        <section className="mt-20 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-400/30">
              <FiAward /> Engineering Excellence
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-4 leading-tight">
              Looking for a Customized Solar Kit for Your Project?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
              Whether you are powering an industrial manufacturing unit, an agricultural pump network, or a multi-tenant residential complex, SolarKits delivers pre-assembled, BIS-certified turnkey equipment.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => handleOpenInquiry()}
                className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-lg shadow-amber-400/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Request Detailed Proposal</span>
                <FiArrowRight />
              </button>
              <a
                href="https://solar-store-9r0g.onrender.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/20 transition-all"
              >
                Browse Solar Shop Store
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Lightbox / Video Player Modal */}
      <MediaLightboxModal
        isOpen={!!activeLightboxItem}
        item={activeLightboxItem}
        onClose={() => {
          setActiveLightboxItem(null);
          // Remove contentId from URL
          searchParams.delete("contentId");
          setSearchParams(searchParams, { replace: true });
        }}
        onOpenInquiry={handleOpenInquiry}
      />

      {/* Custom Quote / Inquiry Modal */}
      <IndustryInquiryModal
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        activeIndustry={inquiryTargetIndustry}
        industries={industries}
      />

      {/* Universal Footer */}
      <FooterSection />
    </div>
  );
}
