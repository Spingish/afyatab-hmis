'use client';
import { useState, useEffect } from 'react';
import { inpatientAPI, patientAPI, staffAPI } from '../../lib/api';

const calcAge = (dob) => {
  if (!dob) return '—';
  const y = Math.floor((Date.now()-new Date(dob))/(365.25*24*3600*1000));
  return y < 1 ? `${Math.floor((Date.now()-new Date(dob))/(30.44*24*3600*1000))}mo` : `${y}yrs`;
};

export default function Inpatient() {
  const [wards, setWards]           = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [wardTypes, setWardTypes]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('wards');
  const [msg, setMsg]               = useState('');
  const [msgType, setMsgType]       = useState('success');
  const [selectedWard, setSelectedWard]   = useState(null);
  const [wardBeds, setWardBeds]           = useState([]);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [admissionDetail, setAdmissionDetail]     = useState(null);

  // Forms
  const [showWardForm, setShowWardForm]   = useState(false);
  const [showAdmitForm, setShowAdmitForm] = useState(false);
  const [showNoteForm, setShowNoteForm]   = useState(false);
  const [showDischargeForm, setShowDischargeForm] = useState(false);

  const [wardForm, setWardForm] = useState({ name:'', ward_type_id:'', total_beds:'', department_id:'' });
  const [admitForm, setAdmitForm] = useState({ patient_id:'', visit_id:'', ward_id:'', bed_id:'', admitting_doctor_id:'', admission_diagnosis:'', admission_notes:'' });
  const [noteForm, setNoteForm] = useState({ note:'', note_type:'Progress', vitals_temp:'', vitals_bp:'', vitals_pulse:'', vitals_spo2:'' });
  const [dischargeForm, setDischargeForm] = useState({ discharge_diagnosis:'', discharge_notes:'', discharge_condition:'Improved' });

  const [availableBeds, setAvailableBeds] = useState([]);

  const showMsg = (text, type='success') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [w, a, wt] = await Promise.all([
        inpatientAPI.getWards(),
        inpatientAPI.getAdmissions('Admitted'),
        inpatientAPI.getWardTypes()
      ]);
      setWards(w.data.wards || []);
      setAdmissions(a.data.admissions || []);
      setWardTypes(wt.data.ward_types || []);
    } catch { setWards([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openWard = async (ward) => {
    setSelectedWard(ward);
    try {
      const r = await inpatientAPI.getWardBeds(ward.id);
      setWardBeds(r.data.beds || []);
    } catch { setWardBeds([]); }
  };

  const openAdmission = async (adm) => {
    setSelectedAdmission(adm);
    try {
      const r = await inpatientAPI.getAdmission(adm.id);
      setAdmissionDetail(r.data);
    } catch { setAdmissionDetail(null); }
    setTab('admissions');
  };

  const loadBedsForWard = async (ward_id) => {
    try {
      const r = await inpatientAPI.getWardBeds(ward_id);
      setAvailableBeds((r.data.beds||[]).filter(b => b.status==='Available'));
    } catch { setAvailableBeds([]); }
  };

  const handleCreateWard = async () => {
    if (!wardForm.name || !wardForm.total_beds) { showMsg('Ward name and bed count required', 'error'); return; }
    try {
      await inpatientAPI.createWard(wardForm);
      showMsg(`✅ Ward ${wardForm.name} created successfully`);
      setShowWardForm(false);
      setWardForm({ name:'', ward_type_id:'', total_beds:'', department_id:'' });
      load();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Error creating ward'), 'error');
    }
  };

  const handleAdmit = async () => {
    if (!admitForm.patient_id || !admitForm.ward_id || !admitForm.bed_id) {
      showMsg('Patient ID, ward and bed are required', 'error'); return;
    }
    try {
      const r = await inpatientAPI.admit(admitForm);
      showMsg(`✅ Patient admitted — ${r.data.admission_no}`);
      setShowAdmitForm(false);
      setAdmitForm({ patient_id:'', visit_id:'', ward_id:'', bed_id:'', admitting_doctor_id:'', admission_diagnosis:'', admission_notes:'' });
      load();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Error admitting patient'), 'error');
    }
  };

  const handleAddNote = async () => {
    if (!noteForm.note) { showMsg('Note content required', 'error'); return; }
    const user = JSON.parse(localStorage.getItem('afyatab_user')||'{}');
    try {
      await inpatientAPI.addNote(selectedAdmission.id, { ...noteForm, written_by: user.staff_id||1 });
      showMsg('✅ Nursing note saved');
      setShowNoteForm(false);
      setNoteForm({ note:'', note_type:'Progress', vitals_temp:'', vitals_bp:'', vitals_pulse:'', vitals_spo2:'' });
      openAdmission(selectedAdmission);
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Error saving note'), 'error');
    }
  };

  const handleDischarge = async () => {
    if (!dischargeForm.discharge_diagnosis) { showMsg('Discharge diagnosis required', 'error'); return; }
    const user = JSON.parse(localStorage.getItem('afyatab_user')||'{}');
    try {
      await inpatientAPI.discharge(selectedAdmission.id, { ...dischargeForm, discharged_by: user.staff_id||1 });
      showMsg(`✅ Patient discharged successfully`);
      setShowDischargeForm(false);
      setSelectedAdmission(null);
      setAdmissionDetail(null);
      load();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Error discharging patient'), 'error');
    }
  };

  const occupancyColor = (pct) => {
    if (!pct) return 'bg-green-500';
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const bedColor = (status) => {
    const map = { Available:'bg-green-100 border-green-300 text-green-700', Occupied:'bg-red-100 border-red-300 text-red-700', Reserved:'bg-yellow-100 border-yellow-300 text-yellow-700', Maintenance:'bg-gray-100 border-gray-300 text-gray-500' };
    return map[status] || 'bg-gray-100 border-gray-300';
  };

  const totalBeds     = wards.reduce((s,w) => s + parseInt(w.total_beds_count||0), 0);
  const totalOccupied = wards.reduce((s,w) => s + parseInt(w.occupied||0), 0);
  const totalAvailable= wards.reduce((s,w) => s + parseInt(w.available||0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Inpatient / Wards</h1>
          <p className="text-gray-500 text-sm">{admissions.length} admitted • {totalAvailable} beds available</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAdmitForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
            + Admit Patient
          </button>
          <button onClick={() => setShowWardForm(true)}
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:border-blue-500 text-gray-600">
            + Add Ward
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Beds',      value: totalBeds,      icon:'🛏️', color:'border-blue-500'   },
          { label:'Occupied',        value: totalOccupied,  icon:'🔴', color:'border-red-500'    },
          { label:'Available',       value: totalAvailable, icon:'🟢', color:'border-green-500'  },
          { label:'Active Wards',    value: wards.length,   icon:'🏥', color:'border-violet-500' },
        ].map(s => (
          <div key={s.label} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 ${s.color} rounded-xl p-4`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{s.label}</p>
                <p className="text-3xl font-bold">{s.value}</p>
              </div>
              <span className="text-2xl">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm border flex items-center justify-between
          ${msgType==='success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          <span>{msg}</span><button onClick={()=>setMsg('')} className="ml-3 font-bold">×</button>
        </div>
      )}

      {/* Add Ward Form */}
      {showWardForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-5">
          <h2 className="font-bold mb-4">Create New Ward</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ward Name *</label>
              <input type="text" value={wardForm.name} onChange={e => setWardForm({...wardForm, name:e.target.value})}
                placeholder="e.g. Ward A, Maternity"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ward Type</label>
              <select value={wardForm.ward_type_id} onChange={e => setWardForm({...wardForm, ward_type_id:e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option value="">Select type...</option>
                {wardTypes.map(wt => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Total Beds *</label>
              <input type="number" value={wardForm.total_beds} onChange={e => setWardForm({...wardForm, total_beds:e.target.value})}
                placeholder="e.g. 12"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreateWard} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">Create Ward</button>
            <button onClick={() => setShowWardForm(false)} className="border border-gray-300 px-6 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Admit Patient Form */}
      {showAdmitForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-5">
          <h2 className="font-bold mb-4">Admit Patient</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Patient ID *</label>
              <input type="number" value={admitForm.patient_id} onChange={e => setAdmitForm({...admitForm, patient_id:e.target.value})}
                placeholder="Database patient ID"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Visit ID (optional)</label>
              <input type="number" value={admitForm.visit_id} onChange={e => setAdmitForm({...admitForm, visit_id:e.target.value})}
                placeholder="Linked visit ID"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ward *</label>
              <select value={admitForm.ward_id} onChange={e => { setAdmitForm({...admitForm, ward_id:e.target.value, bed_id:''}); loadBedsForWard(e.target.value); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option value="">Select ward...</option>
                {wards.map(w => <option key={w.id} value={w.id}>{w.name} ({w.available} available)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bed *</label>
              <select value={admitForm.bed_id} onChange={e => setAdmitForm({...admitForm, bed_id:e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option value="">Select bed...</option>
                {availableBeds.map(b => <option key={b.id} value={b.id}>{b.bed_no}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Admitting Doctor ID</label>
              <input type="number" value={admitForm.admitting_doctor_id} onChange={e => setAdmitForm({...admitForm, admitting_doctor_id:e.target.value})}
                placeholder="Staff ID"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Admission Diagnosis *</label>
              <input type="text" value={admitForm.admission_diagnosis} onChange={e => setAdmitForm({...admitForm, admission_diagnosis:e.target.value})}
                placeholder="Primary diagnosis for admission"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Admission Notes</label>
              <textarea value={admitForm.admission_notes} onChange={e => setAdmitForm({...admitForm, admission_notes:e.target.value})}
                rows={2} placeholder="Additional notes..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleAdmit} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">Admit Patient</button>
            <button onClick={() => setShowAdmitForm(false)} className="border border-gray-300 px-6 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
        {[['wards','🏥 Ward Map'],['admissions','🛏️ Admitted Patients'],['discharged','✅ Discharged']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab===key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading...</div>
      ) : (
        <>
          {/* WARD MAP */}
          {tab === 'wards' && (
            <div>
              {wards.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
                  <p className="text-4xl mb-3">🏥</p>
                  <p className="text-gray-400 text-sm mb-3">No wards created yet</p>
                  <button onClick={() => setShowWardForm(true)}
                    className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
                    Create First Ward
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {wards.map(w => (
                    <div key={w.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => openWard(w)}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-base">{w.name}</h3>
                          <p className="text-xs text-gray-400">{w.ward_type} • {w.department_name}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold
                          ${parseFloat(w.occupancy_pct||0)>=90 ? 'bg-red-100 text-red-700' :
                            parseFloat(w.occupancy_pct||0)>=70 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'}`}>
                          {w.occupancy_pct||0}%
                        </span>
                      </div>

                      {/* Occupancy bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{w.occupied} occupied</span>
                          <span>{w.available} available</span>
                        </div>
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-3 rounded-full transition-all ${occupancyColor(w.occupancy_pct)}`}
                            style={{ width: `${w.occupancy_pct||0}%` }}></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-red-50 rounded-lg p-2">
                          <div className="font-bold text-red-700 text-lg">{w.occupied||0}</div>
                          <div className="text-red-400">Occupied</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                          <div className="font-bold text-green-700 text-lg">{w.available||0}</div>
                          <div className="text-green-400">Available</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                          <div className="font-bold text-gray-700 dark:text-gray-200 text-lg">{w.total_beds_count||0}</div>
                          <div className="text-gray-400">Total</div>
                        </div>
                      </div>

                      {/* Bed grid */}
                      {selectedWard?.id === w.id && wardBeds.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="text-xs font-bold text-gray-400 uppercase mb-2">Bed Map</div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {wardBeds.map(b => (
                              <div key={b.id}
                                className={`border rounded-lg p-1.5 text-center text-xs font-medium cursor-pointer ${bedColor(b.status)}`}
                                title={b.patient_name || b.status}>
                                <div className="font-bold">{b.bed_no}</div>
                                <div className="text-xs opacity-70 truncate">{b.patient_name ? b.patient_name.split(' ')[0] : b.status}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ADMITTED PATIENTS */}
          {tab === 'admissions' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* List */}
              <div>
                <h2 className="font-bold text-sm mb-3">Currently Admitted ({admissions.length})</h2>
                {admissions.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
                    <p className="text-4xl mb-3">🛏️</p>
                    <p className="text-gray-400 text-sm">No patients currently admitted</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {admissions.map(a => (
                      <div key={a.id}
                        onClick={() => openAdmission(a)}
                        className={`bg-white dark:bg-gray-800 border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md
                          ${selectedAdmission?.id===a.id ? 'border-blue-500 shadow-md' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {a.first_name?.[0]}{a.last_name?.[0]}
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{a.first_name} {a.last_name}</div>
                              <div className="text-xs text-gray-400">{a.patient_no} • {a.gender} • {calcAge(a.date_of_birth)}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{a.admission_no}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-blue-600">{a.ward_name}</div>
                            <div className="text-xs text-gray-400">Bed {a.bed_no}</div>
                            <div className="text-xs text-gray-400">{a.days_admitted} day(s)</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-1.5">
                          <strong>Dx:</strong> {a.admission_diagnosis || '—'}
                        </div>
                        {a.allergies && a.allergies !== 'None' && (
                          <div className="mt-1 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">⚠️ {a.allergies}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detail Panel */}
              <div>
                {!selectedAdmission ? (
                  <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
                    <p className="text-4xl mb-3">🛏️</p>
                    <p className="text-gray-400 text-sm">Select a patient to view details</p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    {/* Patient header */}
                    <div className="bg-green-600 p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold">
                            {selectedAdmission.first_name?.[0]}{selectedAdmission.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-bold">{selectedAdmission.first_name} {selectedAdmission.last_name}</div>
                            <div className="text-green-200 text-xs">{selectedAdmission.patient_no} • {selectedAdmission.ward_name} • Bed {selectedAdmission.bed_no}</div>
                            <div className="text-green-200 text-xs">{selectedAdmission.admission_no} • {selectedAdmission.days_admitted} day(s) admitted</div>
                          </div>
                        </div>
                        <button onClick={() => { setSelectedAdmission(null); setAdmissionDetail(null); }} className="text-white/70 hover:text-white text-xl">×</button>
                      </div>
                    </div>

                    <div className="p-4">
                      {/* Info */}
                      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                        <div><span className="text-gray-400">Doctor:</span> <span className="font-medium">{selectedAdmission.doctor_name||'—'}</span></div>
                        <div><span className="text-gray-400">Admitted:</span> <span className="font-medium">{new Date(selectedAdmission.admission_date).toLocaleDateString('en-KE')}</span></div>
                        <div><span className="text-gray-400">Blood Group:</span> <span className="font-medium">{selectedAdmission.blood_group||'Unknown'}</span></div>
                        <div><span className="text-gray-400">Diagnosis:</span> <span className="font-medium">{selectedAdmission.admission_diagnosis||'—'}</span></div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 mb-4">
                        <button onClick={() => setShowNoteForm(!showNoteForm)}
                          className="flex-1 bg-blue-600 text-white text-xs py-2 rounded-lg hover:bg-blue-700 font-medium">
                          📝 Add Nursing Note
                        </button>
                        <button onClick={() => setShowDischargeForm(!showDischargeForm)}
                          className="flex-1 bg-red-600 text-white text-xs py-2 rounded-lg hover:bg-red-700 font-medium">
                          🚪 Discharge Patient
                        </button>
                      </div>

                      {/* Nursing Note Form */}
                      {showNoteForm && (
                        <div className="border border-blue-200 rounded-xl p-4 mb-4 bg-blue-50 dark:bg-blue-900/20">
                          <div className="font-bold text-sm mb-3 text-blue-700">New Nursing Note</div>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">Note Type</label>
                              <select value={noteForm.note_type} onChange={e => setNoteForm({...noteForm, note_type:e.target.value})}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none dark:bg-gray-700 dark:border-gray-600">
                                <option>Progress</option><option>Handover</option><option>Observation</option><option>Incident</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">Temperature</label>
                              <input type="number" step="0.1" placeholder="°C" value={noteForm.vitals_temp}
                                onChange={e => setNoteForm({...noteForm, vitals_temp:e.target.value})}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">BP</label>
                              <input type="text" placeholder="120/80" value={noteForm.vitals_bp}
                                onChange={e => setNoteForm({...noteForm, vitals_bp:e.target.value})}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">Pulse</label>
                              <input type="number" placeholder="bpm" value={noteForm.vitals_pulse}
                                onChange={e => setNoteForm({...noteForm, vitals_pulse:e.target.value})}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                          </div>
                          <textarea value={noteForm.note} onChange={e => setNoteForm({...noteForm, note:e.target.value})}
                            rows={3} placeholder="Write nursing note here..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none dark:bg-gray-700 dark:border-gray-600 resize-none" />
                          <div className="flex gap-2">
                            <button onClick={handleAddNote} className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">Save Note</button>
                            <button onClick={() => setShowNoteForm(false)} className="border border-gray-300 text-xs px-4 py-2 rounded-lg">Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* Discharge Form */}
                      {showDischargeForm && (
                        <div className="border border-red-200 rounded-xl p-4 mb-4 bg-red-50 dark:bg-red-900/20">
                          <div className="font-bold text-sm mb-3 text-red-700">Discharge Patient</div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">Discharge Diagnosis *</label>
                              <input type="text" value={dischargeForm.discharge_diagnosis}
                                onChange={e => setDischargeForm({...dischargeForm, discharge_diagnosis:e.target.value})}
                                placeholder="Final diagnosis at discharge"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">Condition at Discharge</label>
                              <select value={dischargeForm.discharge_condition}
                                onChange={e => setDischargeForm({...dischargeForm, discharge_condition:e.target.value})}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none dark:bg-gray-700 dark:border-gray-600">
                                <option>Improved</option><option>Recovered</option><option>Transferred</option><option>LAMA</option><option>Deceased</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">Discharge Notes</label>
                              <textarea value={dischargeForm.discharge_notes}
                                onChange={e => setDischargeForm({...dischargeForm, discharge_notes:e.target.value})}
                                rows={2} placeholder="Summary, instructions, follow-up..."
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none dark:bg-gray-700 dark:border-gray-600 resize-none" />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button onClick={handleDischarge} className="bg-red-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-red-700 font-medium">Confirm Discharge</button>
                            <button onClick={() => setShowDischargeForm(false)} className="border border-gray-300 text-xs px-4 py-2 rounded-lg">Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* Nursing Notes */}
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase mb-2">
                          Nursing Notes ({admissionDetail?.notes?.length || 0})
                        </div>
                        {!admissionDetail?.notes?.length ? (
                          <p className="text-gray-400 text-xs text-center py-4">No notes yet</p>
                        ) : admissionDetail.notes.map((n,i) => (
                          <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 mb-2">
                            <div className="flex justify-between items-start mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                ${n.note_type==='Progress' ? 'bg-blue-100 text-blue-700' : n.note_type==='Handover' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                {n.note_type}
                              </span>
                              <span className="text-xs text-gray-400">{new Date(n.written_at).toLocaleString('en-KE')}</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{n.note}</p>
                            {(n.vitals_temp || n.vitals_bp || n.vitals_pulse) && (
                              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                {n.vitals_temp && <span>🌡️ {n.vitals_temp}°C</span>}
                                {n.vitals_bp   && <span>🩺 {n.vitals_bp}</span>}
                                {n.vitals_pulse && <span>💓 {n.vitals_pulse}bpm</span>}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">— {n.nurse_name || 'Nurse'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DISCHARGED */}
          {tab === 'discharged' && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-bold text-sm">Discharged Patients</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      {['Admission No','Patient','Ward','Bed','Admitted','Discharged','Days','Condition','Doctor'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={9} className="text-center py-8 text-gray-400">Click to load discharged patients</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}