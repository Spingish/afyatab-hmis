'use client';
import { useState } from 'react';
import Link from 'next/link';

const FP_METHODS = [
  'DMPA Injectable','Combined Oral Contraceptive (COC)',
  'Progestogen Only Pill (POP)','Implant (Jadelle/Implanon)',
  'IUCD (Copper T)','Male Condoms','Female Condoms',
  'Tubal Ligation','Vasectomy','NFP / LAM','Emergency Contraception'
];

export default function FP() {
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    patient_id:'', fp_method_id:'',
    visit_type:'New', date_issued:'',
    next_visit_date:'', counseling_done: true,
    side_effects:'', reason_for_change:'', notes:''
  });

  const handleSubmit = () => {
    if (!form.patient_id || !form.fp_method_id) {
      setMsg('❌ Patient ID and FP method are required'); return;
    }
    setMsg('✅ FP visit recorded successfully');
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/mch" className="text-gray-400 hover:text-blue-600 text-sm">← MCH</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold">FP Register</h1>
        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-semibold">Family Planning</span>
        <div className="ml-auto">
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
            + New FP Client
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm border ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {msg} <button onClick={() => setMsg('')} className="ml-2 font-bold">×</button>
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-5">
          <h2 className="font-bold mb-4 text-blue-700">New FP Visit</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Patient ID *</label>
              <input type="number" value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Visit Type</label>
              <select value={form.visit_type} onChange={e => setForm({...form, visit_type: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option>New</option><option>Revisit</option><option>Change</option><option>Discontinue</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">FP Method *</label>
              <select value={form.fp_method_id} onChange={e => setForm({...form, fp_method_id: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option value="">Select method...</option>
                {FP_METHODS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date Issued</label>
              <input type="date" value={form.date_issued} onChange={e => setForm({...form, date_issued: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Next Visit Date</label>
              <input type="date" value={form.next_visit_date} onChange={e => setForm({...form, next_visit_date: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" id="counseling" checked={form.counseling_done} onChange={e => setForm({...form, counseling_done: e.target.checked})} className="w-4 h-4" />
              <label htmlFor="counseling" className="text-sm font-medium">Counseling Done</label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Side Effects Reported</label>
              <input type="text" value={form.side_effects} onChange={e => setForm({...form, side_effects: e.target.value})}
                placeholder="None / describe"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Reason for Change</label>
              <input type="text" value={form.reason_for_change} onChange={e => setForm({...form, reason_for_change: e.target.value})}
                placeholder="If changing method"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">Save FP Visit</button>
            <button onClick={() => setShowForm(false)} className="border border-gray-300 px-6 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
        <p className="text-4xl mb-3">💊</p>
        <p className="text-gray-400 text-sm mb-3">No FP records yet</p>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">Record First FP Client</button>
      </div>
    </div>
  );
}