'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { patientAPI } from '../lib/api';
import './globals.css';

const navItems = [
  { href:'/',               icon:'📊', label:'Dashboard'   },
  { href:'/reception',      icon:'🚪', label:'Reception'   },
  { href:'/patients',       icon:'👥', label:'Patients'    },
  { href:'/appointments',   icon:'📅', label:'Appointments'},
  { href:'/mch',            icon:'🏥', label:'MCH Clinic'  },
  { href:'/consultation',   icon:'🩺', label:'Consultation'},
  { href:'/laboratory',     icon:'🧪', label:'Laboratory'  },
  { href:'/pharmacy',       icon:'💊', label:'Pharmacy'    },
  { href:'/billing',        icon:'💰', label:'Billing'     },
  { href:'/reports',        icon:'📈', label:'Reports'     },
  { href:'/staff',          icon:'👨‍⚕️', label:'Staff'      },
  { href:'/settings',       icon:'⚙️',  label:'Settings'   },
];

export default function RootLayout({ children }) {
  const pathname                        = usePathname();
  const router                          = useRouter();
  const [dark, setDark]                 = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [search, setSearch]             = useState('');
  const [results, setResults]           = useState([]);
  const [searching, setSearching]       = useState(false);
  const [showResults, setShowResults]   = useState(false);
  const searchRef                       = useRef(null);
  const debounceRef                     = useRef(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
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
      } catch (err) {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const selectPatient = (p) => {
    setSearch('');
    setResults([]);
    setShowResults(false);
    router.push(`/patients?id=${p.id}`);
  };

  const pageTitles = {
    '/':'/Dashboard', '/reception':'Reception', '/patients':'Patients',
    '/appointments':'Appointments', '/consultation':'Consultation',
    '/laboratory':'Laboratory', '/pharmacy':'Pharmacy',
    '/billing':'Billing', '/reports':'Reports',
    '/staff':'Staff', '/settings':'Settings'
  };

  return (
    <html lang="en">
      <body className={`${dark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} min-h-screen flex`}>

        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} ${dark ? 'bg-gray-950' : 'bg-blue-950'} text-white flex flex-col fixed h-full z-50 transition-all duration-300 overflow-hidden`}>

          {/* Logo */}
          <div className="p-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0">A</div>
              {sidebarOpen && (
                <div>
                  <div className="font-bold text-sm leading-tight">AfyaTab HMIS</div>
                  <div className="text-xs text-white/50">Webuye West Hospital</div>
                </div>
              )}
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {sidebarOpen && <div className="px-4 pb-1 pt-2 text-xs font-bold text-white/30 uppercase tracking-widest">Main Menu</div>}
            {navItems.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 text-sm transition-all
                    ${active ? 'bg-blue-600 text-white font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                  <span className="text-base flex-shrink-0 w-5 text-center">{item.icon}</span>
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-white/10 flex-shrink-0">
            <button onClick={() => setDark(!dark)}
              className="flex items-center gap-2 text-white/50 hover:text-white text-xs w-full px-2 py-1.5 rounded-lg hover:bg-white/10 transition-all">
              <span className="w-5 text-center">{dark ? '☀️' : '🌙'}</span>
              {sidebarOpen && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className={`${sidebarOpen ? 'ml-60' : 'ml-16'} flex-1 flex flex-col transition-all duration-300 min-h-screen`}>

          {/* Topbar */}
          <header className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 h-14 flex items-center justify-between sticky top-0 z-40 gap-4`}>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-blue-600'} text-lg transition-colors`}>
                ☰
              </button>
              <span className={`font-semibold text-sm ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
                {pageTitles[pathname] || 'AfyaTab HMIS'}
              </span>
            </div>

            {/* Global Search */}
            <div className="flex-1 max-w-md relative" ref={searchRef}>
              <div className={`flex items-center gap-2 ${dark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border rounded-lg px-3 py-1.5`}>
                <span className="text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search patient by name, phone or ID..."
                  className={`flex-1 bg-transparent text-sm outline-none ${dark ? 'text-white placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'}`}
                />
                {searching && <span className="text-gray-400 text-xs">...</span>}
                {search && (
                  <button onClick={() => { setSearch(''); setResults([]); setShowResults(false); }}
                    className="text-gray-400 hover:text-gray-600 text-sm">×</button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && (
                <div className={`absolute top-full left-0 right-0 mt-1 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto`}>
                  {results.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">No patients found</div>
                  ) : (
                    <>
                      <div className={`px-3 py-2 text-xs font-bold uppercase tracking-widest ${dark ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-100'} border-b`}>
                        {results.length} patient{results.length !== 1 ? 's' : ''} found
                      </div>
                      {results.map(p => (
                        <button key={p.id} onClick={() => selectPatient(p)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b last:border-0
                            ${dark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-50 hover:bg-blue-50'}`}>
                          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {p.first_name?.[0]}{p.last_name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-800'}`}>
                              {p.first_name} {p.last_name}
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {p.patient_no} • {p.phone} • {p.gender}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {p.allergies && p.allergies !== 'None' && (
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">⚠️ Allergy</span>
                            )}
                            <span className="text-xs text-gray-400">{p.county_name}</span>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-400'} hidden md:block`}>
                {new Date().toLocaleDateString('en-KE', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
              </div>
              <Link href="/reception"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                + Register
              </Link>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:bg-blue-700 transition-colors">
                AD
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-6">
            {children}
          </main>

          {/* Footer */}
          <footer className={`${dark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'} border-t px-6 py-2 text-xs flex justify-between`}>
            <span>AfyaTab HMIS v1.0 — Webuye West Sub-County Hospital</span>
            <span>Backend: localhost:5000 • DB: afyatab_hmis</span>
          </footer>
        </div>

      </body>
    </html>
  );
}