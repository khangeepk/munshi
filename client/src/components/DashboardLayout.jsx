import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Menu, X, LayoutDashboard, Scale, CircleDollarSign, 
  Settings, Users, FolderOpen, Contact, User, ChevronDown, LogOut 
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout, stopImpersonating } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const hasAdminToken = localStorage.getItem('adminToken') !== null;

  const handleReturnToAdmin = async () => {
    const success = await stopImpersonating();
    if (success) {
      navigate('/superadmin/dashboard');
    }
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close sidebar drawer on route navigation (mobile screen)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper to dynamically resolve top title based on current active route
  const getPageTitle = (path) => {
    const p = path.toLowerCase();
    if (p.includes('/superadmin/advocates')) return 'Manage Advocates';
    if (p.includes('/superadmin/finance')) return 'Financial Overview';
    if (p.includes('/superadmin/settings')) return 'Site Settings';
    if (p.includes('/superadmin/dashboard') || p === '/superadmin' || p === '/superadmin/') return 'Dashboard Overview';
    
    if (p.includes('/advocate/clients')) return 'Clients Directory';
    if (p.includes('/advocate/cases')) return 'Case Files';
    if (p.includes('/advocate/munshis')) return 'Munshi Clerks';
    if (p.includes('/advocate/dashboard') || p === '/advocate' || p === '/advocate/') return 'Lawyer Dashboard';
    
    if (p.includes('/munshi/clients')) return 'Practice Clients';
    if (p.includes('/munshi/cases')) return 'Case Records';
    if (p.includes('/munshi/dashboard') || p === '/munshi' || p === '/munshi/') return 'Clerk Dashboard';
    
    if (p.includes('/account')) return 'Account Settings';
    return 'Dashboard';
  };

  // Configures Navigation Links based on user roles
  const getNavigation = (role) => {
    switch (role) {
      case 'SUPERADMIN':
        return [
          { name: 'Dashboard', path: '/superadmin/dashboard', exact: true, icon: <LayoutDashboard size={18} /> },
          { name: 'Advocates', path: '/superadmin/advocates', icon: <Scale size={18} /> },
          { name: 'Financial Overview', path: '/superadmin/finance', icon: <CircleDollarSign size={18} /> },
          { name: 'Site Settings', path: '/superadmin/settings', icon: <Settings size={18} /> },
          { name: 'Account Settings', path: '/superadmin/account', icon: <User size={18} /> },
        ];
      case 'ADVOCATE':
        return [
          { name: 'Dashboard', path: '/advocate/dashboard', exact: true, icon: <LayoutDashboard size={18} /> },
          { name: 'Clients', path: '/advocate/clients', icon: <Users size={18} /> },
          { name: 'Case Files', path: '/advocate/cases', icon: <FolderOpen size={18} /> },
          { name: 'Munshi Accounts', path: '/advocate/munshis', icon: <Contact size={18} /> },
          { name: 'Account Settings', path: '/advocate/account', icon: <User size={18} /> },
        ];
      case 'MUNSHI':
        return [
          { name: 'Dashboard', path: '/munshi/dashboard', exact: true, icon: <LayoutDashboard size={18} /> },
          { name: 'Clients', path: '/munshi/clients', icon: <Users size={18} /> },
          { name: 'Case Files', path: '/munshi/cases', icon: <FolderOpen size={18} /> },
          { name: 'Account Settings', path: '/munshi/account', icon: <User size={18} /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavigation(user?.role);

  // Styled pill elements for Role badges
  const getRoleBadgeClasses = (role) => {
    if (role === 'SUPERADMIN') return 'bg-gold/10 text-gold border border-gold/30';
    if (role === 'ADVOCATE') return 'bg-violet-500/10 text-violet-400 border border-violet-500/30';
    return 'bg-sky-500/10 text-sky-400 border border-sky-500/30';
  };

  const getRoleDisplayName = (role) => {
    if (role === 'SUPERADMIN') return 'SuperAdmin';
    if (role === 'ADVOCATE') return 'Advocate';
    return 'Munshi';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden">
      
      {/* Mobile Drawer Backdrop overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/70 z-30 transition-opacity md:hidden" 
        />
      )}

      {/* Sidebar Navigation Panel */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800/80 z-40 flex flex-col justify-between
        transform transition-transform duration-300 md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        <div className="flex flex-col">
          {/* Brand header */}
          <div className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xl font-black tracking-widest text-gold font-mono">ANTIGRAVITY</span>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-200 md:hidden hover:bg-slate-800 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Role-Specific Menu links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) => `
                  flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150
                  ${isActive 
                    ? 'bg-gold/10 text-gold border-l-4 border-gold pl-3' 
                    : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}
                `}
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer label */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-[10px] text-slate-500 tracking-wider text-center">
          Powered by <span className="font-bold text-gold opacity-90">Antigravity</span>
        </div>
      </aside>

      {/* Main page canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Impersonation Warning Banner */}
        {hasAdminToken && (
          <div className="bg-gold text-slate-950 px-6 py-2.5 flex justify-between items-center text-xs font-bold tracking-wider uppercase border-b border-gold-hover shadow-md z-30 select-none animate-fade-in">
            <span className="flex items-center space-x-2">
              <span className="animate-pulse">⚠️</span>
              <span>Impersonation Active: Viewing portal as {user?.name || 'Advocate'} ({user?.email})</span>
            </span>
            <button 
              onClick={handleReturnToAdmin}
              className="bg-slate-950 hover:bg-slate-900 text-gold px-3.5 py-1 rounded-md font-extrabold text-[10px] tracking-widest border border-gold/40 hover:border-gold transition-all cursor-pointer"
            >
              Return to Admin Mode
            </button>
          </div>
        )}

        {/* Top Header Bar */}
        <header className="h-16 bg-slate-900 border-b border-slate-800/80 px-6 flex justify-between items-center z-20">
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-200 md:hidden hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-200 tracking-wide">
              {getPageTitle(location.pathname)}
            </h2>
          </div>

          {/* User profile dropdown button */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-3 p-1 rounded-lg hover:bg-slate-850 transition-colors focus:outline-none cursor-pointer"
            >
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-gold" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-850 border border-gold flex items-center justify-center font-bold text-gold text-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="flex items-center space-x-1.5">
                  <p className="text-xs font-bold text-slate-250">{user?.name}</p>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${getRoleBadgeClasses(user?.role)}`}>
                    {getRoleDisplayName(user?.role)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{user?.email}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {/* Dropdown Menu Popup */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-30 animate-fade-in">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate(`/${user?.role.toLowerCase()}/account`);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-850 hover:text-slate-100 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <User size={16} />
                  <span>My Profile</span>
                </button>
                <div className="border-t border-slate-800 my-1" />
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-950/30 hover:text-red-300 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Nested Route Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
}
