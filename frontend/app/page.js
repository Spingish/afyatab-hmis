'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';

// ── Sparkline bar chart (single series) ──────────────────────
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

// ── Dual-series bar chart (e.g. OPD/IPD, or age-split) ────────
const DualBarChart = ({ data, seriesA, seriesB, colorA = '#3b82f6', colorB = '#16a34a', height = 90 }) => {
  if (!data || !data.length) return <div className="flex items-center justify-center h-20 text-gray-300 text-xs">No data yet</div>;
  const max = Math.max(...data.map(d => Math.max(d[seriesA] || 0, d[seriesB] || 0)), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex gap-0.5 items-end" style={{ height: height - 20 }}>
            <div className="flex-1 rounded-t-sm transition-all duration-500" style={{ height: `${Math.max((d[seriesA] / max) * (height - 22), 2)}px`, background: colorA, opacity: 0.85 }} title={`${d.label}: ${d[seriesA]}`} />
            <div className="flex-1 rounded-t-sm transition-all duration-500" style={{ height: `${Math.max((d[seriesB] / max) * (height - 22), 2)}px`, background: colorB, opacity: 0.85 }} title={`${d.label}: ${d[seriesB]}`} />
          </div>
          <span className="text-xs text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// ── Compact progress ring (bed occupancy) ─────────────────────
const ProgressRing = ({ pct = 0, size = 88, label, sub }) => {
  const r = (size - 14) / 2, cx = size / 2, cy = size / 2, circumference = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(pct, 0), 100);
  const dash = (clamped / 100) * circumference;
  const color = clamped >= 90 ? '#dc2626' : clamped >= 70 ? '#d97706' : '#16a34a';
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.6s ease' }} />
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1e293b">{Math.round(clamped)}%</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="8" fill="#94a3b8">occupied</text>
      </svg>
      {label && <p className="text-xs font-semibold text-gray-600 mt-1">{label}</p>}
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
};

// ── Compact stat widget (7-up top row) ─────────────────────────
const CompactStat = ({ label, value, icon, sub, accent, bold }) => (
  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 hover:shadow-sm transition-shadow min-w-0">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">{label}</span>
      <span className="text-sm flex-shrink-0">{icon}</span>
    </div>
    <p className={`leading-none truncate ${bold ? 'text-xl font-extrabold' : 'text-xl font-bold'}`} style={accent ? { color: accent } : undefined}>{value ?? '—'}</p>
    {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
  </div>
);

// Period picker dropdown
const PeriodPicker = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 font-medium text-gray-600 outline-none focus:border-blue-500">
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const priorityBadge = (p) => {
  if (!p) return <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">—</span>;
  const map = {
    Emergency: 'bg-red-100 text-red-700',
    Urgent:    'bg-amber-100 text-amber-700',
    High:      'bg-amber-100 text-amber-700',
    Normal:    'bg-emerald-100 text-emerald-700',
    Low:       'bg-emerald-100 text-emerald-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[p] || 'bg-gray-100 text-gray-500'}`}>{p}</span>;
};

const statusBadge = (s) => {
  if (!s) return <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">New</span>;
  const map = {
    Active:      'bg-blue-100 text-blue-700',
    Completed:   'bg-emerald-100 text-emerald-700',
    Admitted:    'bg-violet-100 text-violet-700',
    Discharged:  'bg-gray-100 text-gray-500',
    Transferred: 'bg-amber-100 text-amber-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[s] || 'bg-gray-100 text-gray-500'}`}>{s}</span>;
};

export default function Dashboard() {
  const [kpis, setKpis]         = useState(null);
  const [dash, setDash]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [time, setTime]         = useState(new Date());
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [search, setSearch]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [staffOnDuty, setStaffOnDuty] = useState([]);
  const [trend, setTrend]       = useState([]);
  const [trendPeriod, setTrendPeriod] = useState('month');
  const [opdAge, setOpdAge]     = useState([]);
  const [opdAgePeriod, setOpdAgePeriod] = useState('week');
  const intervalRef = useRef(null);

  const load = async () => {
    try {
      const [k, d, s] = await Promise.all([
        axios.get('/api/dashboard/kpis'),
        axios.get('/api/dashboard'),
        axios.get('/api/dashboard/staff-on-duty'),
      ]);
      setKpis(k.data.kpis);
      setDash(d.data.data);
      setStaffOnDuty(s.data.staff || []);

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

  const loadTrend = async (period) => {
    try {
      const r = await axios.get('/api/dashboard/trend', { params: { period } });
      setTrend(r.data.trend || []);
    } catch { setTrend([]); }
  };

  const loadOpdAge = async (period) => {
    try {
      const r = await axios.get('/api/dashboard/opd-by-age', { params: { period } });
      setOpdAge((r.data.data || []).map(d => ({
        label: new Date(d.visit_date).toLocaleDateString('en-KE', { weekday: 'short' }),
        under5: parseInt(d.under_five), over5: parseInt(d.over_five)
      })));
    } catch { setOpdAge([]); }
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 60000);
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => { clearInterval(intervalRef.current); clearInterval(clock); };
  }, []);

  useEffect(() => { loadTrend(trendPeriod); }, [trendPeriod]);
  useEffect(() => { loadOpdAge(opdAgePeriod); }, [opdAgePeriod]);

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const r = await axios.get(`/api/patients/search?q=${q}`);
      setSearchResults(r.data.patients?.slice(0,5) || []);
    } catch { setSearchResults([]); }
  };

  const today   = dash?.today;
  const revenue = dash?.revenue;

  // Bed occupancy totals for the ring
  const bedTotals = (dash?.bed_occupancy || []).reduce((acc, w) => ({
    total: acc.total + parseInt(w.total_beds || 0),
    occupied: acc.occupied + parseInt(w.occupied || 0),
  }), { total: 0, occupied: 0 });
  const bedPct = bedTotals.total > 0 ? (bedTotals.occupied / bedTotals.total) * 100 : 0;

  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('afyatab_user') || 'null') : null;

  return (
    <div className="space-y-4">

      {/* ── SINGLE-ROW TOP BAR ────────────────────────────────── */}
      <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
        <div className="flex-shrink-0">
          <span className="font-bold text-sm">Dashboard</span>
          <span className="text-gray-300 mx-2">·</span>
          <span className="text-xs text-gray-400 font-mono">
            {time.toLocaleDateString('en-KE',{weekday:'long', day:'2-digit', month:'long', year:'numeric'})} - {time.toLocaleTimeString('en-KE')}
          </span>
        </div>

        <div className="flex-1 relative">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus-within:border-blue-500 transition-colors">
            <span className="text-gray-400 text-sm">🔍</span>
            <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Quick search — patient name, phone, ID..."
              className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400" />
            {search && <button onClick={() => { setSearch(''); setSearchResults([]); }} className="text-gray-400 hover:text-gray-600">×</button>}
          </div>
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              {searchResults.map(p => (
                <Link key={p.id} href={`/patients?id=${p.id}`}
                  onClick={() => { setSearch(''); setSearchResults([]); }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 border-b last:border-0 border-gray-50">
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

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={load} title="Refresh"
            className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors text-sm">
            ↻
          </button>
          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)} title="Notifications"
              className="relative w-8 h-8 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors text-sm">
              🔔
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {notifications.length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                  <span className="font-bold text-sm">Notifications</span>
                  <span className="text-xs text-gray-400">{notifications.length} alerts</span>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-400 text-sm">All clear ✅</div>
                ) : notifications.map((n,i) => (
                  <div key={i} className={`px-4 py-3 border-b border-gray-50 last:border-0
                    ${n.type==='danger' ? 'bg-red-50' : n.type==='warning' ? 'bg-yellow-50' : 'bg-blue-50'}`}>
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
          <Link href="/settings" title="Staff profile"
            className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold hover:bg-blue-700 transition-colors">
            {user?.first_name?.[0] || 'A'}{user?.last_name?.[0] || 'D'}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-400 text-sm">Loading live data...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

          {/* ══════════════════ MAIN BODY (left, ~80%) ══════════════════ */}
          <div className="xl:col-span-9 space-y-4">

            {/* ── 7 ultra-compact stat widgets ─────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <CompactStat label="Patients Today"      value={kpis?.opd_today ?? 0}                  icon="👥" sub="OPD visits" />
              <CompactStat label="Admissions"           value={today?.at_reception ?? 0}              icon="🏥" sub="waiting to be seen" />
              <CompactStat label="Active Consultations" value={kpis?.consultations_today ?? 0}        icon="🩺" sub="completed" />
              <CompactStat label="Pharmacy"              value={today?.pharmacy?.pending ?? 0}         icon="💊" sub="pending prescriptions" />
              <CompactStat label="Inpatients"            value={today?.admissions?.admitted_today ?? 0} icon="🛏️" sub="admitted today" />
              <CompactStat label="Discharges"            value={today?.admissions?.discharged_today ?? 0} icon="🚑" sub="completed" />
              <CompactStat label="Financial Overview"    value={`KES ${parseFloat(revenue?.today||0).toLocaleString()}`} icon="💰" bold accent="#16a34a" />
            </div>

            {/* ── Monthly Trend + Revenue Summary ──────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-sm">Monthly Trend</h3>
                    <p className="text-xs text-gray-400">OPD vs IPD visit volume</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>OPD</span>
                    <span className="flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>IPD</span>
                    <PeriodPicker value={trendPeriod} onChange={setTrendPeriod}
                      options={[{value:'year',label:'Year'},{value:'month',label:'Month'},{value:'week',label:'Week'},{value:'daily',label:'Daily'}]} />
                  </div>
                </div>
                <DualBarChart
                  data={trend.map(t => ({ label: t.label, opd: parseInt(t.opd), ipd: parseInt(t.ipd) }))}
                  seriesA="opd" seriesB="ipd" colorA="#3b82f6" colorB="#16a34a" height={130} />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">Revenue Summary</h3>
                  <Link href="/billing" className="text-xs text-blue-600 hover:underline">View all →</Link>
                </div>
                <div className="space-y-2">
                  {[
                    { label:'Today',        value: revenue?.today,           color:'text-emerald-600', bg:'bg-emerald-50' },
                    { label:'This Week',    value: revenue?.week,            color:'text-blue-600',    bg:'bg-blue-50'    },
                    { label:'This Month',   value: revenue?.month,           color:'text-violet-600',  bg:'bg-violet-50'  },
                    { label:'Pending (KES)',value: revenue?.pending_balance, color:'text-red-600',     bg:'bg-red-50'     },
                  ].map(r => (
                    <div key={r.label} className={`flex items-center justify-between px-3 py-2 ${r.bg} rounded-lg`}>
                      <span className="text-xs font-medium text-gray-500">{r.label}</span>
                      <span className={`text-sm font-bold ${r.color}`}>KES {parseFloat(r.value||0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Patients Registration Log ─────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm">Patients Registration Log</h3>
                  <p className="text-xs text-gray-400">Most recently registered patients</p>
                </div>
                <Link href="/patients" className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
              {!dash?.recent_patients?.length ? (
                <p className="text-gray-400 text-xs text-center py-6">No patients registered yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                        <th className="pb-2 font-semibold">Patient</th>
                        <th className="pb-2 font-semibold">File No.</th>
                        <th className="pb-2 font-semibold">Gender</th>
                        <th className="pb-2 font-semibold">Triage</th>
                        <th className="pb-2 font-semibold">Status</th>
                        <th className="pb-2 font-semibold text-right">Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dash.recent_patients.map((p,i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {p.first_name?.[0]}{p.last_name?.[0]}
                              </div>
                              <span className="font-medium truncate">{p.first_name} {p.last_name}</span>
                            </div>
                          </td>
                          <td className="py-2 text-gray-500 font-mono text-xs">{p.patient_no}</td>
                          <td className="py-2 text-gray-500">{p.gender}</td>
                          <td className="py-2">{priorityBadge(p.triage_priority)}</td>
                          <td className="py-2">{statusBadge(p.visit_status)}</td>
                          <td className="py-2 text-right text-xs text-gray-400">
                            {new Date(p.created_at).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════ RIGHT SIDEBAR (stacked monitoring) ══════════════════ */}
          <div className="xl:col-span-3 space-y-4">

            {/* 1. Communication Center */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-1.5">📢 Communication Center</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{notifications.length}</span>
              </div>
              <div className="space-y-2 mb-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-3 text-gray-400 text-xs">
                    <span className="text-xl block mb-1">✅</span>All systems normal
                  </div>
                ) : notifications.slice(0,3).map((n,i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs
                    ${n.type==='danger' ? 'bg-red-50 border-red-200' : n.type==='warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                    <span className="flex-shrink-0">{n.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{n.title}</div>
                      <div className="text-gray-500 mt-0.5">{n.msg}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-2.5">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Recent Activity</div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {!dash?.recent_activity?.length ? (
                    <p className="text-gray-400 text-xs text-center py-1">No activity in last 24 hours</p>
                  ) : dash.recent_activity.slice(0,5).map((a,i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0
                        ${a.type==='payment' ? 'bg-emerald-500' : a.type==='lab' ? 'bg-blue-500' : a.type==='patient' ? 'bg-violet-500' : 'bg-gray-400'}`} />
                      <span className="text-gray-600 truncate flex-1">{a.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Active Staff on Duty */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Active Staff on Duty</h3>
                <Link href="/staff" className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
              {!staffOnDuty.length ? (
                <p className="text-gray-400 text-xs text-center py-3">No active staff on this shift</p>
              ) : (
                <div className="space-y-2">
                  {staffOnDuty.slice(0,6).map((s,i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {s.first_name?.[0]}{s.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{s.first_name} {s.last_name}</div>
                        <div className="text-xs text-gray-400 truncate">{s.role_name || '—'}</div>
                      </div>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" title={`${s.shift} shift`}></span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Bed Occupancy */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">Bed Occupancy</h3>
                <Link href="/inpatient" className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
              {bedTotals.total === 0 ? (
                <p className="text-gray-400 text-xs text-center py-3">No wards set up yet</p>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <ProgressRing pct={bedPct} size={88} />
                  <div className="text-xs space-y-1">
                    <div><span className="font-bold">{bedTotals.occupied}</span> <span className="text-gray-400">occupied</span></div>
                    <div><span className="font-bold">{bedTotals.total - bedTotals.occupied}</span> <span className="text-gray-400">available</span></div>
                    <div><span className="font-bold">{bedTotals.total}</span> <span className="text-gray-400">total beds</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Weekly OPD Visits (age split) */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Weekly OPD Visits</h3>
                <PeriodPicker value={opdAgePeriod} onChange={setOpdAgePeriod}
                  options={[{value:'week',label:'Week'},{value:'daily',label:'Today'}]} />
              </div>
              <div className="flex items-center gap-3 mb-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span>&lt;5 yrs</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>&gt;5 yrs</span>
              </div>
              <DualBarChart data={opdAge} seriesA="under5" seriesB="over5" colorA="#06b6d4" colorB="#4f46e5" height={90} />
            </div>

            {/* 5. Quick Action Workflow */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-sm mb-3">Quick Action Workflow</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { href:'/triage',       icon:'❤️', label:'Triage'      },
                  { href:'/consultation', icon:'🩺', label:'Consult'     },
                  { href:'/laboratory',   icon:'🧪', label:'Lab'         },
                  { href:'/pharmacy',     icon:'💊', label:'Pharmacy'    },
                  { href:'/billing',      icon:'💰', label:'Billing'     },
                ].map(a => (
                  <Link key={a.href} href={a.href}
                    className="flex flex-col items-center gap-1 p-2.5 bg-gray-50 rounded-lg hover:bg-blue-50 hover:scale-105 transition-all text-center border border-transparent hover:border-blue-200">
                    <span className="text-lg">{a.icon}</span>
                    <span className="text-xs font-medium text-gray-500">{a.label}</span>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}