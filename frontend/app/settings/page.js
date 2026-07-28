'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Settings() {
  const [form, setForm]       = useState({
    hospital_name: '', motto: '', logo_url: '',
    facility_code: '', county: '', sub_county: '', phone: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    axios.get('/api/settings/hospital')
      .then(r => { if (r.data.settings) setForm(f => ({ ...f, ...r.data.settings })); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put('/api/settings/hospital', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Could not save settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key:'hospital_name', label:'Hospital Name' },
    { key:'motto',         label:'Hospital Motto / Slogan' },
    { key:'logo_url',      label:'Hospital Logo (Image URL)' },
    { key:'facility_code', label:'Facility Code' },
    { key:'county',        label:'County' },
    { key:'sub_county',    label:'Sub-County' },
    { key:'phone',         label:'Phone' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Settings</h1>
        <p className="text-gray-500 text-sm">TibaMax HMIS system configuration</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-bold mb-1 text-black">Hospital Information</h2>
          <p className="text-xs text-gray-400 mb-4">Logo, name and motto shown in the sidebar come from here.</p>

          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : (
            <div className="space-y-4">
              {form.logo_url && (
                <div className="flex items-center gap-3 mb-2">
                  <img src={form.logo_url} alt="Logo preview"
                    className="w-14 h-14 rounded-xl object-cover border border-gray-200"
                    onError={e => { e.target.style.display = 'none'; }} />
                  <span className="text-xs text-gray-400">Logo preview</span>
                </div>
              )}
              {fields.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.label}</label>
                  <input type="text" value={form[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-500" />
                </div>
              ))}
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 mt-2 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saved && <span className="ml-3 text-sm text-emerald-600 font-medium">✓ Saved</span>}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-bold mb-4 text-black">System Settings</h2>
          <div className="space-y-3">
            {[
              { label:'Currency',             value:'KES (Kenyan Shilling)',  badge:'bg-green-100 text-green-700' },
              { label:'Auto Backup',          value:'Enabled',                badge:'bg-green-100 text-green-700' },
              { label:'MOH Reports',          value:'Enabled',                badge:'bg-green-100 text-green-700' },
              { label:'SMS Alerts',           value:'Pending Setup',          badge:'bg-yellow-100 text-yellow-700' },
              { label:'Insurance Integration',value:'NHIF',                   badge:'bg-blue-100 text-blue-700' },
              { label:'Database',             value:'PostgreSQL 18',          badge:'bg-blue-100 text-blue-700' },
              { label:'Backend',              value:'Node.js + Express',      badge:'bg-green-100 text-green-700' },
              { label:'Frontend',             value:'Next.js + Tailwind',     badge:'bg-violet-100 text-violet-700' },
              { label:'System Version',       value:'TibaMax HMIS v1.0.0',   badge:'bg-gray-100 text-gray-600' },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-black">{s.label}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.badge}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}