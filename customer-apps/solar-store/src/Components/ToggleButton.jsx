const ToggleButton = ({ checked, onChange, label, disabled = false, description, gradient = false }) => {
  return (
    <label className={`flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          className="sr-only"
          disabled={disabled}
        />
        <div
          className={`block w-14 h-8 rounded-full transition-all duration-300 ${disabled ? 'bg-surface-hover' : (checked
            ? (gradient ? "gradient-primary" : "bg-primary")
            : "bg-text-muted")}`}
        ></div>
        <div
          className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${checked ? 'transform translate-x-6' : ''}`}
        ></div>
      </div>
      {label && (
        <div className="ml-3">
          <div className="text-text-primary font-medium">{label}</div>
          {description && <p className="text-xs text-text-secondary">{description}</p>}
        </div>
      )}
    </label>
  );
};

export default ToggleButton;