// CardSlider.jsx
import { useState, useEffect } from "react";
import IconButton from "./IconButton";

export default function CardSlider({
    slides = [],
    height = "400px",
    aspectRatio = "16/9",
    showCounter = true,
    showArrows = true,
    showDots = true,
    autoPlay = false,
    autoPlayInterval = 4000,
    swipeThreshold = 50,
    arrowSize = "medium",
    dotStyle = "default",
    overlay = null,
    slidePadding = "",
    className = "",
    containerClassName = "",
    slideClassName = "",
    overlayClassName = "",
    onSlideChange = null
}) {
    const [index, setIndex] = useState(0);
    const [startX, setStartX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [translateX, setTranslateX] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    // Height calculation
    const getHeightStyle = () => {
        if (height === 'full') return { height: '100%' };
        if (height === 'fit' || height === 'fit-content') return { height: 'fit-content' };
        if (String(height).includes('vh') || String(height).includes('%') || String(height).includes('px')) {
            return { height };
        }
        return { height: `${height}px` };
    };

    // Arrow size classes
    const getArrowSize = () => {
        switch (arrowSize) {
            case 'sm': return { button: 'p-2', icon: 'w-2 h-2 md:w-3 md:h-3' };
            case 'lg': return { button: 'p-4', icon: 'w-4 h-4 md:w-6 md:h-6' };
            case 'md':
            default: return { button: 'p-2', icon: 'w-4 h-4 md:w-5 md:h-5' };
        }
    };

    // Dot style classes
    const getDotStyle = (isActive) => {
        const baseClasses = "transition-all duration-300 rounded-full touch-manipulation";

        switch (dotStyle) {
            case 'minimal':
                return `${baseClasses} ${isActive ? `bg-text-inverse ${isMobile ? 'w-6' : 'w-4'}`
                    : `bg-text-inverse/40 hover:bg-text-inverse/60 ${isMobile ? 'w-2 h-2' : 'w-1.5 h-1.5'}`
                    } ${isMobile ? 'h-2' : 'h-1.5'}`;

            case 'numbered':
                return `${baseClasses} ${isActive ? `bg-text-inverse text-text-primary ${isMobile ? 'w-8 h-6 text-sm' : 'w-6 h-4 text-xs'}`
                    : `bg-text-inverse/40 hover:bg-text-inverse/60 ${isMobile ? 'w-6 h-2' : 'w-4 h-1.5'}`
                    } flex items-center justify-center font-medium`;

            case 'line':
                return `${baseClasses} ${isActive ? `bg-text-inverse ${isMobile ? 'w-8 h-1' : 'w-6 h-1'}`
                    : `bg-text-inverse/40 hover:bg-text-inverse/60 ${isMobile ? 'w-4 h-1' : 'w-3 h-1'}`
                    }`;

            case 'default':
            default:
                return `${baseClasses} ${isActive ? `bg-text-inverse ${isMobile ? 'w-3 h-3' : 'w-2.5 h-2.5'}`
                    : `bg-text-inverse/50 hover:bg-text-inverse/80 ${isMobile ? 'w-2 h-2' : 'w-1.5 h-1.5'}`
                    }`;
        }
    };

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const next = () => {
        const newIndex = (index + 1) % slides.length;
        setIndex(newIndex);
        onSlideChange && onSlideChange(newIndex);
    };

    const prev = () => {
        const newIndex = (index - 1 + slides.length) % slides.length;
        setIndex(newIndex);
        onSlideChange && onSlideChange(newIndex);
    };

    const handleStart = (e) => {
        setStartX(e.touches ? e.touches[0].clientX : e.clientX);
        setIsDragging(true);
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        setTranslateX(clientX - startX);
    };

    const handleEnd = () => {
        setIsDragging(false);
        const currentSwipeThreshold = isMobile ? swipeThreshold * 0.6 : swipeThreshold;
        if (translateX > currentSwipeThreshold) prev();
        else if (translateX < -currentSwipeThreshold) next();
        setTranslateX(0);
    };

    const goToSlide = (i) => {
        setIndex(i);
        onSlideChange && onSlideChange(i);
    };

    // Auto-play
    useEffect(() => {
        if (!autoPlay || slides.length <= 1) return;

        const interval = setInterval(() => {
            next();
        }, autoPlayInterval);

        return () => clearInterval(interval);
    }, [index, autoPlay, autoPlayInterval, slides.length]);

    return (
        <div
            className={`relative w-full overflow-hidden select-none group touch-pan-y ${containerClassName}`}
            style={{
                ...getHeightStyle(),
                aspectRatio: aspectRatio
            }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={() => isDragging && handleEnd()}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            {/* Slides Container */}
            <div
                className={`flex h-full transition-transform duration-300 ease-out ${className}`}
                style={{
                    transform: `translateX(calc(${-index * 100}% + ${translateX}px))`,
                }}
            >
                {slides.map((slide, i) => (
                    <div key={i} className={`w-full h-full shrink-0 relative ${slidePadding} ${slideClassName}`}>
                        {slide}
                    </div>
                ))}
            </div>

            {/* Custom Overlay */}
            {overlay && (
                <div className={`absolute inset-0 z-20 pointer-events-none ${overlayClassName}`}>
                    {typeof overlay === 'function' ? overlay(index) : overlay}
                </div>
            )}

            {/* Navigation Arrows */}
            {showArrows && slides.length > 1 && (
                <>
                    <IconButton
                        variant="ghost"
                        onClick={prev}
                        className={`absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-surface/90 hover:bg-surface text-text-primary rounded-full shadow-lg transition-all duration-200 ${getArrowSize().button} ${isMobile ? 'opacity-80 active:scale-95' : 'opacity-0 group-hover:opacity-80 hover:opacity-100'} hover:scale-110 touch-manipulation z-30 pointer-events-auto`}
                        aria-label="Previous slide"
                    >
                        <svg className={getArrowSize().icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </IconButton>
                    <IconButton
                        variant="ghost"
                        onClick={next}
                        className={`absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-surface/90 hover:bg-surface text-text-primary rounded-full shadow-lg transition-all duration-200 ${getArrowSize().button} ${isMobile ? 'opacity-80 active:scale-95' : 'opacity-0 group-hover:opacity-80 hover:opacity-100'} hover:scale-110 touch-manipulation z-30 pointer-events-auto`}
                        aria-label="Next slide"
                    >
                        <svg className={getArrowSize().icon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </IconButton>
                </>
            )}

            {/* Slide Indicators/Dots */}
            {showDots && slides.length > 1 && (
                <div className={`absolute left-0 right-0 flex justify-center gap-1 md:gap-1.5 px-4 z-30 pointer-events-auto ${dotStyle === "line" ? "bottom-4" : "bottom-3 md:bottom-4"}`}>
                    {slides.map((_, i) => (
                        <IconButton key={i} onClick={() => goToSlide(i)} variant="secondary" className={getDotStyle(index === i) + " p-0! cursor-pointer"} aria-label={`Go to slide ${i + 1}`} aria-current={index === i ? "true" : "false"}>
                            {dotStyle === "numbered" && index === i && <span className="leading-none">{i + 1}</span>}
                        </IconButton>
                    ))}
                </div>
            )}

            {/* Slide Counter */}
            {showCounter && slides.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/70 text-text-inverse text-xs px-4 py-2 rounded-full backdrop-blur-sm font-medium z-30 pointer-events-auto">
                    {index + 1} / {slides.length}
                </div>
            )}

            {/* Loading State */}
            {slides.length === 0 && (
                <div className="absolute inset-0 bg-surface-hover flex items-center justify-center z-20">
                    <div className="text-center">
                        <svg className="w-8 h-8 md:w-12 md:h-12 text-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <div className="text-text-secondary text-sm">No slides available</div>
                    </div>
                </div>
            )}
        </div>
    );
}