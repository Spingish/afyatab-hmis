'use client';
import Link from 'next/link';

const modules = [
  {
    href: '/mch/anc',
    icon: '🤰',
    title: 'ANC Register',
    subtitle: 'Antenatal Care',
    desc: 'Gravidity, parity, EDD, risk assessment, fundal height, fetal heart rate, supplements',
    color: 'border-pink-500',
    bg: 'bg-pink-50',
    text: 'text-pink-700',
  },
  {
    href: '/mch/pnc',
    icon: '👶',
    title: 'PNC Register',
    subtitle: 'Postnatal Care',
    desc: 'Mother review, baby review, breastfeeding, wound status, FP counseling',
    color: 'border-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
  },
  {
    href: '/mch/fp',
    icon: '💊',
    title: 'FP Register',
    subtitle: 'Family Planning',
    desc: 'DMPA, Implant, IUCD, COC, POP, condoms — new and revisit clients',
    color: 'border-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
  },
  {
    href: '/mch/cwc',
    icon: '🧒',
    title: 'CWC Register',
    subtitle: 'Child Welfare Clinic',
    desc: 'Growth monitoring, immunization, nutrition, developmental milestones',
    color: 'border-green-500',
    bg: 'bg-green-50',
    text: 'text-green-700',
  },
];

export default function MCH() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">MCH Clinic</h1>
        <p className="text-gray-500 text-sm">Maternal & Child Health — Webuye West Sub-County Hospital</p>
      </div>

      {/* Rule */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 mb-6 text-sm text-blue-800">
        <strong>MCH Rule:</strong> All MCH patients must first pass through Reception before any service.
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {modules.map(m => (
          <Link key={m.href} href={m.href}
            className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 ${m.color} rounded-xl p-6 hover:shadow-md transition-all group`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 ${m.bg} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
                {m.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-base">{m.title}</h2>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${m.text} mb-2`}>{m.subtitle}</p>
                  </div>
                  <span className="text-gray-300 group-hover:text-blue-500 text-xl transition-colors">→</span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{m.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'ANC Visits Today',  value:'0', icon:'🤰', color:'border-pink-500'   },
          { label:'PNC Visits Today',  value:'0', icon:'👶', color:'border-purple-500' },
          { label:'FP Clients Today',  value:'0', icon:'💊', color:'border-blue-500'   },
          { label:'CWC Visits Today',  value:'0', icon:'🧒', color:'border-green-500'  },
        ].map(s => (
          <div key={s.label} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 ${s.color} rounded-xl p-4`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{s.label}</p>
                <p className="text-3xl font-bold">{s.value}</p>
              </div>
              <span className="text-2xl">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}