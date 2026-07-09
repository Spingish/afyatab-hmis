'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import './globals.css';

const navItems = [
  { href: '/',               icon: '📊', label: 'Dashboard' },
  { href: '/reception',      icon: '🚪', label: 'Reception' },
  { href: '/patients',       icon: '👥', label: 'Patients' },
  { href: '/appointments',   icon: '📅', label: 'Appointments' },
  { href: '/consultation',   icon: '🩺', label: 'Consultation' },
  { href: '/laboratory',     icon: '🧪', label: 'Laboratory' },
  { href: '/pharmacy',       icon: '💊', label: 'Pharmacy' },
  { href: '/billing',        icon: '💰', label: 'Billing' },
  { href: '/reports',        icon: '📈', label: 'Reports' },
  { href: '/staff',          icon: '👨‍⚕️', label: 'Staff' },
  { href: '/settings',       icon: '⚙️',  label: 'Settings' },
];

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <html lang="en" className={dark ? 'dark' : ''}>
      <body className={`${dark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} min-h-screen flex`}>

        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} ${dark ? 'bg-gray-950' : 'bg-blue-950'} text-white flex flex-col fixed h-full z-50 transition-all duration-300`}>
          {/* Logo */}
          <div className="p-4 border-b border-white/10">
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
          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg mb-1 text-sm transition-all
                    ${active ? 'bg-blue-600 text-white font-semibold' : 'text-white/70 hover:bg-white/10'}`}>
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <button onClick={() => setDark(!dark)}
              className="flex items-center gap-2 text-white/60 hover:text-white text-sm w-full">
              <span>{dark ? '☀️' : '🌙'}</span>
              {sidebarOpen && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className={`${sidebarOpen ? 'ml-60' : 'ml-16'} flex-1 flex flex-col transition-all duration-300`}>
          {/* Topbar */}
          <header className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 h-14 flex items-center justify-between sticky top-0 z-40`}>
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-blue-600 text-xl">☰</button>
              <span className="font-semibold text-sm">AfyaTab HMIS</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {new Date().toLocaleDateString('en-KE', { weekday:'short', year:'numeric', month:'short', day:'numeric' })}
              </span>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">AD</div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>

      </body>
    </html>
  );
}