'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

const getAuthHeader = () => {
  const token = localStorage.getItem('tibamax_token');
  return { Authorization: `Bearer ${token}` };
};

export default function SuperAdmin() {
  const [overview, setOverview]   = useState(null);
  const [users, setUsers]         = useState([]);
  const [roles, setRoles]         = useState([]);
  const [depts, setDepts]         = useState([]);
  const [auditLog, setAuditLog]   = useState([]);
  const [staffWithoutLogin, setStaffWithoutLogin] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('overview');
  const [msg, setMsg]             = useState('');
  const [msgType, setMsgType]     = useState('success');
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // 'new' = create a brand-new staff record + login
  // 'existing' = link a login to a staff record that already exists (no login yet)
  const [createMode, setCreateMode] = useState('new');
  const [selectedStaffId, setSelectedStaffId] = useState('');

  const [form, setForm] = useState({
    first_name:'', last_name:'', gender:'Male',
    phone:'', email:'', national_id:'',
    department_id:'', role_id:'',
    username:'', password:'',
    shift:'Day', hire_date:''
  });

  const showMsg = (text, type='success') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeader();
      const [ov, us, rl, dp, al, sw] = await Promise.all([
        axios.get('/api/superadmin/overview',           { headers }),
        axios.get('/api/superadmin/users',              { headers }),
        axios.get('/api/superadmin/roles',              { headers }),
        axios.get('/api/superadmin/departments',        { headers }),
        axios.get('/api/superadmin/audit-log',          { headers }),
        axios.get('/api/superadmin/staff-without-login',{ headers }),
      ]);
      setOverview(ov.data.overview);
      setUsers(us.data.users);
      setRoles(rl.data.roles);
      setDepts(dp.data.departments);
      setAuditLog(al.data.logs);
      setStaffWithoutLogin(sw.data.staff);
    } catch (err) {
      if (err.response?.status === 403) {
        showMsg('Error: Access denied - Super Admin only', 'error');
      } else {
        showMsg('Error: Failed to load admin data', 'error');
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ first_name:'', last_name:'', gender:'Male', phone:'', email:'', national_id:'', department_id:'', role_id:'', username:'', password:'', shift:'Day', hire_date:'' });
    setCreateMode('new');
    setSelectedStaffId('');
  };

  const handleCreateUser = async () => {
    if (!form.username || !form.password || !form.role_id) {
      showMsg('Please fill all required fields', 'error'); return;
    }
    if (createMode === 'existing' && !selectedStaffId) {
      showMsg('Please select a staff member to link', 'error'); return;
    }
    if (createMode === 'new' && (!form.first_name || !form.last_name)) {
      showMsg('Please fill all required fields', 'error'); return;
    }

    setSubmitting(true);
    try {
      const payload = createMode === 'existing'
        ? { staff_id: selectedStaffId, username: form.username, password: form.password, role_id: form.role_id }
        : { ...form };

      const r = await axios.post('/api/superadmin/users', payload, { headers: getAuthHeader() });
      showMsg(`Success: User ${form.username} created - Staff No: ${r.data.staff_no}`);
      setShowForm(false);
      resetForm();
      load();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Error creating user'), 'error');
    } finally { setSubmitting(false); }
  };

  const toggleUser = async (id, username) => {
    try {
      const r = await axios.put(`/api/superadmin/users/${id}/toggle`, {}, { headers: getAuthHeader() });
      showMsg(`Success: ${username} ${r.data.user.is_active ? 'activated' : 'deactivated'}`);
      load();
    } catch (err) {
      showMsg('Error: Failed to update user', 'error');
    }
  };

  const changeRole = async (id, role_id) => {
    try {
      await axios.put(`/api/superadmin/users/${id}/role`, { role_id }, { headers: getAuthHeader() });
      showMsg('Success: Role updated successfully');
      load();
    } catch (err) {
      showMsg('Error: Failed to update role', 'error');
    }
  };

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { showMsg('Password must be at least 6 characters', 'error'); return; }
    try {
      await axios.put(`/api/superadmin/users/${resetUserId}/reset-password`, { new_password: newPassword }, { headers: getAuthHeader() });
      showMsg('Success: Password reset successfully');
      setResetUserId(null); setNewPassword('');
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Error'), 'error');
    }
  };

  const statCards = overview ? [
    { label:'Total Patients',       value: overview.total_patients,      color:'border-blue-500',   bg:'bg-blue-50',   text:'text-blue-700'   },
    { label:'Visits Today',         value: overview.visits_today,        color:'border-cyan-500',   bg:'bg-cyan-50',   text:'text-cyan-700'   },
    { label:'Active Users',         value: overview.active_users,        color:'border-violet-500', bg:'bg-violet-50', text:'text-violet-700' },
    { label:'Active Staff',         value: overview.active_staff,        color:'border-green-500',  bg:'bg-green-50',  text:'text-green-700'  },
    { label:'Pending Bills',        value: overview.pending_bills,       color:'border-red-500',    bg:'bg-red-50',    text:'text-red-700'    },
    { label:'Revenue Today (KES)', value: `${parseFloat(overview.revenue_today||0).toLocaleString()}`, color:'border-emerald-500', bg:'bg-emerald-50', text:'text-emerald-700' },
    { label:'Lab Requests Today',  value: overview.lab_requests_today,  color:'border-yellow-500', bg:'bg-yellow-50', text:'text-yellow-700' },
    { label:'Prescriptions Today', value: overview.prescriptions_today, color:'border-pink-500',   bg:'bg-pink-50',   text:'text-pink-700'   },
  ] : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Super Admin Panel</h1>
          <p className="text-gray-500 text-sm">TibaMax HMIS - Full System Control</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide">
            Super Admin Access
          </span>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm border flex items-center justify-between
          ${msgType==='success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          <span>{msg}</span>
          <button onClick={()=>setMsg('')} className="ml-3 font-bold">X</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {[
          ['overview','Overview'],
          ['users','User Management'],
          ['audit','Audit Log'],
          ['system','System Info'],
        ].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab===key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-400 text-sm">Loading system data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div>
              <h2 className="font-bold text-sm text-gray-500 uppercase tracking-widest mb-4">System Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {statCards.map(c => (
                  <div key={c.label} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 ${c.color} rounded-xl p-4`}>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{c.label}</p>
                    <p className="text-2xl font-bold">{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Roles & Departments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                  <h3 className="font-bold text-sm mb-4">System Roles ({roles.length})</h3>
                  <div className="space-y-2">
                    {roles.map(r => (
                      <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <div>
                          <span className="font-medium text-sm">{r.name}</span>
                          {r.description && <div className="text-xs text-gray-400">{r.description}</div>}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium
                          ${r.name==='Super Admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {r.name==='Super Admin' ? 'Super' : 'Role'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                  <h3 className="font-bold text-sm mb-4">Departments ({depts.length})</h3>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {depts.map(d => (
                      <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <span className="text-sm">{d.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full
                          ${d.category==='CLINICAL' ? 'bg-green-100 text-green-700' : d.category==='ADMINISTRATIVE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {d.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* USER MANAGEMENT TAB */}
          {tab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-sm text-gray-500 uppercase tracking-widest">System Users ({users.length})</h2>
                <button onClick={() => setShowForm(!showForm)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
                  + Create New User
                </button>
              </div>

              {/* Create User Form */}
              {showForm && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-5">
                  <h3 className="font-bold mb-4">Create New System User</h3>

                  {/* Mode toggle: new staff record vs. linking to an existing one */}
                  <div className="flex gap-2 mb-4 border border-gray-200 dark:border-gray-600 rounded-lg p-1 w-fit">
                    <button
                      onClick={() => { setCreateMode('new'); setSelectedStaffId(''); }}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold ${createMode==='new' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
                      New Staff Member
                    </button>
                    <button
                      onClick={() => setCreateMode('existing')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold ${createMode==='existing' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
                      Link to Existing Staff ({staffWithoutLogin.length})
                    </button>
                  </div>

                  {createMode === 'existing' ? (
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Staff Member *</label>
                      <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700">
                        <option value="">Select staff member...</option>
                        {staffWithoutLogin.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.staff_no} - {s.first_name} {s.last_name}{s.department_name ? ` (${s.department_name})` : ''}
                          </option>
                        ))}
                      </select>
                      {staffWithoutLogin.length === 0 && (
                        <p className="text-xs text-gray-400 mt-1">Every active staff member already has a login.</p>
                      )}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {createMode === 'new' && [
                      { label:'First Name *',  key:'first_name', type:'text'  },
                      { label:'Last Name *',   key:'last_name',  type:'text'  },
                      { label:'Phone',         key:'phone',      type:'tel'   },
                      { label:'Email',         key:'email',      type:'email' },
                      { label:'National ID',   key:'national_id',type:'text'  },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.label}</label>
                        <input type={f.type} value={form[f.key]}
                          onChange={e => setForm({...form,[f.key]:e.target.value})}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700" />
                      </div>
                    ))}

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Username *</label>
                      <input type="text" value={form.username}
                        onChange={e => setForm({...form,username:e.target.value})}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password *</label>
                      <input type="password" value={form.password}
                        onChange={e => setForm({...form,password:e.target.value})}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700" />
                    </div>

                    {createMode === 'new' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hire Date</label>
                        <input type="date" value={form.hire_date}
                          onChange={e => setForm({...form,hire_date:e.target.value})}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700" />
                      </div>
                    )}

                    {createMode === 'new' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Gender</label>
                        <select value={form.gender} onChange={e => setForm({...form,gender:e.target.value})}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700">
                          <option>Male</option><option>Female</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role *</label>
                      <select value={form.role_id} onChange={e => setForm({...form,role_id:e.target.value})}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700">
                        <option value="">Select role...</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>

                    {createMode === 'new' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Department</label>
                        <select value={form.department_id} onChange={e => setForm({...form,department_id:e.target.value})}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700">
                          <option value="">Select department...</option>
                          {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                    )}

                    {createMode === 'new' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Shift</label>
                        <select value={form.shift} onChange={e => setForm({...form,shift:e.target.value})}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700">
                          <option>Day</option><option>Night</option><option>Rotating</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button onClick={handleCreateUser} disabled={submitting}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-400">
                      {submitting ? 'Creating...' : (createMode === 'existing' ? 'Create Login' : 'Create User')}
                    </button>
                    <button onClick={() => { setShowForm(false); resetForm(); }}
                      className="border border-gray-300 px-6 py-2 rounded-lg text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Reset Password Modal */}
              {resetUserId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold mb-4">Reset Password</h3>
                    <input type="password" value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="New password (min 6 chars)"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
                    <div className="flex gap-3">
                      <button onClick={resetPassword}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 flex-1">
                        Reset Password
                      </button>
                      <button onClick={() => { setResetUserId(null); setNewPassword(''); }}
                        className="border border-gray-300 px-4 py-2 rounded-lg text-sm flex-1">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Table */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        {['Staff No','Name','Username','Role','Department','Phone','Last Login','Status','Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 font-semibold text-blue-600">{u.staff_no}</td>
                          <td className="px-4 py-3 font-medium">{u.first_name} {u.last_name}</td>
                          <td className="px-4 py-3 font-mono text-gray-500 text-xs">{u.username}</td>
                          <td className="px-4 py-3">
                            <select value={u.role} onChange={e => {
                              const role = roles.find(r => r.name === e.target.value);
                              if (role) changeRole(u.id, role.id);
                            }}
                              className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-xs dark:bg-gray-700">
                              {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{u.department_name || '-'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{u.phone || '-'}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {u.last_login ? new Date(u.last_login).toLocaleString('en-KE') : 'Never'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => toggleUser(u.id, u.username)}
                                className={`text-xs px-2 py-1 rounded-lg font-medium ${u.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button onClick={() => { setResetUserId(u.id); setNewPassword(''); }}
                                className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium">
                                Reset Pwd
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* AUDIT LOG TAB */}
          {tab === 'audit' && (
            <div>
              <h2 className="font-bold text-sm text-gray-500 uppercase tracking-widest mb-4">
                System Audit Log ({auditLog.length} recent entries)
              </h2>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        {['Time','User','Action','Table','Record','Details'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {auditLog.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">No audit logs yet</td></tr>
                      ) : auditLog.map(log => (
                        <tr key={log.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                            {new Date(log.performed_at).toLocaleString('en-KE')}
                          </td>
                          <td className="px-4 py-3 font-medium text-xs">{log.performed_by || log.username || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium
                              ${log.action==='CREATE' ? 'bg-green-100 text-green-700' : log.action==='DELETE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs font-mono">{log.table_name}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{log.record_id}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs max-w-48 truncate">
                            {log.new_values ? JSON.stringify(log.new_values).slice(0,60) + '...' : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SYSTEM INFO TAB */}
          {tab === 'system' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="font-bold text-sm mb-4">System Information</h3>
                {[
                  { label:'System Name',    value:'TibaMax HMIS'                },
                  { label:'Version',        value:'v1.0.0'                      },
                  { label:'Facility',       value:'Webuye West Sub-County Hospital'},
                  { label:'County',         value:'Bungoma County'              },
                  { label:'Database',       value:'PostgreSQL 18 (afyatab_hmis)'},
                  { label:'Backend',        value:'Node.js v24 + Express'       },
                  { label:'Frontend',       value:'Next.js 16 + Tailwind CSS'   },
                  { label:'Total Roles',    value: roles.length                 },
                  { label:'Total Departments', value: depts.length             },
                  { label:'Total Staff',    value: overview?.active_staff       },
                  { label:'Total Patients', value: overview?.total_patients     },
                ].map(s => (
                  <div key={s.label} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm">
                    <span className="text-gray-500">{s.label}</span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="font-bold text-sm mb-4">Super Admin Account</h3>
                {[
                  { label:'Name',       value:'Spingish Kasimili'         },
                  { label:'Username',   value:'admin'                      },
                  { label:'Role',       value:'Super Admin'                },
                  { label:'Email',      value:'spingishbwire@gmail.com'    },
                  { label:'Staff No',   value:'S001'                       },
                  { label:'Status',     value:'Active'                     },
                ].map(s => (
                  <div key={s.label} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm">
                    <span className="text-gray-500">{s.label}</span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <strong>Security Note:</strong> The Super Admin account has full system access. Keep credentials secure and change the default password immediately.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}