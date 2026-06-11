import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Upload, X, Loader2, Eye, Layout } from 'lucide-react';
import Toast from '../../components/Toast';

export default function SiteSettings() {
  const { token } = useAuth();
  
  const [siteName, setSiteName] = useState('Antigravity');
  const [logoUrl, setLogoUrl] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const triggerToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  // Fetch current site settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/superadmin/settings/site', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load site configurations.');
      
      const data = await response.json();
      if (data.siteName) setSiteName(data.siteName);
      if (data.logoUrl) setLogoUrl(data.logoUrl);
    } catch (err) {
      console.error(err);
      triggerToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  // Handle dropped files
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  // Handle selected file via input
  const handleFileSelect = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  // Upload logo image file to server
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('logo', file);

    setUploadingLogo(true);
    try {
      const response = await fetch('/api/superadmin/settings/logo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload logo.');

      setLogoUrl(data.logoUrl);
      triggerToast('Site branding logo updated successfully.');
    } catch (err) {
      triggerToast(err.message, 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Remove current logo url
  const handleRemoveLogo = async () => {
    if (!window.confirm('Are you sure you want to remove the logo? site name text brand will be shown as fallback.')) return;
    
    setLogoUrl('');
    triggerToast('Logo removed from draft. Save site settings to persist.', 'info');
  };

  // Save text settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!siteName.trim()) {
      triggerToast('Site brand name is required.', 'error');
      return;
    }

    setSavingSettings(true);
    try {
      const response = await fetch('/api/superadmin/settings/site', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ siteName, logoUrl })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save site settings.');

      triggerToast('Site branding configurations saved successfully.');
    } catch (err) {
      triggerToast(err.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* Header Panel */}
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold text-slate-100">Site Settings</h2>
        <p className="text-sm text-slate-400">Configure public application branding, site name, and login page assets.</p>
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-24 flex flex-col justify-center items-center shadow-lg">
          <Loader2 className="w-10 h-10 text-gold animate-spin mb-4" />
          <p className="text-slate-400 text-sm font-semibold tracking-wider">Loading settings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Settings form panel */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
            <h3 className="font-semibold text-slate-200 border-b border-slate-800 pb-2 flex items-center space-x-2">
              <Layout size={16} className="text-gold" />
              <span>Branding Assets</span>
            </h3>

            {/* Logo Upload Area */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">Branding Logo Asset</label>
              
              {logoUrl ? (
                // Current Logo Preview & Actions
                <div className="border border-slate-850 rounded-xl p-4 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 max-w-[200px] flex items-center justify-center">
                    <img src={logoUrl} alt="Logo Preview" className="h-12 object-contain" />
                  </div>
                  <div className="flex space-x-2.5">
                    <label 
                      htmlFor="logoReplace" 
                      className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Change Logo
                    </label>
                    <input 
                      id="logoReplace" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileSelect} 
                      className="hidden" 
                    />
                    <button 
                      onClick={handleRemoveLogo}
                      className="bg-red-950/30 hover:bg-red-950/50 text-red-400 border border-red-900/40 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Remove Logo
                    </button>
                  </div>
                </div>
              ) : (
                // Drag and Drop Zone
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all ${
                    isDragActive 
                      ? 'border-gold bg-gold/5' 
                      : 'border-slate-800 bg-slate-950/20 hover:border-slate-700'
                  }`}
                >
                  {uploadingLogo ? (
                    <Loader2 className="w-10 h-10 text-gold animate-spin mb-3" />
                  ) : (
                    <Upload className="w-10 h-10 text-slate-500 mb-3" />
                  )}
                  <p className="text-xs text-slate-300 font-semibold mb-1">
                    Drag and drop your logo file here, or{' '}
                    <label htmlFor="logoInput" className="text-gold hover:underline cursor-pointer">browse files</label>
                  </p>
                  <p className="text-[10px] text-slate-500">Supports JPG, PNG, WEBP. Max size 5MB.</p>
                  
                  <input 
                    id="logoInput" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    disabled={uploadingLogo}
                  />
                </div>
              )}
            </div>

            {/* Text details form */}
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Site Brand Name</label>
                <input 
                  type="text" 
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Antigravity Suite"
                  disabled={savingSettings}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold transition-all" 
                />
              </div>

              <button 
                type="submit" 
                disabled={savingSettings}
                className="bg-gold hover:bg-gold-hover text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow disabled:opacity-50"
              >
                {savingSettings ? <Loader2 size={12} className="animate-spin" /> : null}
                <span>Save Site Settings</span>
              </button>
            </form>
          </div>

          {/* Live mock preview panel */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
              <Eye size={12} className="text-gold" />
              <span>Login Page branding Preview</span>
            </h4>
            
            <div className="bg-slate-950 border border-slate-900 rounded-xl p-8 flex flex-col justify-center items-center shadow-inner relative overflow-hidden h-[330px] border-dashed border-2 border-slate-800">
              
              {/* Radial background highlight */}
              <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-gold/5 blur-[50px] pointer-events-none" />
              
              {/* Branding Block */}
              <div className="text-center mb-6 z-10 w-full flex flex-col items-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-10 object-contain mb-2 max-w-[80%]" />
                ) : (
                  <h1 className="text-2xl font-black tracking-widest text-gold font-mono truncate max-w-full uppercase">
                    {siteName}
                  </h1>
                )}
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mt-1">
                  Legal Practice Management
                </p>
              </div>

              {/* Login form mock mockup */}
              <div className="w-full max-w-[240px] bg-white rounded-lg shadow p-4 border border-slate-200 z-10 scale-95 select-none pointer-events-none">
                <div className="flex justify-center space-x-1 mb-3">
                  <span className="text-[7px] font-bold uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">SA</span>
                  <span className="text-[7px] font-bold uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">ADV</span>
                  <span className="text-[7px] font-bold uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">MUN</span>
                </div>
                <div className="h-2 w-12 bg-slate-800 rounded mx-auto mb-4" />
                <div className="space-y-2">
                  <div className="h-1.5 w-8 bg-slate-400 rounded" />
                  <div className="h-6 w-full bg-slate-100 rounded border border-slate-200" />
                  <div className="h-1.5 w-8 bg-slate-400 rounded" />
                  <div className="h-6 w-full bg-slate-100 rounded border border-slate-200" />
                </div>
                <div className="h-6 w-full bg-gold rounded mt-3 shadow flex items-center justify-center">
                  <div className="h-1.5 w-16 bg-slate-950 rounded" />
                </div>
              </div>

              <div className="absolute bottom-2 text-center text-[8px] text-slate-600 tracking-wider">
                Mockup Preview (Not Interactive)
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Toast Alert Portal */}
      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage(null)} 
      />

    </div>
  );
}
