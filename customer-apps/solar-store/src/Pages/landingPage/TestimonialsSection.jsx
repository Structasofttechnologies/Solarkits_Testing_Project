import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";

import {
  FiStar,
  FiMapPin,
  FiCheckCircle,
  FiTrendingDown,
} from "react-icons/fi";
import { RiDoubleQuotesL } from "react-icons/ri";

const TESTIMONIALS = [
  {
    id: 1,
    name: "Ramesh Sharma",
    city: "Jaipur, Rajasthan",
    role: "Homeowner",
    rating: 5,
    review:
      "We installed a 3kW system through SolarKits. The whole process from ordering to installation was super smooth. My electricity bill dropped from ₹2,800 to just ₹120! Best investment ever.",
    system: "3kW On-Grid System",
    savings: "₹2,680/mo",
    initials: "RS",
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: 2,
    name: "Priya Menon",
    city: "Coimbatore, Tamil Nadu",
    role: "Factory Owner",
    rating: 5,
    review:
      "Ordered 50 panels for our factory rooftop. Delivery was on time and the panels are top quality — all MNRE certified. Our energy costs have fallen by 65%. Highly recommend SolarKits!",
    system: "25kW Commercial System",
    savings: "₹42,000/mo",
    initials: "PM",
    color: "from-sky-400 to-cyan-600",
  },
  {
    id: 3,
    name: "Ajay Verma",
    city: "Lucknow, Uttar Pradesh",
    role: "Farmer",
    rating: 5,
    review:
      "Maine 5kW off-grid system lagaya apne khet ke liye. Ab pump chalta hai bina bijli bill ke. SolarKits ka support team bahut helpful tha. Thank you!",
    system: "5kW Off-Grid System",
    savings: "₹5,200/mo",
    initials: "AV",
    color: "from-green-400 to-emerald-600",
  },
  {
    id: 4,
    name: "Sunita Patel",
    city: "Surat, Gujarat",
    role: "Homeowner",
    rating: 4,
    review:
      "Got subsidy of ₹78,000 with help from SolarKits team. The installation team was professional and completed the job in just 2 days. Very satisfied with the quality and service.",
    system: "4kW On-Grid System",
    savings: "₹3,500/mo",
    initials: "SP",
    color: "from-orange-400 to-amber-600",
  },
  {
    id: 5,
    name: "Mohit Gupta",
    city: "Pune, Maharashtra",
    role: "IT Professional",
    rating: 5,
    review:
      "The SolarKits app made it so easy to track my production. I'm producing 18–20 units daily. The 25-year warranty gives me complete peace of mind. Great product, great service!",
    system: "3kW Hybrid System",
    savings: "₹2,900/mo",
    initials: "MG",
    color: "from-purple-500 to-violet-700",
  },
];

const PLATFORM_RATINGS = [
  {
    platform: "Google",
    rating: "4.9",
    reviews: "1.2K reviews",
    color: "bg-blue-50 text-blue-600",
  },
  {
    platform: "Trustpilot",
    rating: "4.7",
    reviews: "520 reviews",
    color: "bg-green-50 text-green-600",
  },
  {
    platform: "Amazon",
    rating: "4.8",
    reviews: "410 reviews",
    color: "bg-orange-50 text-orange-600",
  },
  {
    platform: "Flipkart",
    rating: "4.8",
    reviews: "270 reviews",
    color: "bg-sky-50 text-sky-600",
  },
];

function StarRating({ rating, size = "text-sm" }) {
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${rating} out of 5 stars`}
    >
      {[...Array(5)].map((_, index) => (
        <FiStar
          key={index}
          className={`${size} ${index < rating
              ? "fill-orange-400 text-orange-400"
              : "fill-gray-100 text-gray-200"
            }`}
        />
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.35 }}
      className="group relative flex h-full min-h-[440px] flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-md transition-shadow duration-300 hover:shadow-2xl md:p-7"
    >
      {/* Decorative quote icon */}
      <RiDoubleQuotesL className="absolute right-5 top-4 text-7xl text-primary-50 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />

      <div className="relative z-10 mb-6 flex items-center justify-between">
        <StarRating rating={testimonial.rating} size="text-base" />

        <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1.5 text-[11px] font-bold text-green-600">
          <FiCheckCircle />
          Verified
        </span>
      </div>

      {/* Customer review */}
      <blockquote className="relative z-10 mb-6 flex-1 text-[15px] font-medium leading-7 text-gray-600">
        “{testimonial.review}”
      </blockquote>

      {/* System information */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-primary-50 px-3.5 py-2.5">
          <span className="text-xs font-semibold text-gray-500">
            Installed system
          </span>

          <span className="text-right text-xs font-bold text-primary-600">
            {testimonial.system}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-green-50 px-3.5 py-2.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <FiTrendingDown className="text-green-600" />
            Monthly savings
          </span>

          <span className="text-xs font-extrabold text-green-600">
            {testimonial.savings}
          </span>
        </div>
      </div>

      {/* Customer information */}
      <div className="flex items-center gap-3 border-t border-gray-100 pt-5">
        <div
          className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br text-sm font-extrabold text-white shadow-md ${testimonial.color}`}
        >
          {testimonial.initials}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-extrabold text-navy">
              {testimonial.name}
            </h3>

            <FiCheckCircle className="flex-shrink-0 fill-primary-500 text-xs text-white" />
          </div>

          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
            <FiMapPin className="flex-shrink-0" />
            <span className="truncate">{testimonial.city}</span>
          </p>
        </div>

        <span className="ml-auto flex-shrink-0 rounded-full bg-gray-50 px-2.5 py-1 text-[10px] font-bold text-gray-500">
          {testimonial.role}
        </span>
      </div>
    </motion.article>
  );
}

export default function TestimonialsSection({ testimonialsConfig }) {
  if (testimonialsConfig && testimonialsConfig.enabled === false) return null;

  const badgeText = testimonialsConfig?.badge_text || "Customer Stories";
  const heading = testimonialsConfig?.heading || "Loved by Solar Customers";
  const subtitle = testimonialsConfig?.subtitle || "Real experiences from families and businesses that switched to clean, affordable solar energy.";
  const overallRating = testimonialsConfig?.overall_rating || "4.8";
  const reviewCount = testimonialsConfig?.review_count || "Based on 2,400+ reviews";
  const platforms = testimonialsConfig?.platforms && testimonialsConfig.platforms.length > 0 ? testimonialsConfig.platforms : PLATFORM_RATINGS;
  const items = testimonialsConfig?.items && testimonialsConfig.items.length > 0 ? testimonialsConfig.items : TESTIMONIALS;

  return (
    <section id="testimonials" className="relative overflow-hidden bg-solarbg py-16 md:py-24">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-primary-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-72 w-72 rounded-full bg-orange-100/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-600">
            <FiStar className="fill-primary-500" />
            {badgeText}
          </span>

          <h2 className="font-heading text-3xl font-extrabold text-navy md:text-4xl lg:text-5xl">
            {heading}
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-gray-500 md:text-base">
            {subtitle}
          </p>
        </motion.div>

        {/* Overall ratings */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="mb-12 rounded-3xl border border-white bg-white/80 p-6 shadow-lg backdrop-blur-sm md:p-8"
        >
          <div className="flex flex-col items-center gap-8 lg:flex-row">
            <div className="flex-shrink-0 text-center lg:w-52">
              <div className="font-heading text-6xl font-extrabold leading-none text-navy">
                {overallRating}
              </div>

              <div className="my-2 flex justify-center">
                <StarRating rating={5} size="text-xl" />
              </div>

              <p className="text-xs font-medium text-gray-400">
                {reviewCount}
              </p>
            </div>

            <div className="hidden h-24 w-px bg-gray-200 lg:block" />

            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {platforms.map((item, idx) => (
                <div
                  key={item.platform || idx}
                  className="rounded-2xl border border-gray-100 bg-white p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <p
                    className={`mx-auto mb-2 w-fit rounded-full px-3 py-1 text-xs font-bold ${item.color || "bg-blue-50 text-blue-600"}`}
                  >
                    {item.platform}
                  </p>

                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl font-extrabold text-navy">
                      {item.rating}
                    </span>

                    <FiStar className="fill-orange-400 text-orange-400" />
                  </div>

                  <p className="mt-1 text-[11px] text-gray-400">
                    {item.reviews}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Testimonials slider */}
        <Swiper
          key={items.map((t, i) => `${t.id || i}-${t.name}`).join('_')}
          modules={[Autoplay, Pagination]}
          loop={items.length > 2}
          grabCursor
          speed={800}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          pagination={{
            clickable: true,
            dynamicBullets: true,
          }}
          slidesPerView={1}
          spaceBetween={22}
          breakpoints={{
            640: {
              slidesPerView: 1.4,
              spaceBetween: 22,
            },
            768: {
              slidesPerView: 2,
              spaceBetween: 24,
            },
            1100: {
              slidesPerView: 3,
              spaceBetween: 28,
            },
          }}
          className="testimonials-swiper !overflow-visible !pb-14"
        >
          {items.map((testimonial, idx) => (
            <SwiperSlide key={testimonial.id || idx} className="h-auto">
              <TestimonialCard testimonial={testimonial} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}