'use client';
import { useState, useEffect } from 'react';
import { visitAPI } from '../../lib/api';

export default function Consultation() {
  const [queue, setQueue]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    visitAPI.getToday({ stage: 'Consultation' })
      .then(r => setQueue(r.data.visits))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Consultation</h1>
          <p className="text-gray-500 text-sm">{queue.length} patients waiting</p>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading queue...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  {['Visit No','Patient','Phone','Visit Type','Stage','Doctor','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">No patients at consultation</td></tr>
                ) : queue.map(v => (
                  <tr key={v.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-semibold text-blue-600">{v.visit_no}</td>
                    <td className="px-4 py-3 font-medium">{v.first_name} {v.last_name}</td>
                    <td className="px-4 py-3 text-gray-500">{v.phone}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${v.visit_type === 'Revisit' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{v.visit_type}</span></td>
                    <td className="px-4 py-3"><span className="bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-full">{v.current_stage}</span></td>
                    <td className="px-4 py-3 text-gray-500">{v.doctor_name || '—'}</td>
                    <td className="px-4 py-3">
                      <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-blue-700">Open</button>
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