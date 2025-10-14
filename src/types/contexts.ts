// ===== AuthContext ===== //
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}


// ===== SidebarContext ===== //
export interface SidebarContextType {
  menuSidebarOpen: boolean;
  setMenuSidebarOpen: (open: boolean) => void;
}