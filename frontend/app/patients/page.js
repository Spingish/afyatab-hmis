'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { patientAPI, visitAPI } from '../../lib/api';
import { UserPlus, Search, X, Eye, Trash2, CircleCheck, CircleAlert, PlayCircle, RotateCcw } from 'lucide-react';

const phoneOwnershipOptions = [
  "Personal (Patient's own phone)",
  "Parent's Phone",
  "Guardian's Phone",
  "Spouse's Phone",
  'Other',
];

const idDocumentOptions = [
  'National ID', 'Passport', 'Birth Certificate', 'Military ID', 'Other',
];

const emptyForm = {
  first_name:'', other_names:'', last_name:'', date_of_birth:'', gender:'Male',
  phone:'', phone_ownership: "Personal (Patient's own phone)", email:'',
  village:'', id_document_type:'National ID', national_id:'',
  kin_name:'', kin_phone:'', kin_relationship:'',
};

const calcAge = (dob) => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth)) return null;
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

export default function Patients() {
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(emptyForm);
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
      setForm(emptyForm);
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

  const startNewVisit = async (patient) => {
    try {
      const r = await visitAPI.startNew({ patient_id: patient.id, patient_type: 'Outpatient', directed_to: 'Triage' });
      setMsgOk(true);
      setMsg(`✅ New visit ${r.data.visit_no} started for ${patient.first_name} ${patient.last_name} — sent to Triage`);
      router.push('/triage');
    } catch (err) {
      setMsgOk(false);
      setMsg('❌ ' + (err.response?.data?.error || 'Error starting visit'));
    }
  };

  const continueVisit = async (patient) => {
    try {
      const r = await visitAPI.continueVisit({ patient_id: patient.id, patient_type: 'Outpatient', directed_to: 'Triage' });
      setMsgOk(true);
      setMsg(`✅ Continuation visit ${r.data.visit_no} — ${r.data.visit_history?.total_visits || 0} previous visit(s) loaded`);
      router.push('/triage');
    } catch (err) {
      setMsgOk(false);
      setMsg('❌ ' + (err.response?.data?.error || 'Error starting continuation visit'));
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

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
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 space-y-6">
          <h2 className="font-bold text-slate-900">New Patient Registration</h2>

          {/* Identity */}
          <div>
            <div className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">Identity</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">First Name *</label>
                <input value={form.first_name} onChange={set('first_name')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Middle Name</label>
                <input value={form.other_names} onChange={set('other_names')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Last Name *</label>
                <input value={form.last_name} onChange={set('last_name')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Date of Birth *</label>
                <input type="date" value={form.date_of_birth} onChange={set('date_of_birth')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Gender *</label>
                <select value={form.gender} onChange={set('gender')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors">
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Residence</label>
                <input value={form.village} onChange={set('village')} placeholder="e.g. Webuye Town"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <div className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">Contact Information</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Phone Number *</label>
                <input type="tel" value={form.phone} onChange={set('phone')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Phone Ownership *</label>
                <select value={form.phone_ownership} onChange={set('phone_ownership')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors">
                  {phoneOwnershipOptions.map(o => <option key={o}>{o}</option>)}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">For children, select Parent's or Guardian's Phone.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email Address</label>
                <input type="email" value={form.email} onChange={set('email')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
              </div>
            </div>
          </div>

          {/* Identification */}
          <div>
            <div className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">Identification</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Document Type</label>
                <select value={form.id_document_type} onChange={set('id_document_type')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors">
                  {idDocumentOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Document Number</label>
                <input value={form.national_id} onChange={set('national_id')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <div className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">Emergency Contact (Optional)</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Contact Name</label>
                <input value={form.kin_name} onChange={set('kin_name')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Contact Phone</label>
                <input type="tel" value={form.kin_phone} onChange={set('kin_phone')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Relationship</label>
                <input value={form.kin_relationship} onChange={set('kin_relationship')} placeholder="e.g. Mother, Spouse"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
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
                  {['Patient No','Name','Gender / Age','Phone','Residence','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">No patients found</td></tr>
                ) : patients.map(p => {
                  const age = calcAge(p.date_of_birth);
                  return (
                    <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-teal-700">{p.patient_no}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{p.first_name} {p.last_name}</td>
                      <td className="px-4 py-3 text-slate-500">{p.gender}{age !== null ? `, ${age}y` : ''}</td>
                      <td className="px-4 py-3 text-slate-600">{p.phone}</td>
                      <td className="px-4 py-3 text-slate-500">{p.village || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => router.push(`/patients/${p.id}`)}
                            className="flex items-center gap-1 bg-teal-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-teal-800 transition-colors">
                            <Eye size={12} /> View
                          </button>
                          <button onClick={() => continueVisit(p)} title="Follow-up visit for an existing patient"
                            className="flex items-center gap-1 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                            <RotateCcw size={12} /> Continue
                          </button>
                          <button onClick={() => startNewVisit(p)} title="Start a brand new visit"
                            className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors">
                            <PlayCircle size={12} /> Initiate Visit
                          </button>
                          <button onClick={() => handleDelete(p.id)}
                            className="flex items-center gap-1 bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}