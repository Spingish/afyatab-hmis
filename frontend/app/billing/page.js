'use client';
import { useState, useEffect } from 'react';
import { billingAPI } from '../../lib/api';

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [pending, setPending]   = useState([]);
  const [revenue, setRevenue]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('all');

  useEffect(() => {
    Promise.all([
      billingAPI.getAll(),
      billingAPI.getPending(),
      billingAPI.getRevenue()
    ]).then(([a, p, r]) => {
      setInvoices(a.data.invoices);
      setPending(p.data.bills);
      setRevenue(r.data.revenue);
    }).finally(() => setLoading(false));
  }, []);

  const statusBadge = (s) => {
    const map = { Paid:'bg-green-100 text-green-700', Pending:'bg-red-100 text-red-700', Partial:'bg-yellow-100 text-yellow-700' };
    return <span className={`text-xs px-2 py-1 rounded-full font-medium ${map[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>;
  };

  const data = tab === 'pending' ? pending : invoices;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Billing & Payments</h1>
          <p className="text-gray-500 text-sm">Invoices, payments and revenue</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Invoices',  value: invoices.length,   icon:'📄', color:'border-blue-500'  },
          { label:'Pending Bills',   value: pending.length,    icon:'⏳', color:'border-red-500'   },
          { label:'Revenue (7 days)',value: `KES ${revenue.slice(0,7).reduce((s,r) => s + parseFloat(r.total_revenue||0), 0).toLocaleString()}`, icon:'💰', color:'border-green-500' },
          { label:'Insurance Claims',value: invoices.filter(i => i.insurance_name).length, icon:'🛡️', color:'border-violet-500' },
        ].map(c => (
          <div key={c.label} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 ${c.color} rounded-xl p-4`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{c.label}</p>
                <p className="text-2xl font-bold">{c.value}</p>
              </div>
              <span className="text-2xl">{c.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[['all','All Invoices'],['pending','Pending Bills']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 hover:border-blue-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  {['Invoice No','Patient','Phone','Amount (KES)','Paid (KES)','Balance','Status','Date','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">No records found</td></tr>
                ) : data.map((inv, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-semibold text-blue-600">{inv.invoice_no}</td>
                    <td className="px-4 py-3 font-medium">{inv.patient_name || `${inv.first_name} ${inv.last_name}`}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.phone}</td>
                    <td className="px-4 py-3 font-semibold">{parseFloat(inv.total||0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-600">{parseFloat(inv.amount_paid||0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-red-600 font-semibold">{parseFloat(inv.balance||0).toLocaleString()}</td>
                    <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{inv.invoice_date || inv.date}</td>
                    <td className="px-4 py-3">
                      <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-blue-700">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}