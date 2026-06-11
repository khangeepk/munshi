import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Loader2, Camera } from 'lucide-react';
import Toast from '../../components/Toast';

export default function AccountSettings() {
  const { user, setUser, token } = useAuth();
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  // Details state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const triggerToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  // Calculate password strength
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-800', width: 'w-0' };
    
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    switch (score) {
      case 0:
      case 1:
        return { score, label: 'Weak', color: 'bg-red-500', width: 'w-1/4' };
      case 2:
      case 3:
        return { score, label: 'Medium', color: 'bg-amber-500', width: 'w-2/3' };
      case 4:
      default:
        return { score, label: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
    }
  };

  const pwdStrength = getPasswordStrength(newPassword);

  // Handle profile detail updates (SuperAdmin only, read-only/disabled for others)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      triggerToast('Only administrators can update account information on this page.', 'error');
      return;
    }
    if (!name.trim() || !email.trim()) {
      triggerToast('Name and email are required.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const response = await fetch('/api/superadmin/settings/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile details.');
      
      setUser(data.user);
      triggerToast('Profile information saved successfully.');
    } catch (err) {
      triggerToast(err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle profile image file uploads
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!isSuperAdmin) {
      triggerToast('Profile picture changes are restricted to SuperAdmin in this configuration.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('profilePicture', file);

    setUploadingImage(true);
    try {
      const response = await fetch('/api/superadmin/settings/profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload image file.');

      setUser(data.user);
      triggerToast('Profile picture updated successfully.');
    } catch (err) {
      triggerToast(err.message, 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle password change submissions
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      triggerToast('Please complete all password fields.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast('New passwords do not match.', 'error');
      return;
    }
    if (pwdStrength.score < 2) {
      triggerToast('New password is too weak. Please use a stronger combination.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to change password.');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      triggerToast('Password updated successfully.');
    } catch (err) {
      triggerToast(err.message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* Header Panel */}
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold text-slate-100">Account Settings</h2>
        <p className="text-sm text-slate-400">Manage your profile, email address, and credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card & Upload Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center text-center">
          <div className="relative group cursor-pointer w-28 h-28 mb-4">
            {user?.profilePicture ? (
              <img 
                src={user.profilePicture} 
                alt="Profile" 
                className="w-28 h-28 rounded-full object-cover border-2 border-gold shadow-md"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-slate-850 border-2 border-gold flex items-center justify-center font-bold text-gold text-4xl shadow-inner">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            
            {/* Upload Hover Overlay */}
            {isSuperAdmin && (
              <label 
                htmlFor="pictureInput" 
                className="absolute inset-0 bg-slate-950/70 rounded-full flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold text-gold uppercase tracking-wider space-y-1"
              >
                {uploadingImage ? (
                  <Loader2 size={16} className="animate-spin text-gold" />
                ) : (
                  <>
                    <Camera size={16} className="text-gold" />
                    <span>Upload</span>
                  </>
                )}
              </label>
            )}
            
            {isSuperAdmin && (
              <input 
                id="pictureInput" 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                className="hidden" 
                disabled={uploadingImage}
              />
            )}
          </div>

          <h3 className="font-bold text-slate-200 text-lg">{user?.name}</h3>
          <p className="text-slate-400 text-xs mt-0.5">{user?.email}</p>
          <span className="inline-block bg-gold/10 text-gold text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 mt-3 rounded-full border border-gold/30">
            {user?.role}
          </span>
          <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-mono">
            Registered: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}
          </p>
        </div>

        {/* Form Panel */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-8">
          
          {/* Subsection 1: Profile Details */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h4 className="font-semibold text-slate-200 border-b border-slate-800 pb-2">Profile Details</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={savingProfile || !isSuperAdmin}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold transition-all disabled:opacity-60 disabled:cursor-not-allowed" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={savingProfile || !isSuperAdmin}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold transition-all disabled:opacity-60 disabled:cursor-not-allowed" 
                />
              </div>
            </div>
            
            {isSuperAdmin ? (
              <button 
                type="submit" 
                disabled={savingProfile}
                className="bg-gold hover:bg-gold-hover text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow disabled:opacity-50"
              >
                {savingProfile ? <Loader2 size={12} className="animate-spin" /> : null}
                <span>Save Profile</span>
              </button>
            ) : (
              <p className="text-[10px] text-slate-500 font-mono mt-1">Profile editing is only available for SuperAdmin accounts.</p>
            )}
          </form>

          {/* Separator */}
          <div className="border-t border-slate-800" />

          {/* Subsection 2: Change Password */}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <h4 className="font-semibold text-slate-200 border-b border-slate-800 pb-2">Change Password</h4>
            
            <div className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={savingPassword}
                    className="w-full pl-4 pr-11 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold transition-all" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 focus:outline-none"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">New Password</label>
                  <div className="relative">
                    <input 
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={savingPassword}
                      className="w-full pl-4 pr-11 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold transition-all" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 focus:outline-none"
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  
                  {/* Strength Bar */}
                  {newPassword && (
                    <div className="mt-2 space-y-1 animate-fade-in">
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${pwdStrength.color} ${pwdStrength.width}`} />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider font-mono text-slate-400">
                        Strength: <span className={pwdStrength.score >= 3 ? 'text-emerald-400' : pwdStrength.score === 2 ? 'text-amber-400' : 'text-red-400'}>{pwdStrength.label}</span>
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Confirm New Password</label>
                  <div className="relative">
                    <input 
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={savingPassword}
                      className="w-full pl-4 pr-11 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold transition-all" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 focus:outline-none"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={savingPassword}
              className="bg-gold hover:bg-gold-hover text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow disabled:opacity-50"
            >
              {savingPassword ? <Loader2 size={12} className="animate-spin" /> : null}
              <span>Change Password</span>
            </button>
          </form>

        </div>

      </div>

      {/* Reusable Toast Alert Component */}
      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage(null)} 
      />

    </div>
  );
}
