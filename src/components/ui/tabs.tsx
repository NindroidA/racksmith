import * as React from 'react';

const Tabs = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={className} {...props}>{children}</div>
);

const TabsList = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`inline-flex items-center justify-center rounded-lg glass p-1 ${className}`} {...props}>
    {children}
  </div>
);

const TabsTrigger = ({ 
  className = '', 
  active = false,
  children, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${
      active 
        ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white shadow-sm' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

const TabsContent = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={className} {...props}>{children}</div>
);

export { Tabs, TabsContent, TabsList, TabsTrigger };
