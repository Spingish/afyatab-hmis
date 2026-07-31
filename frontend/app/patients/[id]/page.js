'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { patientAPI, visitAPI } from '../../../lib/api';
import { ArrowLeft, PlayCircle, RotateCcw, Phone, MapPin, Droplet, AlertTriangle, Pencil, X, CircleCheck, CircleAlert } from 'lucide-react';

const calcAge = (dob) => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth)) return null;
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

const stageBadge = (stage) => {
  const map = {
    Reception: 'bg-blue-100 text-blue-700', Triage: 'bg-amber-100 text-amber-700',
    Consultation: 'bg-violet-100 text-violet-700', Investigation: 'bg-cyan-100 text-cyan-700',
    Procedure: 'bg-orange-100 text-orange-700', Pharmacy: 'bg-emerald-100 text-emerald-700',
    Discharged: 'bg-slate-100 text-slate-500',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[stage] || 'bg-slate-100 text-slate-500'}`}>{stage || '-'}</span>;
};

export default function PatientRecord() {
  const { id } = useParams();
  const router = useRouter();
  const [patient, setPatient]   = useState(null);
  const [full, setFull]         = useState(null);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState('');
  const [msgOk, setMsgOk]       = useState(true);
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState(null);

  const load = async () => {
    try {
      const [h, p] = await Promise.all([
        visitAPI.getHistory(id),
        patientAPI.getById(id),
      ]);
      setPatient(h.data.patient);
      setHistory(h.data.history || []);
      setFull(p.data.patient);
      setForm(p.data.patient);
    } catch {
      setMsgOk(false);
      setMsg('Could not load this patient record.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const saveEdit = async () => {
    try {
      await patientAPI.update(id, form);
      setMsgOk(true);
      setMsg('Patient details updated');
      setEditing(false);
      load();
    } catch (err) {
      setMsgOk(false);
      setMsg(err.response?.data?.message || err.response?.data?.error || 'Error updating patient');
    }
  };

  const startNewVisit = async () => {
    try {
      const r = await visitAPI.startNew({ patient_id: id, patient_type: 'Outpatient', directed_to: 'Triage' });
      router.push('/triage');
    } catch (err) {
      setMsgOk(false);
      setMsg(err.response?.data?.error || 'Error starting visit');
    }
  };

  const continueVisit = async () => {
    try {
      await visitAPI.continueVisit({ patient_id: id, patient_type: 'Outpatient', directed_to: 'Triage' });
      router.push('/triage');
    } catch (err) {
      setMsgOk(false);
      setMsg(err.response?.data?.error || 'Error starting continuation visit');
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 text-sm">Loading patient record...</div>;
  if (!patient) return <div className="p-10 text-center text-red-500 text-sm">{msg || 'Patient not found'}</div>;

  const age = calcAge(full?.date_of_birth);

  return (
    <div>
      <button onClick={() => router.push('/patients')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 mb-4">
        <ArrowLeft size={15} /> Back to Patient Register
      </button>

      {msg && (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-xl mb-4 ${msgOk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msgOk ? <CircleCheck size={16} className="flex-shrink-0" /> : <CircleAlert size={16} className="flex-shrink-0" />}
          {msg}
        </div>
      )}

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-700 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
              {patient.name?.split(' ').map(n => n[0]).slice(0,2).join('')}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{patient.name}</h1>
              <div className="text-sm text-slate-400">
                {patient.patient_no} {full?.gender ? `- ${full.gender}` : ''}{age !== null ? `, ${age}y` : ''}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setEditing(!editing)}
              className="flex items-center gap-1.5 border border-slate-200 text-slate-600 text-sm px-4 py-2 rounded-xl font-semibold hover:border-teal-600 hover:text-teal-700 transition-colors">
              {editing ? <X size={15} /> : <Pencil size={15} />}
              {editing ? 'Cancel Edit' : 'Edit Details'}
            </button>
            <button onClick={continueVisit}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              <RotateCcw size={15} /> Continue (Follow-up)
            </button>
            <button onClick={startNewVisit}
              className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
              <PlayCircle size={15} /> Initiate New Visit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm">
            <Phone size={15} className="text-slate-400 flex-shrink-0" />
            <span className="text-slate-700">{patient.phone || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={15} className="text-slate-400 flex-shrink-0" />
            <span className="text-slate-700">{full?.village || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Droplet size={15} className="text-slate-400 flex-shrink-0" />
            <span className="text-slate-700">{patient.blood_group || 'Blood group unknown'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle size={15} className={patient.allergies && patient.allergies !== 'None' ? 'text-red-500 flex-shrink-0' : 'text-slate-300 flex-shrink-0'} />
            <span className={patient.allergies && patient.allergies !== 'None' ? 'text-red-600 font-medium' : 'text-slate-400'}>
              {patient.allergies || 'No known allergies'}
            </span>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {editing && form && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 space-y-4">
          <h2 className="font-bold text-slate-900 mb-1">Edit Registration Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">First Name *</label>
              <input value={form.first_name || ''} onChange={set('first_name')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Middle Name</label>
              <input value={form.other_names || ''} onChange={set('other_names')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Last Name *</label>
              <input value={form.last_name || ''} onChange={set('last_name')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Phone Number *</label>
              <input type="tel" value={form.phone || ''} onChange={set('phone')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email Address</label>
              <input type="email" value={form.email || ''} onChange={set('email')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Residence</label>
              <input value={form.village || ''} onChange={set('village')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Emergency Contact Name</label>
              <input value={form.kin_name || ''} onChange={set('kin_name')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Emergency Contact Phone</label>
              <input type="tel" value={form.kin_phone || ''} onChange={set('kin_phone')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Relationship</label>
              <input value={form.kin_relationship || ''} onChange={set('kin_relationship')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600 transition-colors" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={saveEdit}
              className="bg-teal-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-800 transition-colors">
              Save Changes
            </button>
            <button onClick={() => { setEditing(false); setForm(full); }}
              className="border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-semibold hover:border-teal-600 hover:text-teal-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Visit history */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Visit History</h2>
          <span className="text-xs text-slate-400">{history.length} visit{history.length === 1 ? '' : 's'}</span>
        </div>
        {history.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No visits recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {['Visit No', 'Date', 'Type', 'Stage', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(v => (
                  <tr key={v.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-teal-700">{v.visit_no}</td>
                    <td className="px-4 py-3 text-slate-600">{v.visit_date ? new Date(v.visit_date).toLocaleDateString('en-KE') : '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{v.visit_type}</td>
                    <td className="px-4 py-3">{stageBadge(v.current_stage)}</td>
                    <td className="px-4 py-3 text-slate-500">{v.status || '-'}</td>
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
