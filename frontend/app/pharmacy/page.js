'use client';
import { useState, useEffect } from 'react';
import { pharmacyAPI } from '../../lib/api';

export default function Pharmacy() {
  const [stock, setStock]       = useState([]);
  const [drugs, setDrugs]       = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('stock');
  const [store, setStore]       = useState('Main');
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg]           = useState('');
  const [form, setForm]         = useState({
    drug_id:'', store:'Main', batch_no:'',
    quantity:'', min_quantity:50,
    expiry_date:'', unit_cost:'',
    selling_price:'', supplier:''
  });

  const load = () => {
    Promise.all([
      pharmacyAPI.getStock(store),
      pharmacyAPI.getDrugs(),
      pharmacyAPI.getLowStock(),
      pharmacyAPI.getExpiring()
    ]).then(([s, d, l, e]) => {
      setStock(s.data.stock);
      setDrugs(d.data.drugs);
      setLowStock(l.data.items);
      setExpiring(e.data.items);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [store]);

  const handleSubmit = async () => {
    try {
      if (!form.drug_id || !form.quantity) {
        setMsg('❌ Drug and quantity are required'); return;
      }
      await pharmacyAPI.addStock(form);
      setMsg('✅ Drug added to stock successfully');
      setShowForm(false);
      setForm({ drug_id:'', store:'Main', batch_no:'', quantity:'', min_quantity:50, expiry_date:'', unit_cost:'', selling_price:'', supplier:'' });
      load();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Error adding drug'));
    }
  };

  const stockLevel = (qty, min) => {
    if (qty === 0) return { label:'Out of Stock', color:'bg-red-100 text-red-700' };
    if (qty < min) return { label:'Low Stock', color:'bg-orange-100 text-orange-700' };
    if (qty < min * 1.5) return { label:'Running Low', color:'bg-yellow-100 text-yellow-700' };
    return { label:'OK', color:'bg-green-100 text-green-700' };
  };

  const isExpiringSoon = (date) => {
    if (!date) return false;
    return new Date(date) < new Date(Date.now() + 90 * 86400000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pharmacy</h1>
          <p className="text-gray-500 text-sm">Stock management and dispensing</p>
        </div>
        <div className="flex gap-3">
          <select value={store} onChange={e => setStore(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700">
            <option value="Main">Main Pharmacy</option>
            <option value="Central">Central Store</option>
          </select>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Add Drug
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Items',     value: stock.length,      icon:'💊', color:'border-blue-500'   },
          { label:'Low Stock',       value: lowStock.length,   icon:'⚠️', color:'border-red-500'    },
          { label:'Expiring Soon',   value: expiring.length,   icon:'📅', color:'border-orange-500' },
          { label:'Total Drugs',     value: drugs.length,      icon:'🏥', color:'border-green-500'  },
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

      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg} <button onClick={() => setMsg('')} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Alerts */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-500 rounded-lg p-3 mb-4 text-sm text-red-800">
          <strong>⚠️ Critical:</strong> {lowStock.slice(0,3).map(i => i.generic_name).join(', ')} — reorder immediately
        </div>
      )}

      {/* Add Drug Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="font-bold mb-4">Add Drug to Stock</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Drug *</label>
              <select value={form.drug_id} onChange={e => setForm({...form, drug_id: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option value="">Select drug...</option>
                {drugs.map(d => <option key={d.id} value={d.id}>{d.generic_name} {d.strength}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Store</label>
              <select value={form.store} onChange={e => setForm({...form, store: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                <option>Main</option><option>Central</option>
              </select>
            </div>
            {[
              { label:'Quantity *',     key:'quantity',      type:'number' },
              { label:'Min Stock Level',key:'min_quantity',  type:'number' },
              { label:'Batch Number',   key:'batch_no',      type:'text'   },
              { label:'Expiry Date',    key:'expiry_date',   type:'date'   },
              { label:'Unit Cost (KES)',key:'unit_cost',     type:'number' },
              { label:'Selling Price',  key:'selling_price', type:'number' },
              { label:'Supplier',       key:'supplier',      type:'text'   },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.label}</label>
                <input type={f.type} value={form[f.key]}
                  onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Add to Stock
            </button>
            <button onClick={() => setShowForm(false)}
              className="border border-gray-300 px-6 py-2 rounded-lg text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[['stock','Current Stock'],['low','Low Stock'],['expiring','Expiring Soon']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 hover:border-blue-500'}`}>
            {label} {key === 'low' && lowStock.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 rounded-full">{lowStock.length}</span>}
          </button>
        ))}
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading stock...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  {['Drug Name','Category','Store','Stock','Min Level','Status','Batch','Expiry','Price (KES)','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(tab === 'stock' ? stock : tab === 'low' ? lowStock : expiring).length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-gray-400">
                    {tab === 'stock' ? 'No stock found — add drugs above' : `No ${tab === 'low' ? 'low stock' : 'expiring'} items`}
                  </td></tr>
                ) : (tab === 'stock' ? stock : tab === 'low' ? lowStock : expiring).map((item, i) => {
                  const level = stockLevel(item.quantity || item.current_qty, item.min_quantity || item.min_qty);
                  const expSoon = isExpiringSoon(item.expiry_date);
                  return (
                    <tr key={i} className={`border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${item.quantity < item.min_quantity ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 font-medium">{item.generic_name}<div className="text-xs text-gray-400">{item.brand_name} {item.strength}</div></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{item.category_name}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{item.store}</span></td>
                      <td className="px-4 py-3 font-bold">{item.quantity ?? item.current_qty}</td>
                      <td className="px-4 py-3 text-gray-500">{item.min_quantity ?? item.min_qty}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${level.color}`}>{level.label}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{item.batch_no || '—'}</td>
                      <td className={`px-4 py-3 text-xs ${expSoon ? 'text-orange-600 font-semibold' : 'text-gray-500'}`}>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-KE') : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{item.selling_price || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-blue-700">Edit</button>
                          <button className="bg-green-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-green-700">Restock</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}