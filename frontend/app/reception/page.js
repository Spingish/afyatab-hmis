'use client';
import { useState, useEffect } from 'react';
import { visitAPI, patientAPI } from '../../lib/api';

export default function Reception() {
  const [queue, setQueue]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]     = useState(false);
  const [msg, setMsg]                 = useState('');
  const [msgType, setMsgType]         = useState('success');
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm]         = useState({
    first_name:'', last_name:'', gender:'Female',
    phone:'', national_id:'', date_of_birth:'',
    county_id:39, allergies:'None',
    kin_name:'', kin_phone:''
  });

  const showMsg = (text, type='success') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  };

  const loadQueue = () => {
    setLoading(true);
    visitAPI.getToday()
      .then(r => setQueue(r.data.visits || []))
      .catch(() => setQueue([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadQueue(); }, []);

  const handleSearch = async (q) => {
    setSearch(q);
    setSearchResults([]);
    if (q.length < 2) return;
    setSearching(true);
    try {
      const r = await patientAPI.search(q);
      setSearchResults(r.data.patients || []);
    } catch (err) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleRegister = async () => {
    if (!regForm.first_name || !regForm.last_name || !regForm.phone) {
      showMsg('First name, last name and phone are required', 'error'); return;
    }
    try {
      const r = await patientAPI.create(regForm);
      showMsg(`✅ Patient ${r.data.patient_no} registered successfully`);
      setShowRegForm(false);
      setRegForm({ first_name:'', last_name:'', gender:'Female', phone:'', national_id:'', date_of_birth:'', county_id:39, allergies:'None', kin_name:'', kin_phone:'' });
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.message || err.response?.data?.error || 'Registration failed'), 'error');
    }
  };

  const startNewVisit = async (patient) => {
    try {
      const r = await visitAPI.startNew({ patient_id: patient.id, patient_type: 'Outpatient', directed_to: 'Triage' });
      showMsg(`✅ New visit ${r.data.visit_no} started for ${patient.first_name} ${patient.last_name}`);
      setSearch(''); setSearchResults([]);
      loadQueue();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Error starting visit'), 'error');
    }
  };

  const continueVisit = async (patient) => {
    try {
      const r = await visitAPI.continueVisit({ patient_id: patient.id, patient_type: 'Outpatient', directed_to: 'Triage' });
      showMsg(`✅ Continuation visit ${r.data.visit_no} — ${r.data.visit_history?.total_visits || 0} previous visits loaded`);
      setSearch(''); setSearchResults([]);
      loadQueue();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Error'), 'error');
    }
  };

  const moveStage = async (id, stage) => {
    try {
      await visitAPI.updateStage(id, stage);
      showMsg(`✅ Patient moved to ${stage}`);
      loadQueue();
    } catch (err) {
      showMsg('❌ Failed to update stage', 'error');
    }
  };

  const stages = ['Reception','Triage','Consultation','Investigation','Procedure','Pharmacy','Discharged'];

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header — single row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Reception</h1>
          <p className="text-gray-500 text-sm">All patients must be registered here first</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-sm font-medium">
            {queue.length} in queue today
          </span>
          <button onClick={() => setShowRegForm(!showRegForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
            + Register New Patient
          </button>
        </div>
      </div>

      {/* Reception Rule */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 mb-4 text-sm text-blue-800">
        <strong>Reception Rule:</strong> ALL patients must pass through Reception before accessing any service.
      </div>

      {/* Message */}
      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm border flex items-center justify-between
          ${msgType === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="ml-3 font-bold">×</button>
        </div>
      )}

      {/* Register Form */}
      {showRegForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">New Patient Registration</h2>
            <button onClick={() => setShowRegForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label:'First Name *',  key:'first_name',   type:'text' },
              { label:'Last Name *',   key:'last_name',    type:'text' },
              { label:'Phone *',       key:'phone',        type:'tel'  },
              { label:'National ID',   key:'national_id',  type:'text' },
              { label:'Date of Birth', key:'date_of_birth',type:'date' },
              { label:'Allergies',     key:'allergies',    type:'text' },
              { label:'Next of Kin',   key:'kin_name',     type:'text' },
              { label:'Kin Phone',     key:'kin_phone',    type:'tel'  },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.label}</label>
                <input type={f.type} value={regForm[f.key]}
                  onChange={e => setRegForm({...regForm, [f.key]: e.target.value})}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Gender</label>
              <select value={regForm.gender} onChange={e => setRegForm({...regForm, gender: e.target.value})}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700">
                <option>Female</option><option>Male</option><option>Other</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleRegister}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
              Register Patient
            </button>
            <button onClick={() => setShowRegForm(false)}
              className="border border-gray-300 px-6 py-2 rounded-lg text-sm hover:border-blue-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Patient Lookup — single search bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-5">
        <h2 className="font-bold text-sm mb-3">Patient Lookup</h2>
        <div className="relative">
          <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus-within:border-blue-500 transition-colors">
            <span className="text-gray-400 text-sm flex-shrink-0">🔍</span>
            <input type="text" value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Type name, phone, ID or patient number..."
              className="flex-1 text-sm outline-none bg-transparent" />
            {searching && <span className="text-gray-400 text-xs flex-shrink-0">Searching...</span>}
            {search && (
              <button onClick={() => { setSearch(''); setSearchResults([]); }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0">×</button>
            )}
          </div>

          {/* Results */}
          {search.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
              {searching ? (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-4 text-center">
                  <p className="text-gray-400 text-sm mb-3">No patient found for "{search}"</p>
                  <button onClick={() => { setSearch(''); setSearchResults([]); setShowRegForm(true); }}
                    className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
                    Register as New Patient
                  </button>
                </div>
              ) : (
                <>
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">
                    {searchResults.length} patient(s) found
                  </div>
                  {searchResults.map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{p.first_name} {p.last_name}</div>
                        <div className="text-xs text-gray-400">{p.patient_no} • {p.phone} • {p.gender}</div>
                        {p.allergies && p.allergies !== 'None' && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full mt-0.5 inline-block">⚠️ {p.allergies}</span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => startNewVisit(p)}
                          className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium">
                          New Visit
                        </button>
                        <button onClick={() => continueVisit(p)}
                          className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium">
                          Continue
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-bold text-sm">Today's Visit Queue</h2>
          <button onClick={loadQueue} className="text-xs text-blue-600 hover:underline">↻ Refresh</button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : queue.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 text-sm mb-3">No visits today yet</p>
            <button onClick={() => setShowRegForm(true)}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
              Register First Patient
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  {['Time','Visit No','Patient','Phone','Type','Stage','Prev. Visits','Move To'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.map(v => (
                  <tr key={v.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{v.visit_time?.slice(0,5)}</td>
                    <td className="px-4 py-3 font-semibold text-blue-600">{v.visit_no}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{v.first_name} {v.last_name}</div>
                      <div className="text-xs text-gray-400">{v.patient_no}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{v.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${v.visit_type === 'Revisit' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {v.visit_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-full">
                        {v.current_stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                      {v.previous_visits_count > 0 ? `${v.previous_visits_count} visit(s)` : 'First visit'}
                    </td>
                    <td className="px-4 py-3">
                      <select onChange={e => { if(e.target.value) { moveStage(v.id, e.target.value); e.target.value=''; }}}
                        defaultValue=""
                        className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs focus:outline-none dark:bg-gray-700">
                        <option value="" disabled>Move to...</option>
                        {stages.filter(s => s !== v.current_stage).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
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