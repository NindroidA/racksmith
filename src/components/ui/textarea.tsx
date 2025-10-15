import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        className={`glass-input flex min-h-[100px] w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
export { Textarea };
