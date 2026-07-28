'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { patientAPI } from '../lib/api';
import './globals.css';

// Dashboard is a standalone top-level link; everything else is grouped into
// dropdown categories. Items with href:null are not built yet ("Soon").
const navGroups = [
  {
    key: 'patient', label: 'Patient Management', icon: '🧑‍🤝‍🧑',
    items: [
      { href:'/reception',    icon:'📝', label:'New Intake' },
      { href:'/patients',     icon:'👥', label:'Patient Register (MPI)' },
      { href:'/appointments', icon:'📅', label:'Scheduling & Booking' },
      { href:'/triage',       icon:'🚦', label:'Queue & Flow Management' },
      { href:'/inpatient',    icon:'🛏️', label:'Admission, Discharge, Transfer' },
    ]
  },
  {
    key: 'clinical', label: 'Clinical Care & EMR', icon:'🩺',
    items: [
      { href:'/triage',       icon:'❤️', label:'Triage & Nursing' },
      { href:'/consultation', icon:'🩺', label:'OPD Consultation' },
      { href:'/inpatient',    icon:'🏨', label:'IPD Care' },
      { href:null,            icon:'🔁', label:'Follow-ups & Chronic Care' },
    ]
  },
  {
    key: 'family', label: 'Family Health & Specialized Clinics', icon:'🤰',
    items: [
      { href:'/mch/anc', icon:'🤰', label:'Antenatal Care (ANC)' },
      { href:'/mch',     icon:'👶', label:'Labor & Delivery (Maternity)' },
      { href:'/mch/cwc', icon:'💉', label:'Postnatal Care & Immunization' },
      { href:'/mch/fp',  icon:'🧬', label:'Family Planning' },
    ]
  },
  {
    key: 'ancillary', label: 'Ancillary & Diagnostic Services', icon:'🔬',
    items: [
      { href:'/laboratory', icon:'🧪', label:'Laboratory (LIS)' },
      { href:null,          icon:'📷', label:'Radiology (RIS)' },
      { href:'/pharmacy',   icon:'💊', label:'Pharmacy & Dispensing' },
    ]
  },
  {
    key: 'supply', label: 'Supply Chain & Inventory', icon:'📦',
    items: [
      { href:'/pharmacy', icon:'📦', label:'Stock Management' },
      { href:null,        icon:'🧾', label:'Procurement' },
      { href:null,        icon:'🚚', label:'Internal Distribution' },
    ]
  },
  {
    key: 'billing', label: 'Billing & Financial Management', icon:'💰',
    items: [
      { href:'/billing', icon:'💵', label:'Point of Sale (POS)' },
      { href:null,       icon:'🏥', label:'Insurance & Claims' },
      { href:null,       icon:'📒', label:'Core Accounting' },
    ]
  },
  {
    key: 'hr', label: 'HR & Administration', icon:'👨‍⚕️',
    items: [
      { href:'/staff',      icon:'👥', label:'Staff Management' },
      { href:'/settings',   icon:'⚙️', label:'System Settings' },
      { href:'/superadmin', icon:'🛡️', label:'Super Admin' },
    ]
  },
  {
    key: 'reports', label: 'Reports & Analytics', icon:'📈',
    items: [
      { href:null,       icon:'📑', label:'Statutory Reporting (DHIS2/KHIS)' },
      { href:'/reports', icon:'📊', label:'Financial & Operational Insights' },
      { href:null,       icon:'🧬', label:'Clinical Analytics' },
    ]
  },
];

const pageTitles = {
  '/':'Dashboard','/reception':'Reception','/patients':'Patients',
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
        if (d.inventory?.low_stock > 0) list.push({ icon:'⚠️', title:'Low Stock', msg:`${d.inventory.low_stock} drug(s) below minimum level` });
        if (d.inventory?.expiring_drugs > 0) list.push({ icon:'📅', title:'Expiring Drugs', msg:`${d.inventory.expiring_drugs} drug(s) expiring within 90 days` });
        if (d.today?.lab_requests?.pending > 0) list.push({ icon:'🧪', title:'Lab Pending', msg:`${d.today.lab_requests.pending} result(s) awaiting` });
        if (d.revenue?.pending_count > 0) list.push({ icon:'💰', title:'Pending Bills', msg:`${d.revenue.pending_count} unpaid invoice(s)` });
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
      <body className={dark ? 'bg-gray-900 text-white min-h-screen flex' : 'bg-sky-50 text-black min-h-screen flex'}>
        <aside className={sidebarOpen
          ? 'w-64 bg-sky-500 text-white flex flex-col fixed top-4 left-4 bottom-4 rounded-2xl shadow-xl z-50 transition-all duration-300 overflow-hidden'
          : 'w-16 bg-sky-500 text-white flex flex-col fixed top-4 left-4 bottom-4 rounded-2xl shadow-xl z-50 transition-all duration-300 overflow-hidden'}>

          {/* Brand: logo, hospital name, motto — from Hospital Settings */}
          <div className="p-4 border-b border-white/15 flex-shrink-0">
            <div className="flex items-center gap-3">
              {hospitalSettings?.logo_url ? (
                <img src={hospitalSettings.logo_url} alt="Hospital logo"
                  className="w-11 h-11 rounded-xl object-cover flex-shrink-0 bg-white"
                  onError={e => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 text-sky-600">
                  {(hospitalSettings?.hospital_name || 'TibaMax')[0]}
                </div>
              )}
              {sidebarOpen && (
                <div className="min-w-0">
                  <div className="font-bold text-sm leading-tight truncate text-white">{hospitalSettings?.hospital_name || 'TibaMax HMIS'}</div>
                  <div className="text-xs text-white/70 leading-tight truncate">{hospitalSettings?.motto || 'Hospital Management System'}</div>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 py-3 overflow-y-auto">
            {/* Dashboard — standalone, no section label */}
            <Link href="/"
              className={pathname === '/'
                ? 'flex items-center gap-3 pl-4 pr-4 py-2.5 ml-3 mr-4 rounded-xl mb-1 text-sm bg-blue-900 text-white font-semibold shadow-md transition-all duration-200'
                : 'flex items-center gap-3 pl-4 pr-4 py-2.5 ml-3 mr-4 rounded-xl mb-1 text-sm text-white/90 hover:bg-white/15 transition-all duration-200'}>
              <span className="text-base flex-shrink-0 w-5 text-center">📊</span>
              {sidebarOpen && <span>Dashboard</span>}
            </Link>

            {navGroups.map(group => {
              const groupActive = group.items.some(it => it.href === pathname);
              const isOpen = !!openGroups[group.key];
              return (
                <div key={group.key} className="mt-0.5">
                  <button onClick={() => toggleGroup(group.key)}
                    className={groupActive
                      ? 'flex items-center gap-3 pl-4 pr-4 py-2.5 ml-3 mr-4 rounded-xl text-sm bg-blue-900 text-white font-semibold shadow-md transition-all duration-200'
                      : 'flex items-center gap-3 pl-4 pr-4 py-2.5 ml-3 mr-4 rounded-xl text-sm text-white/90 hover:bg-white/15 transition-all duration-200'}
                    style={{ width: 'calc(100% - 1.75rem)' }}>
                    <span className="text-base flex-shrink-0 w-5 text-center">{group.icon}</span>
                    {sidebarOpen && <span className="flex-1 text-left truncate">{group.label}</span>}
                    {sidebarOpen && (
                      <span className={`text-xs flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>›</span>
                    )}
                  </button>

                  {sidebarOpen && isOpen && (
                    <div className="mt-0.5 mb-1 space-y-0.5">
                      {group.items.map((it, i) => it.href ? (
                        <Link key={i} href={it.href}
                          className={pathname === it.href
                            ? 'flex items-center gap-2 pl-11 pr-4 py-2 ml-3 mr-4 rounded-xl text-xs bg-blue-900 text-white font-semibold shadow-md transition-all duration-200'
                            : 'flex items-center gap-2 pl-11 pr-4 py-2 ml-3 mr-4 rounded-xl text-xs text-white/80 hover:bg-white/15 transition-all duration-200'}>
                          <span className="w-4 text-center flex-shrink-0">{it.icon}</span>
                          <span className="truncate">{it.label}</span>
                        </Link>
                      ) : (
                        <div key={i}
                          className="flex items-center gap-2 pl-11 pr-4 py-2 ml-3 mr-4 rounded-xl text-xs text-white/40 cursor-not-allowed">
                          <span className="w-4 text-center flex-shrink-0">{it.icon}</span>
                          <span className="truncate flex-1">{it.label}</span>
                          <span className="text-[9px] bg-white/15 px-1.5 py-0.5 rounded-full flex-shrink-0">Soon</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/15 flex-shrink-0">
            <button onClick={() => setDark(!dark)}
              className="flex items-center gap-2 text-white/80 hover:text-white text-xs w-full px-2 py-1.5 rounded-lg hover:bg-white/15">
              <span className="w-5 text-center">{dark ? '☀' : '🌙'}</span>
              {sidebarOpen && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
          </div>
        </aside>

        <div className={sidebarOpen ? 'ml-[17rem] flex-1 flex flex-col transition-all duration-300 min-h-screen' : 'ml-[5.5rem] flex-1 flex flex-col transition-all duration-300 min-h-screen'}>
          <header className={dark ? 'bg-gray-800 border-gray-700 border-b px-4 h-14 flex items-center justify-between sticky top-0 z-40 gap-4' : 'bg-white border-gray-200 border-b px-4 h-14 flex items-center justify-between sticky top-0 z-40 gap-4'}>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-blue-600 text-lg">☰</button>
              <span className="font-semibold text-sm">{pageTitles[pathname] || 'TibaMax HMIS'}</span>
            </div>
            <div className="flex-1 max-w-md relative" ref={searchRef}>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                <span className="text-gray-400 text-sm">🔍</span>
                <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
                  placeholder="Search patient by name, phone or ID..."
                  className="flex-1 bg-transparent text-sm outline-none text-gray-700" />
                {searching && <span className="text-gray-400 text-xs">...</span>}
                {search && <button onClick={() => { setSearch(''); setResults([]); setShowResults(false); }} className="text-gray-400 text-sm">×</button>}
              </div>
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                  {results.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">No patients found</div>
                  ) : results.map(p => (
                    <button key={p.id} onClick={() => selectPatient(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0 hover:bg-blue-50">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-800">{p.first_name} {p.last_name}</div>
                        <div className="text-xs text-gray-400">{p.patient_no} • {p.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-xs text-gray-400 hidden md:block">
                {new Date().toLocaleDateString('en-KE', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
              </div>
              <button onClick={() => window.location.reload()} title="Refresh"
                className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center hover:border-blue-500 transition-colors text-sm">
                ↻
              </button>
              <div className="relative">
                <button onClick={() => setAlertsOpen(!alertsOpen)} title="Notifications"
                  className="relative w-8 h-8 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center hover:border-blue-500 transition-colors text-sm">
                  🔔
                  {alerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {alerts.length}
                    </span>
                  )}
                </button>
                {alertsOpen && (
                  <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                      <span className="font-bold text-sm">Notifications</span>
                      <span className="text-xs text-gray-400">{alerts.length} alerts</span>
                    </div>
                    {alerts.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-400 text-sm">All clear ✅</div>
                    ) : alerts.map((n,i) => (
                      <div key={i} className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-start gap-2">
                        <span className="flex-shrink-0">{n.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs">{n.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{n.msg}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative group">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:bg-blue-700">
                  {user?.first_name?.[0] || 'A'}{user?.last_name?.[0] || 'D'}
                </div>
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-48 hidden group-hover:block">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="font-semibold text-sm text-gray-800">{user?.first_name} {user?.last_name}</div>
                    <div className="text-xs text-gray-400">{user?.role}</div>
                  </div>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-xl">
                    🚪 Sign Out
                  </button>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 pb-14 overflow-y-auto">{children}</main>
          <footer className={(sidebarOpen ? 'left-[17rem]' : 'left-[5.5rem]') + ' fixed bottom-0 right-0 border-gray-200 border-t px-6 py-2 text-xs flex justify-between text-gray-400 bg-white z-30 transition-all duration-300'}>
            <span>TibaMax HMIS v1.0 — Webuye West Sub-County Hospital <span className="text-gray-300">|</span> Your corporate health management information system.</span>
            <span>Backend: localhost:5000 • DB: afyatab_hmis</span>
          </footer>
        </div>
      </body>
    </html>
  );
}