import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRouteProps } from '../types/components';

/**
 * Protected Route Wrapper Component.
 * Redirects to login if user is not authenticated.
 * Shows loading state while checking authentication.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  /* Loading State */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1117' }}>
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  /* Unauthenticated State - Redirect to Login */
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  /* Authenticated State - Render Content */
  return <>{children}</>;
}