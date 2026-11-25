import { Fragment, useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Listbox, Transition, Portal } from "@headlessui/react";
import { FaChevronDown, FaCheck, FaSearch, FaTimes } from "react-icons/fa";

// Debounce utility
const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

export default function MultiSelectDropdownWithSearchInput({
    label,
    values = [],
    onChange,
    options = [],
    className = "",
    disabled = false,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
}) {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [visibleCount, setVisibleCount] = useState(30);
    const buttonRef = useRef(null);
    const optionsRef = useRef(null);
    const observerRef = useRef(null);
    const loadingRef = useRef(null);

    const debouncedSetQuery = useMemo(
        () => debounce((q) => setDebouncedQuery(q), 150),
        []
    );

    const handleQueryChange = useCallback((e) => {
        const q = e.target.value;
        setQuery(q);
        debouncedSetQuery(q);
    }, [debouncedSetQuery]);

    // Recursively get text from JSX/React components
    const getTextFromNode = useCallback((node) => {
        if (typeof node === 'string' || typeof node === 'number') {
            return node.toString();
        }
        if (Array.isArray(node)) {
            return node.map(getTextFromNode).join('');
        }
        if (node && node.props && node.props.children) {
            return getTextFromNode(node.props.children);
        }
        return '';
    }, []);

    // 🔍 Filter options by search text
    const filteredOptions = useMemo(() => {
        if (!debouncedQuery.trim()) return options;
        const lower = debouncedQuery.toLowerCase();
        return options.filter((opt) => getTextFromNode(opt.text).toLowerCase().includes(lower));
    }, [options, debouncedQuery, getTextFromNode]);

    // Reset visible count when filtered options change
    useEffect(() => {
        setVisibleCount(30);
        if (optionsRef.current) {
            optionsRef.current.scrollTop = 0;
        }
    }, [debouncedQuery]);

    // Get visible options based on visibleCount
    const visibleOptions = useMemo(() => {
        return filteredOptions.slice(0, visibleCount);
    }, [filteredOptions, visibleCount]);

    const hasMore = visibleCount < filteredOptions.length;

    // Setup intersection observer for infinite scroll
    useEffect(() => {
        if (!optionsRef.current) return;

        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const firstEntry = entries[0];
                if (firstEntry.isIntersecting && hasMore) {
                    setVisibleCount(prev => Math.min(prev + 30, filteredOptions.length));
                }
            },
            { threshold: 0.1, root: optionsRef.current }
        );

        if (loadingRef.current) {
            observer.observe(loadingRef.current);
        }

        observerRef.current = observer;

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasMore, filteredOptions.length]);

    // Reset query when dropdown closes
    const handleAfterLeave = useCallback(() => {
        setQuery("");
        setDebouncedQuery("");
        setVisibleCount(30);
    }, []);

    // Handle scroll to load more manually as fallback
    const handleScroll = useCallback((e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop <= clientHeight + 10 && hasMore) {
            setVisibleCount(prev => Math.min(prev + 30, filteredOptions.length));
        }
    }, [hasMore, filteredOptions.length]);

    const removeValue = (valToRemove, e) => {
        e.stopPropagation();
        onChange(values.filter(v => v !== valToRemove));
    };

    return (
        <Fragment>
            {label && (
                <label className="text-text-primary mb-1 font-medium block text-left">{label}</label>
            )}

            <Listbox value={values} onChange={onChange} multiple disabled={disabled}>
                {({ open }) => (
                    <div className="relative">
                        <Listbox.Button
                            ref={buttonRef}
                            className={`relative w-full border-2 border-border rounded-xl px-4 py-3 text-sm 
                            text-left flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary
                            bg-surface hover:bg-surface-hover hover:border-primary/40 transition-all duration-200 ${
                                disabled ? "opacity-50 cursor-not-allowed" : ""
                            } ${className}`}
                        >
                            <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                                {values.length > 0 ? (
                                    values.map(val => {
                                        const opt = options.find(o => o.value === val);
                                        return (
                                            <span key={val} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                {opt ? opt.text : val}
                                                <FaTimes 
                                                    className="cursor-pointer hover:text-danger transition-colors" 
                                                    onClick={(e) => removeValue(val, e)} 
                                                />
                                            </span>
                                        );
                                    })
                                ) : (
                                    <span className="text-text-muted font-medium">{placeholder}</span>
                                )}
                            </div>
                            <FaChevronDown className="ml-2 text-text-secondary text-xs shrink-0 transition-transform duration-200" />
                        </Listbox.Button>

                        <Portal>
                            <Transition
                                as={Fragment}
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                                afterLeave={handleAfterLeave}
                                show={open}
                            >
                                <Listbox.Options
                                    ref={optionsRef}
                                    onScroll={handleScroll}
                                    anchor="bottom start"
                                    className="z-[9999] w-[var(--button-width)] bg-surface border-2 border-border rounded-xl shadow-lg 
                                    max-h-64 overflow-auto scrollbar-hover [--anchor-gap:8px]"
                                    static
                                >
                                    {/* 🔍 Search box - sticky at top */}
                                    <div className="sticky top-0 z-10 bg-surface border-b border-border p-2 flex items-center gap-2">
                                        <FaSearch className="text-primary text-xs shrink-0" />
                                        <input
                                            type="text"
                                            value={query}
                                            onChange={handleQueryChange}
                                            placeholder={searchPlaceholder}
                                            className="w-full text-sm bg-transparent outline-none text-text-primary placeholder-text-secondary"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        {filteredOptions.length > 0 && (
                                            <span className="text-xs text-text-secondary bg-surface-hover px-2 py-0.5 rounded-lg shrink-0 font-medium">
                                                {filteredOptions.length}
                                            </span>
                                        )}
                                    </div>

                                    {/* Options */}
                                    {visibleOptions.length > 0 ? (
                                        <div className="py-1">
                                            {visibleOptions.map((opt) => (
                                                <Listbox.Option key={opt.value} value={opt.value}>
                                                    {({ active }) => {
                                                        const isSelected = values.includes(opt.value);
                                                        return (
                                                            <div
                                                                className={`cursor-pointer px-3 py-2 text-sm flex items-center justify-between rounded-md transition-all
                                                                    ${isSelected ? "bg-primary/10 text-primary font-bold"
                                                                        : active ? "bg-surface-hover text-text-primary"
                                                                            : "text-text-secondary hover:text-text-primary"
                                                                    }`}
                                                            >
                                                                <span className="truncate flex-1">{opt.text}</span>
                                                                {isSelected && <FaCheck className="text-xs ml-2 shrink-0" />}
                                                            </div>
                                                        );
                                                    }}
                                                </Listbox.Option>
                                            ))}

                                            {/* Loading indicator for infinite scroll */}
                                            {hasMore && (
                                                <div
                                                    ref={loadingRef}
                                                    className="px-3 py-3 text-sm text-text-secondary text-center border-t border-border"
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                        <span>Loading more...</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="px-3 py-8 text-sm text-text-secondary text-center">
                                            No results found
                                        </div>
                                    )}
                                </Listbox.Options>
                            </Transition>
                        </Portal>
                    </div>
                )}
            </Listbox>
        </Fragment>
    );
}
