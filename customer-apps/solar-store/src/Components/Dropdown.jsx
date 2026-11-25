// components/optimized-dropdown/Dropdown.jsx
import { Fragment, useState, useRef, useLayoutEffect, useMemo, useCallback, useEffect } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { FaChevronDown, FaCheck } from "react-icons/fa";

export default function Dropdown({
  label,
  value,
  onChange,
  options = [],
  className = "w-56",
  disabled = false,
  placeholder = "Select...",
}) {
  const [openUp, setOpenUp] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const buttonRef = useRef(null);
  const optionsRef = useRef(null);
  const observerRef = useRef(null);
  const loadingRef = useRef(null);

  const filteredOptions = useMemo(() => options, [options]);

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
    <div className={`flex flex-col ${className}`}>
      {label && <label className="text-text-primary font-medium mb-1">{label}</label>}

      <Listbox value={value ?? ""} onChange={onChange} disabled={disabled}>
        {({ open }) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          useLayoutEffect(() => {
            if (open && buttonRef.current) {
              const rect = buttonRef.current.getBoundingClientRect();
              const spaceBelow = window.innerHeight - rect.bottom;
              setOpenUp(spaceBelow < 250);
            }
          }, [open]);

          return (
            <div className="relative">
              <Listbox.Button
                ref={buttonRef}
                className={`relative w-full border border-border rounded-md px-3 py-2 text-sm 
                text-left flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring bg-surface hover:bg-surface-hover transition ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                disabled={disabled}
              > 
                <span className={`truncate flex items-center ${selectedOption ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {selectedOption?.image && (
                    <img
                      src={selectedOption.image.startsWith("http") ? selectedOption.image : `http://localhost:5000${selectedOption.image}`}
                      alt=""
                      className="w-4 h-4 rounded-full object-contain mr-2 shrink-0"
                    />
                  )}
                  {selectedOption?.icon && (
                    <span className="mr-2 shrink-0 flex items-center">{selectedOption.icon}</span>
                  )}
                  {selectedOption ? selectedOption.text : placeholder}
                </span>
                <FaChevronDown className="ml-2 text-text-secondary text-xs" />
              </Listbox.Button>

              <Transition 
                as={Fragment} 
                leave="transition ease-in duration-50" 
                leaveFrom="opacity-50" 
                leaveTo="opacity-0"
                afterLeave={handleAfterLeave}
                show={open}
              >
                <Listbox.Options
                  ref={optionsRef}
                  onScroll={handleScroll}
                  className={`absolute z-50 w-full bg-surface border border-border rounded-md shadow-xl 
                  max-h-56 overflow-auto scrollbar-hover ${openUp ? "bottom-full mb-1" : "mt-1"}`}
                  static
                >
                  {visibleOptions.length > 0 ? (
                    <div className="py-1">
                      {visibleOptions.map((opt) => (
                        <Listbox.Option key={opt.value} value={opt.value}>
                          {({ active, selected }) => {
                            const isSelected = value === opt.value;
                            return (
                              <div
                                className={`cursor-pointer px-3 py-2 text-sm flex items-center justify-between rounded-md transition-all
                                  ${isSelected ? "btn-primary shadow-none!"
                                    : active ? "bg-surface-hover text-text-primary"
                                    : "text-text-secondary hover:text-text-primary"
                                  }`}
                              >
                                <span className="flex items-center truncate">
                                  {opt.image && (
                                    <img
                                      src={opt.image.startsWith("http") ? opt.image : `http://localhost:5000${opt.image}`}
                                      alt=""
                                      className="w-5 h-5 rounded-full object-contain mr-2 shrink-0"
                                    />
                                  )}
                                  {opt.icon && (
                                    <span className="mr-2 shrink-0 flex items-center">{opt.icon}</span>
                                  )}
                                  <span className="truncate">{opt.text}</span>
                                </span>
                                {isSelected && <FaCheck className="text-xs ml-2 shrink-0" />}
                              </div>
                            );
                          }}
                        </Listbox.Option>
                      ))}
                      
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
                      
                      {filteredOptions.length > 30 && (
                        <div className="sticky bottom-0 bg-surface/90 backdrop-blur-sm border-t border-border px-3 py-1 text-xs text-text-secondary text-center">
                          Showing {visibleOptions.length} of {filteredOptions.length} items
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-3 py-8 text-sm text-text-secondary text-center">
                      No options available
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