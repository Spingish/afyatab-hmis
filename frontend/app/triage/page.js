'use client';
import { useState, useEffect } from 'react';
import { triageAPI, visitAPI } from '../../lib/api';

const priorityConfig = {
  Emergency: { color: 'bg-red-600',    text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-500',    badge: 'bg-red-100 text-red-700'    },
  Urgent:    { color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-500', badge: 'bg-orange-100 text-orange-700'},
  High:      { color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-500', badge: 'bg-yellow-100 text-yellow-700'},
  Normal:    { color: 'bg-blue-500',   text: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-500',   badge: 'bg-blue-100 text-blue-700'   },
  Low:       { color: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-500',  badge: 'bg-green-100 text-green-700' },
};

const calcAge = (dob) => {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return years < 1 ? `${Math.floor(diff / (30.44 * 24 * 3600 * 1000))} months` : `${years} yrs`;
};

const VitalFlag = ({ label, value, unit, low, high, critLow, critHigh }) => {
  if (!value) return null;
  const v = parseFloat(value);
  let status = 'normal';
  if (critLow && v < critLow) status = 'critical';
  else if (critHigh && v > critHigh) status = 'critical';
  else if (low && v < low) status = 'low';
  else if (high && v > high) status = 'high';
  const colors = { normal:'text-green-600', low:'text-yellow-600', high:'text-yellow-600', critical:'text-red-600' };
  return (
    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className={`text-xl font-bold ${colors[status]}`}>{value}<span className="text-xs font-normal ml-1">{unit}</span></div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {status !== 'normal' && <div className={`text-xs font-semibold ${colors[status]} mt-0.5`}>{status === 'critical' ? '⚠️ Critical' : status === 'low' ? '↓ Low' : '↑ High'}</div>}
    </div>
  );
};

export default function Triage() {
  const [pending, setPending]   = useState([]);
  const [done, setDone]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg]           = useState('');
  const [msgType, setMsgType]   = useState('success');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]         = useState({
    temperature:'', blood_pressure_systolic:'', blood_pressure_diastolic:'',
    pulse_rate:'', respiratory_rate:'', oxygen_saturation:'',
    weight_kg:'', height_cm:'', muac_cm:'',
    priority:'Normal', chief_complaint:''
  });

  const showMsg = (text, type='success') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [p, d] = await Promise.all([
        triageAPI.getPending(),
        triageAPI.getToday()
      ]);
      setPending(p.data.pending || []);
      setDone(d.data.triage || []);
    } catch (err) {
      showMsg('Failed to load triage data', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openTriage = (patient) => {
    setSelected(patient);
    setForm({
      temperature:'', blood_pressure_systolic:'', blood_pressure_diastolic:'',
      pulse_rate:'', respiratory_rate:'', oxygen_saturation:'',
      weight_kg:'', height_cm:'', muac_cm:'',
      priority:'Normal', chief_complaint:''
    });
  };

  const handleSubmit = async () => {
    if (!form.chief_complaint) { showMsg('Chief complaint is required', 'error'); return; }
    setSubmitting(true);
    try {
      await triageAPI.create({
        visit_id:   selected.visit_id,
        patient_id: selected.patient_id,
        ...form,
        temperature:              form.temperature || null,
        blood_pressure_systolic:  form.blood_pressure_systolic || null,
        blood_pressure_diastolic: form.blood_pressure_diastolic || null,
        pulse_rate:               form.pulse_rate || null,
        respiratory_rate:         form.respiratory_rate || null,
        oxygen_saturation:        form.oxygen_saturation || null,
        weight_kg:                form.weight_kg || null,
        height_cm:                form.height_cm || null,
        muac_cm:                  form.muac_cm || null,
      });

      // Move to Consultation
      await visitAPI.updateStage(selected.visit_id, 'Consultation');

      showMsg(`✅ Triage complete for ${selected.first_name} ${selected.last_name} — moved to Consultation`);
      setSelected(null);
      load();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Error saving triage'), 'error');
    } finally { setSubmitting(false); }
  };

  const bmi = form.weight_kg && form.height_cm
    ? (parseFloat(form.weight_kg) / Math.pow(parseFloat(form.height_cm) / 100, 2)).toFixed(1)
    : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Triage</h1>
          <p className="text-gray-500 text-sm">{pending.length} patients waiting to be triaged</p>
        </div>
        <div className="flex gap-3">
          <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-sm font-medium">
            {pending.length} pending
          </span>
          <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-sm font-medium">
            {done.length} done today
          </span>
          <button onClick={load} className="border border-gray-200 px-3 py-1.5 rounded-lg text-sm hover:border-blue-500 text-gray-500">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Priority Legend */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(priorityConfig).map(([p, c]) => (
          <span key={p} className={`text-xs px-3 py-1 rounded-full font-medium ${c.badge}`}>● {p}</span>
        ))}
      </div>

      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm border flex items-center justify-between
          ${msgType === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="ml-3 font-bold">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT — Pending Queue */}
        <div>
          <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Pending Triage
          </h2>
          {loading ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center text-gray-400">Loading...</div>
          ) : pending.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-gray-400 text-sm">No patients waiting for triage</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(p => (
                <div key={p.visit_id}
                  className={`bg-white dark:bg-gray-800 border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md
                    ${selected?.visit_id === p.visit_id ? 'border-blue-500 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
                  onClick={() => openTriage(p)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{p.first_name} {p.last_name}</div>
                        <div className="text-xs text-gray-400">{p.patient_no} • {p.gender} • {calcAge(p.date_of_birth)}</div>
                        <div className="text-xs text-gray-400">{p.visit_no} • {p.visit_type}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.visit_type === 'Revisit' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {p.visit_type}
                      </span>
                      {p.previous_visits > 0 && (
                        <span className="text-xs text-gray-400">{p.previous_visits} prev visit(s)</span>
                      )}
                    </div>
                  </div>
                  {p.allergies && p.allergies !== 'None' && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-xs text-red-700">
                      ⚠️ <strong>Allergy:</strong> {p.allergies}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Arrived: {p.visit_time?.slice(0,5)}</span>
                    <button className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium">
                      Start Triage →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Done Today */}
          {done.length > 0 && (
            <div className="mt-5">
              <h2 className="font-bold text-sm mb-3 text-gray-500">Triaged Today ({done.length})</h2>
              <div className="space-y-2">
                {done.map(t => {
                  const pc = priorityConfig[t.priority] || priorityConfig.Normal;
                  return (
                    <div key={t.id} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 ${pc.border} rounded-xl p-3 flex items-center justify-between`}>
                      <div>
                        <div className="font-medium text-sm">{t.first_name} {t.last_name}</div>
                        <div className="text-xs text-gray-400">{t.patient_no} • {t.visit_no}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{t.chief_complaint}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${pc.badge}`}>{t.priority}</span>
                        <span className="text-xs text-gray-400">{new Date(t.triaged_at).toLocaleTimeString('en-KE', {hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Triage Form */}
        <div>
          {!selected ? (
            <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
              <p className="text-4xl mb-3">🩺</p>
              <p className="text-gray-400 text-sm font-medium">Select a patient from the queue</p>
              <p className="text-gray-300 text-xs mt-1">Click on a patient card to begin triage</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              {/* Patient Header */}
              <div className="bg-blue-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold">
                      {selected.first_name?.[0]}{selected.last_name?.[0]}
                    </div>
                    <div>
                      <div className="font-bold">{selected.first_name} {selected.last_name}</div>
                      <div className="text-blue-200 text-xs">{selected.patient_no} • {selected.gender} • {calcAge(selected.date_of_birth)} • {selected.visit_no}</div>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-white/70 hover:text-white text-xl">×</button>
                </div>
                {selected.allergies && selected.allergies !== 'None' && (
                  <div className="mt-2 bg-red-500/30 rounded-lg px-3 py-1.5 text-xs">
                    ⚠️ <strong>Allergy:</strong> {selected.allergies}
                  </div>
                )}
              </div>

              <div className="p-5">
                {/* Priority */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Triage Priority</label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(priorityConfig).map(([p, c]) => (
                      <button key={p} type="button"
                        onClick={() => setForm({...form, priority: p})}
                        className={`py-2 rounded-lg text-xs font-bold transition-all border-2
                          ${form.priority === p ? `${c.color} text-white border-transparent` : `bg-gray-50 dark:bg-gray-700 ${c.text} border-gray-200 dark:border-gray-600 hover:border-current`}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chief Complaint */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Chief Complaint *</label>
                  <textarea value={form.chief_complaint}
                    onChange={e => setForm({...form, chief_complaint: e.target.value})}
                    rows={2} placeholder="Patient's main complaint / reason for visit..."
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 resize-none" />
                </div>

                {/* Vitals */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Vital Signs</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Temperature (°C)</label>
                      <input type="number" step="0.1" value={form.temperature}
                        onChange={e => setForm({...form, temperature: e.target.value})}
                        placeholder="36.5"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Pulse Rate (bpm)</label>
                      <input type="number" value={form.pulse_rate}
                        onChange={e => setForm({...form, pulse_rate: e.target.value})}
                        placeholder="72"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">BP Systolic (mmHg)</label>
                      <input type="number" value={form.blood_pressure_systolic}
                        onChange={e => setForm({...form, blood_pressure_systolic: e.target.value})}
                        placeholder="120"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">BP Diastolic (mmHg)</label>
                      <input type="number" value={form.blood_pressure_diastolic}
                        onChange={e => setForm({...form, blood_pressure_diastolic: e.target.value})}
                        placeholder="80"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Respiratory Rate</label>
                      <input type="number" value={form.respiratory_rate}
                        onChange={e => setForm({...form, respiratory_rate: e.target.value})}
                        placeholder="18"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">SpO2 (%)</label>
                      <input type="number" value={form.oxygen_saturation}
                        onChange={e => setForm({...form, oxygen_saturation: e.target.value})}
                        placeholder="98"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Weight (kg)</label>
                      <input type="number" step="0.1" value={form.weight_kg}
                        onChange={e => setForm({...form, weight_kg: e.target.value})}
                        placeholder="70"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Height (cm)</label>
                      <input type="number" step="0.1" value={form.height_cm}
                        onChange={e => setForm({...form, height_cm: e.target.value})}
                        placeholder="165"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700" />
                    </div>
                  </div>

                  {/* BMI auto-calculation */}
                  {bmi && (
                    <div className={`mt-3 p-3 rounded-lg text-sm font-semibold text-center
                      ${parseFloat(bmi) < 18.5 ? 'bg-yellow-50 text-yellow-700' : parseFloat(bmi) > 30 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      BMI: {bmi} — {parseFloat(bmi) < 18.5 ? 'Underweight' : parseFloat(bmi) < 25 ? 'Normal' : parseFloat(bmi) < 30 ? 'Overweight' : 'Obese'}
                    </div>
                  )}
                </div>

                {/* Live Vital Flags */}
                {(form.temperature || form.pulse_rate || form.oxygen_saturation) && (
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Vital Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      <VitalFlag label="Temp" value={form.temperature} unit="°C" low={36} high={37.5} critLow={35} critHigh={39} />
                      <VitalFlag label="Pulse" value={form.pulse_rate} unit="bpm" low={60} high={100} critLow={40} critHigh={140} />
                      <VitalFlag label="SpO2" value={form.oxygen_saturation} unit="%" low={95} critLow={90} />
                    </div>
                  </div>
                )}

                {/* Submit */}
                <div className="flex gap-3 mt-4">
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-400 transition-colors">
                    {submitting ? 'Saving...' : '✓ Complete Triage & Send to Consultation'}
                  </button>
                  <button onClick={() => setSelected(null)}
                    className="border border-gray-300 px-4 py-3 rounded-xl text-sm hover:border-red-400 text-gray-500">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}