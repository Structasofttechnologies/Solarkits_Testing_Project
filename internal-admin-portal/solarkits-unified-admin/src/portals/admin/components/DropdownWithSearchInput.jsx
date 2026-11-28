import { Fragment, useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Listbox, Transition, Portal } from "@headlessui/react";
import { FaChevronDown, FaCheck, FaSearch } from "react-icons/fa";

// Debounce utility
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export default function DropdownWithSearchInput({
  label,
  value,
  onChange,
  options = [],
  className = "w-56",
  disabled = false,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  id,
  size = "md",
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
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

  // Helper to extract display text supporting text, label, and name properties
  const getOptionText = useCallback((opt) => {
    if (!opt) return "";
    return opt.text ?? opt.label ?? opt.name ?? "";
  }, []);

  // 🔍 Filter options by search text
  const filteredOptions = useMemo(() => {
    if (!debouncedQuery.trim()) return options;
    const lower = debouncedQuery.toLowerCase();
    return options.filter((opt) => getTextFromNode(getOptionText(opt)).toLowerCase().includes(lower));
  }, [options, debouncedQuery, getTextFromNode, getOptionText]);

  const selectedOption = useMemo(() => 
    options.find((opt) => opt.value === value || (value !== null && value !== undefined && value !== "" && String(opt.value) === String(value))),
    [options, value]
  );

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

  return (
    <div className={`w-full flex flex-col ${className}`}>
      {label && <label htmlFor={id} className="text-text-primary mb-1 font-medium">{label}</label>}

      <Listbox value={value ?? ""} onChange={onChange} disabled={disabled}>
        {({ open }) => (
          <div className="relative">
            <Listbox.Button
              className={`relative w-full border border-border rounded-2xl text-left flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary bg-surface hover:bg-surface-hover hover:border-primary/40 transition-all duration-200 ${
                size === "sm" ? "px-3 py-1.5 text-xs font-semibold" : "border-2 px-4 py-3 text-sm font-medium"
              } ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <span className="truncate text-text-primary font-medium flex items-center gap-2">
                {selectedOption?.image && (
                  <img
                    src={selectedOption.image}
                    alt=""
                    className="w-5 h-5 rounded-md object-contain bg-white border border-border p-0.5"
                  />
                )}
                {selectedOption ? getOptionText(selectedOption) : <span className="text-text-muted">{placeholder}</span>}
              </span>
              <FaChevronDown className="ml-2 text-text-secondary text-xs transition-transform duration-200" />
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
                  className="z-[9999] w-[var(--button-width)] bg-surface border-2 border-border rounded-2xl shadow-lg 
                  max-h-64 overflow-auto scrollbar-hover [--anchor-gap:8px] [--anchor-max-height:16rem]"
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
                      {visibleOptions.map((opt, idx) => (
                        <Listbox.Option key={`${idx}_${opt.value}`} value={opt.value}>
                          {({ active }) => {
                            const isSelected = value === opt.value || (value !== null && value !== undefined && value !== "" && String(opt.value) === String(value));
                            return (
                              <div
                                className={`cursor-pointer px-3 py-2 text-sm flex items-center justify-between rounded-md transition-all
                                  ${isSelected ? "btn-primary shadow-none!"
                                    : active ? "bg-surface-hover text-text-primary"
                                    : "text-text-secondary hover:text-text-primary"
                                  }`}
                              >
                                <span className="truncate flex-1 flex items-center gap-2">
                                  {opt.image && (
                                    <img
                                      src={opt.image}
                                      alt=""
                                      className="w-5 h-5 rounded-md object-contain bg-white border border-border p-0.5"
                                    />
                                  )}
                                  <span>{getOptionText(opt)}</span>
                                </span>
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
                      
                      {/* Show count */}
                      {filteredOptions.length > 30 && (
                        <div className="sticky bottom-0 bg-surface/90 backdrop-blur-sm border-t border-border px-3 py-1 text-xs text-text-secondary text-center">
                          Showing {visibleOptions.length} of {filteredOptions.length} items
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
    </div>
  );
}