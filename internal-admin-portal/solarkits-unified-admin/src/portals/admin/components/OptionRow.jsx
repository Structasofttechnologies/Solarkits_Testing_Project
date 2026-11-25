// components/optimized-dropdown/OptionRow.jsx
import { Listbox } from "@headlessui/react";
import { FaCheck } from "react-icons/fa";

const OptionRow = ({ index, style, data }) => {
  const { filteredOptions, selectedValue, multiple } = data;
  const opt = filteredOptions[index];
  
  return (
    <Listbox.Option key={opt.value} value={opt.value}>
      {({ active, selected }) => (
        <div
          style={style}
          className={`cursor-pointer px-3 py-2 text-sm flex items-center justify-between transition-all
            ${multiple && selectedValue?.includes(opt.value) ? "bg-primary text-white"
              : !multiple && selectedValue === opt.value ? "bg-primary text-white"
              : active ? "bg-surface-hover text-text-primary"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          }`}
        >
          <span className="truncate flex-1">{opt.text}</span>
          {(multiple ? selectedValue?.includes(opt.value) : selectedValue === opt.value) && 
            <FaCheck className="text-xs ml-2 shrink-0" />
          }
        </div>
      )}
    </Listbox.Option>
  );
};

export default OptionRow;