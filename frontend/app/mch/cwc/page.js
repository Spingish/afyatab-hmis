'use client';
import { useState } from 'react';
import Link from 'next/link';

const VACCINES = ['BCG','OPV 0','OPV 1','OPV 2','OPV 3','DPT-HepB-Hib 1','DPT-HepB-Hib 2','DPT-HepB-Hib 3','PCV10 1','PCV10 2','PCV10 3','Rotavirus 1','Rotavirus 2','IPV','MR1','MR2','Yellow Fever','Vitamin A'];

export default function CWC() {
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    patient_id:'', mother_id:'',
    weight_kg:'', height_cm:'', muac_cm:'',
    nutritional_status:'Normal',
    vaccines_given:[], deworming_given: false,
    vitamin_a_given: false, developmental_milestone:'',
    next_visit_date:'', notes:''
  });

  const toggleVaccine = (v) => {
    setForm(f => ({
      ...f,
      vaccines_given: f.vaccines_given.includes(v)
        ? f.vaccines_given.filter(x => x !== v)
        : [...f.vaccines_given, v]
    }));
  };

  const handleSubmit = () => {
    if (!form.patient_id) { setMsg('❌ Child Patient ID required'); return; }
    setMsg('✅ CWC visit recorded successfully');
    setShowForm(false);
  };

  const getBMIStatus = (weight, height) => {
    if (!weight || !height) return null;
    const bmi = weight / Math.pow(height / 100, 2);
    if (bmi < 16) return { label: 'SAM', color: 'text-red-600' };
    if (bmi < 18.5) return { label: 'MAM', color: 'text-orange-600' };
    return { label: 'Normal', color: 'text-green-600' };
  };

  const status = getBMIStatus(form.weight_kg, form.height_cm);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/mch" className="text-gray-400 hover:text-blue-600 text-sm">← MCH</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold">CWC Register</h1>
        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">Child Welfare Clinic</span>
        <div className="ml-auto">
          <button onClick={() => setShowForm(!showForm)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700">
            + New CWC Visit
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
          <h2 className="font-bold mb-4 text-green-700">New CWC Visit</h2>

          {/* Patient IDs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Child Patient ID *</label>
              <input type="number" value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mother Patient ID</label>
              <input type="number" value={form.mother_id} onChange={e => setForm({...form, mother_id: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>

          {/* Growth Monitoring */}
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Growth Monitoring</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Weight (kg)</label>
                <input type="number" step="0.01" value={form.weight_kg}
                  onChange={e => setForm({...form, weight_kg: e.target.value})}
                  placeholder="kg"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Height (cm)</label>
                <input type="number" step="0.1" value={form.height_cm}
                  onChange={e => setForm({...form, height_cm: e.target.value})}
                  placeholder="cm"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">MUAC (cm)</label>
                <input type="number" step="0.1" value={form.muac_cm}
                  onChange={e => setForm({...form, muac_cm: e.target.value})}
                  placeholder="cm"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nutritional Status</label>
                {status ? (
                  <div className={`border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold ${status.color}`}>
                    {status.label} (auto)
                  </div>
                ) : (
                  <select value={form.nutritional_status} onChange={e => setForm({...form, nutritional_status: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 dark:bg-gray-700 dark:border-gray-600">
                    <option>Normal</option><option>MAM</option><option>SAM</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Immunization */}
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Vaccines Given This Visit ({form.vaccines_given.length} selected)
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {VACCINES.map(v => (
                <label key={v} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition-all
                  ${form.vaccines_given.includes(v) ? 'bg-green-50 border-green-400 text-green-700 font-semibold' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-green-300'}`}>
                  <input type="checkbox" checked={form.vaccines_given.includes(v)} onChange={() => toggleVaccine(v)} className="rounded" />
                  {v}
                </label>
              ))}
            </div>
          </div>

          {/* Other */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="deworm" checked={form.deworming_given} onChange={e => setForm({...form, deworming_given: e.target.checked})} className="w-4 h-4" />
              <label htmlFor="deworm" className="text-sm font-medium">Deworming Given</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="vita" checked={form.vitamin_a_given} onChange={e => setForm({...form, vitamin_a_given: e.target.checked})} className="w-4 h-4" />
              <label htmlFor="vita" className="text-sm font-medium">Vitamin A Given</label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Next Visit Date</label>
              <input type="date" value={form.next_visit_date} onChange={e => setForm({...form, next_visit_date: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Developmental Milestones / Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                rows={2} placeholder="Developmental notes, concerns..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 resize-none" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSubmit} className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-green-700">Save CWC Visit</button>
            <button onClick={() => setShowForm(false)} className="border border-gray-300 px-6 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
        <p className="text-4xl mb-3">🧒</p>
        <p className="text-gray-400 text-sm mb-3">No CWC records yet</p>
        <button onClick={() => setShowForm(true)} className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700">Record First CWC Visit</button>
      </div>
    </div>
  );
}