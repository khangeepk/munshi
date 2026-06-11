import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [siteName, setSiteName] = useState('ANTIGRAVITY');
  
  const [apiError, setApiError] = useState(null);
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
  const [loginSuccessRole, setLoginSuccessRole] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm();

  // Attempt to load settings (branding logo, site name), fallback to text ANTIGRAVITY on failure
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/superadmin/settings/site');
        if (response.ok) {
          const data = await response.json();
          if (data.logoUrl) setLogoUrl(data.logoUrl);
          if (data.siteName) setSiteName(data.siteName);
        }
      } catch (err) {
        console.error('Branding fetch failed:', err);
      }
    };
    fetchSettings();
  }, []);

  const onSubmit = async (formData) => {
    setApiError(null);
    setIsSubmittingLocal(true);
    try {
      const authResult = await login(formData.email, formData.password);
      
      // Briefly show role badge success overlay
      setLoginSuccessRole(authResult.loginAs);
      
      setTimeout(() => {
        // Redirect based on user role
        if (authResult.role === 'SUPERADMIN') {
          navigate('/superadmin/dashboard');
        } else if (authResult.role === 'ADVOCATE') {
          navigate('/advocate/dashboard');
        } else if (authResult.role === 'MUNSHI') {
          navigate('/munshi/dashboard');
        }
      }, 1500);
    } catch (err) {
      setIsSubmittingLocal(false);
      
      // Standardized error handlers
      if (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
        setApiError('Connection failed. Try again.');
      } else if (err.message === 'Invalid email or password.' || err.message === 'Invalid credentials') {
        setApiError('Invalid credentials');
      } else {
        setApiError(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center py-12 px-4 select-none relative overflow-hidden">
      
      {/* Premium background radial highlights */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />

      {/* Main card section */}
      <div className="w-full flex-1 flex flex-col justify-center items-center max-w-md">
        
        {/* Briefly Show Role Badge success overlay */}
        {loginSuccessRole && (
          <div className="fixed inset-0 bg-slate-950/90 z-50 flex flex-col justify-center items-center animate-fade-in">
            <div className="bg-slate-900 border border-gold/40 p-8 rounded-xl text-center shadow-2xl pulse-gold max-w-sm mx-4">
              <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold flex items-center justify-center text-gold text-2xl mx-auto mb-4 animate-scale-in">
                ⚖️
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">Access Granted</h3>
              <p className="text-slate-400 text-sm mb-4">Redirecting you to the portal...</p>
              <span className="inline-block px-4 py-1.5 rounded-full bg-gold text-slate-950 font-bold text-sm tracking-wide shadow-md">
                Logged in as {loginSuccessRole}
              </span>
            </div>
          </div>
        )}

        {/* Logo and Tagline branding */}
        <div className="text-center mb-8 animate-fade-in">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-16 object-contain mb-3" />
          ) : (
            <h1 className="text-4xl font-extrabold tracking-widest text-gold drop-shadow-md font-mono">
              {siteName.toUpperCase()}
            </h1>
          )}
          <p className="text-slate-400 uppercase tracking-widest text-xs font-semibold mt-1.5 opacity-80">
            Legal Practice Management
          </p>
        </div>

        {/* Center white form card */}
        <div className="w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-200/80 animate-scale-in relative">
          
          {/* Card Header badges */}
          <div className="flex justify-center space-x-2.5 mb-8">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
              SuperAdmin
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
              Advocate
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
              Munshi
            </span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 text-center mb-6">
            Sign In
          </h2>

          {/* Error Banner */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2.5 mb-5 text-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1 font-medium">{apiError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase text-slate-500 mb-1.5 tracking-wider">
                Email Address
              </label>
              <input
                id="email"
                type="text"
                {...register('email', { 
                  required: 'Email address is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-gold'} rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold focus:bg-white transition-all text-sm`}
                placeholder="advocate@example.com"
                disabled={isSubmittingLocal}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase text-slate-500 mb-1.5 tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: 'Password is required' })}
                  className={`w-full pl-4 pr-11 py-2.5 bg-slate-50 border ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-gold'} rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold focus:bg-white transition-all text-sm`}
                  placeholder="••••••••"
                  disabled={isSubmittingLocal}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors"
                  disabled={isSubmittingLocal}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Gold Action Button */}
            <button
              type="submit"
              disabled={isSubmittingLocal}
              className="w-full bg-gold hover:bg-gold-hover text-slate-950 font-bold py-2.5 px-4 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 flex items-center justify-center space-x-2 text-sm shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmittingLocal ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In to Portal</span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Powered by label */}
      <div className="text-center mt-8 text-xs text-slate-500 tracking-wider">
        <span className="opacity-80">Powered by </span>
        <span className="font-bold text-gold opacity-90">Antigravity</span>
      </div>
    </div>
  );
}
