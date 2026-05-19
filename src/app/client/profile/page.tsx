'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, CreditCard, Save, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

type Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  cnic: string | null;
  fatherName: string | null;
  createdAt: string;
  updatedAt: string;
};

function Field({ label, icon: Icon, value }: { label: string; icon: React.ElementType; value: string | null }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
        <Icon className="w-4 h-4" style={{ color: '#1E3A5F' }} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Edit form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    fetch('/api/client/profile', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else {
          setProfile(d.profile);
          setName(d.profile.name ?? '');
          setPhone(d.profile.phone ?? '');
          setWhatsapp(d.profile.whatsapp ?? '');
          setAddress(d.profile.address ?? '');
          setCity(d.profile.city ?? '');
        }
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!name.trim() || name.length < 2) {
      alert('Name must be at least 2 characters');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/client/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, whatsapp, address, city }),
      });
      const d = await r.json();
      if (d.error) {
        alert(d.error);
      } else {
        setProfile(prev => prev ? { ...prev, ...d.profile } : d.profile);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1E3A5F' }} />
        <p className="text-sm text-gray-500">Loading profile…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl p-6 flex items-center gap-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-800">Unable to load profile</p>
          <p className="text-sm text-red-600 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F2240' }}>My Profile</h1>
          <p className="text-sm text-gray-500 mt-1">View and update your contact details</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Saved!
          </div>
        )}
      </div>

      {/* Avatar / Name */}
      <div className="bg-white rounded-2xl p-6 flex items-center gap-5" style={{ border: '1px solid #E5E7EB' }}>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1E3A5F, #0F2240)', color: '#D4AF37' }}
        >
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">{profile.name}</p>
          <p className="text-sm text-gray-500">{profile.email ?? 'No email on file'}</p>
          <p className="text-xs text-gray-400 mt-1">Client since {new Date(profile.createdAt).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {!editing ? (
        <>
          {/* Read-only fields */}
          <div className="bg-white rounded-2xl p-5 space-y-3" style={{ border: '1px solid #E5E7EB' }}>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Contact Information</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Full Name" icon={User} value={profile.name} />
              <Field label="Email Address" icon={Mail} value={profile.email} />
              <Field label="Phone Number" icon={Phone} value={profile.phone} />
              <Field label="WhatsApp" icon={Phone} value={profile.whatsapp} />
              <Field label="City" icon={MapPin} value={profile.city} />
              <Field label="CNIC" icon={CreditCard} value={profile.cnic} />
            </div>
            {profile.address && (
              <Field label="Address" icon={MapPin} value={profile.address} />
            )}
            {profile.fatherName && (
              <Field label="Father's Name" icon={User} value={profile.fatherName} />
            )}
          </div>

          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: '#1E3A5F' }}
          >
            <User className="w-4 h-4" />
            Edit Contact Details
          </button>
        </>
      ) : (
        /* Edit Form */
        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #E5E7EB' }}>
          <h2 className="text-sm font-semibold text-gray-700 mb-5">Edit Contact Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: 'Full Name *', value: name, onChange: setName, type: 'text' },
              { label: 'Phone Number *', value: phone, onChange: setPhone, type: 'tel' },
              { label: 'WhatsApp Number', value: whatsapp, onChange: setWhatsapp, type: 'tel' },
              { label: 'City', value: city, onChange: setCity, type: 'text' },
            ].map(({ label, value, onChange, type }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': '#1E3A5F' } as React.CSSProperties}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Address</label>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 resize-none"
                style={{ '--tw-ring-color': '#1E3A5F' } as React.CSSProperties}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: '#1E3A5F' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
