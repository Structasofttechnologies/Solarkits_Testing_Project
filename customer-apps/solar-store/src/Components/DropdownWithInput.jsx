// components/optimized-dropdown/DropdownWithInput.jsx
import { Fragment, useState, useRef, useLayoutEffect, useMemo, useCallback, useEffect } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { FaChevronDown, FaCheck, FaPlus } from "react-icons/fa";
import CustomInput from "./CustomInput";
import IconButton from "./IconButton";

export default function DropdownWithInput({
  label,
  value,
  onChange,
  options: initialOptions,
  className = "w-56",
  disabled = false
}) {
  const [options, setOptions] = useState(initialOptions);
  const [newOption, setNewOption] = useState("");
  const [openUp, setOpenUp] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const buttonRef = useRef(null);
  const optionsRef = useRef(null);
  const observerRef = useRef(null);
  const loadingRef = useRef(null);

  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions]);
  
  const selectedOption = useMemo(() => 
    options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => options, [options]);

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

  const handleAddOption = useCallback(() => {
    if (!newOption.trim()) return;
    const newItem = { value: newOption.toLowerCase(), text: newOption };
    setOptions((prev) => [...prev, newItem]);
    onChange(newItem.value);
    setNewOption("");
    setVisibleCount(30);
  }, [newOption, onChange]);

  const handleAfterLeave = useCallback(() => {
    setNewOption("");
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
      {label && <label className="text-text-primary mb-1">{label}</label>}

      <Listbox value={value} onChange={onChange}>
        {({ open }) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          useLayoutEffect(() => {
            if (open && buttonRef.current) {
              const rect = buttonRef.current.getBoundingClientRect();
              const spaceBelow = window.innerHeight - rect.bottom;
              setOpenUp(spaceBelow < 280);
            }
          }, [open]);

          return (
            <div className="relative">
              <Listbox.Button
                ref={buttonRef}
                className={`relative w-full border border-border rounded-md px-3 py-2 text-sm 
              text-left flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring
              bg-surface hover:bg-surface-hover transition ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                disabled={disabled}
              >
                <span className={`truncate ${selectedOption ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {selectedOption ? selectedOption.text : "Select or add new"}
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
                  className={`absolute z-20 w-full bg-surface border border-border rounded-md shadow-lg 
                  max-h-60 overflow-auto scrollbar-hover ${openUp ? "bottom-full mb-1" : "mt-1"}`}
                  static
                >
                  <div className="sticky top-0 bg-surface flex items-center gap-2 p-2 border-b border-border w-full overflow-x-hidden">
                    <CustomInput
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Add new option"
                    />
                    <IconButton onClick={handleAddOption} size="sm" className="shrink-0">
                      <FaPlus />
                    </IconButton>
                  </div>

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
                                <span>{opt.text}</span>
                                {isSelected && <FaCheck className="text-xs ml-2" />}
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