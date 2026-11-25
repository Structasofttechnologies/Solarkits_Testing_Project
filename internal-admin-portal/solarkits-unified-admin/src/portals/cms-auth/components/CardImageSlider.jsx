// CardImageSlider.jsx
import { useState, useEffect } from "react";
import IconButton from "./IconButton";
import { HiChevronLeft, HiChevronRight, HiPhoto } from "react-icons/hi2";

export default function CardImageSlider({
    images = [],
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
        if (height.includes('vh') || height.includes('%') || height.includes('px')) {
            return { height };
        }
        return { height: `${height}px` };
    };

    // Arrow size classes
    const getArrowSize = () => {
        switch (arrowSize) {
            case 'small': return { button: 'p-2', icon: 'w-2 h-2 md:w-4 md:h-4' };
            case 'large': return { button: 'p-4', icon: 'w-4 h-4 md:w-6 md:h-6' };
            case 'medium':
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
        const newIndex = (index + 1) % images.length;
        setIndex(newIndex);
        onSlideChange && onSlideChange(newIndex);
    };
    
    const prev = () => {
        const newIndex = (index - 1 + images.length) % images.length;
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
        if (!autoPlay || images.length <= 1) return;

        const interval = setInterval(() => {
            next();
        }, autoPlayInterval);

        return () => clearInterval(interval);
    }, [index, autoPlay, autoPlayInterval, images.length]);

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
                {images.map((img, i) => (
                    <div key={i} className="w-full h-full shrink-0 relative">
                        <div
                            className={`w-full h-full bg-cover bg-center ${slideClassName}`}
                            style={{ backgroundImage: `url(${img})` }}
                            aria-label={`slide-${i}`}
                            role="img"
                        />
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
            {showArrows && images.length > 1 && (
                <>
                    <IconButton
                        onClick={prev}
                        className={`absolute left-2 md:left-4 top-1/2 -translate-y-1/2 shadow-lg transition-all duration-200 ${getArrowSize().button
                            } ${isMobile 
                                ? 'opacity-80 active:scale-95'
                                : 'opacity-0 group-hover:opacity-80 hover:opacity-100'
                            } hover:scale-110 touch-manipulation z-30 pointer-events-auto`}
                        aria-label="Previous image"
                        variant="ghost"
                    >
                        <HiChevronLeft className={getArrowSize().icon} />
                    </IconButton>
                    <IconButton
                        onClick={next}
                        className={`absolute right-2 md:right-4 top-1/2 -translate-y-1/2 shadow-lg transition-all duration-200 ${getArrowSize().button
                            } ${isMobile 
                                ? 'opacity-80 active:scale-95'
                                : 'opacity-0 group-hover:opacity-80 hover:opacity-100'
                            } hover:scale-110 touch-manipulation z-30 pointer-events-auto`}
                        aria-label="Next image"
                        variant="ghost"
                    >
                        <HiChevronRight className={getArrowSize().icon} />
                    </IconButton>
                </>
            )}

            {/* Slide Indicators/Dots */}
            {showDots && images.length > 1 && (
                <div
                    className={`absolute left-0 right-0 flex justify-center gap-1 md:gap-1.5 px-4 z-30 pointer-events-auto ${
                        dotStyle === "line" ? "bottom-4" : "bottom-3 md:bottom-4"
                    }`}
                >
                    {images.map((_, i) => (
                        <IconButton
                            key={i}
                            onClick={() => goToSlide(i)}
                            className={`p-0! ${getDotStyle(index === i)}`}
                            aria-label={`Go to slide ${i + 1}`}
                            aria-current={index === i ? "true" : "false"}
                            variant="ghost"
                        >
                            {dotStyle === "numbered" && index === i && (
                                <span className="leading-none">{i + 1}</span>
                            )}
                        </IconButton>
                    ))}
                </div>
            )}

            {/* Slide Counter */}
            {showCounter && images.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/70 text-text-inverse text-xs px-4 py-2 rounded-full backdrop-blur-sm font-medium z-30 pointer-events-auto">
                    {index + 1} / {images.length}
                </div>
            )}

            {/* Loading State */}
            {images.length === 0 && (
                <div className="absolute inset-0 bg-surface-hover flex items-center justify-center z-20">
                    <div className="text-center">
                        <HiPhoto className="w-8 h-8 md:w-12 md:h-12 text-text-muted mx-auto mb-2" />
                        <div className="text-text-secondary text-sm">No images available</div>
                    </div>
                </div>
            )}
        </div>
    );
}