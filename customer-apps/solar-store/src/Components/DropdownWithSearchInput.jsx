import { Fragment, useState, useRef, useLayoutEffect, useMemo, useCallback, useEffect } from "react";
import { Listbox, Transition } from "@headlessui/react";
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
  forceDown = false,
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [openUp, setOpenUp] = useState(false);
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

  const selectedOption = useMemo(() => 
    options.find((opt) => opt.value === value),
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
    <div className={`flex flex-col ${className}`}>
      {label && <label className="text-text-primary mb-1 font-medium">{label}</label>}

      <Listbox value={value} onChange={onChange} disabled={disabled}>
        {({ open }) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          useLayoutEffect(() => {
            if (open && buttonRef.current) {
              if (forceDown) {
                setOpenUp(false);
              } else {
                const rect = buttonRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                setOpenUp(spaceBelow < 300);
              }
            }
          }, [open]);

          return (
            <div className="relative">
              <Listbox.Button
                ref={buttonRef}
                className={`relative w-full border border-border rounded-md px-3 py-2 text-sm 
                text-left flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring
                bg-surface hover:bg-surface-hover transition ${
                  disabled ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                <span className="truncate text-text-primary">
                  {selectedOption ? selectedOption.text : placeholder}
                </span>
                <FaChevronDown className="ml-2 text-text-secondary text-xs" />
              </Listbox.Button>

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
                  className={`absolute z-20 w-full bg-surface border border-border rounded-md shadow-lg 
                  max-h-64 overflow-auto scrollbar-hover ${openUp ? "bottom-full mb-1" : "mt-1"}`}
                  static
                >
                  {/* 🔍 Search box - sticky at top */}
                  <div className="sticky top-0 z-10 bg-surface border-b border-border p-2 flex items-center gap-2">
                    <FaSearch className="text-text-secondary text-xs shrink-0" />
                    <input
                      type="text"
                      value={query}
                      onChange={handleQueryChange}
                      placeholder={searchPlaceholder}
                      className="w-full text-sm bg-transparent outline-none text-text-primary placeholder-text-secondary"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {filteredOptions.length > 0 && (
                      <span className="text-xs text-text-secondary bg-gray-100 px-2 py-1 rounded-full shrink-0">
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
                            const isSelected = value === opt.value;
                            return (
                              <div
                                className={`cursor-pointer px-3 py-2 text-sm flex items-center justify-between rounded-md transition-all
                                  ${isSelected ? "btn-primary shadow-none!"
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
            </div>
          );
        }}
      </Listbox>
    </div>
  );
}