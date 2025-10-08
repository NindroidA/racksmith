import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// App pages
import Dashboard from './pages/Dashboard';
import DeviceLibrary from './pages/DeviceLibrary';
import DeviceOptions from './pages/DeviceOptions';
import DevicePorts from './pages/DevicePorts';
import FloorPlan from './pages/FloorPlan';
import NetworkTools from './pages/NetworkTools';
import RackBuilder from './pages/RackBuilder';
import RackDetails from './pages/RackDetails';
import Racks from './pages/Racks';
import SavedNetworkPlans from './pages/SavedNetworkPlans';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes with Layout */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="racks" element={<Racks />} />
            <Route path="racks/new" element={<RackBuilder />} />
            <Route path="racks/:id/edit" element={<RackBuilder />} />
            <Route path="racks/:id" element={<RackDetails />} />
            <Route path="devices/library" element={<DeviceLibrary />} />
            <Route path="devices/options" element={<DeviceOptions />} />
            <Route path="devices/:id/ports" element={<DevicePorts />} />
            <Route path="network/floor-plan" element={<FloorPlan />} />
            <Route path="network/tools" element={<NetworkTools />} />
            <Route path="network/plans" element={<SavedNetworkPlans />} />
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;