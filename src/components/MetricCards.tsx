import React from 'react';
import { Flame, Ship, Radar, ShieldAlert } from 'lucide-react';

export const MetricCards: React.FC = () => {
  const metrics = [
    {
      id: 'active-spills',
      label: 'Active spills',
      value: '03',
      subtext: '1 Critical • Lakshadweep Sea',
      icon: Flame,
      color: 'text-[#C45D42]',
      borderColor: 'border-[#F0C0B3]',
      iconBg: 'bg-[#FFF1ED] border-[#F0C0B3]',
      badge: 'LIVE WATCH',
    },
    {
      id: 'vessels-tracked',
      label: 'Vessels tracked',
      value: '1,284',
      subtext: 'AIS Real-time Feeds Active',
      icon: Ship,
      color: 'text-[#0F667A]',
      borderColor: 'border-[#B7D7DB]',
      iconBg: 'bg-[#EAF5F4] border-[#B7D7DB]',
      badge: '99.4% COVERAGE',
    },
    {
      id: 'area-monitored',
      label: 'Area monitored',
      value: '42,680 km²',
      subtext: 'Sentinel-1 SAR Radar Mesh',
      icon: Radar,
      color: 'text-[#2F8F83]',
      borderColor: 'border-[#B8DCD5]',
      iconBg: 'bg-[#ECF7F4] border-[#B8DCD5]',
      badge: 'ARABIAN SEA',
    },
    {
      id: 'alert-level',
      label: 'Alert level',
      value: 'HIGH',
      subtext: 'Incident INC-2026-0914-01',
      icon: ShieldAlert,
      color: 'text-[#C45D42]',
      borderColor: 'border-[#F0C0B3]',
      iconBg: 'bg-[#FFF1ED] border-[#F0C0B3]',
      badge: 'ACTION REQUIRED',
    },
  ];

  return (
    <div className="reveal-group grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric) => {
        const IconComponent = metric.icon;
        return (
          <div
            key={metric.id}
            className={`reveal glass-panel rounded-xl p-4 border ${metric.borderColor} relative overflow-hidden transition-all duration-200 hover:border-opacity-60`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold tracking-wide text-[#647780]">
                    {metric.label}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0f1624] border border-[#26334d] text-slate-500">
                    Demo
                  </span>
                </div>
                <div className={`text-2xl sm:text-3xl font-extrabold font-mono mt-1.5 ${metric.color}`}>
                  {metric.value}
                </div>
              </div>
              <div className={`p-2.5 rounded-lg border ${metric.iconBg} ${metric.color}`}>
                <IconComponent className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#1e2a42] flex items-center justify-between text-[11px]">
              <span className="text-[#647780] truncate">{metric.subtext}</span>
              <span className={`font-mono font-semibold text-[10px] px-1.5 py-0.5 rounded bg-[#0f1624] ${metric.color}`}>
                {metric.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
