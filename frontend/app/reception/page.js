'use client';
import { useState, useEffect } from 'react';
import { visitAPI, patientAPI } from '../../lib/api';

export default function Reception() {
  const [queue, setQueue]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [msg, setMsg]           = useState('');

  const loadQueue = () => {
    visitAPI.getToday().then(r => setQueue(r.data.visits)).finally(() => setLoading(false));
  };

  useEffect(() => { loadQueue(); }, []);

  const handleSearch = async (q) => {
    setSearch(q);
    setSelectedPatient(null);
    if (q.length < 2) { setSearchResults([]); return; }
    const r = await patientAPI.search(q);
    setSearchResults(r.data.patients);
  };

  const startNewVisit = async (patient_id) => {
    try {
      const r = await visitAPI.startNew({ patient_id, patient_type: 'Outpatient', directed_to: 'Triage' });
      setMsg(`✅ New visit started — ${r.data.visit_no}`);
      setSearch(''); setSearchResults([]); setSelectedPatient(null);
      loadQueue();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Error starting visit'));
    }
  };

  const continueVisit = async (patient_id) => {
    try {
      const r = await visitAPI.continueVisit({ patient_id, patient_type: 'Outpatient', directed_to: 'Triage' });
      setMsg(`✅ Continuation visit — ${r.data.visit_no} (${r.data.visit_history.total_visits} previous visits loaded)`);
      setSearch(''); setSearchResults([]); setSelectedPatient(null);
      loadQueue();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Error'));
    }
  };

  const moveStage = async (id, stage) => {
    await visitAPI.updateStage(id, stage);
    loadQueue();
  };

  const stages = ['Reception','Triage','Consultation','Investigation','Procedure','Pharmacy','Discharged'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reception</h1>
          <p className="text-gray-500 text-sm">All patients must be registered here first</p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg font-medium">{queue.length} in queue today</span>
        </div>
      </div>

      {/* Alert */}
      <div className="bg-blue-50 border border-blue-200 border-l-4 border-l-blue-500 rounded-lg p-3 mb-4 text-sm text-blue-800">
        <strong>Reception Rule:</strong> ALL patients must pass through Reception before accessing any service.
      </div>

      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg} <button onClick={() => setMsg('')} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Patient Lookup */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="font-bold text-sm mb-3">Patient Lookup</h2>
        <div className="flex gap-3">
          <input type="text" placeholder="Search by name, phone, ID or patient number..."
            value={search} onChange={e => handleSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {searchResults.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 last:border-0">
                <div>
                  <div className="font-semibold text-sm">{p.first_name} {p.last_name}</div>
                  <div className="text-xs text-gray-500">{p.patient_no} • {p.phone} • {p.gender}</div>
                  {p.allergies && p.allergies !== 'None' && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">⚠️ {p.allergies}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startNewVisit(p.id)}
                    className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700">
                    New Visit
                  </button>
                  <button onClick={() => continueVisit(p.id)}
                    className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700">
                    Continue Visit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's Queue */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-bold text-sm">Today's Visit Queue</h2>
          <button onClick={loadQueue} className="text-xs text-blue-600 hover:underline">Refresh</button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading queue...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  {['Time','Visit No','Patient','Phone','Type','Stage','Previous Visits','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No visits today yet</td></tr>
                ) : queue.map(v => (
                  <tr key={v.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-gray-500 text-xs">{v.visit_time?.slice(0,5)}</td>
                    <td className="px-4 py-3 font-semibold text-blue-600">{v.visit_no}</td>
                    <td className="px-4 py-3 font-medium">{v.first_name} {v.last_name}</td>
                    <td className="px-4 py-3 text-gray-500">{v.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${v.visit_type === 'Revisit' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {v.visit_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-full">{v.current_stage}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{v.previous_visits_count}</td>
                    <td className="px-4 py-3">
                      <select onChange={e => moveStage(v.id, e.target.value)} defaultValue=""
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                        <option value="" disabled>Move to...</option>
                        {stages.map(s => <option key={s} value={s}>{s}</option>)}
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