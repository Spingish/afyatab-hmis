'use client';
import { useState, useEffect } from 'react';
import { staffAPI } from '../../lib/api';

export default function Staff() {
  const [staff, setStaff]         = useState([]);
  const [roles, setRoles]         = useState([]);
  const [departments, setDepts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [msg, setMsg]             = useState('');
  const [form, setForm]           = useState({
    first_name:'', last_name:'', gender:'Male',
    phone:'', email:'', national_id:'',
    role_id:'', department_id:'',
    shift:'Day', hire_date:''
  });

  const load = () => {
    Promise.all([
      staffAPI.getAll(),
      staffAPI.getRoles(),
      staffAPI.getDepartments()
    ]).then(([s, r, d]) => {
      setStaff(s.data.staff);
      setRoles(r.data.roles);
      setDepts(d.data.departments);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    try {
      if (!form.first_name || !form.last_name || !form.role_id) {
        setMsg('❌ First name, last name and role are required'); return;
      }
      await staffAPI.create(form);
      setMsg('✅ Staff member added successfully');
      setShowForm(false);
      setForm({ first_name:'', last_name:'', gender:'Male', phone:'', email:'', national_id:'', role_id:'', department_id:'', shift:'Day', hire_date:'' });
      load();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Error adding staff'));
    }
  };

  const roleCounts = staff.reduce((acc, s) => {
    acc[s.role_name] = (acc[s.role_name] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-gray-500 text-sm">{staff.length} staff members</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add Staff
        </button>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[['Doctor','👨‍⚕️','border-blue-500'],['Nurse','👩‍⚕️','border-green-500'],['Pharmacist','💊','border-violet-500'],['Lab Technician','🧪','border-yellow-500'],['Receptionist','🚪','border-cyan-500']].map(([role, icon, color]) => (
          <div key={role} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 ${color} rounded-xl p-4`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{role}s</p>
                <p className="text-2xl font-bold">{roleCounts[role] || 0}</p>
              </div>
              <span className="text-2xl">{icon}</span>
            </div>
          </div>
        ))}
      </div>

      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg} <button onClick={() => setMsg('')} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Add Staff Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="font-bold mb-4">Add New Staff Member</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label:'First Name *', key:'first_name', type:'text' },
              { label:'Last Name *',  key:'last_name',  type:'text' },
              { label:'Phone',        key:'phone',      type:'tel'  },
              { label:'Email',        key:'email',      type:'email'},
              { label:'National ID',  key:'national_id',type:'text' },
              { label:'Hire Date',    key:'hire_date',  type:'date' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.label}</label>
                <input type={f.type} value={form[f.key]}
                  onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Gender</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option>Male</option><option>Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role *</label>
              <select value={form.role_id} onChange={e => setForm({...form, role_id: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option value="">Select role...</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
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
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Shift</label>
              <select value={form.shift} onChange={e => setForm({...form, shift: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option>Day</option><option>Night</option><option>Rotating</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Add Staff Member
            </button>
            <button onClick={() => setShowForm(false)}
              className="border border-gray-300 px-6 py-2 rounded-lg text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading staff...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  {['Staff No','Name','Role','Department','Phone','Email','Shift','Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">No staff members found</td></tr>
                ) : staff.map(s => (
                  <tr key={s.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-semibold text-blue-600">{s.staff_no}</td>
                    <td className="px-4 py-3 font-medium">{s.first_name} {s.last_name}</td>
                    <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{s.role_name}</span></td>
                    <td className="px-4 py-3 text-gray-500">{s.department_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.shift}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span></td>
                    <td className="px-4 py-3">
                      <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-blue-700">Edit</button>
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