'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';

// ── Donut ring ───────────────────────────────────────────────
const DonutRing = ({ occupied, total, size = 90 }) => {
  const r = 35, cx = 45, cy = 45;
  const circ = 2 * Math.PI * r;
  const pct  = total > 0 ? occupied / total : 0;
  const dash = pct * circ;
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 90 90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth="12"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={-circ * 0.25}
          strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3b82f6" strokeWidth="12"
          strokeDasharray={`${circ - dash} ${dash}`}
          strokeDashoffset={-circ * 0.25 - dash}
          strokeLinecap="round" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="#94a3b8">Total</text>
      </svg>
      <div className="text-xs space-y-1">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /><span className="text-gray-500">{total - occupied} Free</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /><span className="text-gray-500">{occupied} Occupied</span></div>
      </div>
    </div>
  );
};

// ── Mini bar chart ───────────────────────────────────────────
const MiniBar = ({ data, colors = ['#3b82f6','#16a34a'], height = 80 }) => {
  if (!data?.length) return <div className="flex items-center justify-center text-gray-300 text-xs" style={{height}}>No data</div>;
  const max = Math.max(...data.flatMap(d => d.values || [d.value || 0]), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full flex gap-0.5 items-end" style={{ height: height - 16 }}>
            {(d.values || [d.value]).map((v, vi) => (
              <div key={vi} className="flex-1 rounded-t-sm transition-all duration-500"
                style={{ height: `${Math.max((v / max) * (height - 20), 2)}px`, background: colors[vi % colors.length], opacity: 0.85 }}
                title={`${d.label}: ${v}`} />
            ))}
          </div>
          <span className="text-xs text-gray-400 truncate w-full text-center leading-none">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// ── Large line/bar trend chart ───────────────────────────────
const TrendChart = ({ data, period, height = 160 }) => {
  if (!data?.length) return (
    <div className="flex items-center justify-center text-gray-300 text-xs flex-col gap-2" style={{height}}>
      <span className="text-4xl">📊</span><span>No data for this period yet</span>
    </div>
  );
  const max = Math.max(...data.map(d => parseInt(d.total || d.opd || 0)), 1);
  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis guides */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => (
        <div key={pct} className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-700 flex items-center"
          style={{ bottom: `${pct * (height - 20)}px` }}>
          <span className="text-xs text-gray-300 pr-1 -mt-2">{Math.round(max * pct)}</span>
        </div>
      ))}
      {/* Bars */}
      <div className="absolute left-6 right-0 bottom-0 flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => {
          const opdH = Math.max((parseInt(d.opd || d.total || 0) / max) * (height - 20), 2);
          const ipdH = Math.max((parseInt(d.ipd || 0) / max) * (height - 20), 2);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex gap-0.5 items-end" style={{ height: height - 20 }}>
                <div className="flex-1 rounded-t bg-blue-500 opacity-80 transition-all" style={{ height: `${opdH}px` }} title={`OPD: ${d.opd || d.total}`} />
                {d.ipd !== undefined && <div className="flex-1 rounded-t bg-green-500 opacity-80 transition-all" style={{ height: `${ipdH}px` }} title={`IPD: ${d.ipd}`} />}
              </div>
              <span className="text-xs text-gray-400 truncate w-full text-center leading-none">{d.month || d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const STATUS_COLORS = {
  Reception:    'bg-blue-100 text-blue-700',
  Triage:       'bg-pink-100 text-pink-700',
  Consultation: 'bg-violet-100 text-violet-700',
  Laboratory:   'bg-yellow-100 text-yellow-700',
  Pharmacy:     'bg-orange-100 text-orange-700',
  Admitted:     'bg-green-100 text-green-700',
  Discharged:   'bg-gray-100 text-gray-600',
  Completed:    'bg-emerald-100 text-emerald-700',
};

const TRIAGE_COLORS = {
  Emergency: 'bg-red-100 text-red-700 border border-red-300',
  Urgent:    'bg-orange-100 text-orange-700 border border-orange-300',
  High:      'bg-yellow-100 text-yellow-700 border border-yellow-300',
  Normal:    'bg-green-100 text-green-700 border border-green-300',
  Low:       'bg-blue-100 text-blue-700 border border-blue-300',
};

export default function Dashboard() {
  const [kpis, setKpis]         = useState(null);
  const [dash, setDash]         = useState(null);
  const [visits, setVisits]     = useState([]);
  const [staff, setStaff]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [time, setTime]         = useState(new Date());
  const [period, setPeriod]     = useState('Month');
  const [opdPeriod, setOpdPeriod] = useState('Week');
  const [search, setSearch]     = useState('');
  const [searchRes, setSearchRes] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const intervalRef = useRef(null);

  const load = async () => {
    try {
      const [k, d, v, s] = await Promise.all([
        axios.get('/api/dashboard/kpis'),
        axios.get('/api/dashboard'),
        axios.get('/api/visits/today'),
        axios.get('/api/staff'),
      ]);
      setKpis(k.data.kpis);
      setDash(d.data.data);
      setVisits(v.data.visits || []);
      setStaff((s.data.staff || []).filter(x => x.status === 'Active' || x.status === 'On Duty').slice(0, 5));
    } catch (err) {
      console.error('Dashboard error:', err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 60000);
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => { clearInterval(intervalRef.current); clearInterval(clock); };
  }, []);

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) { setSearchRes([]); return; }
    try {
      const r = await axios.get(`/api/patients/search?q=${q}`);
      setSearchRes(r.data.patients?.slice(0, 6) || []);
    } catch { setSearchRes([]); }
  };

  const notifications = [];
  if (dash?.inventory?.low_stock > 0)
    notifications.push({ type:'danger',  icon:'⚠️', title:'Low Stock Alert',    msg:`${dash.inventory.low_stock} drug(s) below minimum` });
  if (dash?.inventory?.expiring_drugs > 0)
    notifications.push({ type:'warning', icon:'📅', title:'Expiring Drugs',      msg:`${dash.inventory.expiring_drugs} drug(s) expiring ≤90 days` });
  if (dash?.today?.lab_requests?.pending > 0)
    notifications.push({ type:'info',    icon:'🧪', title:'Lab Results Pending', msg:`${dash.today.lab_requests.pending} request(s) pending` });
  if (dash?.revenue?.pending_count > 0)
    notifications.push({ type:'warning', icon:'💰', title:'Pending Bills',       msg:`${dash.revenue.pending_count} invoice(s) — KES ${parseFloat(dash.revenue.pending_balance||0).toLocaleString()}` });

  const totalBeds     = dash?.bed_occupancy?.reduce((s, w) => s + parseInt(w.total_beds || 0), 0) || 0;
  const totalOccupied = dash?.bed_occupancy?.reduce((s, w) => s + parseInt(w.occupied  || 0), 0) || 0;

  const weeklyOPDChart = (dash?.weekly_opd || []).map(d => ({
    label:  new Date(d.visit_date).toLocaleDateString('en-KE', { weekday:'short' }),
    values: [parseInt(d.visits), 0]
  }));

  const monthlyChart = (dash?.monthly_trend || []).map(d => ({
    month: d.month,
    opd:   parseInt(d.opd  || 0),
    ipd:   parseInt(d.ipd  || 0),
    total: parseInt(d.total|| 0),
  }));

  const roleIcon = (role) => {
    const map = { Doctor:'👨‍⚕️', Nurse:'👩‍⚕️', Pharmacist:'💊', 'Lab Technician':'🧪', Receptionist:'🚪', Cashier:'💰' };
    return map[role] || '👤';
  };

  return (
    <div className="flex gap-0 -m-6">

      {/* ══════════════ MAIN BODY ══════════════ */}
      <div className="flex-1 min-w-0 p-5 space-y-4">

        {/* Top bar */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <h1 className="text-lg font-bold leading-tight">Dashboard</h1>
            <p className="text-xs text-gray-400">
              Live: {time.toLocaleDateString('en-KE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
              {' – '}<span className="font-mono">{time.toLocaleTimeString('en-KE')}</span>
            </p>
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus-within:border-blue-500 focus-within:shadow-sm transition-all">
              <span className="text-gray-400 text-sm">🔍</span>
              <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
                placeholder="Quick search – patient name, phone, ID..."
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400" />
              {search && <button onClick={() => { setSearch(''); setSearchRes([]); }} className="text-gray-400 hover:text-gray-600">×</button>}
            </div>
            {searchRes.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                {searchRes.map(p => (
                  <Link key={p.id} href={`/patients?id=${p.id}`}
                    onClick={() => { setSearch(''); setSearchRes([]); }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b last:border-0 border-gray-50 dark:border-gray-700">
                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {p.first_name?.[0]}{p.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{p.first_name} {p.last_name}</div>
                      <div className="text-xs text-gray-400">{p.patient_no} • {p.phone}</div>
                    </div>
                    {p.allergies && p.allergies !== 'None' && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex-shrink-0">⚠️</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={load}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg transition-colors">
              ↻ Refresh
            </button>
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors text-base">
                🔔
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                    {notifications.length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex justify-between">
                    <span className="font-bold text-sm">Notifications</span>
                    <span className="text-xs text-gray-400">{notifications.length} alerts</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-5 text-center text-gray-400 text-sm">All clear ✅</div>
                  ) : notifications.map((n,i) => (
                    <div key={i} className={`px-4 py-2.5 border-b last:border-0 border-gray-50 dark:border-gray-700 flex items-start gap-2
                      ${n.type==='danger' ? 'bg-red-50 dark:bg-red-900/20' : n.type==='warning' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                      <span>{n.icon}</span>
                      <div>
                        <div className="font-semibold text-xs">{n.title}</div>
                        <div className="text-xs text-gray-500">{n.msg}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">S</div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300 hidden md:block">Staff Profile</span>
            </div>
          </div>
        </div>

        {/* ── 7 compact KPI widgets ── */}
        <div className="grid grid-cols-7 gap-3">
          {[
            { label:'Patients Today',         value: kpis?.visits_today,       sub:'OPD',              icon:'👥', color:'text-blue-600'   },
            { label:'Admissions',             value: kpis?.inpatients,         sub:'Waiting',          icon:'🛏️', color:'text-green-600'  },
            { label:'Active Consultations',   value: dash?.today?.at_consultation, sub:'Completed',    icon:'🩺', color:'text-violet-600' },
            { label:'Pharmacy',               value: dash?.today?.pharmacy?.pending, sub:'Pending Rx', icon:'💊', color:'text-orange-600' },
            { label:'Inpatients',             value: kpis?.inpatients,         sub:'Admitted Today',   icon:'🏥', color:'text-teal-600'   },
            { label:'Discharges',             value: dash?.today?.discharged,  sub:'Completed',        icon:'🚪', color:'text-emerald-600'},
            { label:'Financial Overview',     value: `KES ${parseFloat(dash?.revenue?.today||0).toLocaleString()}`, sub:'Today', icon:'💰', color:'text-blue-700' },
          ].map((c, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center hover:shadow-sm transition-all">
              <div className="text-xl mb-1">{c.icon}</div>
              <div className={`text-xl font-bold leading-tight ${c.color}`}>{c.value ?? '0'}</div>
              <div className="text-xs text-gray-400 leading-tight mt-0.5 truncate">{c.label}</div>
              <div className="text-xs text-gray-300 leading-tight">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Monthly Trend + Revenue ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Monthly trend — large */}
          <div className="col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">Monthly Trend</h3>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                {['Year','Month','Week','Daily'].map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all
                      ${period===p ? 'bg-white dark:bg-gray-600 shadow text-blue-600 font-semibold' : 'text-gray-400 hover:text-gray-600'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 text-xs mb-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>OPD</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>IPD</span>
            </div>
            <TrendChart data={monthlyChart} period={period} height={160} />
          </div>

          {/* Revenue summary */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="font-bold text-sm mb-3">Revenue Summary</h3>
            <div className="space-y-3">
              {[
                { label:'Billing',          left: `KES ${parseFloat(dash?.revenue?.today||0).toLocaleString()}`,   right: 'Billing',  rightVal: `KES ${parseFloat(dash?.revenue?.week||0).toLocaleString()}`  },
                { label:'Target',           left: 'KES 2,000',  right: 'Target',   rightVal: 'KES 300'   },
                { label:'Pending Payments', left: `KES ${parseFloat(dash?.revenue?.pending_balance||0).toLocaleString()}`, right: 'Payments', rightVal: `KES ${parseFloat(dash?.revenue?.month||0).toLocaleString()}` },
              ].map((r,i) => (
                <div key={i} className="pb-2.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{r.label}</span><span>{r.right}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-800 dark:text-gray-200">{r.left}</span>
                    <span className="text-gray-800 dark:text-gray-200">{r.rightVal}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex gap-2">
                <Link href="/billing" className="flex-1 text-center bg-blue-600 text-white text-xs py-2 rounded-lg hover:bg-blue-700 font-medium">View Invoices</Link>
                <Link href="/reports" className="flex-1 text-center border border-gray-200 text-gray-500 text-xs py-2 rounded-lg hover:border-blue-500 font-medium">Reports</Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Patient Registration Log ── */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-bold text-sm">Patients Registration Log</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5">
                <span className="text-gray-400 text-xs">🔍</span>
                <input type="text" placeholder="Search"
                  className="bg-transparent text-xs outline-none text-gray-600 dark:text-gray-300 w-24" />
              </div>
              <Link href="/reception"
                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium">
                + Register
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  {['Name ↕','File No. ↕','Triage Category ↕','Status ↕','Time'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-400 text-xs">
                      No visits today yet —{' '}
                      <Link href="/reception" className="text-blue-600 hover:underline">Register first patient</Link>
                    </td>
                  </tr>
                ) : visits.slice(0, 8).map((v, i) => (
                  <tr key={i} className="border-t border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {v.first_name?.[0]}{v.last_name?.[0]}
                        </div>
                        <span className="font-medium text-xs">{v.first_name} {v.last_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{v.patient_no}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TRIAGE_COLORS[v.priority || 'Normal'] || TRIAGE_COLORS.Normal}`}>
                        {v.priority || 'Normal'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[v.current_stage] || 'bg-gray-100 text-gray-600'}`}>
                        {v.current_stage}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {v.visit_time?.slice(0,5) || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visits.length > 8 && (
            <div className="px-4 py-2.5 border-t border-gray-50 dark:border-gray-700 text-center">
              <Link href="/reception" className="text-xs text-blue-600 hover:underline">View all {visits.length} visits today →</Link>
            </div>
          )}
        </div>

      </div>

      {/* ══════════════ RIGHT SIDEBAR ══════════════ */}
      <div className="w-72 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4 overflow-y-auto" style={{ minHeight:'calc(100vh - 56px)' }}>

        {/* 1. Communication Center */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm">Communication Center</h3>
            <button className="text-gray-400 hover:text-gray-600 text-lg leading-none">⋯</button>
          </div>
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">✅ All systems normal</div>
            ) : notifications.map((n,i) => (
              <div key={i}
                className={`flex items-start gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity
                  ${n.type==='danger'  ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                    n.type==='warning' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
                    'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'}`}>
                <span className="flex-shrink-0 mt-0.5">{n.icon}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-xs">{n.title}</div>
                  <div className="text-xs text-gray-500 truncate">{n.msg}</div>
                </div>
                <span className="text-gray-300 flex-shrink-0 text-sm">›</span>
              </div>
            ))}
            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 rounded-lg cursor-pointer">
              <span className="text-blue-500 flex-shrink-0">💬</span>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-blue-700">Internal messages</div>
                <div className="text-xs text-gray-400 truncate">Staff communication channel</div>
              </div>
              <span className="text-gray-300 flex-shrink-0 text-sm">›</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700" />

        {/* 2. Active Staff on Duty */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm">Active Staff on Duty</h3>
            <button className="text-gray-400 hover:text-gray-600 text-lg leading-none">⋯</button>
          </div>
          {staff.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">No staff records</p>
          ) : (
            <div className="space-y-2">
              {staff.map((s,i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-base flex-shrink-0">
                    {roleIcon(s.role_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs truncate">{s.first_name} {s.last_name}</div>
                    <div className="text-xs text-gray-400 truncate">{s.role_name}</div>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="On Duty" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700" />

        {/* 3. Bed Occupancy */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm">Bed Occupancy</h3>
            <Link href="/inpatient" className="text-xs text-blue-600 hover:underline">View →</Link>
          </div>
          <DonutRing occupied={totalOccupied} total={totalBeds} size={90} />
          {dash?.bed_occupancy?.slice(0,3).map((w,i) => (
            <div key={i} className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                <span className="truncate">{w.ward}</span>
                <span className="flex-shrink-0 ml-1">{w.occupied}/{w.total_beds}</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-1.5 rounded-full ${parseFloat(w.occupancy_pct||0)>=90?'bg-red-500':parseFloat(w.occupancy_pct||0)>=70?'bg-amber-500':'bg-green-500'}`}
                  style={{ width:`${w.occupancy_pct||0}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700" />

        {/* 4. Weekly OPD Visits */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm">Weekly OPD Visits</h3>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              {['Week','Daily'].map(p => (
                <button key={p} onClick={() => setOpdPeriod(p)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-all
                    ${opdPeriod===p ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-400'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 text-xs mb-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />{'<5 yrs'}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />{'>5 yrs'}</span>
          </div>
          <MiniBar data={weeklyOPDChart} colors={['#3b82f6','#16a34a']} height={80} />
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700" />

        {/* 5. Quick Action Workflow */}
        <div>
          <h3 className="font-bold text-sm mb-2">Quick Action Workflow</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href:'/triage',       icon:'❤️', label:'Triage'      },
              { href:'/consultation', icon:'🩺', label:'Consultation' },
              { href:'/laboratory',   icon:'🧪', label:'Laboratory'   },
              { href:'/pharmacy',     icon:'💊', label:'Pharmacy'     },
              { href:'/billing',      icon:'💰', label:'Billing'      },
              { href:'/inpatient',    icon:'🛏️', label:'Wards'        },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex flex-col items-center gap-1.5 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-200 transition-all">
                <span className="text-xl">{a.icon}</span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}