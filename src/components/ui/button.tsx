import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'gradient';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-white';
    
    const variants = {
      default: 'glass-button',
      outline: 'glass border-2 hover:bg-white/10',
      ghost: 'hover:bg-white/10',
      gradient: 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/50 hover:scale-105',
    };
    
    const sizes = {
      default: 'h-11 px-6 py-2 text-sm',
      sm: 'h-9 px-4 text-sm',
      lg: 'h-12 px-8 text-base',
      icon: 'h-11 w-11',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
export { Button };
