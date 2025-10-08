import { createContext, HTMLAttributes, ReactNode, useContext, useState } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(true);
  const toggle = () => setIsOpen(!isOpen);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within SidebarProvider');
  return context;
};

export const Sidebar = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col h-full ${className}`} {...props}>{children}</div>
);

export const SidebarHeader = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`px-4 py-2 ${className}`} {...props} />
);

export const SidebarContent = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex-1 overflow-auto ${className}`} {...props} />
);

export const SidebarGroup = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`${className}`} {...props} />
);

export const SidebarGroupContent = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`${className}`} {...props} />
);

export const SidebarMenu = ({ className = '', ...props }: HTMLAttributes<HTMLUListElement>) => (
  <ul className={`space-y-1 ${className}`} {...props} />
);

export const SidebarMenuItem = ({ className = '', ...props }: HTMLAttributes<HTMLLIElement>) => (
  <li className={`${className}`} {...props} />
);

export const SidebarMenuButton = ({ className = '', asChild, children, ...props }: HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => {
  if (asChild) return <>{children}</>;
  return <button className={`w-full text-left ${className}`} {...props}>{children}</button>;
};