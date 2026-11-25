const ToggleButton = ({
  checked,
  isChecked,
  onChange,
  label,
  disabled = false,
  description,
  gradient = false
}) => {
  const active = Boolean(checked !== undefined ? checked : isChecked);

  return (
    <label className={`inline-flex items-center select-none ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <div className="relative inline-block">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => {
            if (!disabled && onChange) {
              onChange(e.target.checked);
            }
          }}
          className="sr-only"
          disabled={disabled}
        />
        {/* Track */}
        <div
          className={`block w-14 h-8 rounded-full transition-all duration-300 ease-in-out ${
            disabled
              ? 'bg-surface-hover border border-border'
              : active
              ? (gradient ? 'gradient-primary shadow-md shadow-primary/25' : 'bg-emerald-500 shadow-md shadow-emerald-500/25')
              : 'bg-slate-700/80 hover:bg-slate-700 border border-slate-600/40'
          }`}
        ></div>
        {/* Thumb */}
        <div
          className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ease-in-out shadow-md flex items-center justify-center ${
            active ? 'transform translate-x-6' : 'translate-x-0'
          }`}
        >
          {active ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          )}
        </div>
      </div>
      {label && (
        <div className="ml-3">
          <div className="text-text-primary font-medium text-sm">{label}</div>
          {description && <p className="text-xs text-text-secondary">{description}</p>}
        </div>
      )}
    </label>
  );
};

export default ToggleButton;