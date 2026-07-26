'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';

// ── Sparkline bar chart ──────────────────────────────────────
const BarChart = ({ data, color = '#3b82f6', height = 80 }) => {
  if (!data || !data.length) return <div className="flex items-center justify-center h-20 text-gray-300 text-xs">No data yet</div>;
  const max = Math.max(...data.map(d => d.value || 0), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-sm transition-all duration-500"
            style={{ height: `${Math.max((d.value / max) * (height - 20), 2)}px`, background: color, opacity: 0.85 }}
            title={`${d.label}: ${d.value}`} />
          <span className="text-xs text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// ── Donut chart (SVG) ────────────────────────────────────────
const DonutChart = ({ segments, size = 120 }) => {
  const r = 45, cx = 60, cy = 60, circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="18" />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circumference;
          const gap  = circumference - dash;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth="18"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dasharray 0.5s ease' }} />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy-4} textAnchor="middle" fontSize="18" fontWeight="bold" fill="#1e293b">{total}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize="10" fill="#94a3b8">Total</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-gray-500">{s.label}</span>
            <span className="font-bold ml-auto pl-3">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Stat card ────────────────────────────────────────────────
const StatCard = ({ label, value, icon, border, sub, subColor, onClick }) => (
  <div onClick={onClick}
    className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 ${border} rounded-xl p-4 hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}>
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 truncate">{label}</p>
        <p className="text-3xl font-bold leading-none">{value ?? '—'}</p>
        {sub && <p className={`text-xs mt-1.5 font-medium ${subColor || 'text-gray-400'}`}>{sub}</p>}
      </div>
      <span className="text-2xl ml-2 flex-shrink-0">{icon}</span>
    </div>
  </div>
);

// ── Flow step ────────────────────────────────────────────────
const FlowStep = ({ label, icon, count, color, active }) => (
  <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all
    ${active ? `${color} text-white shadow-md scale-105` : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
    <span className="text-base">{icon}</span>
    <span>{label}</span>
    {count > 0 && <span className={`text-xs font-bold ${active ? 'text-white/90' : 'text-blue-600'}`}>{count}</span>}
  </div>
);

export default function Dashboard() {
  const [kpis, setKpis]         = useState(null);
  const [dash, setDash]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [time, setTime]         = useState(new Date());
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [search, setSearch]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const intervalRef = useRef(null);

  const load = async () => {
    try {
      const token = localStorage.getItem('afyatab_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [k, d] = await Promise.all([
        axios.get('/api/dashboard/kpis'),
        axios.get('/api/dashboard'),
      ]);
      setKpis(k.data.kpis);
      setDash(d.data.data);

      // Build notifications from alerts
      const notifs = [];
      if (d.data.data.inventory?.low_stock > 0)
        notifs.push({ type:'danger', icon:'⚠️', title:'Low Stock Alert', msg:`${d.data.data.inventory.low_stock} drug(s) below minimum level`, time:'Now' });
      if (d.data.data.inventory?.expiring_drugs > 0)
        notifs.push({ type:'warning', icon:'📅', title:'Expiring Drugs', msg:`${d.data.data.inventory.expiring_drugs} drug(s) expiring within 90 days`, time:'Now' });
      if (d.data.data.today?.lab_requests?.pending > 0)
        notifs.push({ type:'info', icon:'🧪', title:'Lab Results Pending', msg:`${d.data.data.today.lab_requests.pending} lab request(s) awaiting results`, time:'Today' });
      if (d.data.data.revenue?.pending_count > 0)
        notifs.push({ type:'warning', icon:'💰', title:'Pending Bills', msg:`${d.data.data.revenue.pending_count} invoice(s) unpaid — KES ${parseFloat(d.data.data.revenue.pending_balance||0).toLocaleString()}`, time:'Today' });
      setNotifications(notifs);
    } catch (err) {
      console.error('Dashboard load error:', err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    // Refresh KPIs every 60 seconds
    intervalRef.current = setInterval(load, 60000);
    // Clock
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => { clearInterval(intervalRef.current); clearInterval(clock); };
  }, []);

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const r = await axios.get(`/api/patients/search?q=${q}`);
      setSearchResults(r.data.patients?.slice(0,5) || []);
    } catch { setSearchResults([]); }
  };

  // Chart data
  const weeklyData = dash?.weekly_opd?.map(d => ({
    label: new Date(d.visit_date).toLocaleDateString('en-KE',{weekday:'short'}),
    value: parseInt(d.visits)
  })) || [];

  const monthlyOPD = dash?.monthly_trend?.map(d => ({ label: d.month, value: parseInt(d.opd) })) || [];
  const monthlyIPD = dash?.monthly_trend?.map(d => ({ label: d.month, value: parseInt(d.ipd) })) || [];

  const visitDonut = [
    { label:'Outpatients', value: parseInt(kpis?.opd_today||0),       color:'#3b82f6' },
    { label:'Inpatients',  value: parseInt(kpis?.inpatients||0),       color:'#16a34a' },
    { label:'Lab Tests',   value: parseInt(kpis?.lab_today||0),        color:'#d97706' },
    { label:'Pharmacy',    value: parseInt(kpis?.consultations_today||0), color:'#7c3aed' },
  ].filter(s => s.value > 0);

  const today = dash?.today;
  const revenue = dash?.revenue;

  return (
    <div className="space-y-5">

      {/* ── TOP HEADER ─────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm">
            {time.toLocaleDateString('en-KE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            {' · '}
            <span className="font-mono">{time.toLocaleTimeString('en-KE')}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-9 h-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors">
              🔔
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {notifications.length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <span className="font-bold text-sm">Notifications</span>
                  <span className="text-xs text-gray-400">{notifications.length} alerts</span>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-400 text-sm">All clear ✅</div>
                ) : notifications.map((n,i) => (
                  <div key={i} className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700 last:border-0
                    ${n.type==='danger' ? 'bg-red-50 dark:bg-red-900/20' : n.type==='warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-lg flex-shrink-0">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs">{n.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{n.msg}</div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={load}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg text-sm hover:border-blue-500 transition-colors">
            ↻ <span className="hidden md:inline">Refresh</span>
          </button>
          <Link href="/reception"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
            + Register Patient
          </Link>
        </div>
      </div>

      {/* ── SEARCH ─────────────────────────────────────────── */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors shadow-sm">
          <span className="text-gray-400">🔍</span>
          <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Quick search — patient name, phone, ID or patient number..."
            className="flex-1 bg-transparent text-sm outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400" />
          {search && <button onClick={() => { setSearch(''); setSearchResults([]); }} className="text-gray-400 hover:text-gray-600">×</button>}
        </div>
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
            {searchResults.map(p => (
              <Link key={p.id} href={`/patients?id=${p.id}`}
                onClick={() => { setSearch(''); setSearchResults([]); }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b last:border-0 border-gray-50 dark:border-gray-700">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {p.first_name?.[0]}{p.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{p.first_name} {p.last_name}</div>
                  <div className="text-xs text-gray-400">{p.patient_no} • {p.phone} • {p.gender}</div>
                </div>
                {p.allergies && p.allergies !== 'None' && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex-shrink-0">⚠️ Allergy</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-400 text-sm">Loading live data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── OPD / IPD SECTION LABELS ──────────────────── */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
              <div className="w-3 h-3 bg-blue-600 rounded-sm"></div> Outpatient (OPD)
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-green-600 uppercase tracking-widest">
              <div className="w-3 h-3 bg-green-600 rounded-sm"></div> Inpatient (IPD)
            </div>
          </div>

          {/* ── STAT CARDS ROW 1 — OPD ────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Patients Today"    value={kpis?.visits_today}       icon="👥" border="border-blue-500"   sub={`${kpis?.opd_today||0} OPD visits`}         subColor="text-blue-500" />
            <StatCard label="At Reception"      value={today?.at_reception}      icon="🚪" border="border-cyan-500"   sub="Waiting to be seen"                          subColor="text-cyan-500" />
            <StatCard label="At Consultation"   value={today?.at_consultation}   icon="🩺" border="border-violet-500" sub={`${kpis?.consultations_today||0} completed today`} subColor="text-violet-500" />
            <StatCard label="At Pharmacy"       value={today?.at_pharmacy}       icon="💊" border="border-orange-500" sub={`${today?.pharmacy?.pending||0} prescriptions pending`} subColor="text-orange-500" />
          </div>

          {/* ── STAT CARDS ROW 2 — IPD + Finance ─────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Admitted (IPD)"    value={kpis?.inpatients}         icon="🛏️" border="border-green-500"  sub={`${today?.admissions?.admitted_today||0} admitted today`} subColor="text-green-500" />
            <StatCard label="Discharged Today"  value={today?.discharged}        icon="✅" border="border-teal-500"   sub="Completed care"                              subColor="text-teal-500" />
            <StatCard label="Revenue Today"     value={`KES ${parseFloat(revenue?.today||0).toLocaleString()}`} icon="💰" border="border-emerald-500" sub={`${revenue?.today_txns||0} transactions`} subColor="text-emerald-500" />
            <StatCard label="Pending Bills"     value={revenue?.pending_count}   icon="⏳" border="border-red-500"    sub={`KES ${parseFloat(revenue?.pending_balance||0).toLocaleString()} outstanding`} subColor="text-red-500" />
          </div>

          {/* ── STAT CARDS ROW 3 — Diagnostics + Alerts ──── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Lab Requests"      value={kpis?.lab_today}          icon="🧪" border="border-yellow-500" sub={`${today?.lab_requests?.pending||0} pending results`} subColor="text-yellow-600" />
            <StatCard label="Triaged Today"     value={kpis?.triaged_today}      icon="❤️" border="border-pink-500"   sub={`${today?.triage?.emergency||0} emergency`}          subColor="text-red-500" />
            <StatCard label="Low Stock Alerts"  value={kpis?.low_stock}          icon="⚠️" border="border-red-500"    sub="Drugs below minimum"                         subColor="text-red-500" />
            <StatCard label="Appointments"      value={kpis?.appointments_today} icon="📅" border="border-indigo-500" sub={`${today?.appointments?.visited||0} visited today`}  subColor="text-indigo-500" />
          </div>

          {/* ── OPD PATIENT FLOW ──────────────────────────── */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-500 rounded-xl p-4">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Outpatient Flow — Today</div>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label:'Reception',    icon:'🚪', count: parseInt(today?.at_reception||0),    color:'bg-blue-600',   active: parseInt(today?.at_reception||0) > 0 },
                { label:'Triage',       icon:'❤️', count: parseInt(kpis?.triaged_today||0),    color:'bg-pink-600',   active: parseInt(kpis?.triaged_today||0) > 0 },
                { label:'Consultation', icon:'🩺', count: parseInt(today?.at_consultation||0), color:'bg-violet-600', active: parseInt(today?.at_consultation||0) > 0 },
                { label:'Laboratory',   icon:'🧪', count: parseInt(today?.at_laboratory||0),   color:'bg-yellow-600', active: parseInt(today?.at_laboratory||0) > 0 },
                { label:'Pharmacy',     icon:'💊', count: parseInt(today?.at_pharmacy||0),     color:'bg-orange-600', active: parseInt(today?.at_pharmacy||0) > 0 },
                { label:'Discharged',   icon:'✅', count: parseInt(today?.discharged||0),      color:'bg-green-600',  active: parseInt(today?.discharged||0) > 0 },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center gap-2">
                  <FlowStep {...step} />
                  {i < arr.length-1 && <span className="text-gray-300 text-lg">→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* ── CHARTS ROW ────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Weekly OPD bar chart */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm">Weekly OPD Visits</h3>
                  <p className="text-xs text-gray-400">Last 7 days</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">OPD</span>
              </div>
              <BarChart data={weeklyData} color="#3b82f6" height={100} />
            </div>

            {/* Monthly trend — dual bar */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm">Monthly Trend</h3>
                  <p className="text-xs text-gray-400">OPD vs IPD (6 months)</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>OPD</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>IPD</span>
                </div>
              </div>
              {monthlyOPD.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-gray-300 text-xs">No monthly data yet</div>
              ) : (
                <div className="flex items-end gap-2" style={{ height: 100 }}>
                  {monthlyOPD.map((d, i) => {
                    const maxVal = Math.max(...monthlyOPD.map(x=>x.value), ...monthlyIPD.map(x=>x.value), 1);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full flex gap-0.5 items-end" style={{ height: 80 }}>
                          <div className="flex-1 rounded-t-sm bg-blue-500 opacity-80 transition-all"
                            style={{ height: `${Math.max((d.value/maxVal)*78,2)}px` }} title={`OPD: ${d.value}`} />
                          <div className="flex-1 rounded-t-sm bg-green-500 opacity-80 transition-all"
                            style={{ height: `${Math.max(((monthlyIPD[i]?.value||0)/maxVal)*78,2)}px` }} title={`IPD: ${monthlyIPD[i]?.value||0}`} />
                        </div>
                        <span className="text-xs text-gray-400">{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Today's distribution donut */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="mb-4">
                <h3 className="font-bold text-sm">Today's Distribution</h3>
                <p className="text-xs text-gray-400">Patient activity breakdown</p>
              </div>
              {visitDonut.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-gray-300 text-xs flex-col gap-2">
                  <span className="text-3xl">📊</span>
                  <span>No activity recorded yet today</span>
                </div>
              ) : (
                <DonutChart segments={visitDonut} size={130} />
              )}
            </div>
          </div>

          {/* ── BOTTOM ROW ────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Bed occupancy */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-green-500 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Bed Occupancy</h3>
                <Link href="/inpatient" className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
              {!dash?.bed_occupancy?.length ? (
                <p className="text-gray-400 text-xs text-center py-4">No wards set up yet</p>
              ) : (
                <div className="space-y-3">
                  {dash.bed_occupancy.slice(0,5).map((w,i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium truncate">{w.ward}</span>
                        <span className="text-gray-400 flex-shrink-0 ml-2">{w.occupied}/{w.total_beds}</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-2 rounded-full transition-all ${parseFloat(w.occupancy_pct||0)>=90?'bg-red-500':parseFloat(w.occupancy_pct||0)>=70?'bg-yellow-500':'bg-green-500'}`}
                          style={{ width:`${w.occupancy_pct||0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h3 className="font-bold text-sm mb-4">Quick Actions</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { href:'/reception',    icon:'👤', label:'Register'    },
                  { href:'/triage',       icon:'❤️', label:'Triage'      },
                  { href:'/consultation', icon:'🩺', label:'Consult'     },
                  { href:'/laboratory',   icon:'🧪', label:'Lab'         },
                  { href:'/pharmacy',     icon:'💊', label:'Pharmacy'    },
                  { href:'/billing',      icon:'💰', label:'Billing'     },
                  { href:'/inpatient',    icon:'🛏️', label:'Wards'       },
                  { href:'/appointments', icon:'📅', label:'Appt'        },
                  { href:'/reports',      icon:'📈', label:'Reports'     },
                ].map(a => (
                  <Link key={a.href} href={a.href}
                    className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:scale-105 transition-all text-center border border-transparent hover:border-blue-200">
                    <span className="text-xl">{a.icon}</span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{a.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Revenue summary */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Revenue Summary</h3>
                <Link href="/billing" className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
              <div className="space-y-3">
                {[
                  { label:'Today',        value: revenue?.today,        color:'text-emerald-600', bg:'bg-emerald-50' },
                  { label:'This Week',    value: revenue?.week,         color:'text-blue-600',    bg:'bg-blue-50'    },
                  { label:'This Month',   value: revenue?.month,        color:'text-violet-600',  bg:'bg-violet-50'  },
                  { label:'Pending (KES)',value: revenue?.pending_balance, color:'text-red-600',  bg:'bg-red-50'     },
                ].map(r => (
                  <div key={r.label} className={`flex items-center justify-between px-3 py-2 ${r.bg} dark:bg-opacity-10 rounded-lg`}>
                    <span className="text-xs font-medium text-gray-500">{r.label}</span>
                    <span className={`text-sm font-bold ${r.color}`}>
                      KES {parseFloat(r.value||0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RECENT ACTIVITY + COMMUNICATION CENTER ────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Recent patients */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Recent Patients</h3>
                <Link href="/patients" className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
              {!dash?.recent_patients?.length ? (
                <p className="text-gray-400 text-xs text-center py-4">No patients registered yet</p>
              ) : (
                <div className="space-y-2">
                  {dash.recent_patients.map((p,i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{p.first_name} {p.last_name}</div>
                        <div className="text-xs text-gray-400">{p.patient_no} • {p.gender} • {p.phone}</div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(p.created_at).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Communication Center */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  📢 Communication Center
                </h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {notifications.length} alerts
                </span>
              </div>

              {/* System Alerts */}
              <div className="space-y-2 mb-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-3 text-gray-400 text-xs">
                    <span className="text-2xl block mb-1">✅</span>
                    All systems normal — no alerts
                  </div>
                ) : notifications.map((n,i) => (
                  <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border
                    ${n.type==='danger'  ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                      n.type==='warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
                      'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'}`}>
                    <span className="text-base flex-shrink-0">{n.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs">{n.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.msg}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Recent Activity</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {!dash?.recent_activity?.length ? (
                    <p className="text-gray-400 text-xs text-center py-2">No activity in last 24 hours</p>
                  ) : dash.recent_activity.map((a,i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0
                        ${a.type==='payment' ? 'bg-emerald-500' :
                          a.type==='lab'     ? 'bg-blue-500' :
                          a.type==='patient' ? 'bg-violet-500' : 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-600 dark:text-gray-300 truncate block">{a.description}</span>
                        <span className="text-gray-400">{new Date(a.time).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { href:'/reports',    label:'Reports',     icon:'📈' },
                    { href:'/superadmin', label:'Admin Panel', icon:'🛡️' },
                    { href:'/settings',   label:'Settings',    icon:'⚙️'  },
                  ].map(l => (
                    <Link key={l.href} href={l.href}
                      className="flex flex-col items-center gap-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-center transition-colors">
                      <span className="text-lg">{l.icon}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{l.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── WEEKLY REVENUE CHART ──────────────────────── */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm">Financial Overview</h3>
                <p className="text-xs text-gray-400">Revenue summary</p>
              </div>
              <div className="flex gap-3 text-sm font-bold">
                <span className="text-emerald-600">Today: KES {parseFloat(revenue?.today||0).toLocaleString()}</span>
                <span className="text-gray-300">|</span>
                <span className="text-blue-600">Month: KES {parseFloat(revenue?.month||0).toLocaleString()}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label:'Revenue Today',  value:`KES ${parseFloat(revenue?.today||0).toLocaleString()}`,   color:'bg-emerald-500', pct: 100 },
                { label:'Revenue Week',   value:`KES ${parseFloat(revenue?.week||0).toLocaleString()}`,    color:'bg-blue-500',    pct: revenue?.week ? Math.min((revenue.today/revenue.week)*100,100) : 0 },
                { label:'Revenue Month',  value:`KES ${parseFloat(revenue?.month||0).toLocaleString()}`,   color:'bg-violet-500',  pct: revenue?.month ? Math.min((revenue.today/revenue.month)*100,100) : 0 },
                { label:'Outstanding',    value:`KES ${parseFloat(revenue?.pending_balance||0).toLocaleString()}`, color:'bg-red-500', pct: 100 },
              ].map(r => (
                <div key={r.label} className="text-center">
                  <div className="text-xs text-gray-400 mb-2">{r.label}</div>
                  <div className="text-sm font-bold mb-2">{r.value}</div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-2 rounded-full ${r.color}`} style={{ width:`${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </>
      )}
    </div>
  );
}