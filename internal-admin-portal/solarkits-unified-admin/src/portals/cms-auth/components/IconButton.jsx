const IconButton = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) => {
  const baseStyles = 'transition-all duration-300 flex items-center justify-center cursor-pointer focus-ring';

  const sizeStyles = {
    sm: 'p-2 text-sm rounded-lg',
    md: 'p-3 text-base rounded-xl',
    lg: 'p-4 text-lg rounded-2xl',
  };
  
  const variantStyles = {
    primary: `
      bg-linear-to-br from-primary to-primary-end text-white
      shadow-md hover:shadow-lg hover:from-primary/90 hover:to-primary-end/90
    `,
    secondary: `
      bg-linear-to-br from-secondary to-[#fbbf24] text-text-primary
      shadow-md hover:shadow-lg hover:from-secondary/90 hover:to-[#fbbf24]/90
    `,
    'outline-primary': `
      bg-transparent border-2 border-primary text-primary
      hover:bg-primary/10 active:bg-primary/20
    `,
    'outline-secondary': `
      bg-transparent border-2 border-secondary text-text-primary
      hover:bg-secondary/10 active:bg-secondary/20
    `,
    ghost: `
      bg-transparent text-text-secondary hover:bg-surface-hover hover:text-primary active:bg-surface-hover/80
    `,
    danger: `
      bg-linear-to-br from-danger to-danger-hover text-white
      shadow-md hover:shadow-lg hover:from-danger/90 hover:to-danger-hover/90
    `,
  };

  const disabledStyles = `
    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100
    disabled:from-button-disabled disabled:to-button-disabled disabled:text-button-disabled-text
    disabled:border-button-disabled
  `;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${disabledStyles}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

export default IconButton;