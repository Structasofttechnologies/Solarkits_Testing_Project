import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronLeft, FiChevronRight, FiPause, FiPlay, FiArrowRight } from "react-icons/fi";

// Option C High-Definition B2B Solar Kit & Franchise Carousel Banners
import slide1kW from "../../assets/images/solarkits_slide_1kw.png";
import slide2kW from "../../assets/images/solarkits_slide_2kw.png";
import slide3kW from "../../assets/images/solarkits_slide_3kw.png";
import bannerMaster from "../../assets/images/solarkits_banner_1_2_3kw.png";
import slideFranchise from "../../assets/images/solarkits_slide_franchise.png";

const SOLAR_IMAGES = [
  {
    id: 1,
    url: slide1kW,
    alt: "1 kW On-Grid DCR Solar Kit with 500W Panels & BOSkit Box - SolarKits",
    title: "1 kW DCR Solar Combo Kit",
    buttonLabel: "BUY 1 kW KIT NOW",
    kw: 1,
    isFranchise: false,
  },
  {
    id: 2,
    url: slide2kW,
    alt: "2 kW On-Grid DCR Solar Kit with 500W Panels & Smart Inverter - SolarKits",
    title: "2 kW DCR Solar Combo Kit",
    buttonLabel: "BUY 2 kW KIT NOW",
    kw: 2,
    isFranchise: false,
  },
  {
    id: 3,
    url: slide3kW,
    alt: "3 kW On-Grid DCR Solar Kit with 500W Modules & Wi-Fi Inverter - SolarKits",
    title: "3 kW DCR Solar Combo Kit",
    buttonLabel: "BUY 3 kW KIT NOW",
    kw: 3,
    isFranchise: false,
  },
  {
    id: 4,
    url: bannerMaster,
    alt: "Complete 1kW | 2kW | 3kW On-Grid DCR Solar Kits - SolarKits",
    title: "1kW, 2kW, 3kW Combo Packages",
    buttonLabel: "BUY SOLAR KITS NOW",
    kw: null,
    isFranchise: false,
  },
  {
    id: 5,
    url: slideFranchise,
    alt: "Become a SolarKits Franchisee - Regional Distribution Partnership",
    title: "Regional Franchisee Program",
    buttonLabel: "BECOME A FRANCHISEE",
    kw: null,
    isFranchise: true,
  },
];

const AUTOPLAY_DURATION = 5000; // 5 seconds per slide

export default function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const timerRef = useRef(null);

  // Preload all local images on component mount for zero latency
  useEffect(() => {
    [slide1kW, slide2kW, slide3kW, bannerMaster, slideFranchise].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % SOLAR_IMAGES.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + SOLAR_IMAGES.length) % SOLAR_IMAGES.length);
  };

  const handleSelectSlide = (idx) => {
    setCurrentIndex(idx);
  };

  // Direct Store / Franchisee Redirection
  const handleCtaClick = () => {
    const current = SOLAR_IMAGES[currentIndex];
    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const storeBase = import.meta.env.VITE_STORE_URL || (isLocal ? "http://localhost:5179" : "https://store.solarkits.in");
    const franchiseBase = import.meta.env.VITE_FRANCHISE_URL || (isLocal ? "http://localhost:5178" : "https://franchise.solarkits.in");

    if (current.isFranchise) {
      window.open(franchiseBase, "_blank", "noopener,noreferrer");
    } else if (current.kw) {
      // Direct redirect to specific kW kit in Solar Store
      window.open(`${storeBase}/shop?kw=${current.kw}`, "_blank", "noopener,noreferrer");
    } else {
      // Direct redirect to B2B Storefront where Franchisees & EPCs can buy kits directly
      window.open(`${storeBase}/shop`, "_blank", "noopener,noreferrer");
    }
  };

  // Autoplay Effect
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        handleNext();
      }, AUTOPLAY_DURATION);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPlaying]);

  // Swipe Gesture Handling
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
  };

  return (
    <section
      id="hero"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
      style={{
        width: "100%",
        height: "calc(100vh - 74px)",
        minHeight: "480px",
        maxHeight: "720px",
        marginTop: "74px", // Navbar offset so banner starts cleanly below the fixed header
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#081430",
      }}
    >
      {/* Background Image Base Layer (Guarantees no black screen) */}
      <img
        src={SOLAR_IMAGES[currentIndex].url}
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
        }}
      />

      {/* Cross-Fade Motion Layer */}
      <div style={{ position: "absolute", inset: 0 }}>
        <AnimatePresence initial={false}>
          <motion.img
            key={SOLAR_IMAGES[currentIndex].id}
            src={SOLAR_IMAGES[currentIndex].url}
            alt={SOLAR_IMAGES[currentIndex].alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
              display: "block",
            }}
          />
        </AnimatePresence>
      </div>

      {/* Real Interactive Action Button (Single Clean Working CTA) */}
      <div
        style={{
          position: "absolute",
          left: "max(28px, calc(50% - 690px))",
          bottom: "44px",
          zIndex: 15,
          display: "flex",
          alignItems: "center",
        }}
      >
        <motion.button
          onClick={handleCtaClick}
          whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(244, 146, 34, 0.45)" }}
          whileTap={{ scale: 0.96 }}
          style={{
            padding: "14px 30px",
            background: SOLAR_IMAGES[currentIndex].isFranchise
              ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
              : "linear-gradient(135deg, #F49222 0%, #E07D10 100%)",
            color: SOLAR_IMAGES[currentIndex].isFranchise ? "#ffffff" : "#0a1428",
            borderRadius: "10px",
            fontSize: "1rem",
            fontWeight: 800,
            cursor: "pointer",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: SOLAR_IMAGES[currentIndex].isFranchise
              ? "0 6px 20px rgba(16, 185, 129, 0.35)"
              : "0 6px 20px rgba(244, 146, 34, 0.35)",
            fontFamily: "inherit",
            letterSpacing: "0.4px",
          }}
        >
          <span>{SOLAR_IMAGES[currentIndex].buttonLabel}</span>
          <FiArrowRight style={{ strokeWidth: 2.8 }} />
        </motion.button>
      </div>

      {/* Floating Glassmorphic Left Arrow Button */}
      <button
        onClick={handlePrev}
        aria-label="Previous Slide"
        style={{
          position: "absolute",
          left: "24px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          borderRadius: "50%",
          width: "52px",
          height: "52px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          cursor: "pointer",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          transition: "all 0.3s ease",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
          e.currentTarget.style.scale = "1.1";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "rgba(15, 23, 42, 0.45)";
          e.currentTarget.style.scale = "1";
        }}
      >
        <FiChevronLeft size={28} />
      </button>

      {/* Floating Glassmorphic Right Arrow Button */}
      <button
        onClick={handleNext}
        aria-label="Next Slide"
        style={{
          position: "absolute",
          right: "24px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          borderRadius: "50%",
          width: "52px",
          height: "52px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          cursor: "pointer",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          transition: "all 0.3s ease",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
          e.currentTarget.style.scale = "1.1";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "rgba(15, 23, 42, 0.45)";
          e.currentTarget.style.scale = "1";
        }}
      >
        <FiChevronRight size={28} />
      </button>

      {/* Bottom Floating Control Bar (Dots + Play/Pause) */}
      <div
        style={{
          position: "absolute",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "50px",
          padding: "8px 22px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Play/Pause Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pause Auto Play" : "Start Auto Play"}
          style={{
            background: "transparent",
            border: "none",
            color: "#ffffff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          {isPlaying ? <FiPause size={18} /> : <FiPlay size={18} />}
        </button>

        {/* Slide Indicator Dots */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {SOLAR_IMAGES.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => handleSelectSlide(idx)}
              style={{
                width: idx === currentIndex ? "32px" : "12px",
                height: "12px",
                borderRadius: "6px",
                background: idx === currentIndex ? "#F49222" : "rgba(255, 255, 255, 0.35)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Top Auto-Slide Progress Bar */}
      {isPlaying && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "4px",
            background: "rgba(255, 255, 255, 0.15)",
            zIndex: 20,
          }}
        >
          <motion.div
            key={currentIndex}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: AUTOPLAY_DURATION / 1000, ease: "linear" }}
            style={{
              height: "100%",
              background: "#F49222",
              boxShadow: "0 0 10px #F49222",
            }}
          />
        </div>
      )}
    </section>
  );
}
