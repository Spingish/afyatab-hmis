'use client';
import { useState, useEffect } from 'react';
import { appointmentAPI, staffAPI } from '../../lib/api';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState('today');
  const [showForm, setShowForm]         = useState(false);
  const [msg, setMsg]                   = useState('');
  const [departments, setDepartments]   = useState([]);
  const [form, setForm]                 = useState({
    patient_id:'', department_id:'', provider_id:'',
    appointment_date:'', appointment_time:'',
    purpose:'', notes:''
  });

  const load = () => {
    Promise.all([
      tab === 'today' ? appointmentAPI.getToday() : appointmentAPI.getAll(),
      staffAPI.getDepartments()
    ]).then(([a, d]) => {
      setAppointments(a.data.appointments);
      setDepartments(d.data.departments);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  const handleSubmit = async () => {
    try {
      if (!form.patient_id || !form.appointment_date) {
        setMsg('❌ Patient ID and date are required'); return;
      }
      const r = await appointmentAPI.create(form);
      setMsg(`✅ Appointment scheduled — ${r.data.appointment_no}`);
      setShowForm(false);
      setForm({ patient_id:'', department_id:'', provider_id:'', appointment_date:'', appointment_time:'', purpose:'', notes:'' });
      load();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Error creating appointment'));
    }
  };

  const updateStatus = async (id, status) => {
    await appointmentAPI.updateStatus(id, { status });
    load();
  };

  const statusBadge = (s) => {
    const map = {
      Scheduled:'bg-blue-100 text-blue-700',
      Visited:'bg-green-100 text-green-700',
      Missed:'bg-red-100 text-red-700',
      LTFU:'bg-gray-100 text-gray-600',
      Rescheduled:'bg-yellow-100 text-yellow-700',
      Cancelled:'bg-red-100 text-red-700'
    };
    return <span className={`text-xs px-2 py-1 rounded-full font-medium ${map[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-gray-500 text-sm">Centralized appointment register — all departments</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + New Appointment
        </button>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg} <button onClick={() => setMsg('')} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* New Appointment Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="font-bold mb-4">Schedule New Appointment</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Patient ID *</label>
              <input type="number" value={form.patient_id}
                onChange={e => setForm({...form, patient_id: e.target.value})}
                placeholder="Patient database ID"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Department</label>
              <select value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option value="">Select department...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date *</label>
              <input type="date" value={form.appointment_date}
                onChange={e => setForm({...form, appointment_date: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Time</label>
              <input type="time" value={form.appointment_time}
                onChange={e => setForm({...form, appointment_time: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Purpose</label>
              <input type="text" value={form.purpose}
                onChange={e => setForm({...form, purpose: e.target.value})}
                placeholder="Reason for appointment"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
              <input type="text" value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
                placeholder="Additional notes"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Schedule Appointment
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
        {[['today','Today'],['all','All Appointments']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 hover:border-blue-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading appointments...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  {['Appt No','Patient','Phone','Department','Provider','Date','Time','Purpose','Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-gray-400">No appointments found</td></tr>
                ) : appointments.map(a => (
                  <tr key={a.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-semibold text-blue-600">{a.appointment_no}</td>
                    <td className="px-4 py-3 font-medium">{a.first_name} {a.last_name}</td>
                    <td className="px-4 py-3 text-gray-500">{a.phone}</td>
                    <td className="px-4 py-3 text-gray-500">{a.department_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{a.provider_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{a.appointment_date}</td>
                    <td className="px-4 py-3 text-gray-500">{a.appointment_time || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-32 truncate">{a.purpose || '—'}</td>
                    <td className="px-4 py-3">{statusBadge(a.status)}</td>
                    <td className="px-4 py-3">
                      <select onChange={e => updateStatus(a.id, e.target.value)} defaultValue=""
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                        <option value="" disabled>Update...</option>
                        {['Visited','Missed','LTFU','Rescheduled','Cancelled'].map(s => (
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