const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'bg-surface-hover hover:bg-surface text-text-primary border-1 border-border',
    outline: 'bg-transparent text-primary dark:text-info border-1 border-primary dark:border-info hover:bg-gradient-to-r from-primary to-primary-end hover:text-text-inverse',
    danger: 'btn-danger',
    success: 'btn-success',
    warning: 'btn-warning',
    ghost: 'bg-transparent hover:bg-surface-hover text-primary dark:text-info',
    link: 'bg-transparent text-primary dark:text-info hover:text-primary-hover dark:hover:text-info/80 underline-offset-4 hover:underline p-0',
  };

  const disabledClasses = 'disabled:opacity-90 disabled:cursor-not-allowed';
  const widthClass = fullWidth ? 'w-full' : '';

  const combinedClasses = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    disabledClasses,
    widthClass,
    className,
  ].join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={combinedClasses}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      <span className="relative z-10">{loading ? 'Processing...' : children}</span>
      {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;