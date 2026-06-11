import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';

// SuperAdmin Pages
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SuperAdminAdvocates from './pages/superadmin/SuperAdminAdvocates';
import SuperAdminFinance from './pages/superadmin/SuperAdminFinance';
import SiteSettings from './pages/superadmin/SiteSettings';

// Advocate Pages
import AdvocateDashboard from './pages/advocate/AdvocateDashboard';
import AdvocateClients from './pages/advocate/AdvocateClients';
import AdvocateCases from './pages/advocate/AdvocateCases';
import AdvocateMunshis from './pages/advocate/AdvocateMunshis';

// Munshi Pages
import MunshiDashboard from './pages/munshi/MunshiDashboard';
import MunshiClients from './pages/munshi/MunshiClients';
import MunshiCases from './pages/munshi/MunshiCases';

// Shared Pages
import AccountSettings from './pages/shared/AccountSettings';

import { Loader2 } from 'lucide-react';

// Protected Route Guard: Restricts routing access based on auth status and roles
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <Loader2 className="w-10 h-10 text-gold animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase">Loading Portal...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect wrong role pages to their own correct portal home
    if (user.role === 'SUPERADMIN') return <Navigate to="/superadmin/dashboard" replace />;
    if (user.role === 'ADVOCATE') return <Navigate to="/advocate/dashboard" replace />;
    if (user.role === 'MUNSHI') return <Navigate to="/munshi/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Guard: Redirects active sessions away from auth forms
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <Loader2 className="w-10 h-10 text-gold animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase">Loading Portal...</p>
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === 'SUPERADMIN') return <Navigate to="/superadmin/dashboard" replace />;
    if (user.role === 'ADVOCATE') return <Navigate to="/advocate/dashboard" replace />;
    if (user.role === 'MUNSHI') return <Navigate to="/munshi/dashboard" replace />;
  }

  return children;
};

// Root Redirect Helper
const HomeRedirect = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <Loader2 className="w-10 h-10 text-gold animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase">Loading Portal...</p>
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === 'SUPERADMIN') return <Navigate to="/superadmin/dashboard" replace />;
    if (user.role === 'ADVOCATE') return <Navigate to="/advocate/dashboard" replace />;
    if (user.role === 'MUNSHI') return <Navigate to="/munshi/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Forms */}
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />

          {/* 1. SUPERADMIN Dashboard Scope */}
          <Route path="/superadmin" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="advocates" element={<SuperAdminAdvocates />} />
            <Route path="finance" element={<SuperAdminFinance />} />
            <Route path="settings" element={<SiteSettings />} />
            <Route path="account" element={<AccountSettings />} />
          </Route>

          {/* 2. ADVOCATE Dashboard Scope */}
          <Route path="/advocate" element={
            <ProtectedRoute allowedRoles={['ADVOCATE']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/advocate/dashboard" replace />} />
            <Route path="dashboard" element={<AdvocateDashboard />} />
            <Route path="clients" element={<AdvocateClients />} />
            <Route path="cases" element={<AdvocateCases />} />
            <Route path="munshis" element={<AdvocateMunshis />} />
            <Route path="account" element={<AccountSettings />} />
          </Route>

          {/* 3. MUNSHI Dashboard Scope */}
          <Route path="/munshi" element={
            <ProtectedRoute allowedRoles={['MUNSHI']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/munshi/dashboard" replace />} />
            <Route path="dashboard" element={<MunshiDashboard />} />
            <Route path="clients" element={<MunshiClients />} />
            <Route path="cases" element={<MunshiCases />} />
            <Route path="account" element={<AccountSettings />} />
          </Route>

          {/* Root & Fallback Redirections */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
