'use client';
export default function Settings() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500 text-sm">AfyaTab HMIS system configuration</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="font-bold mb-4">Hospital Information</h2>
          <div className="space-y-4">
            {[
              { label:'Hospital Name', value:'Webuye West Sub-County Hospital' },
              { label:'Facility Code', value:'13024' },
              { label:'County',        value:'Bungoma County' },
              { label:'Sub-County',    value:'Webuye West' },
              { label:'Phone',         value:'+254 700 000000' },
              { label:'System Name',   value:'AfyaTab HMIS v1.0' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.label}</label>
                <input type="text" defaultValue={f.value}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600" />
              </div>
            ))}
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 mt-2">
              Save Changes
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="font-bold mb-4">System Settings</h2>
          <div className="space-y-3">
            {[
              { label:'Currency',             value:'KES (Kenyan Shilling)',  badge:'bg-green-100 text-green-700' },
              { label:'Auto Backup',          value:'Enabled',                badge:'bg-green-100 text-green-700' },
              { label:'MOH Reports',          value:'Enabled',                badge:'bg-green-100 text-green-700' },
              { label:'SMS Alerts',           value:'Pending Setup',          badge:'bg-yellow-100 text-yellow-700' },
              { label:'Insurance Integration',value:'NHIF',                   badge:'bg-blue-100 text-blue-700' },
              { label:'Database',             value:'PostgreSQL 18',          badge:'bg-blue-100 text-blue-700' },
              { label:'Backend',              value:'Node.js + Express',      badge:'bg-green-100 text-green-700' },
              { label:'Frontend',             value:'Next.js + Tailwind',     badge:'bg-violet-100 text-violet-700' },
              { label:'System Version',       value:'AfyaTab HMIS v1.0.0',   badge:'bg-gray-100 text-gray-600' },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-sm text-gray-500">{s.label}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.badge}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}