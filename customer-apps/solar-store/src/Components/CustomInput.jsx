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
  readOnly = false,
  min,
  max,
  minLength,
  maxLength,
  customCheckbox = false, // New prop for custom checkbox design
  ...rest
}) {

  // --- TEXTAREA SUPPORT ---
  if (type === "textarea") {
    return (
      <div className={`flex flex-col w-full ${className}`}>
        {label && (
          <label htmlFor={name} className="text-text-primary">
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
          readOnly={readOnly}
          rows={4}
          className={`border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-surface text-text-primary disabled:bg-surface-hover disabled:cursor-not-allowed resize-none ${
            readOnly ? "bg-surface-hover/70 cursor-not-allowed select-none opacity-90 focus:ring-0" : ""
          }`}
          {...rest}
        />
      </div>
    );
  }

  // --- NORMAL INPUT ---
  if (type !== "radio" && type !== "checkbox") {
    return (
      <div className={`flex flex-col w-full ${className}`}>
        {label && (
          <label htmlFor={name} className="text-text-primary mb-1 font-medium">
            {label}
          </label>
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
          readOnly={readOnly}
          className={`border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-surface text-text-primary disabled:bg-surface-hover disabled:cursor-not-allowed ${
            readOnly ? "bg-surface-hover/70 cursor-not-allowed select-none opacity-90 focus:ring-0" : ""
          }`}
          {...rest}
        />
      </div>
    );
  }

  // --- CUSTOM CHECKBOX DESIGN (with the exact styling you requested) ---
  if (type === "checkbox" && customCheckbox) {
    return (
      <div className={`flex flex-col w-full ${className}`}>
        {label && <p className="text-text-primary mb-1 font-medium">{label}</p>}
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
                {/* Custom checkbox with exact styling from your example */}
                <div className={`
                  flex items-center justify-center w-5 h-5 border rounded transition-all
                  ${isChecked 
                    ? "bg-gradient-to-r from-primary to-primary-end border-primary text-white" 
                    : "border-border text-transparent bg-surface group-hover:border-primary/50"
                  }
                  ${disabled ? "opacity-60" : ""}
                `}>
                  {isChecked && <span className="text-xs">✓</span>}
                </div>
                <span className={`
                  text-sm transition-colors
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
      {label && <p className="text-text-primary mb-1 font-medium">{label}</p>}
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
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}