'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { patientAPI } from '../lib/api';
import './globals.css';

const navItems = [
  { href:'/',             icon:'📊', label:'Dashboard'   },
  { href:'/reception',    icon:'🚪', label:'Reception'   },
  { href:'/triage',       icon:'❤️', label:'Triage'      },
  { href:'/patients',     icon:'👥', label:'Patients'    },
  { href:'/appointments', icon:'📅', label:'Appointments'},
  { href:'/mch',          icon:'🏥', label:'MCH Clinic'  },
  { href:'/consultation', icon:'🩺', label:'Consultation'},
  { href:'/laboratory',   icon:'🧪', label:'Laboratory'  },
  { href:'/pharmacy',     icon:'💊', label:'Pharmacy'    },
  { href:'/billing',      icon:'💰', label:'Billing'     },
  { href:'/reports',      icon:'📈', label:'Reports'     },
  { href:'/staff',        icon:'👨', label:'Staff'       },
  { href:'/settings',     icon:'⚙',  label:'Settings'   },
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
  const searchRef   = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (pathname === '/login') return;
    const token    = localStorage.getItem('afyatab_token');
    const userData = localStorage.getItem('afyatab_user');
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
    localStorage.removeItem('afyatab_token');
    localStorage.removeItem('afyatab_user');
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
      <body className={dark ? 'bg-gray-900 text-white min-h-screen flex' : 'bg-gray-100 text-gray-900 min-h-screen flex'}>
        <aside className={sidebarOpen ? (dark ? 'w-60 bg-gray-950 text-white flex flex-col fixed h-full z-50 transition-all duration-300 overflow-hidden' : 'w-60 bg-blue-950 text-white flex flex-col fixed h-full z-50 transition-all duration-300 overflow-hidden') : (dark ? 'w-16 bg-gray-950 text-white flex flex-col fixed h-full z-50 transition-all duration-300 overflow-hidden' : 'w-16 bg-blue-950 text-white flex flex-col fixed h-full z-50 transition-all duration-300 overflow-hidden')}>
          <div className="p-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0">A</div>
              {sidebarOpen && <div><div className="font-bold text-sm leading-tight">AfyaTab HMIS</div><div className="text-xs text-white/50">Webuye West Hospital</div></div>}
            </div>
          </div>
          <nav className="flex-1 py-3 overflow-y-auto">
            {sidebarOpen && <div className="px-4 pb-1 pt-2 text-xs font-bold text-white/30 uppercase tracking-widest">Main Menu</div>}
            {navItems.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={active ? 'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 text-sm bg-blue-600 text-white font-semibold' : 'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 text-sm text-white/70 hover:bg-white/10 hover:text-white'}>
                  <span className="text-base flex-shrink-0 w-5 text-center">{item.icon}</span>
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-white/10 flex-shrink-0">
            <button onClick={() => setDark(!dark)}
              className="flex items-center gap-2 text-white/50 hover:text-white text-xs w-full px-2 py-1.5 rounded-lg hover:bg-white/10">
              <span className="w-5 text-center">{dark ? '☀' : '🌙'}</span>
              {sidebarOpen && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
          </div>
        </aside>

        <div className={sidebarOpen ? 'ml-60 flex-1 flex flex-col transition-all duration-300 min-h-screen' : 'ml-16 flex-1 flex flex-col transition-all duration-300 min-h-screen'}>
          <header className={dark ? 'bg-gray-800 border-gray-700 border-b px-4 h-14 flex items-center justify-between sticky top-0 z-40 gap-4' : 'bg-white border-gray-200 border-b px-4 h-14 flex items-center justify-between sticky top-0 z-40 gap-4'}>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-blue-600 text-lg">☰</button>
              <span className="font-semibold text-sm">{pageTitles[pathname] || 'AfyaTab HMIS'}</span>
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
              <Link href="/reception" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                + Register
              </Link>
              <div className="relative group">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:bg-blue-700">
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
          <main className="flex-1 p-6">{children}</main>
          <footer className="border-gray-200 border-t px-6 py-2 text-xs flex justify-between text-gray-400">
            <span>AfyaTab HMIS v1.0 — Webuye West Sub-County Hospital</span>
            <span>Backend: localhost:5000 • DB: afyatab_hmis</span>
          </footer>
        </div>
      </body>
    </html>
  );
}