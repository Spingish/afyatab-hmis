'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';

// ── Dual-series clustered/grouped bar chart ─────────────────────
const ClusterBarChart = ({ data, seriesA, seriesB, colorA = '#dc2626', colorB = '#16a34a', height = 90 }) => {
  if (!data || !data.length) return <div className="flex items-center justify-center h-20 text-gray-300 text-xs">No data yet</div>;
  const max = Math.max(...data.map(d => Math.max(d[seriesA] || 0, d[seriesB] || 0)), 1);
  return (
    <div className="flex items-end justify-center gap-3" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 w-full max-w-[64px]">
          <div className="w-full flex gap-0.5 items-end" style={{ height: height - 20 }}>
            <div className="flex-1 rounded-t-sm transition-all duration-500" style={{ height: `${Math.max((d[seriesA] / max) * (height - 22), 2)}px`, background: colorA, opacity: 0.9 }} title={`${d.label}: ${d[seriesA]}`} />
            <div className="flex-1 rounded-t-sm transition-all duration-500" style={{ height: `${Math.max((d[seriesB] / max) * (height - 22), 2)}px`, background: colorB, opacity: 0.9 }} title={`${d.label}: ${d[seriesB]}`} />
          </div>
          <span className="text-xs text-gray-500 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// ── Compact stat widget (7-up top row) ──────────────────────────
const CompactStat = ({ label, value, icon, sub, variant = 'default' }) => {
  const box = variant === 'gold' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200';
  return (
    <div className={`${box} border rounded-lg px-3 py-2 hover:shadow-sm transition-shadow min-w-0`}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs font-bold text-black/60 uppercase tracking-wide truncate">{label}</span>
        <span className="text-sm flex-shrink-0">{icon}</span>
      </div>
      <p className="leading-none truncate text-xl font-extrabold text-black">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
    </div>
  );
};

// Period picker dropdown
const PeriodPicker = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 font-medium text-black outline-none focus:border-blue-500">
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

const quickActions = [
  { href:'/reception',     icon:'📝', label:'Register'    },
  { href:'/triage',        icon:'❤️', label:'Triage'      },
  { href:'/consultation',  icon:'🩺', label:'Consult'     },
  { href:'/laboratory',    icon:'🧪', label:'Lab'         },
  { href:'/pharmacy',      icon:'💊', label:'Pharmacy'    },
  { href:'/billing',       icon:'💰', label:'Billing'     },
  { href:'/billing',       icon:'🧾', label:'Invoices'    },
  { href:'/reports',       icon:'📈', label:'Reports'     },
];

export default function Dashboard() {
  const [kpis, setKpis]         = useState(null);
  const [dash, setDash]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [alerts, setAlerts]     = useState([]);
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

      const list = [];
      if (d.data.data.inventory?.low_stock > 0)
        list.push({ type:'danger', icon:'⚠️', title:'Low Stock Alert', msg:`${d.data.data.inventory.low_stock} drug(s) below minimum level` });
      if (d.data.data.inventory?.expiring_drugs > 0)
        list.push({ type:'warning', icon:'📅', title:'Expiring Drugs', msg:`${d.data.data.inventory.expiring_drugs} drug(s) expiring within 90 days` });
      if (d.data.data.today?.lab_requests?.pending > 0)
        list.push({ type:'info', icon:'🧪', title:'Lab Results Pending', msg:`${d.data.data.today.lab_requests.pending} lab request(s) awaiting results` });
      if (d.data.data.revenue?.pending_count > 0)
        list.push({ type:'warning', icon:'💰', title:'Pending Bills', msg:`${d.data.data.revenue.pending_count} invoice(s) unpaid — KES ${parseFloat(d.data.data.revenue.pending_balance||0).toLocaleString()}` });
      setAlerts(list);
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
        label: d.label,
        under5: parseInt(d.under_five), over5: parseInt(d.over_five)
      })));
    } catch { setOpdAge([]); }
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 60000);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => { loadTrend(trendPeriod); }, [trendPeriod]);
  useEffect(() => { loadOpdAge(opdAgePeriod); }, [opdAgePeriod]);

  const today   = dash?.today;
  const revenue = dash?.revenue;

  // Bed occupancy totals
  const bedTotals = (dash?.bed_occupancy || []).reduce((acc, w) => ({
    total: acc.total + parseInt(w.total_beds || 0),
    occupied: acc.occupied + parseInt(w.occupied || 0),
  }), { total: 0, occupied: 0 });
  const bedAvailable = bedTotals.total - bedTotals.occupied;

  return (
    <div className="space-y-2">

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-black text-sm">Loading live data...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 items-stretch">

          {/* ══════════════════ MAIN BODY (left, ~80%) ══════════════════ */}
          <div className="xl:col-span-9 space-y-2">

            {/* ── 7 ultra-compact stat widgets ─────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <CompactStat label="Patients Today" value={kpis?.opd_today ?? 0} icon="👥" sub="OPD visits" variant="gold" />
              <CompactStat label="Waiting List"    value={today?.waiting_list ?? 0} icon="📋" sub="surgeries, admissions & appointments" />
              <CompactStat label="Active Consultations" value={kpis?.consultations_today ?? 0} icon="🩺" sub="completed" />
              <CompactStat label="Pharmacy"        value={today?.pharmacy?.pending ?? 0} icon="💊" sub="pending prescriptions" variant="gold" />
              <CompactStat label="Inpatients"      value={today?.admissions?.admitted_today ?? 0} icon="🛏️" sub="admitted today" />
              <CompactStat label="Discharges"      value={today?.admissions?.discharged_today ?? 0} icon="🚑" sub="completed" />
              <CompactStat label="Financial Overview" value={`KES ${parseFloat(revenue?.today||0).toLocaleString()}`} icon="💰" variant="gold" />
            </div>

            {/* ── Monthly Trend (clustered bars) + Revenue Summary ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-black">Monthly Trend</h3>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-black"><span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>OPD</span>
                    <span className="flex items-center gap-1 text-xs text-black"><span className="w-2 h-2 rounded-full bg-green-600 inline-block"></span>IPD</span>
                    <PeriodPicker value={trendPeriod} onChange={setTrendPeriod}
                      options={[{value:'year',label:'Year'},{value:'month',label:'Month'},{value:'week',label:'Week'},{value:'daily',label:'Daily'}]} />
                  </div>
                </div>
                <ClusterBarChart
                  data={trend.map(t => ({ label: t.label, opd: parseInt(t.opd), ipd: parseInt(t.ipd) }))}
                  seriesA="opd" seriesB="ipd" colorA="#dc2626" colorB="#16a34a" height={90} />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-black">Revenue Summary</h3>
                  <Link href="/billing" className="text-xs text-blue-600 hover:underline">View all →</Link>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label:'Today',        value: revenue?.today,           color:'text-emerald-600', bg:'bg-emerald-50' },
                    { label:'This Week',    value: revenue?.week,            color:'text-blue-600',    bg:'bg-blue-50'    },
                    { label:'This Month',   value: revenue?.month,           color:'text-violet-600',  bg:'bg-violet-50'  },
                    { label:'Pending (KES)',value: revenue?.pending_balance, color:'text-red-600',     bg:'bg-red-50'     },
                  ].map(r => (
                    <div key={r.label} className={`flex items-center justify-between px-2.5 py-1.5 ${r.bg} rounded-lg`}>
                      <span className="text-xs font-medium text-black">{r.label}</span>
                      <span className={`text-sm font-bold ${r.color}`}>KES {parseFloat(r.value||0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Bed Occupancy (bars, stats on right) + OPD Visits ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm text-black">Bed Occupancy</h3>
                  <Link href="/inpatient" className="text-xs text-blue-600 hover:underline">View all →</Link>
                </div>
                {bedTotals.total === 0 ? (
                  <p className="text-gray-500 text-xs text-center py-3">No wards set up yet</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <ClusterBarChart
                        data={[{ label:'Beds', occupied: bedTotals.occupied, available: bedAvailable }]}
                        seriesA="occupied" seriesB="available" colorA="#dc2626" colorB="#16a34a" height={80} />
                    </div>
                    <div className="text-xs space-y-1.5 flex-shrink-0 border-l border-gray-100 pl-4">
                      <div><span className="font-bold text-black">{bedTotals.occupied}</span> <span className="text-gray-500">occupied</span></div>
                      <div><span className="font-bold text-black">{bedAvailable}</span> <span className="text-gray-500">available</span></div>
                      <div><span className="font-bold text-black">{bedTotals.total}</span> <span className="text-gray-500">total beds</span></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm text-black">OPD Visits</h3>
                  <PeriodPicker value={opdAgePeriod} onChange={setOpdAgePeriod}
                    options={[{value:'daily',label:'Daily'},{value:'week',label:'Week'},{value:'month',label:'Month'},{value:'year',label:'Year'}]} />
                </div>
                <div className="flex items-center gap-3 mb-1 text-xs text-black">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span>&lt;5 yrs</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>&gt;5 yrs</span>
                </div>
                <ClusterBarChart data={opdAge} seriesA="under5" seriesB="over5" colorA="#06b6d4" colorB="#4f46e5" height={80} />
              </div>
            </div>

            {/* ── Patients Registration Log ─────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm text-black">Patients Registration Log</h3>
                <Link href="/patients" className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
              {!dash?.recent_patients?.length ? (
                <p className="text-gray-500 text-xs text-center py-6">No patients registered yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-black">
                    <thead>
                      <tr className="text-left text-xs text-black/60 uppercase tracking-wide border-b border-gray-100">
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
                          <td className="py-2 text-black/70 font-mono text-xs">{p.patient_no}</td>
                          <td className="py-2 text-black/70">{p.gender}</td>
                          <td className="py-2">{priorityBadge(p.triage_priority)}</td>
                          <td className="py-2">{statusBadge(p.visit_status)}</td>
                          <td className="py-2 text-right text-xs text-black/50">
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

          {/* ══════════════════ RIGHT SIDEBAR — ONE continuous widget ══════════════════ */}
          <div className="xl:col-span-3">
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-200 flex flex-col h-full">

              {/* 1. Communication Center */}
              <div className="p-3 flex-1 flex flex-col">
                <h3 className="font-bold text-sm text-black mb-2">📢 Communication Center</h3>
                <div className="space-y-1.5 overflow-y-auto flex-1">
                  {!dash?.recent_activity?.length ? (
                    <p className="text-gray-500 text-xs text-center py-1">No activity in last 24 hours</p>
                  ) : dash.recent_activity.slice(0,6).map((a,i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0
                        ${a.type==='payment' ? 'bg-emerald-500' : a.type==='lab' ? 'bg-blue-500' : a.type==='patient' ? 'bg-violet-500' : 'bg-gray-400'}`} />
                      <span className="text-black/70 truncate flex-1">{a.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Hospital Alerts */}
              <div className="p-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-black">🚨 Hospital Alerts</h3>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{alerts.length}</span>
                </div>
                {alerts.length === 0 ? (
                  <div className="text-center py-3 text-gray-500 text-xs">
                    <span className="text-xl block mb-1">✅</span>All systems normal
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {alerts.map((n,i) => (
                      <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border text-xs
                        ${n.type==='danger' ? 'bg-red-50 border-red-200' : n.type==='warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                        <span className="flex-shrink-0">{n.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-black">{n.title}</div>
                          <div className="text-black/60 mt-0.5">{n.msg}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Active Staff on Duty */}
              <div className="p-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-black">Active Staff on Duty</h3>
                  <Link href="/staff" className="text-xs text-blue-600 hover:underline">View all →</Link>
                </div>
                {!staffOnDuty.length ? (
                  <p className="text-gray-500 text-xs text-center py-3">No active staff on this shift</p>
                ) : (
                  <div className="space-y-1.5">
                    {staffOnDuty.slice(0,6).map((s,i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {s.first_name?.[0]}{s.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-black truncate">{s.first_name} {s.last_name}</div>
                          <div className="text-xs text-black/50 truncate">{s.role_name || '—'}</div>
                        </div>
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" title={`${s.shift} shift`}></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Quick Action Workflow */}
              <div className="p-3 flex-1 flex flex-col">
                <h3 className="font-bold text-sm text-black mb-2">Quick Action Workflow</h3>
                <div className="grid grid-cols-4 gap-1.5">
                  {quickActions.map((a,i) => (
                    <Link key={i} href={a.href}
                      className="flex flex-col items-center gap-0.5 p-1.5 bg-gray-50 rounded-lg hover:bg-blue-50 hover:scale-105 transition-all text-center border border-transparent hover:border-blue-200">
                      <span className="text-base">{a.icon}</span>
                      <span className="text-xs text-black/70 leading-tight">{a.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}