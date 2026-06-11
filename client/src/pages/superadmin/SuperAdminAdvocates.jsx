import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Plus, Eye, Edit2, 
  Trash2, Play, Pause, ExternalLink, X, Loader2, AlertTriangle, RefreshCw
} from 'lucide-react';

export default function SuperAdminAdvocates() {
  const { token, impersonate } = useAuth();
  const navigate = useNavigate();

  // Core Page States
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Sheets State
  const [activeModal, setActiveModal] = useState(null); // 'ADD', 'EDIT', 'VIEW', 'CONFIRM_PAUSE', 'CONFIRM_ACTIVATE', 'CONFIRM_DELETE'
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Form Management hooks
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  // Fetch Advocate records
  const fetchAdvocates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/superadmin/advocates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to load advocate portals.');
      const data = await response.json();
      setAdvocates(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvocates();
  }, [token]);

  // Status mapping helper
  const getAdvocateStatus = (adv) => {
    if (!adv.isActive) return 'DELETED';
    if (adv.portal?.subscriptionStatus === 'PAUSED') return 'PAUSED';
    
    // Check if advocate portal has any pending payments
    const hasPending = adv.payments?.some(p => p.status === 'PENDING');
    if (hasPending) return 'PAYMENT_DUE';
    return 'ACTIVE';
  };

  // Onboard new Advocate account + portal settings
  const handleAddAdvocate = async (formData) => {
    setModalError(null);
    setModalSubmitting(true);
    try {
      const response = await fetch('/api/superadmin/advocates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to onboard advocate.');
      
      await fetchAdvocates();
      setActiveModal(null);
      reset();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Edit Advocate details
  const handleEditAdvocate = async (formData) => {
    setModalError(null);
    setModalSubmitting(true);
    try {
      const response = await fetch(`/api/superadmin/advocates/${selectedAdvocate.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          portalName: formData.portalName,
          monthlyFee: formData.monthlyFee,
          password: formData.password || undefined // Only update if typed
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update advocate details.');
      
      await fetchAdvocates();
      setActiveModal(null);
      reset();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Pause or Reactivate advocate Portal subscription
  const handleToggleSubscription = async (advocate) => {
    setModalSubmitting(true);
    const isPaused = advocate.portal?.subscriptionStatus === 'PAUSED';
    const action = isPaused ? 'activate' : 'pause';
    try {
      const response = await fetch(`/api/superadmin/advocates/${advocate.id}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} portal.`);
      }
      await fetchAdvocates();
      setActiveModal(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Soft Delete Advocate account
  const handleDeleteAdvocate = async (advocateId) => {
    setModalSubmitting(true);
    try {
      const response = await fetch(`/api/superadmin/advocates/${advocateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to soft delete advocate.');
      }
      await fetchAdvocates();
      setActiveModal(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Access advocate portal as administrator (Bypass Impersonate)
  const handleAccessPortal = async (advocate) => {
    try {
      const response = await fetch(`/api/superadmin/advocates/${advocate.id}/access-token`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to generate bypass token.');
      const data = await response.json();
      
      // Call AuthContext impersonation hook
      await impersonate(data.token);
      
      // Redirect to Advocate dashboard area
      navigate('/advocate/dashboard');
    } catch (err) {
      alert(err.message);
    }
  };

  // Trigger Edit Modal form pre-population
  const triggerEditModal = (adv) => {
    setSelectedAdvocate(adv);
    setValue('name', adv.name);
    setValue('email', adv.email);
    setValue('portalName', adv.portal?.portalName || '');
    setValue('monthlyFee', adv.portal?.monthlyFee || 0);
    setValue('password', '');
    setModalError(null);
    setActiveModal('EDIT');
  };

  // Trigger View Details panel (loads relational database objects)
  const triggerViewModal = async (adv) => {
    setSelectedAdvocate(adv);
    setActiveModal('VIEW');
    try {
      const response = await fetch(`/api/superadmin/advocates/${adv.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedAdvocate(data);
      }
    } catch (err) {
      console.error('Failed to fetch detailed profile information');
    }
  };

  // Search & Filter routing
  const filteredAdvocates = advocates.filter(adv => {
    const matchesSearch = 
      adv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adv.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (adv.portal?.portalName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const status = getAdvocateStatus(adv);
    const matchesFilter = statusFilter === 'ALL' || status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* Header bar actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Manage Advocates</h2>
          <p className="text-sm text-slate-400">Onboard new advocate portals, adjust subscription billing, and view billing details.</p>
        </div>
        <button 
          onClick={() => {
            reset();
            setModalError(null);
            setActiveModal('ADD');
          }}
          className="bg-gold hover:bg-gold-hover text-slate-950 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md"
        >
          <Plus size={18} />
          <span>Add New Advocate</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Advocates</p>
          <p className="text-2xl font-extrabold text-slate-200 mt-1">{advocates.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Portals</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">
            {advocates.filter(a => getAdvocateStatus(a) === 'ACTIVE').length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Paused Portals</p>
          <p className="text-2xl font-extrabold text-red-400 mt-1">
            {advocates.filter(a => getAdvocateStatus(a) === 'PAUSED').length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Payment Due</p>
          <p className="text-2xl font-extrabold text-amber-400 mt-1">
            {advocates.filter(a => getAdvocateStatus(a) === 'PAYMENT_DUE').length}
          </p>
        </div>
      </div>

      {/* Table search & filters */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by name, email, or portal name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-gold transition-all"
          />
        </div>
        {/* Status Dropdowns */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-gold w-full md:w-48 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="PAYMENT_DUE">Payment Due</option>
            <option value="DELETED">Deactivated</option>
          </select>
          <button 
            onClick={fetchAdvocates}
            className="p-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Refresh database"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Main Advocates Grid */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 flex flex-col justify-center items-center shadow-lg">
          <Loader2 className="w-8 h-8 text-gold animate-spin mb-3" />
          <p className="text-slate-400 text-sm font-semibold tracking-wider">Syncing Portal Registrations...</p>
        </div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-800/60 p-6 rounded-xl text-center text-red-400 text-sm">
          ⚠️ {error}
        </div>
      ) : filteredAdvocates.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center text-slate-400 text-sm shadow-lg">
          No advocate records found matching requirements.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-955 border-b border-slate-800 text-slate-400 font-semibold tracking-wider uppercase text-[11px]">
                  <th className="px-6 py-4">Advocate Details</th>
                  <th className="px-6 py-4">Portal Name</th>
                  <th className="px-6 py-4">Monthly Fee</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Next Payment Due</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAdvocates.map((adv) => {
                  const status = getAdvocateStatus(adv);
                  return (
                    <tr key={adv.id} className="hover:bg-slate-850/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-200">{adv.name}</div>
                        <div className="text-xs text-slate-500">{adv.email}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-medium">{adv.portal?.portalName || '-'}</td>
                      <td className="px-6 py-4 text-slate-300 font-mono">${adv.portal?.monthlyFee.toFixed(2) || '0.00'}</td>
                      <td className="px-6 py-4">
                        {status === 'ACTIVE' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-xs uppercase tracking-wider">
                            Active
                          </span>
                        )}
                        {status === 'PAUSED' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 font-bold text-xs uppercase tracking-wider">
                            Paused
                          </span>
                        )}
                        {status === 'PAYMENT_DUE' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-xs uppercase tracking-wider">
                            Payment Due
                          </span>
                        )}
                        {status === 'DELETED' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/30 font-bold text-xs uppercase tracking-wider">
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                        {adv.portal?.nextPaymentDue ? new Date(adv.portal.nextPaymentDue).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <button 
                          onClick={() => triggerViewModal(adv)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-all cursor-pointer"
                          title="View Invoices & Clerks"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => triggerEditModal(adv)}
                          className="p-1.5 text-slate-400 hover:text-gold hover:bg-slate-800 rounded transition-all cursor-pointer"
                          title="Edit Portal Fee / Info"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedAdvocate(adv);
                            setActiveModal(status === 'PAUSED' ? 'CONFIRM_ACTIVATE' : 'CONFIRM_PAUSE');
                          }}
                          className={`p-1.5 rounded transition-all cursor-pointer ${
                            status === 'PAUSED' 
                              ? 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/20' 
                              : 'text-amber-500 hover:text-amber-400 hover:bg-amber-950/20'
                          }`}
                          title={status === 'PAUSED' ? 'Activate Subscription' : 'Pause Subscription'}
                        >
                          {status === 'PAUSED' ? <Play size={16} /> : <Pause size={16} />}
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedAdvocate(adv);
                            setActiveModal('CONFIRM_DELETE');
                          }}
                          className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-950/20 rounded transition-all cursor-pointer"
                          title="Deactivate Account (Soft Delete)"
                        >
                          <Trash2 size={16} />
                        </button>
                        {status !== 'DELETED' && (
                          <button 
                            onClick={() => handleAccessPortal(adv)}
                            className="p-1.5 text-gold hover:text-gold-hover hover:bg-gold/10 rounded transition-all cursor-pointer animate-pulse"
                            title="Access Portal (Impersonate)"
                          >
                            <ExternalLink size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. ADD ADVOCATE MODAL FORM */}
      {/* ========================================================= */}
      {activeModal === 'ADD' && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-850 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-slate-200 mb-6">Onboard Advocate Portal</h3>

            {modalError && (
              <div className="bg-red-950/20 border border-red-800 text-red-400 px-4 py-2.5 rounded-lg mb-4 text-xs font-medium">
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit(handleAddAdvocate)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Advocate Name</label>
                <input 
                  type="text" 
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold"
                  placeholder="Senior Advocate Malik"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  {...register('email', { required: 'Email is required' })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold"
                  placeholder="malik@chambers.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Initial Account Password</label>
                <input 
                  type="password" 
                  {...register('password', { required: 'Password is required' })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold"
                  placeholder="••••••••"
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Portal Name</label>
                <input 
                  type="text" 
                  {...register('portalName', { required: 'Portal Name is required' })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold"
                  placeholder="Malik Chambers"
                />
                {errors.portalName && <p className="text-red-500 text-xs mt-1">{errors.portalName.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Monthly Subscription Fee ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  defaultValue="20.00"
                  {...register('monthlyFee', { required: 'Monthly Fee is required' })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold font-mono"
                />
                {errors.monthlyFee && <p className="text-red-500 text-xs mt-1">{errors.monthlyFee.message}</p>}
              </div>

              <button 
                type="submit" 
                disabled={modalSubmitting}
                className="w-full bg-gold hover:bg-gold-hover text-slate-950 font-bold py-2.5 rounded-lg text-sm mt-4 flex justify-center items-center space-x-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {modalSubmitting ? <Loader2 size={16} className="animate-spin" /> : <span>Onboard Advocate</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. EDIT ADVOCATE MODAL FORM */}
      {/* ========================================================= */}
      {activeModal === 'EDIT' && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-850 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-slate-200 mb-6">Edit Advocate Settings</h3>

            {modalError && (
              <div className="bg-red-950/20 border border-red-800 text-red-400 px-4 py-2.5 rounded-lg mb-4 text-xs font-medium">
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit(handleEditAdvocate)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Advocate Name</label>
                <input 
                  type="text" 
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  {...register('email', { required: 'Email is required' })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Change Password (Optional)</label>
                <input 
                  type="password" 
                  {...register('password')}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold"
                  placeholder="Leave blank to keep current"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Portal Name</label>
                <input 
                  type="text" 
                  {...register('portalName', { required: 'Portal Name is required' })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold"
                />
                {errors.portalName && <p className="text-red-500 text-xs mt-1">{errors.portalName.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Monthly SaaS Fee ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  {...register('monthlyFee', { required: 'Monthly Fee is required' })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold font-mono"
                />
                {errors.monthlyFee && <p className="text-red-500 text-xs mt-1">{errors.monthlyFee.message}</p>}
              </div>

              <button 
                type="submit" 
                disabled={modalSubmitting}
                className="w-full bg-gold hover:bg-gold-hover text-slate-950 font-bold py-2.5 rounded-lg text-sm mt-4 flex justify-center items-center space-x-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {modalSubmitting ? <Loader2 size={16} className="animate-spin" /> : <span>Update Advocate</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. VIEW DETAILS DRAWER */}
      {/* ========================================================= */}
      {activeModal === 'VIEW' && selectedAdvocate && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-850 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-slate-800">
              <div className="w-14 h-14 rounded-full bg-slate-800 border border-gold flex items-center justify-center font-bold text-gold text-xl shadow select-none">
                {selectedAdvocate.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-250">{selectedAdvocate.name}</h3>
                <p className="text-slate-400 text-sm">{selectedAdvocate.email}</p>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-850 text-slate-400 border border-slate-700">
                    Advocate Portal
                  </span>
                  <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                    selectedAdvocate.portal?.subscriptionStatus === 'ACTIVE' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}>
                    {selectedAdvocate.portal?.subscriptionStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Portal Specifications</h4>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2 text-sm text-slate-300">
                  <p><span className="text-slate-500 text-xs">Portal Name:</span> <span className="font-semibold text-slate-200">{selectedAdvocate.portal?.portalName}</span></p>
                  <p><span className="text-slate-500 text-xs">Monthly Billing:</span> <span className="font-mono text-gold">${selectedAdvocate.portal?.monthlyFee.toFixed(2)}</span></p>
                  <p><span className="text-slate-500 text-xs">Next Due Date:</span> <span className="font-mono text-slate-400">{selectedAdvocate.portal?.nextPaymentDue ? new Date(selectedAdvocate.portal.nextPaymentDue).toLocaleDateString() : '-'}</span></p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Munshi Clerks Onboarded</h4>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-sm max-h-[108px] overflow-y-auto">
                  {!selectedAdvocate.munshis || selectedAdvocate.munshis.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-4">No assistants onboarded.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {selectedAdvocate.munshis.map(m => (
                        <li key={m.id} className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-350">{m.munshi?.name}</span>
                          <span className={`px-1.5 rounded-full text-[9px] font-bold ${
                            m.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {m.isActive ? 'Active' : 'Locked'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Subscription Invoice Logs</h4>
              <div className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow">
                {!selectedAdvocate.payments || selectedAdvocate.payments.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-8">No invoice history available.</p>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-850 text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
                        <th className="px-4 py-2.5">Due Date</th>
                        <th className="px-4 py-2.5">Amount</th>
                        <th className="px-4 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {selectedAdvocate.payments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-900/40">
                          <td className="px-4 py-2.5 font-mono">{new Date(p.dueDate).toLocaleDateString()}</td>
                          <td className="px-4 py-2.5 font-mono text-gold">${p.amount.toFixed(2)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider ${
                              p.status === 'PAID' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. CONFIRM PAUSE PORTAL */}
      {/* ========================================================= */}
      {activeModal === 'CONFIRM_PAUSE' && selectedAdvocate && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-lg font-bold text-slate-200 mb-2">Pause Portal Subscription?</h3>
            <p className="text-slate-400 text-sm mb-6">
              You are about to pause the portal for <span className="font-semibold text-slate-350">{selectedAdvocate.name}</span>.<br />
              This will lock advocate access and automatically deactivate all linked Munshi clerk accounts.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setActiveModal(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2 rounded-lg text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleToggleSubscription(selectedAdvocate)}
                disabled={modalSubmitting}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded-lg text-sm transition-colors flex justify-center items-center cursor-pointer disabled:opacity-50"
              >
                {modalSubmitting ? <Loader2 size={16} className="animate-spin" /> : <span>Confirm Pause</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. CONFIRM ACTIVATE PORTAL */}
      {/* ========================================================= */}
      {activeModal === 'CONFIRM_ACTIVATE' && selectedAdvocate && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
            <Play className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-bold text-slate-200 mb-2">Reactivate Portal Subscription?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Reactivate the portal for <span className="font-semibold text-slate-350">{selectedAdvocate.name}</span>.<br />
              This will restore portal access for the advocate and enable linked Munshi clerk accounts.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setActiveModal(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2 rounded-lg text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleToggleSubscription(selectedAdvocate)}
                disabled={modalSubmitting}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg text-sm transition-colors flex justify-center items-center cursor-pointer disabled:opacity-50"
              >
                {modalSubmitting ? <Loader2 size={16} className="animate-spin" /> : <span>Confirm Activate</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. CONFIRM DELETE MODAL (SOFT DELETE) */}
      {/* ========================================================= */}
      {activeModal === 'CONFIRM_DELETE' && selectedAdvocate && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-200 mb-2">Deactivate Advocate Account?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Are you sure you want to deactivate <span className="font-semibold text-slate-350">{selectedAdvocate.name}</span>?<br />
              This soft-deletes the advocate account (sets isActive = false) blocking logins permanently.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setActiveModal(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2 rounded-lg text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteAdvocate(selectedAdvocate.id)}
                disabled={modalSubmitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-sm transition-colors flex justify-center items-center cursor-pointer disabled:opacity-50"
              >
                {modalSubmitting ? <Loader2 size={16} className="animate-spin" /> : <span>Confirm Deactivate</span>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
