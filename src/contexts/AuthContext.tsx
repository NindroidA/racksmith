import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AuthContextType, User } from '../types/contexts';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Provider Component.
 * Manages user authentication state and persists to localStorage.
 * Currently in DEV MODE with mock authentication.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* Initialize Auth State from Storage */
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  /* Authentication Methods */
  /**
   * Login user (DEV MODE: auto-login without backend).
   */
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // DEV MODE: Mock authentication
      const mockUser: User = {
        id: '1',
        email: email || 'demo@racksmith.com',
        name: email?.split('@')[0] || 'Demo User'
      };
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user (DEV MODE: auto-register without backend).
   */
  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      // DEV MODE: Mock registration
      const mockUser = { id: Date.now().toString(), email, name };
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout current user and clear storage.
   */
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context.
 * Must be used within an AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
};