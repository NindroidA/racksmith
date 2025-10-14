import { ChevronDown } from 'lucide-react';
import { forwardRef, ReactNode, SelectHTMLAttributes } from 'react';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', value, onValueChange, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          className={`flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-10 bg-transparent ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    );
  }
);

Select.displayName = 'Select';

const SelectTrigger = ({ children, className }: { children?: ReactNode; className?: string }) => null;
const SelectValue = ({ placeholder }: { placeholder?: string }) => null;
const SelectContent = ({ children, className }: { children: ReactNode; className?: string }) => <>{children}</>;
const SelectItem = ({ value, children, className = '' }: { value: string; children: ReactNode; className?: string }) => (
  <option value={value} className={className}>{children}</option>
);

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
