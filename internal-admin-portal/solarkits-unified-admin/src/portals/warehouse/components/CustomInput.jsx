export default function CustomInput({
  name,
  label,
  placeholder,
  onChange,
  type = "text",
  value,
  checked,
  options = [],
  className = "",
  disabled = false,
  min,
  max,
  minLength,
  maxLength,
  customCheckbox = false,
  icon = null,
  prefix = null,
  labelClassName = "",
  inputClassName = ""
}) {

  const baseLabelClasses = "text-text-secondary mb-2 font-bold uppercase tracking-widest text-[10px]";
  const baseInputClasses = "w-full border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface text-text-primary placeholder:text-text-muted/60 disabled:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 hover:border-primary/40 shadow-xs focus:shadow-sm";

  // --- TEXTAREA SUPPORT ---
  if (type === "textarea") {
    return (
      <div className={`flex flex-col w-full ${className}`}>
        {label && (
          <label htmlFor={name} className={`${baseLabelClasses} ${labelClassName}`}>
            {label}
          </label>
        )}
        <textarea
          name={name}
          id={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          rows={4}
          className={`${baseInputClasses} resize-none ${inputClassName}`}
        />
      </div>
    );
  }

  // --- NORMAL INPUT ---
  if (type !== "radio" && type !== "checkbox") {
    return (
      <div className={`flex flex-col w-full ${className}`}>
        {label && (
          <label htmlFor={name} className={`${baseLabelClasses} ${labelClassName}`}>
            {label}
          </label>
        )}
        <div className="relative flex items-center group/input">
          {icon && (
            <div className="absolute left-4 text-text-secondary group-focus-within/input:text-primary transition-colors pointer-events-none z-10">
              {icon}
            </div>
          )}
          {prefix && (
            <div className={`absolute text-text-muted pointer-events-none font-black text-xs z-10 ${icon ? "left-11" : "left-4"}`}>
              {prefix}
            </div>
          )}
          <input
            type={type}
            name={name}
            id={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            minLength={minLength}
            maxLength={maxLength}
            disabled={disabled}
            className={`${baseInputClasses} ${
              icon && prefix ? "pl-20 pr-4" : 
              icon ? "pl-12 pr-4" : 
              prefix ? "pl-14 pr-4" : "px-4"
            } ${inputClassName}`}
          />
        </div>
      </div>
    );
  }

  // --- CUSTOM CHECKBOX DESIGN ---
  if (type === "checkbox" && customCheckbox) {
    return (
      <div className={`flex flex-col w-full ${className}`}>
        {label && <p className={`${baseLabelClasses} ${labelClassName}`}>{label}</p>}
        <div className="flex flex-col gap-3">
          {options.map((opt) => {
            const isChecked = checked?.includes(opt.value) || value === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-3 cursor-pointer group ${
                  disabled ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                <input
                  type="checkbox"
                  name={name}
                  value={opt.value}
                  checked={isChecked}
                  onChange={onChange}
                  disabled={disabled}
                  className="hidden"
                />
                <div className={`
                  flex items-center justify-center w-5 h-5 border rounded-lg transition-all duration-300
                  ${isChecked 
                    ? "bg-linear-to-br from-primary to-primary-end border-primary text-white shadow-md shadow-primary/20" 
                    : "border-border text-transparent bg-surface group-hover:border-primary/50 group-hover:shadow-sm"
                  }
                  ${disabled ? "opacity-60" : ""}
                `}>
                  {isChecked && <span className="text-[10px] font-black">✓</span>}
                </div>
                <span className={`
                  text-sm transition-colors font-semibold
                  ${isChecked ? "text-primary" : "text-text-secondary group-hover:text-text-primary"}
                  ${disabled ? "text-text-secondary" : ""}
                `}>
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // --- RADIO & DEFAULT CHECKBOX ---
  return (
    <div className={`flex flex-col w-full ${className}`}>
      {label && <p className={`${baseLabelClasses} ${labelClassName}`}>{label}</p>}
      <div className="flex flex-wrap gap-4">
        {options.map((opt) => {
          const isChecked = checked?.includes(opt.value) || value === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex items-center gap-2 cursor-pointer transition-all duration-300 group ${
                isChecked ? "text-primary" : "text-text-secondary"
              } ${disabled ? "cursor-not-allowed text-text-secondary" : "hover:text-text-primary"}`}
            >
              <input
                type={type}
                name={name}
                value={opt.value}
                checked={isChecked}
                onChange={onChange}
                disabled={disabled}
                className={`w-4 h-4 accent-primary transition-all duration-300 ${
                  disabled ? "cursor-not-allowed" : "cursor-pointer group-hover:scale-110"
                }`}
              />
              <span className="font-bold text-sm tracking-tight">{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}