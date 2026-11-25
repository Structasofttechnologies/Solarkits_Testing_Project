// components/optimized-dropdown/SearchInputWithDropdown.jsx
import { Fragment, useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { FaChevronDown, FaCheck, FaSearch } from "react-icons/fa";

// Debounce utility
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export default function SearchInputWithDropdown({
  label,
  value,
  onChange,
  inputValue,
  options,
  className = "w-56",
  disabled = false,
  placeholder = "Search or select...",
  onInputChange = () => { },
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const wrapperRef = useRef(null);
  const inputWrapperRef = useRef(null);
  const optionsRef = useRef(null);
  const observerRef = useRef(null);
  const loadingRef = useRef(null);

  const debouncedSetQuery = useMemo(
    () => debounce((q) => setDebouncedQuery(q), 150),
    []
  );

  const handleInputChange = useCallback((e) => {
    const q = e.target.value;
    setQuery(q);
    debouncedSetQuery(q);
    onInputChange(q);
    setOpen(true);
  }, [debouncedSetQuery, onInputChange]);

  const filteredOptions = useMemo(() => {
    if (!debouncedQuery.trim()) return options;
    const lower = debouncedQuery.toLowerCase();
    return options.filter((opt) => {
      const text = typeof opt.text === 'string' ? opt.text : opt.text?.toString() || '';
      return text.toLowerCase().includes(lower);
    });
  }, [options, debouncedQuery]);

  useEffect(() => {
    setVisibleCount(30);
    if (optionsRef.current) {
      optionsRef.current.scrollTop = 0;
    }
  }, [debouncedQuery]);

  const visibleOptions = useMemo(() => {
    return filteredOptions.slice(0, visibleCount);
  }, [filteredOptions, visibleCount]);

  const hasMore = visibleCount < filteredOptions.length;

  useEffect(() => {
    if (!optionsRef.current || !open) return;

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
  }, [hasMore, filteredOptions.length, open]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (!wrapperRef.current.contains(document.activeElement)) {
        setOpen(false);
      }
    }, 120);
  }, []);

  const handleAfterLeave = useCallback(() => {
    setQuery(inputValue || "");
    setDebouncedQuery(inputValue || "");
    setVisibleCount(30);
  }, [inputValue]);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 10 && hasMore) {
      setVisibleCount(prev => Math.min(prev + 30, filteredOptions.length));
    }
  }, [hasMore, filteredOptions.length]);

  useEffect(() => {
    setQuery(inputValue);
    setDebouncedQuery(inputValue);
  }, [inputValue]);

  return (
    <div className={`flex flex-col ${className}`} ref={wrapperRef}>
      {label && (
        <label className="text-text-primary font-medium mb-1">{label}</label>
      )}

      <Combobox value={value} onChange={(val) => {
        onChange(val);
        setOpen(false);
      }} disabled={disabled}>
        <div className="relative">
          <div
            ref={inputWrapperRef}
            className={`w-full border-2 border-border rounded-xl px-4 py-3 text-sm bg-surface flex items-center gap-2 cursor-text transition-all duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:border-primary hover:bg-surface-hover hover:border-primary/40
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => !disabled && setOpen(true)}
          >
            <FaSearch className="text-primary text-xs shrink-0" />

            <Combobox.Input
              type="text"
              value={query}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none text-text-primary font-medium placeholder-text-muted"
              onFocus={() => setOpen(true)}
              onBlur={handleBlur}
              onChange={handleInputChange}
              disabled={disabled}
            />

            <FaChevronDown
              className={`text-text-secondary text-xs transition-transform duration-200 cursor-pointer ${open ? "rotate-180" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
            />
          </div>

          <Transition
            as={Fragment}
            show={open}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={handleAfterLeave}
          >
            <Combobox.Options
              ref={optionsRef}
              static
              onScroll={handleScroll}
              className="absolute left-0 right-0 z-50 mt-2 bg-surface border-2 border-border rounded-xl shadow-lg 
              max-h-64 overflow-auto scrollbar-hover"
              onBlur={handleBlur}
            >
              {visibleOptions.length > 0 ? (
                <div className="py-1">
                  {visibleOptions.map((opt) => (
                    <Combobox.Option key={opt.value} value={opt.value}>
                      {({ selected, active }) => (
                        <div
                          className={`cursor-pointer px-3 py-2 text-sm flex items-center justify-between rounded-md transition-all
                            ${selected
                              ? "btn-primary shadow-none!"
                              : active
                                ? "bg-surface-hover text-text-primary"
                                : "text-text-secondary hover:text-text-primary"
                            }`}
                        >
                          <span className="truncate flex-1">{opt.text}</span>
                          {selected && <FaCheck className="text-xs ml-2 shrink-0" />}
                        </div>
                      )}
                    </Combobox.Option>
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
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
}