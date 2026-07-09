'use client';
import { useState, useEffect } from 'react';
import { reportAPI } from '../../lib/api';

export default function Reports() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportAPI.getDashboard().then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading reports...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-gray-500 text-sm">AfyaTab HMIS — Clinical & Financial Reports</p>
        </div>
        <div className="flex gap-3">
          <button className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:border-blue-500">📄 PDF</button>
          <button className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:border-blue-500">📊 Excel</button>
          <button className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:border-blue-500">🖨️ Print</button>
        </div>
      </div>

      {/* Today Summary */}
      <h2 className="font-bold text-sm text-gray-500 uppercase tracking-widest mb-3">Today's Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Patients',   value: data?.today?.total_patients_today, icon:'👥' },
          { label:'Outpatients',      value: data?.today?.outpatients,           icon:'🚪' },
          { label:'Inpatients',       value: data?.today?.inpatients,            icon:'🛏️' },
          { label:'Discharged',       value: data?.today?.discharged,            icon:'✅' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{s.label}</p>
                <p className="text-3xl font-bold">{s.value ?? '0'}</p>
              </div>
              <span className="text-2xl">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* OPD Monthly Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="font-bold text-sm mb-4">OPD Monthly Attendance</h2>
          {data?.opd_monthly?.length ? (
            <div className="space-y-3">
              {data.opd_monthly.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 flex-shrink-0">
                    {new Date(m.month).toLocaleDateString('en-KE', { month:'short', year:'numeric' })}
                  </span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-blue-500 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min((m.total_visits / 200) * 100, 100)}%` }}></div>
                  </div>
                  <div className="text-xs font-bold w-16 text-right">
                    {m.total_visits} <span className="text-gray-400 font-normal">visits</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No OPD data yet</p>
          )}
        </div>

        {/* Revenue */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="font-bold text-sm mb-4">Revenue (Last 7 Days)</h2>
          {data?.revenue_7days?.length ? (
            <div className="space-y-3">
              {data.revenue_7days.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 flex-shrink-0">
                    {new Date(r.payment_date).toLocaleDateString('en-KE', { weekday:'short', month:'short', day:'numeric' })}
                  </span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-green-500 h-3 rounded-full"
                      style={{ width: `${Math.min((r.total_revenue / 50000) * 100, 100)}%` }}></div>
                  </div>
                  <div className="text-xs font-bold w-20 text-right">
                    KES {parseFloat(r.total_revenue||0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No revenue data yet</p>
          )}
        </div>
      </div>

      {/* Bed Occupancy */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="font-bold text-sm mb-4">Bed Occupancy</h2>
        {data?.bed_occupancy?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.bed_occupancy.map((w, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="font-semibold text-sm">{w.ward}</div>
                <div className="text-xs text-gray-500 mb-2">{w.ward_type}</div>
                <div className="text-2xl font-bold">{w.occupied}/{w.total_beds}</div>
                <div className="mt-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className={`h-2 rounded-full ${w.occupancy_pct >= 90 ? 'bg-red-500' : w.occupancy_pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${w.occupancy_pct || 0}%` }}></div>
                </div>
                <div className="text-xs text-gray-400 mt-1">{w.occupancy_pct}% occupied</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">No ward data yet — add wards first</p>
        )}
      </div>

      {/* MOH Reports */}
      <h2 className="font-bold text-sm text-gray-500 uppercase tracking-widest mb-3">MOH Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title:'OPD Summary',      icon:'🏥', items:[['New Patients', data?.today?.total_patients_today || 0],['Outpatients', data?.today?.outpatients || 0],['Inpatients', data?.today?.inpatients || 0]] },
          { title:'Lab Workload',     icon:'🧪', items:[['Tests Today', 0],['Pending', 0],['Completed', 0]] },
          { title:'Financial Summary',icon:'💰', items:[['Pending Bills', data?.pending_bills || 0],['Revenue Today','KES 0'],['Insurance Claims', 0]] },
        ].map(r => (
          <div key={r.title} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-bold text-sm mb-3">{r.icon} {r.title}</h3>
            {r.items.map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}