import { forwardRef, InputHTMLAttributes } from 'react';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        className={`glass-input flex h-11 w-full rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
