'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { visitAPI, patientAPI } from '../../lib/api';
import {
  Search, Calendar, Info, Plus, Eye, Trash2, ChevronDown, X,
} from 'lucide-react';

// ── Static config (mirrors the prompt spec) ──────────────────────────────
const SERVICE_LOCATIONS = [
  'Triage', 'OPD Consultation', 'Laboratory', 'Radiology',
  'Antenatal Care (ANC)', 'Postnatal Care & Immunization', 'Family Planning',
];
const AGE_RANGES = [
  { value: 'All',   label: 'All Ages' },
  { value: '0-5',   label: '0–5' },
  { value: '6-17',  label: '6–17' },
  { value: '18-35', label: '18–35' },
  { value: '36-59', label: '36–59' },
  { value: '60+',   label: '60+' },
];
const todayStr = () => new Date().toISOString().slice(0, 10);

const formatTime = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12  = ((hour + 11) % 12) + 1;
  return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
};

const typeBadge = (type) => (
  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
    type === 'Revisit' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
  }`}>{type}</span>
);

const LOCATION_COLORS = {
  Reception: 'bg-slate-100 text-slate-600',
  Triage: 'bg-amber-100 text-amber-700',
  'OPD Consultation': 'bg-violet-100 text-violet-700',
  Laboratory: 'bg-cyan-100 text-cyan-700',
  Radiology: 'bg-orange-100 text-orange-700',
  'Antenatal Care (ANC)': 'bg-pink-100 text-pink-700',
  'Postnatal Care & Immunization': 'bg-rose-100 text-rose-700',
  'Family Planning': 'bg-teal-100 text-teal-700',
};
const locationBadge = (loc) => (
  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${LOCATION_COLORS[loc] || 'bg-slate-100 text-slate-600'}`}>
    {loc || 'Reception'}
  </span>
);

const emptyRegForm = {
  first_name: '', last_name: '', gender: 'Female',
  phone: '', national_id: '', date_of_birth: '',
  county_id: 39, allergies: 'None', kin_name: '', kin_phone: '',
};

export default function LookupPage() {
  const router = useRouter();

  const [dateVisited, setDateVisited] = useState(todayStr());
  const [ageQuick, setAgeQuick]       = useState('All'); // top-right quick filter

  const [search, setSearch]           = useState('');
  const [patientType, setPatientType] = useState('All');   // All | New | Revisit
  const [gender, setGender]           = useState('All');
  const [visitStatus, setVisitStatus] = useState('All');   // All | New | Revisit
  const [ageRange, setAgeRange]       = useState('All');   // panel filter (kept in sync w/ ageQuick)

  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState('');
  const [msgType, setMsgType] = useState('success');

  const [openMenu, setOpenMenu] = useState(null); // { id, type: 'initiate'|'move' }
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm]         = useState(emptyRegForm);

  const [page, setPage]         = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const showMsg = (text, type = 'success') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  };

  const load = useCallback(() => {
    setLoading(true);
    visitAPI.lookup({
      date: dateVisited,
      search: search || undefined,
      type: patientType !== 'All' ? patientType : undefined,
      gender: gender !== 'All' ? gender : undefined,
      visit_status: visitStatus !== 'All' ? visitStatus : undefined,
      age_range: ageRange !== 'All' ? ageRange : (ageQuick !== 'All' ? ageQuick : undefined),
    })
      .then(r => setRows(r.data.patients || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [dateVisited, search, patientType, gender, visitStatus, ageRange, ageQuick]);

  useEffect(() => { load(); }, [dateVisited, ageQuick]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => { setPage(1); load(); };
  const clearFilters = () => {
    setSearch(''); setPatientType('All'); setGender('All');
    setVisitStatus('All'); setAgeRange('All'); setAgeQuick('All');
    setPage(1);
    setTimeout(load, 0);
  };

  // ── Actions ──────────────────────────────────────────────────────────
  const [busyId, setBusyId] = useState(null);
  const genKey = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

  const doInitiate = async (row) => {
    setOpenMenu(null);
    if (busyId === row.id) return; // guard against a physical double-click
    setBusyId(row.id);
    try {
      await visitAPI.startNew({
        patient_id: row.patient_id, patient_type: 'Outpatient',
        visit_date: dateVisited, idempotency_key: genKey()
      });
      showMsg(`✅ New visit initiated for ${row.first_name} ${row.last_name}`);
      load();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Could not initiate visit'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const doContinue = async (row) => {
    setOpenMenu(null);
    if (busyId === row.id) return;
    setBusyId(row.id);
    try {
      const r = await visitAPI.continueVisit({
        patient_id: row.patient_id, patient_type: 'Outpatient',
        visit_date: dateVisited, idempotency_key: genKey()
      });
      showMsg(r.data.continued_existing_encounter
        ? `✅ Continuing existing visit for ${row.first_name} ${row.last_name}`
        : `✅ New visit (Revisit) started for ${row.first_name} ${row.last_name}`);
      load();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Could not continue visit'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const doMove = async (row, location) => {
    setOpenMenu(null);
    try {
      await visitAPI.moveLocation(row.id, location);
      showMsg(`✅ ${row.first_name} ${row.last_name} moved to ${location}`);
      load();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Could not move patient'), 'error');
    }
  };

  const doDelete = async (row) => {
    try {
      await visitAPI.deleteVisit(row.id);
      showMsg('🗑️ Visit record deleted. Patient registration remains intact.');
      setConfirmDeleteId(null);
      load();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Could not delete visit'), 'error');
    }
  };

  const handleRegister = async () => {
    if (!regForm.first_name || !regForm.last_name || !regForm.phone) {
      showMsg('First name, last name and phone are required', 'error'); return;
    }
    try {
      const r = await patientAPI.create(regForm);
      showMsg(`✅ Patient ${r.data.patient_no} registered successfully — search for them to start a visit`);
      setShowRegForm(false);
      setRegForm(emptyRegForm);
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.message || err.response?.data?.error || 'Registration failed'), 'error');
    }
  };

  // ── Pagination (client-side over the fetched day's rows) ──────────────
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const pageRows = rows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className="max-w-[1600px] mx-auto" onClick={() => openMenu && setOpenMenu(null)}>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Look-up</h1>
          <p className="text-slate-500 text-sm">Search, register new patient, initiate or continue visit, and refer patient to appropriate service.</p>
        </div>

        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date Visited</label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
              <Calendar size={15} className="text-slate-400" />
              <input type="date" value={dateVisited}
                onChange={e => { setDateVisited(e.target.value); setPage(1); }}
                className="text-sm outline-none bg-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Age</label>
            <select value={ageQuick} onChange={e => { setAgeQuick(e.target.value); setPage(1); }}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white outline-none">
              {AGE_RANGES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 text-sm text-slate-600 pb-2.5">
            <span className="font-bold text-lg text-slate-800">{rows.length}</span>
            <span>Encounters Today</span>
            <Info size={14} className="text-slate-400" title="A patient may legitimately have more than one encounter in a day" />
          </div>
          <button onClick={() => setShowRegForm(true)}
            className="flex items-center gap-1.5 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors">
            <Plus size={16} /> Register Patient
          </button>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm border flex items-center justify-between
          ${msgType === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="ml-3 font-bold">×</button>
        </div>
      )}

      {/* Search & Filter Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Search Patient</label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5 focus-within:border-teal-500">
              <Search size={15} className="text-slate-400 flex-shrink-0" />
              <input type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Name, phone, UHID, National ID or Passport..."
                className="flex-1 text-sm outline-none bg-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Patient Type</label>
            <select value={patientType} onChange={e => setPatientType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none">
              <option value="All">All</option><option value="New">New</option><option value="Revisit">Returning</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none">
              <option value="All">All</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Visit Status</label>
            <select value={visitStatus} onChange={e => setVisitStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none">
              <option value="All">All</option><option value="New">New</option><option value="Revisit">Revisit</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Age Range</label>
            <select value={ageRange} onChange={e => setAgeRange(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none">
              {AGE_RANGES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-3">
          <button onClick={clearFilters}
            className="border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-600 hover:border-slate-400">
            Clear Filters
          </button>
          <button onClick={handleSearch}
            className="flex items-center gap-1.5 bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700">
            <Search size={15} /> Search
          </button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5">
        <div className="px-5 py-3 border-b border-slate-200">
          <h2 className="font-bold text-sm">Patients Seen Today - {new Date(dateVisited).toLocaleDateString('en-GB')}</h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading...</div>
        ) : pageRows.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No patients found for this date/filter combination.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="bg-teal-700 text-white">
                  {['#', 'Time', 'Visit No', 'Patient', 'Phone', 'Age / Gender', 'Type', 'Stage / Location', 'Encounters Today', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, idx) => (
                  <tr key={row.id} className={`border-t border-slate-100 hover:bg-slate-50 ${!row.has_visit_today ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-4 py-3 text-slate-400">{(page - 1) * rowsPerPage + idx + 1}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {row.has_visit_today ? formatTime(row.visit_time) : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-teal-700 whitespace-nowrap">
                      {row.has_visit_today ? row.visit_no : (
                        <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Not visited today</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.first_name} {row.last_name}</div>
                      <div className="text-xs text-slate-400">{row.patient_no}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{row.phone}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{row.age ?? '—'} / {row.gender}</td>
                    <td className="px-4 py-3">{row.has_visit_today ? typeBadge(row.visit_type) : <span className="text-xs text-slate-400">—</span>}</td>
                    <td className="px-4 py-3">{row.has_visit_today ? locationBadge(row.directed_to) : <span className="text-xs text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">{row.visits_today}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => router.push(`/patients/${row.patient_id}`)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:border-slate-400 text-slate-600">
                          <Eye size={13} /> View
                        </button>

                        {/* Initiate / Continue */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu?.id === row.id && openMenu.type === 'initiate' ? null : { id: row.id, type: 'initiate' })}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                            {row.has_visit_today ? 'Continue / Initiate Visit' : 'Initiate Visit'} <ChevronDown size={13} />
                          </button>
                          {openMenu?.id === row.id && openMenu.type === 'initiate' && (
                            <div className="absolute z-40 mt-1 right-0 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-1">
                              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase">Select Visit Action</div>
                              <button onClick={() => doInitiate(row)}
                                className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50">
                                <div className="text-sm font-medium">Initiate New Visit</div>
                                <div className="text-xs text-slate-400">Start a new visit for today</div>
                              </button>
                              <button onClick={() => doContinue(row)}
                                className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50">
                                <div className="text-sm font-medium">Continue Previous Visit</div>
                                <div className="text-xs text-slate-400">Within the window: continues the same visit. After it: starts a new one (Revisit)</div>
                              </button>
                            </div>
                          )}
                        </div>

                        {row.has_visit_today && (
                          <>
                            {/* Move to */}
                            <div className="relative">
                              <button
                                disabled={row.location_locked}
                                onClick={() => setOpenMenu(openMenu?.id === row.id && openMenu.type === 'move' ? null : { id: row.id, type: 'move' })}
                                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                                  row.location_locked
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                                title={row.location_locked ? 'This visit has been discharged/completed' : 'Move to a service location'}>
                                Move to <ChevronDown size={13} />
                              </button>
                              {openMenu?.id === row.id && openMenu.type === 'move' && !row.location_locked && (
                                <div className="absolute z-40 mt-1 right-0 w-56 bg-white border border-slate-200 rounded-lg shadow-xl p-1">
                                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase">Select Service Location</div>
                                  <p className="px-3 pb-1 text-[10px] text-slate-400">Can be changed as many times as needed while this visit is active.</p>
                                  {SERVICE_LOCATIONS.map(loc => (
                                    <button key={loc} onClick={() => doMove(row, loc)}
                                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50">
                                      {loc}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Delete */}
                            <button onClick={() => setConfirmDeleteId(row.id)}
                              className="p-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500 flex-wrap gap-3">
            <span>Showing {(page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, rows.length)} of {rows.length} entries</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40">Previous</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold ${n === page ? 'bg-teal-600 text-white' : 'border border-slate-200 hover:border-slate-400'}`}>
                  {n}
                </button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40">Next</button>
            </div>
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs">
                {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="font-bold text-xs uppercase text-slate-500 mb-2">Page Purpose</h3>
          <p className="text-xs text-slate-500 mb-2">The Look-up page is the daily front-desk workspace.</p>
          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
            <li>Search existing patients</li>
            <li>Register new patients</li>
            <li>Initiate or continue visit</li>
            <li>Refer/move patient to a specific service</li>
            <li>Delete visit record (does not delete patient registration)</li>
          </ul>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="font-bold text-xs uppercase text-slate-500 mb-2">Key Rules</h3>
          <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
            <li>Date Visited defaults to Today.</li>
            <li>A patient may have more than one legitimate encounter per day — there is no maximum.</li>
            <li>Continue Visit within the continuation window (default 6h) resumes the same encounter — no new visit is created.</li>
            <li>Continue Visit after the window opens a new, linked encounter (Revisit) instead.</li>
            <li>Initiate Visit always creates a new encounter and places the patient in the selected service queue.</li>
            <li>Move to can be used repeatedly while a visit is active — it only locks once the visit is discharged/completed.</li>
            <li>Delete removes the visit record only. Patient registration remains intact.</li>
            <li>All actions are role-based and logged in the audit trail.</li>
          </ol>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="font-bold text-xs uppercase text-slate-500 mb-2">Visit Actions</h3>
          <div className="mb-3">
            <div className="text-sm font-semibold">Initiate New Visit</div>
            <p className="text-xs text-slate-500">Creates a new visit for the patient for the selected date and service.</p>
          </div>
          <div>
            <div className="text-sm font-semibold">Continue Previous Visit</div>
            <p className="text-xs text-slate-500">Within the continuation window, resumes the same encounter (same visit number). After the window, starts a new linked encounter (Revisit) instead — carrying forward triage, diagnosis, notes, treatments and prescriptions as history.</p>
            <p className="text-xs text-teal-600 mt-1">No daily limit — a patient may legitimately be seen more than once a day.</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="font-bold text-xs uppercase text-slate-500 mb-2">Move To (Service Locations)</h3>
          <ul className="text-xs text-slate-600 space-y-1">
            {SERVICE_LOCATIONS.map(l => <li key={l}>{l}</li>)}
          </ul>
          <p className="text-xs text-teal-600 mt-2">Can be changed as many times as needed while the visit is active — locks only once discharged/completed.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="font-bold text-xs uppercase text-slate-500 mb-2">Actions Legend</h3>
          <ul className="text-xs text-slate-600 space-y-2">
            <li><strong>View</strong> — view patient details, visit history and demographics.</li>
            <li><strong>Initiate/Continue Visit</strong> — start a new encounter, or resume/continue the existing one depending on the continuation window.</li>
            <li><strong>Move to</strong> — refer patient to a specific service location.</li>
            <li><strong className="text-red-600">Delete Visit</strong> — deletes visit record only. Cannot be undone.</li>
          </ul>
        </div>
      </div>

      {/* Register Patient Modal */}
      {showRegForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowRegForm(false)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base">New Patient Registration</h2>
              <button onClick={() => setShowRegForm(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'First Name *', key: 'first_name', type: 'text' },
                { label: 'Last Name *',  key: 'last_name',  type: 'text' },
                { label: 'Phone *',      key: 'phone',      type: 'tel' },
                { label: 'National ID',  key: 'national_id',type: 'text' },
                { label: 'Date of Birth',key: 'date_of_birth', type: 'date' },
                { label: 'Allergies',    key: 'allergies',  type: 'text' },
                { label: 'Next of Kin',  key: 'kin_name',   type: 'text' },
                { label: 'Kin Phone',    key: 'kin_phone',  type: 'tel' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{f.label}</label>
                  <input type={f.type} value={regForm[f.key]}
                    onChange={e => setRegForm({ ...regForm, [f.key]: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Gender</label>
                <select value={regForm.gender} onChange={e => setRegForm({ ...regForm, gender: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500">
                  <option>Female</option><option>Male</option><option>Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleRegister}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700">
                Register Patient
              </button>
              <button onClick={() => setShowRegForm(false)}
                className="border border-slate-300 px-6 py-2 rounded-lg text-sm hover:border-teal-500">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-red-600 mb-2">Delete Visit</h3>
            <p className="text-sm text-slate-600 mb-4">
              This deletes the visit record only. Patient registration remains intact. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteId(null)}
                className="border border-slate-300 px-4 py-2 rounded-lg text-sm hover:border-slate-400">
                Cancel
              </button>
              <button onClick={() => doDelete(rows.find(r => r.id === confirmDeleteId))}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700">
                Delete Visit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
