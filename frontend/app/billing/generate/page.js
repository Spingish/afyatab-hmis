'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { billingAPI } from '../../../lib/api';

export default function GenerateBill() {
  const router = useRouter();
  const [visitId, setVisitId]     = useState('');
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [charges, setCharges]     = useState(null); // { categories, gross_total }
  const [verified, setVerified]   = useState(false);
  const [creating, setCreating]   = useState(false);
  const [invoiceResult, setInvoiceResult] = useState(null);

  const fetchCharges = async () => {
    if (!visitId) return;
    setError('');
    setCharges(null);
    setVerified(false);
    setInvoiceResult(null);
    setLoading(true);
    try {
      const res = await billingAPI.getVisitCharges(visitId);
      setCharges(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not load charges for this visit');
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async () => {
    if (!charges || !patientId) return;
    setCreating(true);
    setError('');
    try {
      const items = [];
      Object.entries(charges.categories).forEach(([category, group]) => {
        group.items.forEach(item => {
          items.push({
            service_type: category,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            source_table: item.source_table,
            source_id: item.source_id
          });
        });
      });

      const res = await billingAPI.create({
        patient_id: patientId,
        visit_id: visitId,
        items
      });
      setInvoiceResult(res.data);
      setCharges(null);
      setVerified(false);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not create invoice');
    } finally {
      setCreating(false);
    }
  };

  const categoryEntries = charges ? Object.entries(charges.categories) : [];
  const hasCharges = categoryEntries.length > 0;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Generate Bill</h1>
        <p className="text-gray-500 text-sm">
          Pull unbilled charges for a visit, verify, then create the invoice
        </p>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Visit ID</label>
            <input
              type="number"
              value={visitId}
              onChange={e => setVisitId(e.target.value)}
              className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
              placeholder="e.g. 43"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Patient ID</label>
            <input
              type="number"
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
              placeholder="e.g. 1"
            />
          </div>
        </div>
        <button
          onClick={fetchCharges}
          disabled={!visitId || loading}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading charges...' : 'Load Unbilled Charges'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {invoiceResult && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm mb-6">
          Invoice <strong>{invoiceResult.invoice_no}</strong> created successfully.
        </div>
      )}

      {/* Charges breakdown */}
      {charges && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold">Gross Charges</h2>
          </div>

          {!hasCharges ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No unbilled charges found for this visit.
            </div>
          ) : (
            <>
              {categoryEntries.map(([category, group]) => (
                <div key={category} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 uppercase flex justify-between">
                    <span>{category}</span>
                    <span>KES {group.subtotal.toLocaleString()}</span>
                  </div>
                  {group.items.map((item, i) => (
                    <div key={i} className="px-4 py-2 flex justify-between text-sm">
                      <span>{item.description} {item.quantity > 1 ? `× ${item.quantity}` : ''}</span>
                      <span className="text-gray-600">KES {parseFloat(item.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="px-4 py-3 flex justify-between items-center font-bold text-lg bg-gray-50 dark:bg-gray-700/50">
                <span>Gross Charges</span>
                <span>KES {charges.gross_total.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Verify + create */}
      {charges && hasCharges && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={verified}
              onChange={e => setVerified(e.target.checked)}
            />
            I have verified these charges are correct for this visit
          </label>
          <button
            onClick={createInvoice}
            disabled={!verified || !patientId || creating}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {creating ? 'Creating invoice...' : 'Create Invoice'}
          </button>
          {!patientId && (
            <p className="text-xs text-red-500 mt-2">Enter the Patient ID above before creating the invoice.</p>
          )}
        </div>
      )}
    </div>
  );
}