// components/auth/AuthLayout.jsx — Premium Emerald Theme with Dark Mode
import CardImageSlider from "../CardImageSlider";
import { useState } from "react";
import useTheme from "../../hooks/useTheme";
import { HiSun, HiMoon, HiLockClosed, HiShieldCheck } from "react-icons/hi2";

const AuthLayout = ({ 
  children, 
  title, 
  subtitle, 
  images = [],
  footerText,
  footerLink,
  footerLinkText 
}) => {
  const { theme, toggleTheme } = useTheme();

  const defaultImages = [
    "https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  const slideMessages = [
    "Secure your digital journey with us",
    "Enterprise-grade protection for your data",
    "Seamless authentication experience",
    "Trusted by thousands of users worldwide"
  ];

  const dynamicOverlayContent = (slideIndex) => (
    <div className="absolute inset-0 bg-linear-to-t from-[#263880]/90 via-[#263880]/40 to-transparent flex flex-col justify-end p-4 md:p-8 text-white">
      <div className="max-w-md">
        <h1 className="text-xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-4">
          {title}
        </h1>
        <p className="text-sm md:text-lg opacity-90 mb-4 md:mb-6">
          {slideMessages[slideIndex] || subtitle}
        </p>
        <div className="flex items-center gap-3">
          <div className="w-8 md:w-10 h-1 bg-secondary rounded-full shadow-sm"></div>
          <span className="text-xs md:text-sm font-medium">
            Slide {slideIndex + 1} of {images.length || defaultImages.length}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-bg-subtle auth-pattern flex items-center justify-center p-0 md:p-4 transition-colors duration-300">
      {/* Main Container */}
      <div className="w-full h-screen md:h-auto md:max-h-[90vh] md:max-w-6xl flex flex-col md:flex-row md:rounded-3xl md:overflow-hidden shadow-none md:shadow-xl bg-surface md:border md:border-border transition-all duration-300">
        
        {/* Left Side - Image Slider (Desktop) */}
        <div className="hidden md:block md:w-1/2 relative overflow-hidden">
          <CardImageSlider
            images={images.length ? images : defaultImages}
            height="100%"
            aspectRatio="1/1"
            showCounter={false}
            showArrows={true}
            showDots={true}
            autoPlay={true}
            autoPlayInterval={5000}
            arrowSize="medium"
            dotStyle="minimal"
            className="rounded-none"
            containerClassName="rounded-none"
            slideClassName="rounded-none"
            overlay={dynamicOverlayContent}
            overlayClassName="transition-opacity duration-500"
            onSlideChange={setCurrentSlide}
          />
        </div>

        {/* Mobile Header with Image Slider */}
        <div className="md:hidden h-56 relative">
          <CardImageSlider
            images={images.length ? images : defaultImages}
            height="100%"
            aspectRatio="4/3"
            showCounter={false}
            showArrows={true}
            showDots={true}
            autoPlay={true}
            autoPlayInterval={5000}
            arrowSize="small"
            dotStyle="minimal"
            className="rounded-none"
            containerClassName="rounded-none"
            slideClassName="rounded-none"
            overlay={dynamicOverlayContent}
            overlayClassName="transition-opacity duration-500"
            onSlideChange={setCurrentSlide}
          />
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex flex-col h-full md:h-auto relative">
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-2xl bg-surface-hover/80 backdrop-blur-sm border border-border/50 text-primary hover:text-primary-hover hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 group shadow-sm flex items-center justify-center cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <HiSun className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <HiMoon className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hover p-5 md:p-8 lg:p-10">
            <div className="max-w-md mx-auto w-full">
              {/* Logo/Brand */}
              <div className="mb-8 md:mb-10 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl gradient-primary mb-4 md:mb-5 shadow-lg shadow-primary/30">
                  <HiLockClosed className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold gradient-text-primary tracking-tight">
                  Secure Access
                </h2>
                <p className="text-text-secondary text-sm md:text-base mt-2 font-medium">
                  Authenticate with your credentials
                </p>
              </div>

              {children}
            </div>
          </div>

          {/* Footer Area */}
          <div className="border-t border-border bg-surface-hover/30 p-4 md:p-6 lg:p-8 transition-colors">
            <div className="max-w-md mx-auto w-full">
              {(footerText || footerLink) && (
                <div className="mb-3 md:mb-4">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs md:text-sm text-text-muted">
                    <span>{footerText}</span>
                    {footerLink && (
                      <a 
                        href={footerLink} 
                        className="text-primary hover:text-primary-hover font-semibold transition-colors text-xs md:text-sm"
                      >
                        {footerLinkText}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Security Info */}
              <div className="flex items-center justify-center gap-2 md:gap-3 text-xs md:text-sm text-text-muted">
                <div className="w-6 h-6 rounded-lg bg-success/15 flex items-center justify-center shadow-sm">
                  <HiShieldCheck className="w-4 h-4 text-success" />
                </div>
                <span className="font-medium text-text-secondary">Protected by enterprise-grade security</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;