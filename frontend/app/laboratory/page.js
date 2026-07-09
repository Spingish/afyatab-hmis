'use client';
import { useState, useEffect } from 'react';
import { labAPI } from '../../lib/api';

export default function Laboratory() {
  const [requests, setRequests] = useState([]);
  const [tests, setTests]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('today');
  const [msg, setMsg]           = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({
    patient_id:'', visit_id:'', priority:'Normal',
    clinical_notes:'', is_walkin: false, tests:[]
  });

  const load = () => {
    Promise.all([
      tab === 'today' ? labAPI.getToday() : labAPI.getAll(),
      labAPI.getTests()
    ]).then(([r, t]) => {
      setRequests(r.data.requests);
      setTests(t.data.tests);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  const toggleTest = (id) => {
    setForm(f => ({
      ...f,
      tests: f.tests.includes(id) ? f.tests.filter(t => t !== id) : [...f.tests, id]
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!form.patient_id) { setMsg('❌ Patient ID is required'); return; }
      if (!form.tests.length) { setMsg('❌ Select at least one test'); return; }
      const r = await labAPI.create(form);
      setMsg(`✅ Lab request created — ${r.data.request_no}`);
      setShowForm(false);
      setForm({ patient_id:'', visit_id:'', priority:'Normal', clinical_notes:'', is_walkin:false, tests:[] });
      load();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Error creating request'));
    }
  };

  const statusBadge = (s) => {
    const map = { Pending:'bg-yellow-100 text-yellow-700', Processing:'bg-blue-100 text-blue-700', Ready:'bg-green-100 text-green-700', Cancelled:'bg-red-100 text-red-700' };
    return <span className={`text-xs px-2 py-1 rounded-full font-medium ${map[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>;
  };

  const priorityBadge = (p) => {
    const map = { Normal:'bg-gray-100 text-gray-600', Urgent:'bg-orange-100 text-orange-700', Critical:'bg-red-100 text-red-700' };
    return <span className={`text-xs px-2 py-1 rounded-full font-medium ${map[p] || 'bg-gray-100 text-gray-600'}`}>{p}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Laboratory</h1>
          <p className="text-gray-500 text-sm">{requests.length} requests</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + New Request
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg} <button onClick={() => setMsg('')} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* New Request Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="font-bold mb-4">New Lab Request</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Patient ID *</label>
              <input type="number" value={form.patient_id}
                onChange={e => setForm({...form, patient_id: e.target.value})}
                placeholder="Patient database ID"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option>Normal</option><option>Urgent</option><option>Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Walk-in Client?</label>
              <select value={form.is_walkin} onChange={e => setForm({...form, is_walkin: e.target.value === 'true'})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option value="false">No (Hospital Patient)</option>
                <option value="true">Yes (Walk-in)</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Clinical Notes</label>
              <input type="text" value={form.clinical_notes}
                onChange={e => setForm({...form, clinical_notes: e.target.value})}
                placeholder="Brief clinical history"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>

          {/* Test Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
              Select Tests * ({form.tests.length} selected)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              {tests.map(t => (
                <label key={t.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-all
                  ${form.tests.includes(t.id) ? 'bg-blue-50 border border-blue-300 text-blue-700' : 'bg-gray-50 dark:bg-gray-700 border border-transparent hover:border-gray-300'}`}>
                  <input type="checkbox" checked={form.tests.includes(t.id)} onChange={() => toggleTest(t.id)} className="rounded" />
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-gray-400">KES {t.price}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Submit Request
            </button>
            <button onClick={() => setShowForm(false)}
              className="border border-gray-300 px-6 py-2 rounded-lg text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[['today','Today'],['all','All Requests']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 hover:border-blue-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  {['Request No','Patient','Tests','Requested By','Time','Priority','Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No lab requests found</td></tr>
                ) : requests.map(r => (
                  <tr key={r.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-semibold text-blue-600">{r.request_no}</td>
                    <td className="px-4 py-3 font-medium">{r.first_name} {r.last_name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.test_count} test(s)</td>
                    <td className="px-4 py-3 text-gray-500">{r.requested_by_name || 'Walk-in'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.requested_at).toLocaleTimeString('en-KE', {hour:'2-digit',minute:'2-digit'})}</td>
                    <td className="px-4 py-3">{priorityBadge(r.priority)}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-blue-700">View</button>
                        {r.status === 'Pending' && (
                          <button className="bg-green-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-green-700">Enter Results</button>
                        )}
                        {r.status === 'Ready' && (
                          <button className="bg-violet-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-violet-700">Print</button>
                        )}
                      </div>
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