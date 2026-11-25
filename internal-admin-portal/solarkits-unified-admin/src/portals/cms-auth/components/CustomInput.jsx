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

  // --- TEXTAREA SUPPORT ---
  if (type === "textarea") {
    return (
      <div className={`flex flex-col w-full ${className}`}>
        {label && (
          <label htmlFor={name} className={`text-text-primary mb-1.5 font-semibold text-sm ${labelClassName}`}>
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
          className={`border-2 border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary bg-surface text-text-primary disabled:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-200 hover:border-primary/40 ${inputClassName}`}
        />
      </div>
    );
  }

  // --- NORMAL INPUT ---
  if (type !== "radio" && type !== "checkbox") {
    return (
      <div className={`flex flex-col w-full ${className}`}>
        {label && (
          <label htmlFor={name} className={`text-text-primary mb-1.5 font-semibold text-sm ${labelClassName}`}>
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-text-secondary pointer-events-none z-10">
              {icon}
            </div>
          )}
          {prefix && (
            <div className={`absolute text-text-secondary pointer-events-none font-bold text-sm z-10 ${icon ? "left-10" : "left-4"}`}>
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
            className={`w-full border-2 border-border rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary bg-surface text-text-primary disabled:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-primary/40 ${
              icon && prefix ? "pl-20 pr-4" : 
              icon ? "pl-11 pr-4" : 
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
        {label && <p className={`text-text-primary mb-1.5 font-semibold text-sm ${labelClassName}`}>{label}</p>}
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
                  flex items-center justify-center w-5 h-5 border-2 rounded-md transition-all duration-200
                  ${isChecked 
                    ? "gradient-primary border-primary text-white shadow-sm shadow-primary/20" 
                    : "border-border text-transparent bg-surface group-hover:border-primary/50"
                  }
                  ${disabled ? "opacity-60" : ""}
                `}>
                  {isChecked && <span className="text-xs">✓</span>}
                </div>
                <span className={`
                  text-sm transition-colors font-medium
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
      {label && <p className={`text-text-primary mb-1.5 font-semibold text-sm ${labelClassName}`}>{label}</p>}
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => {
          const isChecked = checked?.includes(opt.value) || value === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex items-center gap-2 cursor-pointer transition-colors ${
                isChecked ? "text-primary" : "text-text-secondary"
              } ${disabled ? "cursor-not-allowed text-text-secondary" : ""}`}
            >
              <input
                type={type}
                name={name}
                value={opt.value}
                checked={isChecked}
                onChange={onChange}
                disabled={disabled}
                className={`w-4 h-4 accent-primary ${
                  disabled ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              />
              <span className="font-medium text-sm">{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}