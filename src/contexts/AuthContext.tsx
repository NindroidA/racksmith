import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import config from '../config/env';
import { AuthContextType, User } from '../types/contexts';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Provider Component.
 * Manages user authentication state and persists to localStorage.
 * 
 * DEV MODE (VITE_RELEASE=dev): Bypasses authentication with mock data
 * PROD MODE (VITE_RELEASE=prod): Enforces real authentication via API
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* Initialize Auth State from Storage */
  useEffect(() => {
    const initAuth = async () => {
      if (config.shouldBypassAuth()) {
        // DEV MODE: Load from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
      } else {
        // PROD MODE: Verify token with API
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const response = await fetch(`${config.apiUrl}/auth/me`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              setUser(data.data.user);
            } else {
              // Invalid token, clear storage
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          } catch (error) {
            console.error('Auth verification failed:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  /* Authentication Methods */
  /**
   * Login user
   * DEV MODE: Auto-login with mock data
   * PROD MODE: API authentication
   */
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (config.shouldBypassAuth()) {
        // DEV MODE: Mock authentication
        const mockUser: User = {
          id: '1',
          email: email || 'demo@racksmith.com',
          name: email?.split('@')[0] || 'Demo User'
        };
        setUser(mockUser);
        localStorage.setItem('user', JSON.stringify(mockUser));
      } else {
        // PROD MODE: Real API call
        const response = await fetch(`${config.apiUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Login failed');
        }

        const data = await response.json();
        setUser(data.data.user);
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user
   * DEV MODE: Auto-register with mock data
   * PROD MODE: API registration
   */
  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      if (config.shouldBypassAuth()) {
        // DEV MODE: Mock registration
        const mockUser = { id: Date.now().toString(), email, name };
        setUser(mockUser);
        localStorage.setItem('user', JSON.stringify(mockUser));
      } else {
        // PROD MODE: Real API call
        const response = await fetch(`${config.apiUrl}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, name }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Registration failed');
        }

        const data = await response.json();
        setUser(data.data.user);
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout current user and clear storage.
   */
  const logout = async () => {
    if (config.isProd()) {
      // PROD MODE: Call logout endpoint
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await fetch(`${config.apiUrl}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        } catch (error) {
          console.error('Logout API call failed:', error);
        }
      }
    }
    
    // Clear local state and storage
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
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