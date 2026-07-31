'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { patientAPI } from '../lib/api';
import './globals.css';
import {
  LayoutDashboard, Users, Stethoscope, HeartPulse, FlaskConical, Package,
  Wallet, UserCog, BarChart3, ChevronRight, ChevronDown, Search, Bell,
  Moon, Sun, LogOut, RefreshCw, Menu, X, Clock,
} from 'lucide-react';

// Dashboard is a standalone top-level link; everything else is grouped into
// dropdown categories. Items with href:null are not built yet ("Soon").
// `section` only controls which header the group renders under -- it does
// not change any route, permission, or API call.
const navGroups = [
  {
    key: 'patient', label: 'Patient Management', icon: Users, section: 'PATIENT CARE',
    items: [
      { href:'/lookup',       label:'Look-up' },
      { href:'/patients',     label:'Patient Register (MPI)' },
      { href:'/appointments', label:'Scheduling & Booking' },
      { href:'/triage',       label:'Queue & Flow Management' },
      { href:'/inpatient',    label:'Admission, Discharge, Transfer' },
    ]
  },
  {
    key: 'clinical', label: 'Clinical Care & EMR', icon: Stethoscope, section: 'PATIENT CARE',
    items: [
      { href:'/triage',       label:'Triage & Nursing' },
      { href:'/consultation', label:'OPD Consultation' },
      { href:'/inpatient',    label:'IPD Care' },
      { href:null,            label:'Follow-ups & Chronic Care' },
    ]
  },
  {
    key: 'family', label: 'Family Health Services', icon: HeartPulse, section: 'PATIENT CARE',
    items: [
      { href:'/mch/anc', label:'Antenatal Care (ANC)' },
      { href:'/mch',     label:'Labor & Delivery (Maternity)' },
      { href:'/mch/cwc', label:'Postnatal Care & Immunization' },
      { href:'/mch/fp',  label:'Family Planning' },
    ]
  },
  {
    key: 'ancillary', label: 'Ancillary & Diagnostics', icon: FlaskConical, section: 'OPERATIONS',
    items: [
      { href:'/laboratory', label:'Laboratory (LIS)' },
      { href:null,          label:'Radiology (RIS)' },
      { href:'/pharmacy',   label:'Pharmacy & Dispensing' },
    ]
  },
  {
    key: 'supply', label: 'Supply Chain & Inventory', icon: Package, section: 'OPERATIONS',
    items: [
      { href:'/pharmacy', label:'Stock Management' },
      { href:null,        label:'Procurement' },
      { href:null,        label:'Internal Distribution' },
    ]
  },
  {
    key: 'billing', label: 'Billing & Financial Mgmt.', icon: Wallet, section: 'OPERATIONS',
    items: [
      { href:'/billing', label:'Point of Sale (POS)' },
      { href:null,       label:'Insurance & Claims' },
      { href:null,       label:'Core Accounting' },
    ]
  },
  {
    key: 'hr', label: 'HR & Administration', icon: UserCog, section: 'ADMINISTRATION',
    items: [
      { href:'/staff',      label:'Staff Management' },
      { href:'/settings',   label:'System Settings' },
      { href:'/superadmin', label:'Super Admin' },
    ]
  },
  {
    key: 'reports', label: 'Reports & Analytics', icon: BarChart3, section: 'ADMINISTRATION',
    items: [
      { href:null,       label:'Statutory Reporting (DHIS2/KHIS)' },
      { href:'/reports', label:'Financial & Operational Insights' },
      { href:null,       label:'Clinical Analytics' },
    ]
  },
];

const sections = ['PATIENT CARE', 'OPERATIONS', 'ADMINISTRATION'];

const pageTitles = {
  '/':'Dashboard','/lookup':'Look-up','/reception':'Reception','/patients':'Patients',
  '/appointments':'Appointments','/mch':'MCH Clinic',
  '/consultation':'Consultation','/laboratory':'Laboratory',
  '/pharmacy':'Pharmacy','/billing':'Billing',
  '/reports':'Reports','/staff':'Staff','/settings':'Settings'
};

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [dark, setDark]               = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch]           = useState('');
  const [results, setResults]         = useState([]);
  const [searching, setSearching]     = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [user, setUser]               = useState(null);
  const [alerts, setAlerts]           = useState([]);
  const [alertsOpen, setAlertsOpen]   = useState(false);
  const [hospitalSettings, setHospitalSettings] = useState(null);
  const [openGroups, setOpenGroups]   = useState({});
  const [now, setNow]                 = useState(new Date());
  const searchRef   = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (pathname === '/login') return;
    axios.get('/api/settings/hospital')
      .then(r => setHospitalSettings(r.data.settings))
      .catch(() => {});
  }, [pathname === '/login']);

  useEffect(() => {
    const grp = navGroups.find(g => g.items.some(it => it.href === pathname));
    if (grp) setOpenGroups(prev => ({ ...prev, [grp.key]: true }));
  }, [pathname]);

  const toggleGroup = (key) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (pathname === '/login') return;
    const fetchAlerts = async () => {
      try {
        const r = await axios.get('/api/dashboard');
        const d = r.data.data;
        const list = [];
        if (d.inventory?.low_stock > 0) list.push({ title:'Low Stock', msg:`${d.inventory.low_stock} drug(s) below minimum level` });
        if (d.inventory?.expiring_drugs > 0) list.push({ title:'Expiring Drugs', msg:`${d.inventory.expiring_drugs} drug(s) expiring within 90 days` });
        if (d.today?.lab_requests?.pending > 0) list.push({ title:'Lab Pending', msg:`${d.today.lab_requests.pending} result(s) awaiting` });
        if (d.revenue?.pending_count > 0) list.push({ title:'Pending Bills', msg:`${d.revenue.pending_count} unpaid invoice(s)` });
        setAlerts(list);
      } catch { /* silent */ }
    };
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 60000);
    return () => clearInterval(iv);
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/login') return;
    const token    = localStorage.getItem('tibamax_token');
    const userData = localStorage.getItem('tibamax_user');
    if (!token) { router.push('/login'); return; }
    if (userData) setUser(JSON.parse(userData));
  }, [pathname]);

  useEffect(() => {
    const fn = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Live clock + Ctrl/Cmd+K to focus search -- presentation-only additions
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000 * 30);
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.querySelector('input')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { clearInterval(iv); window.removeEventListener('keydown', onKey); };
  }, []);

  const handleSearch = (q) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); setShowResults(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await patientAPI.search(q);
        setResults(r.data.patients || []);
        setShowResults(true);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  };

  const selectPatient = (p) => {
    setSearch(''); setResults([]); setShowResults(false);
    router.push('/patients?id=' + p.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('tibamax_token');
    localStorage.removeItem('tibamax_user');
    router.push('/login');
  };

  if (pathname === '/login') {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={dark ? 'bg-slate-900 text-white min-h-screen flex' : 'bg-slate-50 text-slate-900 min-h-screen flex'}>

        {/* ============ SIDEBAR ============ */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-[72px]'} bg-white border-r border-slate-200 flex flex-col fixed top-0 left-0 bottom-0 z-50 transition-all duration-300 overflow-hidden`}>

          {/* Logo */}
          <div className="h-16 flex items-center gap-2 px-4 border-b border-slate-100 flex-shrink-0">
            <div className="w-9 h-9 rounded-lg bg-teal-700 flex items-center justify-center flex-shrink-0">
              <HeartPulse size={18} className="text-white" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="font-bold text-sm leading-none text-slate-900">TibaMax</div>
                <div className="text-[10px] text-slate-400 tracking-wide">HMIS</div>
              </div>
            )}
          </div>

          {/* Hospital card */}
          <div className="p-3 flex-shrink-0">
            <div className="rounded-xl p-3 bg-gradient-to-br from-teal-700 to-teal-500 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {hospitalSettings?.logo_url ? (
                    <img src={hospitalSettings.logo_url} alt="Hospital logo" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <span className="text-sm font-bold">{(hospitalSettings?.hospital_name || 'TibaMax')[0]}</span>
                  )}
                </div>
                {sidebarOpen && (
                  <div className="min-w-0">
                    <div className="text-xs font-semibold leading-tight truncate">{hospitalSettings?.hospital_name || 'Webuye West Sub-County Hospital'}</div>
                    <div className="text-[10px] text-white/70 leading-tight truncate">{hospitalSettings?.motto || 'Your corporate health management'}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 pb-3">
            <Link href="/"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2 text-sm transition-colors
                ${pathname === '/' ? 'bg-teal-700 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
              <LayoutDashboard size={17} className="flex-shrink-0" />
              {sidebarOpen && <span>Dashboard</span>}
            </Link>

            {sections.map(section => (
              <div key={section} className="mb-1">
                {sidebarOpen && (
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider px-3 pt-3 pb-1">{section}</div>
                )}
                {navGroups.filter(g => g.section === section).map(group => {
                  const Icon = group.icon;
                  const groupActive = group.items.some(it => it.href === pathname);
                  const isOpen = !!openGroups[group.key];
                  return (
                    <div key={group.key}>
                      <button onClick={() => toggleGroup(group.key)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                          ${groupActive ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Icon size={17} className="flex-shrink-0" />
                        {sidebarOpen && <span className="flex-1 text-left truncate">{group.label}</span>}
                        {sidebarOpen && (isOpen
                          ? <ChevronDown size={14} className="flex-shrink-0 text-slate-400" />
                          : <ChevronRight size={14} className="flex-shrink-0 text-slate-400" />)}
                      </button>

                      {sidebarOpen && isOpen && (
                        <div className="mt-0.5 mb-1 ml-4 pl-4 border-l border-slate-100 space-y-0.5">
                          {group.items.map((it, i) => it.href ? (
                            <Link key={i} href={it.href}
                              className={`block px-3 py-1.5 rounded-lg text-xs truncate transition-colors
                                ${pathname === it.href ? 'bg-teal-700 text-white font-semibold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                              {it.label}
                            </Link>
                          ) : (
                            <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-slate-300 cursor-not-allowed">
                              <span className="truncate">{it.label}</span>
                              <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2">Soon</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* ============ MAIN COLUMN ============ */}
        <div className={`${sidebarOpen ? 'ml-64' : 'ml-[72px]'} flex-1 flex flex-col transition-all duration-300 min-h-screen`}>

          {/* Top bar */}
          <header className="h-16 bg-white border-b border-slate-200 px-5 flex items-center justify-between sticky top-0 z-40 gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-teal-700 transition-colors">
                <Menu size={20} />
              </button>
              <span className="font-bold text-lg text-slate-900">{pageTitles[pathname] || 'Dashboard'}</span>
            </div>

            <div className="flex-1 max-w-md relative" ref={searchRef}>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <Search size={16} className="text-slate-400 flex-shrink-0" />
                <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
                  placeholder="Search patient by name, phone or ID..."
                  className="flex-1 bg-transparent text-sm outline-none text-slate-700" />
                {searching && <span className="text-slate-400 text-xs flex-shrink-0">...</span>}
                {search ? (
                  <button onClick={() => { setSearch(''); setResults([]); setShowResults(false); }} className="text-slate-400 flex-shrink-0"><X size={14} /></button>
                ) : (
                  <span className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 flex-shrink-0">Ctrl K</span>
                )}
              </div>
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                  {results.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-400 text-center">No patients found</div>
                  ) : results.map(p => (
                    <button key={p.id} onClick={() => selectPatient(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0 hover:bg-teal-50">
                      <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-800">{p.first_name} {p.last_name}</div>
                        <div className="text-xs text-slate-400">{p.patient_no} - {p.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-xs text-slate-400 hidden md:flex items-center gap-1.5">
                <Clock size={13} />
                {now.toLocaleDateString('en-KE', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
                <span className="text-slate-300">|</span>
                {now.toLocaleTimeString('en-KE', { hour:'2-digit', minute:'2-digit' })}
              </div>

              <button onClick={() => window.location.reload()} title="Refresh"
                className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center hover:border-teal-600 hover:text-teal-700 transition-colors text-slate-500">
                <RefreshCw size={15} />
              </button>

              <button onClick={() => setDark(!dark)} title="Toggle dark mode"
                className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center hover:border-teal-600 hover:text-teal-700 transition-colors text-slate-500">
                {dark ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              <div className="relative">
                <button onClick={() => setAlertsOpen(!alertsOpen)} title="Notifications"
                  className="relative w-9 h-9 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center hover:border-teal-600 hover:text-teal-700 transition-colors text-slate-500">
                  <Bell size={15} />
                  {alerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {alerts.length}
                    </span>
                  )}
                </button>
                {alertsOpen && (
                  <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                      <span className="font-bold text-sm">Notifications</span>
                      <span className="text-xs text-slate-400">{alerts.length} alerts</span>
                    </div>
                    {alerts.length === 0 ? (
                      <div className="px-4 py-6 text-center text-slate-400 text-sm">All clear</div>
                    ) : alerts.map((n,i) => (
                      <div key={i} className="px-4 py-3 border-b border-slate-50 last:border-0">
                        <div className="font-semibold text-xs text-slate-800">{n.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{n.msg}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative group">
                <div className="flex items-center gap-2 cursor-pointer">
                  <div className="w-9 h-9 bg-teal-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {user?.first_name?.[0] || 'A'}{user?.last_name?.[0] || 'D'}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-semibold text-slate-800 leading-tight">{user?.first_name} {user?.last_name}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">{user?.role}</div>
                  </div>
                </div>
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-48 hidden group-hover:block">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="font-semibold text-sm text-slate-800">{user?.first_name} {user?.last_name}</div>
                    <div className="text-xs text-slate-400">{user?.role}</div>
                  </div>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-xl">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 pb-14 overflow-y-auto bg-slate-50">{children}</main>

          <footer className={`${sidebarOpen ? 'left-64' : 'left-[72px]'} fixed bottom-0 right-0 border-slate-200 border-t px-6 py-2 text-xs flex justify-between text-slate-400 bg-white z-30 transition-all duration-300`}>
            <span>TibaMax HMIS v1.0 - Webuye West Sub-County Hospital <span className="text-slate-300">|</span> Your corporate health management information system.</span>
            <span>Backend: localhost:5000 - DB: afyatab_hmis</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
