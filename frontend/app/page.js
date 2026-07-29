'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, Hourglass, Stethoscope, BedDouble, Pill, Wallet,
  Megaphone, TriangleAlert, CircleCheck, UserPlus, ClipboardPlus,
  FlaskConical, PillBottle, Receipt, FileBarChart,
} from 'lucide-react';

const TEAL = '#0F766E';
const TEAL_LIGHT = '#14B8A6';
const GREEN = '#22C55E';
const ORANGE = '#F97316';
const RED = '#DC2626';
const SLATE = '#94A3B8';

// ---- KPI card, top row ----------------------------------------------
const KpiCard = ({ icon: Icon, label, value, trend, trendUp, sub, iconBg }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-2">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={17} className="text-white" />
      </div>
      {trend && (
        <span className={`text-xs font-semibold ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
          {trendUp ? '+' : ''}{trend}
        </span>
      )}
    </div>
    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide truncate">{label}</div>
    <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{value}</div>
    {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
  </div>
);

// ---- Period picker dropdown ------------------------------------------
const PeriodPicker = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-medium text-slate-700 outline-none focus:border-teal-600">
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const priorityBadge = (p) => {
  if (!p) return <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-medium">-</span>;
  const map = {
    Emergency: 'bg-red-100 text-red-700',
    Urgent:    'bg-amber-100 text-amber-700',
    High:      'bg-amber-100 text-amber-700',
    Normal:    'bg-emerald-100 text-emerald-700',
    Low:       'bg-emerald-100 text-emerald-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[p] || 'bg-slate-100 text-slate-500'}`}>{p}</span>;
};

const statusBadge = (s) => {
  if (!s) return <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-medium">New</span>;
  const map = {
    Active:      'bg-blue-100 text-blue-700',
    Completed:   'bg-emerald-100 text-emerald-700',
    Admitted:    'bg-violet-100 text-violet-700',
    Discharged:  'bg-slate-100 text-slate-500',
    Transferred: 'bg-amber-100 text-amber-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[s] || 'bg-slate-100 text-slate-500'}`}>{s}</span>;
};

const quickActions = [
  { href:'/reception',     icon: UserPlus,      label:'Register'    },
  { href:'/triage',        icon: ClipboardPlus, label:'Triage'      },
  { href:'/consultation',  icon: Stethoscope,   label:'Consult'     },
  { href:'/laboratory',    icon: FlaskConical,  label:'Lab'         },
  { href:'/pharmacy',      icon: PillBottle,    label:'Pharmacy'    },
  { href:'/billing',       icon: Wallet,        label:'Billing'     },
  { href:'/billing',       icon: Receipt,       label:'Invoices'    },
  { href:'/reports',       icon: FileBarChart,  label:'Reports'     },
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
        list.push({ type:'danger', title:'Low Stock Alert', msg:`${d.data.data.inventory.low_stock} drug(s) below minimum level` });
      if (d.data.data.inventory?.expiring_drugs > 0)
        list.push({ type:'warning', title:'Expiring Drugs', msg:`${d.data.data.inventory.expiring_drugs} drug(s) expiring within 90 days` });
      if (d.data.data.today?.lab_requests?.pending > 0)
        list.push({ type:'info', title:'Lab Results Pending', msg:`${d.data.data.today.lab_requests.pending} lab request(s) awaiting results` });
      if (d.data.data.revenue?.pending_count > 0)
        list.push({ type:'warning', title:'Pending Bills', msg:`${d.data.data.revenue.pending_count} invoice(s) unpaid - KES ${parseFloat(d.data.data.revenue.pending_balance||0).toLocaleString()}` });
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

  const bedTotals = (dash?.bed_occupancy || []).reduce((acc, w) => ({
    total: acc.total + parseInt(w.total_beds || 0),
    occupied: acc.occupied + parseInt(w.occupied || 0),
  }), { total: 0, occupied: 0 });
  const bedAvailable = bedTotals.total - bedTotals.occupied;
  const occupancyPct = bedTotals.total > 0 ? Math.round((bedTotals.occupied / bedTotals.total) * 100) : 0;

  const bedPieData = [
    { name: 'Occupied',  value: bedTotals.occupied },
    { name: 'Available', value: bedAvailable },
  ];

  const trendChartData = trend.map(t => ({ label: t.label, OPD: parseInt(t.opd), IPD: parseInt(t.ipd) }));
  const opdAgeChartData = opdAge.map(d => ({ label: d.label, 'Under 5': d.under5, 'Over 5': d.over5 }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Loading live data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ---- 6 KPI cards ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={Users} label="OPD Visits" value={kpis?.opd_today ?? 0} sub="vs yesterday" iconBg="bg-teal-700" />
        <KpiCard icon={Hourglass} label="Waiting List" value={today?.waiting_list ?? 0} sub="vs yesterday" iconBg="bg-orange-500" />
        <KpiCard icon={Stethoscope} label="Active Consults" value={kpis?.consultations_today ?? 0} sub="vs yesterday" iconBg="bg-violet-500" />
        <KpiCard icon={BedDouble} label="Inpatients" value={today?.admissions?.admitted_today ?? 0} sub="admitted today" iconBg="bg-blue-500" />
        <KpiCard icon={Pill} label="Pharmacy" value={today?.pharmacy?.pending ?? 0} sub="pending prescriptions" iconBg="bg-pink-500" />
        <KpiCard icon={Wallet} label="Revenue (Today)" value={`KES ${parseFloat(revenue?.today||0).toLocaleString()}`} iconBg="bg-emerald-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">

        {/* ============ MAIN COLUMN ============ */}
        <div className="xl:col-span-9 space-y-4">

          {/* OPD Trend + Revenue Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-slate-900">OPD Trend</h3>
                <PeriodPicker value={trendPeriod} onChange={setTrendPeriod}
                  options={[{value:'year',label:'Year'},{value:'month',label:'Month'},{value:'week',label:'Week'},{value:'daily',label:'Daily'}]} />
              </div>
              {trendChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="OPD" stroke={TEAL} strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="IPD" stroke={GREEN} strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-slate-900">Revenue Summary</h3>
                <Link href="/billing" className="text-xs text-teal-700 font-medium hover:underline">View Report</Link>
              </div>
              <div className="space-y-2">
                {[
                  { label:'Today',         value: revenue?.today,           bg:'bg-emerald-50',  color:'text-emerald-700' },
                  { label:'This Week',     value: revenue?.week,            bg:'bg-blue-50',      color:'text-blue-700'    },
                  { label:'This Month',    value: revenue?.month,           bg:'bg-violet-50',    color:'text-violet-700'  },
                  { label:'Pending (KES)', value: revenue?.pending_balance, bg:'bg-red-50',       color:'text-red-600'     },
                ].map(r => (
                  <div key={r.label} className={`flex items-center justify-between px-3 py-2 ${r.bg} rounded-xl`}>
                    <span className="text-xs font-medium text-slate-600">{r.label}</span>
                    <span className={`text-sm font-bold ${r.color}`}>KES {parseFloat(r.value||0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bed Occupancy donut + OPD Visits by Age Group */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm text-slate-900">Bed Occupancy</h3>
                <Link href="/inpatient" className="text-xs text-teal-700 font-medium hover:underline">View Details</Link>
              </div>
              {bedTotals.total === 0 ? (
                <p className="text-slate-400 text-xs text-center py-6">No wards set up yet</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={bedPieData} dataKey="value" innerRadius={45} outerRadius={65} paddingAngle={2}>
                          <Cell fill={TEAL} />
                          <Cell fill="#E2E8F0" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-extrabold text-slate-900">{occupancyPct}%</span>
                      <span className="text-[10px] text-slate-400">Occupied</span>
                    </div>
                  </div>
                  <div className="text-xs space-y-2">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-teal-700"></span><span className="font-bold text-slate-800">{bedTotals.occupied}</span><span className="text-slate-400">Occupied</span></div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span><span className="font-bold text-slate-800">{bedAvailable}</span><span className="text-slate-400">Available</span></div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span><span className="font-bold text-slate-800">{bedTotals.total}</span><span className="text-slate-400">Total beds</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm text-slate-900">OPD Visits by Age Group</h3>
                <PeriodPicker value={opdAgePeriod} onChange={setOpdAgePeriod}
                  options={[{value:'daily',label:'Daily'},{value:'week',label:'Week'},{value:'month',label:'Month'},{value:'year',label:'Year'}]} />
              </div>
              {opdAgeChartData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-slate-300 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={opdAgeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Under 5" fill={TEAL_LIGHT} radius={[4,4,0,0]} />
                    <Bar dataKey="Over 5" fill={TEAL} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent Patient Registrations table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900">Recent Patient Registrations</h3>
              <Link href="/patients" className="text-xs text-teal-700 font-medium hover:underline">View all</Link>
            </div>
            {!dash?.recent_patients?.length ? (
              <p className="text-slate-400 text-xs text-center py-8">No patients registered yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-700">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                      <th className="pb-2 font-semibold">#</th>
                      <th className="pb-2 font-semibold">Patient Name</th>
                      <th className="pb-2 font-semibold">File No.</th>
                      <th className="pb-2 font-semibold">Gender</th>
                      <th className="pb-2 font-semibold">Triage</th>
                      <th className="pb-2 font-semibold">Status</th>
                      <th className="pb-2 font-semibold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash.recent_patients.map((p,i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="py-2.5 text-slate-400">{i+1}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-teal-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {p.first_name?.[0]}{p.last_name?.[0]}
                            </div>
                            <span className="font-medium truncate">{p.first_name} {p.last_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-slate-500 font-mono text-xs">{p.patient_no}</td>
                        <td className="py-2.5 text-slate-500">{p.gender}</td>
                        <td className="py-2.5">{priorityBadge(p.triage_priority)}</td>
                        <td className="py-2.5">{statusBadge(p.visit_status)}</td>
                        <td className="py-2.5 text-right text-xs text-slate-400">
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

        {/* ============ RIGHT COLUMN ============ */}
        <div className="xl:col-span-3 space-y-4">

          {/* Communication Center */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone size={16} className="text-teal-700" />
              <h3 className="font-bold text-sm text-slate-900">Communication Center</h3>
            </div>
            {!dash?.recent_activity?.length ? (
              <p className="text-slate-400 text-xs text-center py-2">No activity in last 24 hours</p>
            ) : (
              <div className="space-y-2">
                {dash.recent_activity.slice(0,6).map((a,i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0
                      ${a.type==='payment' ? 'bg-emerald-500' : a.type==='lab' ? 'bg-blue-500' : a.type==='patient' ? 'bg-violet-500' : 'bg-slate-400'}`} />
                    <span className="text-slate-600 truncate flex-1">{a.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hospital Alerts */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TriangleAlert size={16} className="text-red-500" />
                <h3 className="font-bold text-sm text-slate-900">Hospital Alerts</h3>
              </div>
              {alerts.length > 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{alerts.length}</span>
              )}
            </div>
            {alerts.length === 0 ? (
              <div className="text-center py-3 text-slate-400 text-xs">
                <CircleCheck size={22} className="text-emerald-500 mx-auto mb-1" />
                All systems normal
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((n,i) => (
                  <div key={i} className={`p-2.5 rounded-xl border text-xs
                    ${n.type==='danger' ? 'bg-red-50 border-red-200' : n.type==='warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="font-bold text-slate-800">{n.title}</div>
                    <div className="text-slate-500 mt-0.5">{n.msg}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Staff on Duty */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900">Active Staff on Duty</h3>
              <Link href="/staff" className="text-xs text-teal-700 font-medium hover:underline">View all</Link>
            </div>
            {!staffOnDuty.length ? (
              <p className="text-slate-400 text-xs text-center py-3">No active staff on this shift</p>
            ) : (
              <div className="space-y-2.5">
                {staffOnDuty.slice(0,6).map((s,i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-teal-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {s.first_name?.[0]}{s.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{s.first_name} {s.last_name}</div>
                      <div className="text-xs text-slate-400 truncate">{s.role_name || '-'}</div>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold flex-shrink-0">{s.shift || 'On Duty'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <h3 className="font-bold text-sm text-slate-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map((a,i) => {
                const Icon = a.icon;
                return (
                  <Link key={i} href={a.href}
                    className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 rounded-xl hover:bg-teal-50 hover:-translate-y-0.5 transition-all text-center border border-transparent hover:border-teal-200">
                    <Icon size={18} className="text-teal-700" />
                    <span className="text-[11px] text-slate-600 leading-tight">{a.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}