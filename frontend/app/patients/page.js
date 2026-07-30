'use client';
import { useState, useEffect } from 'react';
import { patientAPI } from '../../lib/api';
import { UserPlus, Search, X, Eye, Trash2, CircleCheck, CircleAlert } from 'lucide-react';

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
  const [msg, setMsg]     = useState('');
  const [msgOk, setMsgOk] = useState(true);

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
      setMsgOk(true);
      setMsg(`Patient ${r.data.patient_no} registered successfully`);
      setShowForm(false);
      setForm({ first_name:'', last_name:'', gender:'Male', phone:'', national_id:'', date_of_birth:'', county_id:39, allergies:'None', kin_name:'', kin_phone:'' });
      load();
    } catch (err) {
      setMsgOk(false);
      setMsg(err.response?.data?.message || err.response?.data?.error || 'Error registering patient');
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
          <h1 className="text-2xl font-bold text-slate-900">Patient Register</h1>
          <p className="text-slate-400 text-sm">{patients.length} patients found</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-800 transition-colors">
          {showForm ? <X size={16} /> : <UserPlus size={16} />}
          {showForm ? 'Cancel' : 'Register Patient'}
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 text-sm ${msgOk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msgOk ? <CircleCheck size={16} className="flex-shrink-0" /> : <CircleAlert size={16} className="flex-shrink-0" />}
          {msg}
        </div>
      )}

      {/* Registration Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-slate-900 mb-4">New Patient Registration</h2>
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{f.label}</label>
                <input type={f.type} value={form[f.key]}
                  onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Gender *</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleSubmit}
              className="bg-teal-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-800 transition-colors">
              Register Patient
            </button>
            <button onClick={() => setShowForm(false)}
              className="border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-semibold hover:border-teal-600 hover:text-teal-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search + Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 max-w-md">
            <Search size={16} className="text-slate-400 flex-shrink-0" />
            <input type="text" placeholder="Search by name, phone, ID or patient number..."
              value={search} onChange={e => handleSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none" />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading patients...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {['Patient No','Name','Gender','Phone','National ID','County','Allergies','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-slate-400">No patients found</td></tr>
                ) : patients.map(p => (
                  <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-teal-700">{p.patient_no}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.first_name} {p.last_name}</td>
                    <td className="px-4 py-3 text-slate-500">{p.gender}</td>
                    <td className="px-4 py-3 text-slate-600">{p.phone}</td>
                    <td className="px-4 py-3 text-slate-500">{p.national_id || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{p.county_name || '-'}</td>
                    <td className="px-4 py-3">
                      {p.allergies && p.allergies !== 'None' ? (
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">{p.allergies}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="flex items-center gap-1 bg-teal-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-teal-800 transition-colors">
                          <Eye size={12} /> View
                        </button>
                        <button onClick={() => handleDelete(p.id)}
                          className="flex items-center gap-1 bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
                          <Trash2 size={12} /> Delete
                        </button>
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