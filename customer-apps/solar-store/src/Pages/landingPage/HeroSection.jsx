import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiSun, FiZap } from "react-icons/fi";
import heroImg from "../../assets/images/hero_solar_house.png";

const SLIDES = [
  {
    id: 1,
    tag: "🌞 India's #1 Solar Kits Marketplace",
    title: "Complete Solar Kits\nFor Homes & Business",
    subtitle: "Certified pre-configured & custom solar kits — panels, inverter, mounting structure & BOS in one box. Save up to ₹78,000 with PM Surya Ghar Subsidy.",
    cta1: { label: "Shop Solar Kits", href: "/shop" },
    bg: "from-navy via-primary-700 to-primary-500",
    image: heroImg,
  },
  {
    id: 2,
    tag: "💰 PM Surya Ghar Yojana",
    title: "Get Govt. Subsidy\nUp to ₹78,000 on Solar Kits",
    subtitle: "Under PM Surya Ghar Muft Bijli Yojana, install 1kW-3kW Rooftop Solar Kits with verified subsidy approval. Apply now through SolarKits!",
    cta1: { label: "Check Subsidy Kits", href: "/shop" },
    bg: "from-[#0D3B6E] via-[#1565C0] to-[#29ABE2]",
    image: heroImg,
  },
  {
    id: 3,
    tag: "⚡ Complete Plug & Play Solar Kits",
    title: "Everything You Need\nin One Box",
    subtitle: "From 1kW Home Kits to 100kW Commercial Kits — our complete kits include high-efficiency panels, inverter, mounting structures & AC/DC BOS. Fast delivery across India!",
    cta1: { label: "View Solar Kits", href: "/shop" },
    bg: "from-[#0D3B6E] to-primary-600",
    image: heroImg,
  },
];

export default function HeroSection({ heroConfig }) {
  const navigate = useNavigate();
  if (heroConfig && heroConfig.enabled === false) return null;

  const slides = heroConfig?.slides && heroConfig.slides.length > 0 ? heroConfig.slides : SLIDES;
  const trustBadges = heroConfig?.trust_badges && heroConfig.trust_badges.length > 0 ? heroConfig.trust_badges : ["✅ BIS Certified", "📋 GST Invoice", "🚚 Free Delivery", "⭐ 4.8 Rating"];
  const stats = heroConfig?.stats && heroConfig.stats.length > 0 ? heroConfig.stats : [
    { val: "10,000+", label: "Happy Customers" },
    { val: "50 MW+", label: "Installed Capacity" },
  ];

  const handleCtaClick = (e, href, label) => {
    e.preventDefault();
    if (
      !href ||
      href === "#products" ||
      href === "#subsidy" ||
      href.includes("shop") ||
      /shop|subsidy|kits|buy/i.test(label || "")
    ) {
      navigate("/shop");
    } else if (href.startsWith("/")) {
      navigate(href);
    } else if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/shop");
      }
    } else {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  const resolveHeroImage = (src, fallback) => {
    if (!src) return fallback;
    if (typeof src === "string" && (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:"))) {
      return src;
    }
    const apiBase = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    return `${apiBase}${src.startsWith("/") ? "" : "/"}${src}`;
  };

  return (
    <section id="hero" className="relative w-full">
      <Swiper
        key={slides.map((s, i) => `${s.id || i}-${s.title}-${s.image || ''}-${s.image_opacity || ''}`).join('_')}
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: false }}
        pagination={{ clickable: true }}
        loop={slides.length > 1}
        speed={800}
        className="w-full h-[520px] md:h-[600px] lg:h-[680px]"
      >
        {slides.map((slide, idx) => (
          <SwiperSlide key={slide.id || idx}>
            <div className={`relative w-full h-full bg-gradient-to-r ${slide.bg || "from-navy via-primary-700 to-primary-500"}`}>
              {/* Background image */}
              <img
                src={resolveHeroImage(slide.image || heroConfig?.bg_image, heroImg)}
                alt={slide.title ? slide.title.replace(/\n/g, " ") : "Solar Kits"}
                style={{
                  opacity: slide.image_opacity ? Number(slide.image_opacity) / 100 : 0.3,
                }}
                className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500"
                onError={(e) => {
                  if (e.target.src !== heroImg) {
                    e.target.src = heroImg;
                  }
                }}
              />
              {/* Overlay */}
              <div className="hero-overlay absolute inset-0" />

              {/* Content */}
              <div className="relative z-10 h-full max-w-7xl mx-auto px-6 flex items-center">
                <motion.div
                  key={slide.id || idx}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="max-w-xl"
                >
                  {/* Tag */}
                  {slide.tag && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-5"
                    >
                      {slide.tag}
                    </motion.div>
                  )}

                  {/* Title */}
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4 whitespace-pre-line"
                  >
                    {slide.title}
                  </motion.h1>

                  {/* Subtitle */}
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="text-white/85 text-base md:text-lg leading-relaxed mb-8 max-w-md"
                  >
                    {slide.subtitle}
                  </motion.p>

                  {/* CTAs */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="flex flex-wrap gap-4"
                  >
                    {slide.cta1 && slide.cta1.label && (
                      <a
                        href={slide.cta1.href || "/shop"}
                        onClick={(e) => handleCtaClick(e, slide.cta1.href, slide.cta1.label)}
                        className="flex items-center gap-2 px-6 py-3.5 bg-accent hover:bg-accent-600 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-glow transition-all duration-300 group cursor-pointer"
                      >
                        {slide.cta1.label}
                        <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                      </a>
                    )}
                    {slide.cta2 && slide.cta2.label && !/buy\s*now|calculate\s*savings/i.test(slide.cta2.label) && (
                      <a
                        href={slide.cta2.href || "#calculator"}
                        onClick={(e) => handleCtaClick(e, slide.cta2.href, slide.cta2.label)}
                        className="flex items-center gap-2 px-6 py-3.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white font-semibold text-base rounded-xl border border-white/30 transition-all duration-300"
                      >
                        {slide.cta2.label}
                      </a>
                    )}
                  </motion.div>

                  {/* Trust badges */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-wrap items-center gap-4 mt-8"
                  >
                    {trustBadges.map((b) => (
                      <span key={b} className="text-white/70 text-xs font-medium">{b}</span>
                    ))}
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Floating stat cards */}
      <div className="hidden lg:flex absolute bottom-8 right-8 z-20 gap-4">
        {stats.map((s, idx) => (
          <motion.div
            key={s.label || idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="glass-card rounded-2xl px-5 py-3 flex items-center gap-3 shadow-card"
          >
            {idx === 0 ? <FiSun className="text-accent text-xl" /> : <FiZap className="text-sky-solar text-xl" />}
            <div>
              <div className="text-navy font-extrabold text-lg leading-none">{s.val}</div>
              <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
