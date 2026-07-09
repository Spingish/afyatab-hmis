'use client';
import { useState, useEffect } from 'react';
import { patientAPI } from '../../lib/api';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({
    first_name:'', last_name:'', gender:'Male',
    phone:'', national_id:'', date_of_birth:'',
    county_id:39, allergies:'None',
    kin_name:'', kin_phone:''
  });
  const [msg, setMsg] = useState('');

  const load = () => {
    patientAPI.getAll().then(r => setPatients(r.data.patients)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) { load(); return; }
    const r = await patientAPI.search(q);
    setPatients(r.data.patients);
  };

  const handleSubmit = async () => {
    try {
      const r = await patientAPI.create(form);
      setMsg(`✅ Patient ${r.data.patient_no} registered successfully`);
      setShowForm(false);
      setForm({ first_name:'', last_name:'', gender:'Male', phone:'', national_id:'', date_of_birth:'', county_id:39, allergies:'None', kin_name:'', kin_phone:'' });
      load();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.message || err.response?.data?.error || 'Error registering patient'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this patient?')) return;
    await patientAPI.delete(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Patient Register</h1>
          <p className="text-gray-500 text-sm">{patients.length} patients found</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Register Patient
        </button>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {/* Registration Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="font-bold mb-4">New Patient Registration</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label:'First Name *',   key:'first_name',   type:'text' },
              { label:'Last Name *',    key:'last_name',    type:'text' },
              { label:'Phone *',        key:'phone',        type:'tel'  },
              { label:'National ID',    key:'national_id',  type:'text' },
              { label:'Date of Birth',  key:'date_of_birth',type:'date' },
              { label:'Next of Kin',    key:'kin_name',     type:'text' },
              { label:'Kin Phone',      key:'kin_phone',    type:'tel'  },
              { label:'Allergies',      key:'allergies',    type:'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.label}</label>
                <input type={f.type} value={form[f.key]}
                  onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Gender *</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Register Patient
            </button>
            <button onClick={() => setShowForm(false)}
              className="border border-gray-300 px-6 py-2 rounded-lg text-sm font-medium hover:border-blue-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-4">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-3">
          <input type="text" placeholder="Search by name, phone, ID or patient number..."
            value={search} onChange={e => handleSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading patients...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  {['Patient No','Name','Gender','Phone','National ID','County','Allergies','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No patients found</td></tr>
                ) : patients.map(p => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-semibold text-blue-600">{p.patient_no}</td>
                    <td className="px-4 py-3 font-medium">{p.first_name} {p.last_name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.gender}</td>
                    <td className="px-4 py-3">{p.phone}</td>
                    <td className="px-4 py-3 text-gray-500">{p.national_id || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.county_name || '—'}</td>
                    <td className="px-4 py-3">
                      {p.allergies && p.allergies !== 'None' ? (
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">{p.allergies}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-blue-700">View</button>
                        <button onClick={() => handleDelete(p.id)} className="bg-red-500 text-white text-xs px-3 py-1 rounded-lg hover:bg-red-600">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}