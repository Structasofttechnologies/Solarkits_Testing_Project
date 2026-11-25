// components/optimized-dropdown/Dropdown.jsx
import { Fragment, useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Listbox, Transition, Portal } from "@headlessui/react";
import { FaChevronDown, FaCheck } from "react-icons/fa";

export default function Dropdown({
  label,
  value,
  onChange,
  options = [],
  className = "w-56",
  disabled = false,
  placeholder = "Select...",
  id,
}) {
  const [visibleCount, setVisibleCount] = useState(30);
  const buttonRef = useRef(null);
  const optionsRef = useRef(null);
  const observerRef = useRef(null);
  const loadingRef = useRef(null);

  const filteredOptions = useMemo(() => {
    const seen = new Set();
    return options.filter((opt) => {
      const key = String(opt.value ?? "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [options]);

  const selectedOption = useMemo(() => 
    options.find((opt) => opt.value === value),
    [options, value]
  );

  const visibleOptions = useMemo(() => {
    return filteredOptions.slice(0, visibleCount);
  }, [filteredOptions, visibleCount]);

  const hasMore = visibleCount < filteredOptions.length;

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

  const handleAfterLeave = useCallback(() => {
    setVisibleCount(30);
  }, []);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 10 && hasMore) {
      setVisibleCount(prev => Math.min(prev + 30, filteredOptions.length));
    }
  }, [hasMore, filteredOptions.length]);

  return (
    <div className={`w-full flex flex-col ${className}`}>
      {label && (
        <label htmlFor={id} className="text-text-primary font-medium mb-1">
          {label}
        </label>
      )}

      <Listbox value={value} onChange={onChange} disabled={disabled}>
        {({ open }) => (
          <div className="relative">
            <Listbox.Button
              ref={buttonRef}
              className={`relative w-full border-2 border-border rounded-xl px-4 py-3 text-sm 
              text-left flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary
              bg-surface hover:bg-surface-hover hover:border-primary/40 transition-all duration-200 ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <span className="truncate text-text-primary font-medium">
                {selectedOption ? selectedOption.text : <span className="text-text-muted">{placeholder}</span>}
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
                  className="z-[9999] w-[var(--button-width)] bg-surface border-2 border-border rounded-xl shadow-lg 
                  max-h-64 overflow-auto scrollbar-hover [--anchor-gap:8px]"
                  static
                >
                  {visibleOptions.length > 0 ? (
                    <div className="py-1">
                      {visibleOptions.map((opt) => (
                        <Listbox.Option key={opt.value} value={opt.value} disabled={opt.disabled}>
                          {({ active, disabled: optionDisabled }) => {
                            const isSelected = value === opt.value;
                            return (
                              <div
                                className={`px-3 py-2 text-sm flex items-center justify-between rounded-md transition-all
                                  ${optionDisabled ? "opacity-45 cursor-not-allowed text-text-disabled bg-surface-hover/30"
                                    : "cursor-pointer"
                                  }
                                  ${isSelected && !optionDisabled ? "btn-primary shadow-none!"
                                    : active && !optionDisabled ? "bg-surface-hover text-text-primary"
                                    : !isSelected && !optionDisabled ? "text-text-secondary hover:text-text-primary"
                                    : ""
                                  }`}
                              >
                                <span className="truncate flex-1">{opt.text}</span>
                                {isSelected && !optionDisabled && <FaCheck className="text-xs ml-2 shrink-0" />}
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