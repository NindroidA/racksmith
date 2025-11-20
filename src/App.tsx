import { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { PageSkeleton } from './components/ui/loading-skeletons';
import { AuthProvider } from './contexts/AuthContext';
import { SidebarProvider } from './contexts/SidebarContext';

/* Auth Pages - Not lazy loaded (needed immediately) */
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

/* Lazy-loaded App Pages for code splitting */
const ActivityHistory = lazy(() => import('./pages/ActivityHistory'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DeviceLibrary = lazy(() => import('./pages/DeviceLibrary'));
const DeviceOptions = lazy(() => import('./pages/DeviceOptions'));
const DevicePorts = lazy(() => import('./pages/DevicePorts'));
const FloorPlan = lazy(() => import('./pages/FloorPlan'));
const NetworkTools = lazy(() => import('./pages/NetworkTools'));
const NotFound = lazy(() => import('./pages/NotFound'));
const RackBuilder = lazy(() => import('./pages/RackBuilder'));
const RackDetails = lazy(() => import('./pages/RackDetails'));
const Racks = lazy(() => import('./pages/Racks'));
const SavedNetworkPlans = lazy(() => import('./pages/SavedNetworkPlans'));
const UserProfile = lazy(() => import('./pages/UserProfile'));

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SidebarProvider>
          {/* Toast Notifications */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(20, 25, 35, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                color: 'white',
              },
              success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
              error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
            }}
          />
          
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes with Layout */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense>} />
              <Route path="racks" element={<Suspense fallback={<PageSkeleton />}><Racks /></Suspense>} />
              <Route path="racks/new" element={<Suspense fallback={<PageSkeleton />}><RackBuilder /></Suspense>} />
              <Route path="racks/:id/edit" element={<Suspense fallback={<PageSkeleton />}><RackBuilder /></Suspense>} />
              <Route path="racks/:id" element={<Suspense fallback={<PageSkeleton />}><RackDetails /></Suspense>} />
              <Route path="devices/library" element={<Suspense fallback={<PageSkeleton />}><DeviceLibrary /></Suspense>} />
              <Route path="devices/options" element={<Suspense fallback={<PageSkeleton />}><DeviceOptions /></Suspense>} />
              <Route path="devices/:id/ports" element={<Suspense fallback={<PageSkeleton />}><DevicePorts /></Suspense>} />
              <Route path="network/floor-plan" element={<Suspense fallback={<PageSkeleton />}><FloorPlan /></Suspense>} />
              <Route path="network/tools" element={<Suspense fallback={<PageSkeleton />}><NetworkTools /></Suspense>} />
              <Route path="network/plans" element={<Suspense fallback={<PageSkeleton />}><SavedNetworkPlans /></Suspense>} />
              <Route path="profile" element={<Suspense fallback={<PageSkeleton />}><UserProfile /></Suspense>} />
              <Route path="activity" element={<Suspense fallback={<PageSkeleton />}><ActivityHistory /></Suspense>} />
            </Route>
            
            {/* 404 Fallback */}
            <Route path="*" element={<Suspense fallback={<PageSkeleton />}><NotFound /></Suspense>} />
          </Routes>
        </SidebarProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;