'use client';
import { useState, useEffect } from 'react';
import { consultationAPI, pharmacyAPI, labAPI } from '../../lib/api';

const calcAge = (dob) => {
  if (!dob) return '—';
  const years = Math.floor((Date.now() - new Date(dob)) / (365.25*24*3600*1000));
  return years < 1 ? `${Math.floor((Date.now()-new Date(dob))/(30.44*24*3600*1000))} months` : `${years} yrs`;
};

const priorityBadge = (p) => {
  const map = { Emergency:'bg-red-100 text-red-700', Urgent:'bg-orange-100 text-orange-700', High:'bg-yellow-100 text-yellow-700', Normal:'bg-blue-100 text-blue-700', Low:'bg-green-100 text-green-700' };
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${map[p]||'bg-gray-100 text-gray-600'}`}>{p||'Normal'}</span>;
};

export default function Consultation() {
  const [queue, setQueue]       = useState([]);
  const [drugs, setDrugs]       = useState([]);
  const [tests, setTests]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [history, setHistory]   = useState([]);
  const [msg, setMsg]           = useState('');
  const [msgType, setMsgType]   = useState('success');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab]   = useState('history');

  // Form state
  const [form, setForm] = useState({
    chief_complaint:'', history_of_presenting_illness:'',
    past_medical_history:'', family_history:'',
    general_examination:'', systemic_examination:'',
    working_diagnosis:'', differential_diagnosis:'',
    management_plan:'', follow_up_date:'',
    next_stage:'Pharmacy'
  });

  // Diagnoses
  const [diagnoses, setDiagnoses] = useState([{ text:'', type:'Primary' }]);

  // Prescriptions
  const [rxItems, setRxItems] = useState([]);
  const [selectedDrug, setSelectedDrug] = useState({ drug_id:'', quantity:'', dosage:'', frequency:'OD', duration:'', route:'Oral' });

  // Lab tests
  const [selectedTests, setSelectedTests] = useState([]);

  const showMsg = (text, type='success') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 6000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [q, d, t] = await Promise.all([
        consultationAPI.getQueue(),
        pharmacyAPI.getDrugs(),
        labAPI.getTests()
      ]);
      setQueue(q.data.queue || []);
      setDrugs(d.data.drugs || []);
      setTests(t.data.tests || []);
    } catch { setQueue([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openConsultation = async (patient) => {
    setSelected(patient);
    setActiveTab('history');
    setForm({ chief_complaint: patient.triage_complaint || '', history_of_presenting_illness:'', past_medical_history:'', family_history:'', general_examination:'', systemic_examination:'', working_diagnosis:'', differential_diagnosis:'', management_plan:'', follow_up_date:'', next_stage:'Pharmacy' });
    setDiagnoses([{ text:'', type:'Primary' }]);
    setRxItems([]);
    setSelectedTests([]);
    try {
      const h = await consultationAPI.getHistory(patient.patient_id);
      setHistory(h.data.history || []);
    } catch { setHistory([]); }
  };

  const addDiagnosis = () => setDiagnoses([...diagnoses, { text:'', type:'Secondary' }]);
  const removeDiagnosis = (i) => setDiagnoses(diagnoses.filter((_,idx) => idx !== i));
  const updateDiagnosis = (i, field, val) => setDiagnoses(diagnoses.map((d,idx) => idx===i ? {...d,[field]:val} : d));

  const addRxItem = () => {
    if (!selectedDrug.drug_id || !selectedDrug.quantity) { showMsg('Select drug and quantity', 'error'); return; }
    const drug = drugs.find(d => d.id === parseInt(selectedDrug.drug_id));
    setRxItems([...rxItems, { ...selectedDrug, drug_name: drug?.generic_name + ' ' + drug?.strength }]);
    setSelectedDrug({ drug_id:'', quantity:'', dosage:'', frequency:'OD', duration:'', route:'Oral' });
  };

  const toggleTest = (id) => setSelectedTests(prev => prev.includes(id) ? prev.filter(t=>t!==id) : [...prev,id]);

  const handleSubmit = async () => {
    if (!form.chief_complaint) { showMsg('Chief complaint is required', 'error'); return; }
    if (!form.working_diagnosis) { showMsg('Working diagnosis is required', 'error'); return; }
    const user = JSON.parse(localStorage.getItem('afyatab_user') || '{}');
    setSubmitting(true);
    try {
      const r = await consultationAPI.create({
        visit_id:    selected.visit_id,
        patient_id:  selected.patient_id,
        doctor_id:   user.staff_id || 1,
        ...form,
        diagnoses:   diagnoses.filter(d => d.text),
        prescriptions: rxItems.map(r => ({
          drug_id:  parseInt(r.drug_id),
          quantity: parseInt(r.quantity),
          dosage:   r.dosage, frequency: r.frequency,
          duration: r.duration, route: r.route
        })),
        lab_tests: selectedTests,
      });

      let successMsg = `✅ Consultation saved — patient moved to ${form.next_stage}`;
      if (r.data.prescription_no) successMsg += ` | Rx: ${r.data.prescription_no}`;
      if (r.data.lab_request_no) successMsg += ` | Lab: ${r.data.lab_request_no}`;
      showMsg(successMsg);
      setSelected(null);
      load();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Error saving consultation'), 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Consultation</h1>
          <p className="text-gray-500 text-sm">{queue.length} patients waiting</p>
        </div>
        <div className="flex gap-3">
          <span className="bg-violet-50 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-lg text-sm font-medium">{queue.length} in queue</span>
          <button onClick={load} className="border border-gray-200 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:border-blue-500">↻ Refresh</button>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm border flex items-center justify-between
          ${msgType==='success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          <span>{msg}</span><button onClick={()=>setMsg('')} className="ml-3 font-bold">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Queue — left column */}
        <div className="lg:col-span-2">
          <h2 className="font-bold text-sm mb-3">Consultation Queue</h2>
          {loading ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center text-gray-400">Loading...</div>
          ) : queue.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
              <p className="text-4xl mb-3">🩺</p>
              <p className="text-gray-400 text-sm">No patients waiting for consultation</p>
            </div>
          ) : queue.map(p => (
            <div key={p.visit_id}
              onClick={() => openConsultation(p)}
              className={`bg-white dark:bg-gray-800 border-2 rounded-xl p-4 mb-3 cursor-pointer transition-all hover:shadow-md
                ${selected?.visit_id === p.visit_id ? 'border-violet-500 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-violet-300'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {p.first_name?.[0]}{p.last_name?.[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{p.first_name} {p.last_name}</div>
                    <div className="text-xs text-gray-400">{p.patient_no} • {p.gender} • {calcAge(p.date_of_birth)}</div>
                  </div>
                </div>
                {priorityBadge(p.priority)}
              </div>
              {p.triage_complaint && (
                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 mb-2">
                  <strong>Complaint:</strong> {p.triage_complaint}
                </div>
              )}
              {/* Vitals mini */}
              <div className="grid grid-cols-4 gap-1 text-center">
                {[
                  { label:'Temp', val: p.temperature ? `${p.temperature}°` : '—' },
                  { label:'BP', val: p.blood_pressure_systolic ? `${p.blood_pressure_systolic}/${p.blood_pressure_diastolic}` : '—' },
                  { label:'Pulse', val: p.pulse_rate ? `${p.pulse_rate}` : '—' },
                  { label:'SpO2', val: p.oxygen_saturation ? `${p.oxygen_saturation}%` : '—' },
                ].map(v => (
                  <div key={v.label} className="bg-gray-50 dark:bg-gray-700 rounded-lg py-1">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">{v.val}</div>
                    <div className="text-xs text-gray-400">{v.label}</div>
                  </div>
                ))}
              </div>
              {p.allergies && p.allergies !== 'None' && (
                <div className="mt-2 text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg">⚠️ {p.allergies}</div>
              )}
              <div className="mt-2 text-right">
                <span className="text-xs text-gray-400">{p.previous_visits} previous visit(s)</span>
              </div>
            </div>
          ))}
        </div>

        {/* Consultation Form — right */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
              <p className="text-4xl mb-3">🩺</p>
              <p className="text-gray-400 text-sm font-medium">Select a patient to open consultation</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">

              {/* Patient header */}
              <div className="bg-violet-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold">
                      {selected.first_name?.[0]}{selected.last_name?.[0]}
                    </div>
                    <div>
                      <div className="font-bold">{selected.first_name} {selected.last_name}</div>
                      <div className="text-violet-200 text-xs">{selected.patient_no} • {selected.gender} • {calcAge(selected.date_of_birth)} • {selected.blood_group || 'Blood group unknown'}</div>
                      <div className="text-violet-200 text-xs">{selected.visit_no} • {selected.visit_type}</div>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-white/70 hover:text-white text-xl">×</button>
                </div>
                {selected.allergies && selected.allergies !== 'None' && (
                  <div className="mt-2 bg-red-500/30 rounded-lg px-3 py-1.5 text-xs">⚠️ <strong>Allergy:</strong> {selected.allergies}</div>
                )}
                {selected.chronic_conditions && (
                  <div className="mt-1 bg-yellow-500/20 rounded-lg px-3 py-1.5 text-xs">📋 <strong>Chronic:</strong> {selected.chronic_conditions}</div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-4 pt-3 border-b border-gray-200 dark:border-gray-700">
                {[['history','History'],['consult','Consultation'],['rx','Prescription'],['lab','Lab Orders'],['plan','Plan']].map(([key,label]) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors
                      ${activeTab===key ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-5">

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                  <div>
                    <h3 className="font-bold text-sm mb-3">Previous Consultations</h3>
                    {history.length === 0 ? (
                      <div className="text-center py-6 text-gray-400">
                        <p className="text-2xl mb-2">📋</p>
                        <p className="text-sm">No previous consultations</p>
                        <button onClick={() => setActiveTab('consult')}
                          className="mt-3 bg-violet-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-violet-700">
                          Start New Consultation →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {history.map((h,i) => (
                          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-semibold text-sm">{h.visit_no} — {h.visit_type}</div>
                              <span className="text-xs text-gray-400">{h.consultation_date}</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-1"><strong>Complaint:</strong> {h.chief_complaint}</div>
                            <div className="text-xs text-gray-500 mb-1"><strong>Diagnosis:</strong> {h.working_diagnosis || h.diagnoses || '—'}</div>
                            <div className="text-xs text-gray-500"><strong>Plan:</strong> {h.management_plan || '—'}</div>
                            <div className="text-xs text-gray-400 mt-1">Dr. {h.doctor_name}</div>
                          </div>
                        ))}
                        <button onClick={() => setActiveTab('consult')}
                          className="w-full bg-violet-600 text-white text-sm py-2 rounded-lg hover:bg-violet-700">
                          Start New Consultation →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* CONSULTATION TAB */}
                {activeTab === 'consult' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chief Complaint *</label>
                      <textarea value={form.chief_complaint} onChange={e => setForm({...form, chief_complaint: e.target.value})}
                        rows={2} placeholder="Patient's main complaint..."
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 dark:bg-gray-700 resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">History of Presenting Illness</label>
                      <textarea value={form.history_of_presenting_illness} onChange={e => setForm({...form, history_of_presenting_illness: e.target.value})}
                        rows={3} placeholder="Onset, duration, progression, associated symptoms..."
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 dark:bg-gray-700 resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Past Medical History</label>
                        <textarea value={form.past_medical_history} onChange={e => setForm({...form, past_medical_history: e.target.value})}
                          rows={2} placeholder="Previous illnesses, surgeries..."
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 dark:bg-gray-700 resize-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Family History</label>
                        <textarea value={form.family_history} onChange={e => setForm({...form, family_history: e.target.value})}
                          rows={2} placeholder="Family medical history..."
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 dark:bg-gray-700 resize-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">General Examination</label>
                        <textarea value={form.general_examination} onChange={e => setForm({...form, general_examination: e.target.value})}
                          rows={2} placeholder="General condition, pallor, jaundice..."
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 dark:bg-gray-700 resize-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Systemic Examination</label>
                        <textarea value={form.systemic_examination} onChange={e => setForm({...form, systemic_examination: e.target.value})}
                          rows={2} placeholder="CVS, RS, GIT, CNS findings..."
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 dark:bg-gray-700 resize-none" />
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('rx')}
                      className="w-full bg-violet-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
                      Next: Diagnosis & Prescription →
                    </button>
                  </div>
                )}

                {/* PRESCRIPTION TAB */}
                {activeTab === 'rx' && (
                  <div className="space-y-4">
                    {/* Diagnoses */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Diagnoses *</label>
                        <button onClick={addDiagnosis} className="text-xs text-violet-600 hover:underline">+ Add</button>
                      </div>
                      {diagnoses.map((d, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <input type="text" value={d.text}
                            onChange={e => updateDiagnosis(i, 'text', e.target.value)}
                            placeholder="Diagnosis..."
                            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 dark:bg-gray-700" />
                          <select value={d.type} onChange={e => updateDiagnosis(i, 'type', e.target.value)}
                            className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-xs dark:bg-gray-700">
                            <option>Primary</option><option>Secondary</option><option>Differential</option>
                          </select>
                          {i > 0 && <button onClick={() => removeDiagnosis(i)} className="text-red-400 hover:text-red-600 px-2">×</button>}
                        </div>
                      ))}
                    </div>

                    {/* Working diagnosis */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Working Diagnosis *</label>
                      <input type="text" value={form.working_diagnosis}
                        onChange={e => setForm({...form, working_diagnosis: e.target.value})}
                        placeholder="Final working diagnosis..."
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 dark:bg-gray-700" />
                    </div>

                    {/* Add drug */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Prescription</label>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <select value={selectedDrug.drug_id}
                          onChange={e => setSelectedDrug({...selectedDrug, drug_id: e.target.value})}
                          className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-xs dark:bg-gray-700 col-span-2">
                          <option value="">Select drug...</option>
                          {drugs.map(d => <option key={d.id} value={d.id}>{d.generic_name} {d.strength} ({d.dosage_form})</option>)}
                        </select>
                        <input type="number" placeholder="Qty" value={selectedDrug.quantity}
                          onChange={e => setSelectedDrug({...selectedDrug, quantity: e.target.value})}
                          className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-xs dark:bg-gray-700" />
                        <input type="text" placeholder="Dosage e.g. 1 tab" value={selectedDrug.dosage}
                          onChange={e => setSelectedDrug({...selectedDrug, dosage: e.target.value})}
                          className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-xs dark:bg-gray-700" />
                        <select value={selectedDrug.frequency}
                          onChange={e => setSelectedDrug({...selectedDrug, frequency: e.target.value})}
                          className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-xs dark:bg-gray-700">
                          <option>OD</option><option>BD</option><option>TDS</option><option>QID</option><option>PRN</option><option>STAT</option>
                        </select>
                        <input type="text" placeholder="Duration e.g. 5 days" value={selectedDrug.duration}
                          onChange={e => setSelectedDrug({...selectedDrug, duration: e.target.value})}
                          className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-xs dark:bg-gray-700" />
                      </div>
                      <button onClick={addRxItem}
                        className="w-full border border-violet-500 text-violet-600 text-xs py-2 rounded-lg hover:bg-violet-50 font-medium">
                        + Add Drug to Prescription
                      </button>
                    </div>

                    {/* Rx list */}
                    {rxItems.length > 0 && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs font-bold text-gray-500 uppercase">Prescription Items</div>
                        {rxItems.map((r, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-700 text-xs">
                            <div>
                              <span className="font-semibold">{r.drug_name}</span>
                              <span className="text-gray-500 ml-2">Qty:{r.quantity} • {r.dosage} • {r.frequency} • {r.duration}</span>
                            </div>
                            <button onClick={() => setRxItems(rxItems.filter((_,idx)=>idx!==i))} className="text-red-400 hover:text-red-600">×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button onClick={() => setActiveTab('lab')}
                      className="w-full bg-violet-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
                      Next: Lab Orders →
                    </button>
                  </div>
                )}

                {/* LAB TAB */}
                {activeTab === 'lab' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                      Order Lab Tests ({selectedTests.length} selected)
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {tests.map(t => (
                        <label key={t.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition-all
                            ${selectedTests.includes(t.id) ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                          <input type="checkbox" checked={selectedTests.includes(t.id)} onChange={() => toggleTest(t.id)} className="rounded" />
                          <div>
                            <div className="font-medium">{t.name}</div>
                            <div className="text-gray-400">KES {t.price}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <button onClick={() => setActiveTab('plan')}
                      className="w-full mt-3 bg-violet-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
                      Next: Management Plan →
                    </button>
                  </div>
                )}

                {/* PLAN TAB */}
                {activeTab === 'plan' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Management Plan</label>
                      <textarea value={form.management_plan} onChange={e => setForm({...form, management_plan: e.target.value})}
                        rows={3} placeholder="Treatment plan, instructions, advice..."
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 dark:bg-gray-700 resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Follow-up Date</label>
                        <input type="date" value={form.follow_up_date}
                          onChange={e => setForm({...form, follow_up_date: e.target.value})}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 dark:bg-gray-700" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Send Patient To</label>
                        <select value={form.next_stage} onChange={e => setForm({...form, next_stage: e.target.value})}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 dark:bg-gray-700">
                          <option value="Pharmacy">Pharmacy</option>
                          <option value="Investigation">Investigation (Lab)</option>
                          <option value="Procedure">Procedure</option>
                          <option value="Discharged">Discharge</option>
                        </select>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-xs space-y-1">
                      <div className="font-bold text-gray-600 dark:text-gray-300 mb-2">Consultation Summary</div>
                      <div><strong>Complaint:</strong> {form.chief_complaint || '—'}</div>
                      <div><strong>Diagnosis:</strong> {form.working_diagnosis || '—'}</div>
                      <div><strong>Drugs:</strong> {rxItems.length > 0 ? rxItems.map(r=>r.drug_name).join(', ') : 'None'}</div>
                      <div><strong>Lab Tests:</strong> {selectedTests.length > 0 ? `${selectedTests.length} test(s) ordered` : 'None'}</div>
                      <div><strong>Next:</strong> → {form.next_stage}</div>
                    </div>

                    <button onClick={handleSubmit} disabled={submitting}
                      className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-violet-700 disabled:bg-violet-400 transition-colors">
                      {submitting ? 'Saving...' : '✓ Save Consultation & Send Patient'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}