import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldAlert } from 'lucide-react';

const DashboardLayout = ({ title, role, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-bold tracking-wider text-gold">ANTIGRAVITY</span>
          <span className="text-xs uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono tracking-wider border border-slate-700">
            {role} Portal
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-semibold">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-gold" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-gold flex items-center justify-center font-bold text-gold">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <button 
            onClick={handleLogout} 
            className="flex items-center space-x-1.5 bg-red-950 hover:bg-red-900 text-red-200 hover:text-white px-3 py-1.5 rounded text-sm transition-colors border border-red-800/60"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-8 max-w-4xl mx-auto w-full flex flex-col justify-center items-center">
        <div className="bg-slate-950 border border-slate-800 p-8 rounded-lg shadow-xl text-center w-full max-w-lg animate-scale-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export const SuperAdminDashboard = () => (
  <DashboardLayout title="SuperAdmin Dashboard" role="SuperAdmin">
    <div className="w-16 h-16 rounded-full bg-slate-900 border border-gold flex items-center justify-center text-gold mx-auto mb-4 pulse-gold flex items-center">
      <ShieldAlert size={28} />
    </div>
    <h2 className="text-2xl font-bold text-gold mb-2">Welcome, SuperAdmin!</h2>
    <p className="text-slate-400 text-sm mb-6">You have successfully accessed the SaaS settings and tenant management portal.</p>
    <div className="bg-slate-900 p-4 rounded border border-slate-800 text-left text-xs font-mono text-slate-400">
      <p>Role Authorized: SUPERADMIN</p>
      <p>System Scope: GLOBAL WRITE/READ</p>
    </div>
  </DashboardLayout>
);

export const AdvocateDashboard = () => (
  <DashboardLayout title="Advocate Dashboard" role="Advocate">
    <div className="w-16 h-16 rounded-full bg-slate-900 border border-gold flex items-center justify-center text-gold text-2xl mx-auto mb-4 pulse-gold flex items-center">
      ⚖️
    </div>
    <h2 className="text-2xl font-bold text-gold mb-2">Welcome, Advocate!</h2>
    <p className="text-slate-400 text-sm mb-6">You have successfully accessed your legal practice management board.</p>
    <div className="bg-slate-900 p-4 rounded border border-slate-800 text-left text-xs font-mono text-slate-400">
      <p>Role Authorized: ADVOCATE</p>
      <p>System Scope: LAWYER PORTAL</p>
    </div>
  </DashboardLayout>
);

export const MunshiDashboard = () => (
  <DashboardLayout title="Munshi Dashboard" role="Munshi">
    <div className="w-16 h-16 rounded-full bg-slate-900 border border-gold flex items-center justify-center text-gold text-2xl mx-auto mb-4 pulse-gold flex items-center">
      📋
    </div>
    <h2 className="text-2xl font-bold text-gold mb-2">Welcome, Munshi!</h2>
    <p className="text-slate-400 text-sm mb-6">You have successfully accessed the assistant/clerk action panel.</p>
    <div className="bg-slate-900 p-4 rounded border border-slate-800 text-left text-xs font-mono text-slate-400">
      <p>Role Authorized: MUNSHI</p>
      <p>System Scope: DELEGATED ACCESS</p>
    </div>
  </DashboardLayout>
);
