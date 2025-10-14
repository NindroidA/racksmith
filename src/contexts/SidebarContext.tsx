import React, { createContext, useContext, useState } from 'react';
import { SidebarContextType } from '../types/contexts';

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

/**
 * Provider component for managing global sidebar state.
 * Allows components to access and control the main menu sidebar.
 */
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuSidebarOpen, setMenuSidebarOpen] = useState(true);

  return (
    <SidebarContext.Provider value={{ menuSidebarOpen, setMenuSidebarOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

/**
 * Hook to access sidebar state.
 * Must be used within a SidebarProvider.
 */
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  
  return context;
};
