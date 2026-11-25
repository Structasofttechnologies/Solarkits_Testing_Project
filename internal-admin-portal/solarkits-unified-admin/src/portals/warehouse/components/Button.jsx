import { AiOutlineLoading3Quarters } from "react-icons/ai";

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
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 cursor-pointer focus-ring active:scale-[0.98]';

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5',
  };

  const variantClasses = {
    primary: 'btn-primary text-white',
    secondary: 'bg-surface-hover hover:bg-surface text-text-primary border border-border hover:border-primary/30',
    outline: 'bg-transparent text-primary border border-primary/40 hover:bg-primary/5 hover:border-primary',
    danger: 'btn-danger text-white',
    success: 'btn-success text-white',
    warning: 'btn-warning text-white',
    ghost: 'bg-transparent hover:bg-surface-hover text-text-secondary hover:text-primary',
    link: 'bg-transparent text-primary hover:text-primary-hover underline-offset-4 hover:underline p-0',
  };

  const disabledClasses = 'disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none';
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
        <AiOutlineLoading3Quarters className="animate-spin -ml-1 mr-2.5 h-4 w-4" />
      )}
      {!loading && leftIcon && <span className="shrink-0 transition-transform duration-300">{leftIcon}</span>}
      <span className="relative z-10">{loading ? 'Processing...' : children}</span>
      {!loading && rightIcon && <span className="shrink-0 transition-transform duration-300">{rightIcon}</span>}
    </button>
  );
};

export default Button;