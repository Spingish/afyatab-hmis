'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';

export default function ANC() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [form, setForm] = useState({
    patient_id:'', visit_id:'', gravidity:'', parity:'',
    lmp:'', edd:'', edd_method:'LMP',
    gestational_age_weeks:'', risk_level:'Low',
    risk_factors:'', visit_number:1,
    blood_pressure:'', weight_kg:'', fundal_height:'',
    fetal_heart_rate:'', presentation:'Cephalic',
    hb_level:'', blood_group:'', hiv_status:'Unknown',
    syphilis_status:'Unknown', malaria_prophylaxis: false,
    tt_status:'', iron_folic_given: false,
    next_visit_date:'', notes:''
  });

  const showMsg = (text, type='success') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  };

  const load = () => {
    axios.get('/api/laboratory/today')
      .catch(() => {})
      .finally(() => setLoading(false));
    setRecords([]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const calcEDD = (lmp) => {
    if (!lmp) return '';
    const d = new Date(lmp);
    d.setDate(d.getDate() + 280);
    return d.toISOString().split('T')[0];
  };

  const handleLMP = (lmp) => {
    setForm({...form, lmp, edd: calcEDD(lmp)});
  };

  const handleSubmit = async () => {
    if (!form.patient_id) { showMsg('Patient ID is required', 'error'); return; }
    try {
      await axios.post('/api/anc', form);
      showMsg('✅ ANC visit recorded successfully');
      setShowForm(false);
      load();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Error saving ANC record'), 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/mch" className="text-gray-400 hover:text-blue-600 text-sm">← MCH</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold">ANC Register</h1>
        <span className="bg-pink-100 text-pink-700 text-xs px-2 py-1 rounded-full font-semibold">Antenatal Care</span>
        <div className="ml-auto">
          <button onClick={() => setShowForm(!showForm)}
            className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pink-700">
            + New ANC Visit
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 mb-4 text-sm text-blue-800">
        <strong>Note:</strong> All ANC patients must be registered at Reception first. Enter their Patient ID below.
      </div>

      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm border flex items-center justify-between
          ${msgType === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="ml-3 font-bold">×</button>
        </div>
      )}

      {/* ANC Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-5">
          <h2 className="font-bold mb-4 text-pink-700">New ANC Visit</h2>
          
          {/* Patient & Obstetric History */}
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Patient & Obstetric History</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Patient ID *</label>
                <input type="number" value={form.patient_id}
                  onChange={e => setForm({...form, patient_id: e.target.value})}
                  placeholder="DB Patient ID"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Visit Number</label>
                <select value={form.visit_number} onChange={e => setForm({...form, visit_number: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600">
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`} Visit</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Gravidity</label>
                <input type="number" value={form.gravidity}
                  onChange={e => setForm({...form, gravidity: e.target.value})}
                  placeholder="G"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Parity</label>
                <input type="number" value={form.parity}
                  onChange={e => setForm({...form, parity: e.target.value})}
                  placeholder="P"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">LMP</label>
                <input type="date" value={form.lmp}
                  onChange={e => handleLMP(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">EDD (Auto-calculated)</label>
                <input type="date" value={form.edd}
                  onChange={e => setForm({...form, edd: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 bg-pink-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">GA (Weeks)</label>
                <input type="number" value={form.gestational_age_weeks}
                  onChange={e => setForm({...form, gestational_age_weeks: e.target.value})}
                  placeholder="Weeks"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Risk Level</label>
                <select value={form.risk_level} onChange={e => setForm({...form, risk_level: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600">
                  <option>Low</option><option>Moderate</option><option>High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Current Visit Findings */}
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Current Visit Findings</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Blood Pressure</label>
                <input type="text" value={form.blood_pressure}
                  onChange={e => setForm({...form, blood_pressure: e.target.value})}
                  placeholder="120/80"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Weight (kg)</label>
                <input type="number" value={form.weight_kg}
                  onChange={e => setForm({...form, weight_kg: e.target.value})}
                  placeholder="kg"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fundal Height (cm)</label>
                <input type="number" value={form.fundal_height}
                  onChange={e => setForm({...form, fundal_height: e.target.value})}
                  placeholder="cm"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">FHR (bpm)</label>
                <input type="number" value={form.fetal_heart_rate}
                  onChange={e => setForm({...form, fetal_heart_rate: e.target.value})}
                  placeholder="bpm"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Presentation</label>
                <select value={form.presentation} onChange={e => setForm({...form, presentation: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600">
                  <option>Cephalic</option><option>Breech</option><option>Transverse</option><option>Unknown</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hb Level (g/dL)</label>
                <input type="number" step="0.1" value={form.hb_level}
                  onChange={e => setForm({...form, hb_level: e.target.value})}
                  placeholder="g/dL"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Blood Group</label>
                <select value={form.blood_group} onChange={e => setForm({...form, blood_group: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600">
                  <option value="">Unknown</option>
                  {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg => <option key={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">HIV Status</label>
                <select value={form.hiv_status} onChange={e => setForm({...form, hiv_status: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600">
                  <option>Unknown</option><option>Negative</option><option>Positive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preventive Care */}
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Preventive Care</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">TT Status</label>
                <select value={form.tt_status} onChange={e => setForm({...form, tt_status: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600">
                  <option value="">Select...</option>
                  <option>TT1</option><option>TT2</option><option>TT3</option><option>TT4</option><option>TT5</option><option>Protected</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="irongiven" checked={form.iron_folic_given}
                  onChange={e => setForm({...form, iron_folic_given: e.target.checked})}
                  className="w-4 h-4 rounded" />
                <label htmlFor="irongiven" className="text-sm font-medium">Iron/Folic Given</label>
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="malaria" checked={form.malaria_prophylaxis}
                  onChange={e => setForm({...form, malaria_prophylaxis: e.target.checked})}
                  className="w-4 h-4 rounded" />
                <label htmlFor="malaria" className="text-sm font-medium">Malaria Prophylaxis (IPTp)</label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Next Visit Date</label>
                <input type="date" value={form.next_visit_date}
                  onChange={e => setForm({...form, next_visit_date: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes / Risk Factors</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  rows={2} placeholder="Clinical notes, risk factors..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 resize-none" />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSubmit}
              className="bg-pink-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-pink-700">
              Save ANC Visit
            </button>
            <button onClick={() => setShowForm(false)}
              className="border border-gray-300 px-6 py-2 rounded-lg text-sm hover:border-pink-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ANC Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-sm">ANC Register</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-4xl mb-3">🤰</p>
            <p className="text-gray-400 text-sm mb-3">No ANC records yet</p>
            <button onClick={() => setShowForm(true)}
              className="bg-pink-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-pink-700">
              Record First ANC Visit
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  {['Patient','G/P','GA (Wks)','EDD','BP','FHR','Presentation','HIV','Risk','Next Visit','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium">{r.patient_name}</td>
                    <td className="px-4 py-3">G{r.gravidity}P{r.parity}</td>
                    <td className="px-4 py-3">{r.gestational_age_weeks} wks</td>
                    <td className="px-4 py-3 text-pink-600 font-medium">{r.edd}</td>
                    <td className="px-4 py-3">{r.blood_pressure || '—'}</td>
                    <td className="px-4 py-3">{r.fetal_heart_rate || '—'}</td>
                    <td className="px-4 py-3">{r.presentation}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.hiv_status === 'Negative' ? 'bg-green-100 text-green-700' : r.hiv_status === 'Positive' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {r.hiv_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.risk_level === 'Low' ? 'bg-green-100 text-green-700' : r.risk_level === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {r.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.next_visit_date}</td>
                    <td className="px-4 py-3">
                      <button className="bg-pink-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-pink-700">View</button>
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