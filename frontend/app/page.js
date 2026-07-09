'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { reportAPI, visitAPI } from '../lib/api';

const StatCard = ({ label, value, icon, color, sub }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 border-l-4 ${color} hover:shadow-md transition-shadow`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-3xl font-bold">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  </div>
);

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([visitAPI.getDashboard(), reportAPI.getDashboard()])
      .then(([v, r]) => {
        setSummary(v.data.summary);
        setReport(r.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Loading AfyaTab HMIS...</p>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm">Webuye West Sub-County Hospital</p>
        </div>
        <div className="flex gap-3">
          <Link href="/reception"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Register Patient
          </Link>
          <Link href="/appointments"
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:border-blue-600 hover:text-blue-600">
            Appointments
          </Link>
        </div>
      </div>

      {/* OPD Stats */}
      <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
        <div className="w-3 h-3 bg-blue-600 rounded-sm"></div> Outpatient (OPD)
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Patients Today" value={summary?.total_patients_today} icon="👥" color="border-blue-500" sub="All departments" />
        <StatCard label="At Reception"         value={summary?.at_reception}         icon="🚪" color="border-cyan-500"  sub="Waiting" />
        <StatCard label="At Consultation"      value={summary?.at_consultation}      icon="🩺" color="border-violet-500" sub="With doctor" />
        <StatCard label="At Pharmacy"          value={summary?.at_pharmacy}          icon="💊" color="border-orange-500" sub="Collecting drugs" />
      </div>

      {/* IPD Stats */}
      <div className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2 flex items-center gap-2">
        <div className="w-3 h-3 bg-green-600 rounded-sm"></div> Inpatient (IPD)
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Admitted Patients" value={summary?.inpatients}   icon="🛏️" color="border-green-500"  sub="In wards" />
        <StatCard label="At Laboratory"     value={summary?.at_laboratory} icon="🧪" color="border-yellow-500" sub="Tests pending" />
        <StatCard label="Discharged Today"  value={summary?.discharged}   icon="✅" color="border-teal-500"   sub="Completed" />
        <StatCard label="Pending Bills"     value={report?.pending_bills} icon="💰" color="border-red-500"    sub="Unpaid invoices" />
      </div>

      {/* OPD Flow */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-500 rounded-xl p-4 mb-4">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Outpatient Flow</p>
        <div className="flex items-center gap-2 flex-wrap">
          {['Reception','Triage','Consultation','Investigation','Procedure','Pharmacy','Discharged'].map((stage, i, arr) => (
            <div key={stage} className="flex items-center gap-2">
              <div className={`px-3 py-2 rounded-lg text-xs font-medium border
                ${stage === 'Consultation' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                {stage}
              </div>
              {i < arr.length - 1 && <span className="text-gray-400">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="font-bold text-sm mb-4">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { href:'/reception',    icon:'👤', label:'Register Patient' },
              { href:'/appointments', icon:'📅', label:'Appointments' },
              { href:'/consultation', icon:'🩺', label:'Consultation' },
              { href:'/billing',      icon:'💰', label:'Billing' },
              { href:'/laboratory',   icon:'🧪', label:'Laboratory' },
              { href:'/reports',      icon:'📈', label:'Reports' },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 border border-transparent text-center transition-all text-xs font-medium text-gray-600 dark:text-gray-300">
                <span className="text-2xl">{a.icon}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        {/* OPD Monthly */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="font-bold text-sm mb-4">OPD Monthly Trend</h2>
          {report?.opd_monthly?.length ? (
            <div className="space-y-2">
              {report.opd_monthly.slice(0, 5).map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 flex-shrink-0">
                    {new Date(m.month).toLocaleDateString('en-KE', { month:'short', year:'numeric' })}
                  </span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min((m.total_visits / 200) * 100, 100)}%` }}>
                    </div>
                  </div>
                  <span className="text-xs font-semibold w-8 text-right">{m.total_visits}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}