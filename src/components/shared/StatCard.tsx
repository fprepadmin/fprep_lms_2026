import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  subtitle?: string;
  accent?: 'blue' | 'navy' | 'electric' | 'cyan' | 'green' | 'orange' | 'pink';
}

export default function StatCard({
  label,
  value,
  unit,
  subtitle,
  icon,
  accent = 'blue'
}: StatCardProps) {
  const getAccentStyles = () => {
    switch (accent) {
      case 'electric':
        return {
          iconBg: 'bg-[#087CFF]/10 text-[#087CFF] border-[#087CFF]/25',
          valueColor: 'text-[#087CFF]',
          glow: 'group-hover:border-[#087CFF]/40'
        };
      case 'cyan':
        return {
          iconBg: 'bg-[#00DFFF]/15 text-[#0284c7] border-[#00DFFF]/30',
          valueColor: 'text-[#0284c7] dark:text-[#00DFFF]',
          glow: 'group-hover:border-[#00DFFF]/40'
        };
      case 'green':
        return {
          iconBg: 'bg-[#16A36A]/10 text-[#16A36A] border-[#16A36A]/25',
          valueColor: 'text-[#16A36A]',
          glow: 'group-hover:border-[#16A36A]/40'
        };
      case 'orange':
        return {
          iconBg: 'bg-[#E9A23B]/10 text-[#d97706] border-[#E9A23B]/30',
          valueColor: 'text-[#d97706]',
          glow: 'group-hover:border-[#E9A23B]/40'
        };
      case 'pink':
        return {
          iconBg: 'bg-pink-500/10 text-pink-600 border-pink-500/25',
          valueColor: 'text-pink-600',
          glow: 'group-hover:border-pink-500/40'
        };
      case 'navy':
        return {
          iconBg: 'bg-[#0B1B55]/10 text-[#0B1B55] dark:text-blue-200 border-[#0B1B55]/20',
          valueColor: 'text-[#0B1B55] dark:text-white',
          glow: 'group-hover:border-[#0B1B55]/40'
        };
      default:
        return {
          iconBg: 'bg-[#1746D1]/10 text-[#1746D1] border-[#1746D1]/25',
          valueColor: 'text-[#1746D1]',
          glow: 'group-hover:border-[#1746D1]/40'
        };
    }
  };

  const style = getAccentStyles();

  return (
    <div className={`p-4 sm:p-5 rounded-[18px] bg-white dark:bg-[#0B1B55]/60 border border-[#E2E8F0] dark:border-[#1B317A] shadow-[0_4px_20px_-2px_rgba(11,27,85,0.04)] transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-[0_8px_25px_-4px_rgba(23,70,209,0.12)] ${style.glow}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider font-body">
          {label}
        </span>
        <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${style.iconBg}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl sm:text-3xl font-black font-heading tracking-tight ${style.valueColor}`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs font-bold text-[#64748B] dark:text-slate-400 font-body">
            {unit}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1.5 font-medium font-body truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
}
