import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface QuickAccessCardProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  accent?: 'blue' | 'navy' | 'electric' | 'cyan' | 'green' | 'orange';
}

export default function QuickAccessCard({
  title,
  desc,
  icon,
  href,
  badge,
  accent = 'blue'
}: QuickAccessCardProps) {
  const getStyles = () => {
    switch (accent) {
      case 'electric':
        return {
          iconBg: 'bg-[#087CFF]/10 text-[#087CFF] border-[#087CFF]/25',
          borderHover: 'hover:border-[#087CFF]/50 hover:shadow-[0_8px_30px_rgba(8,124,255,0.12)]',
          textColor: 'group-hover:text-[#087CFF]'
        };
      case 'cyan':
        return {
          iconBg: 'bg-[#00DFFF]/15 text-[#0284c7] border-[#00DFFF]/30',
          borderHover: 'hover:border-[#00DFFF]/50 hover:shadow-[0_8px_30px_rgba(0,223,255,0.15)]',
          textColor: 'group-hover:text-[#0284c7]'
        };
      case 'green':
        return {
          iconBg: 'bg-[#16A36A]/10 text-[#16A36A] border-[#16A36A]/25',
          borderHover: 'hover:border-[#16A36A]/50 hover:shadow-[0_8px_30px_rgba(22,163,106,0.12)]',
          textColor: 'group-hover:text-[#16A36A]'
        };
      case 'orange':
        return {
          iconBg: 'bg-[#E9A23B]/10 text-[#d97706] border-[#E9A23B]/30',
          borderHover: 'hover:border-[#E9A23B]/50 hover:shadow-[0_8px_30px_rgba(233,162,59,0.12)]',
          textColor: 'group-hover:text-[#d97706]'
        };
      default:
        return {
          iconBg: 'bg-[#1746D1]/10 text-[#1746D1] border-[#1746D1]/25',
          borderHover: 'hover:border-[#1746D1]/50 hover:shadow-[0_8px_30px_rgba(23,70,209,0.12)]',
          textColor: 'group-hover:text-[#1746D1]'
        };
    }
  };

  const s = getStyles();

  return (
    <Link
      href={href}
      className={`p-4 sm:p-5 rounded-[18px] bg-white dark:bg-[#0B1B55]/70 border border-[#E2E8F0] dark:border-[#1B317A] shadow-[0_4px_20px_-2px_rgba(11,27,85,0.04)] transition-all duration-200 group flex flex-col justify-between gap-4 ${s.borderHover}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${s.iconBg}`}>
          {icon}
        </div>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700">
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h4 className={`text-base font-black font-heading text-[#14213D] dark:text-white transition-colors m-0 ${s.textColor}`}>
          {title}
        </h4>
        <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium font-body line-clamp-2 m-0">
          {desc}
        </p>
      </div>

      <div className="pt-2 border-t border-[#E2E8F0]/70 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#1746D1] dark:text-blue-400">
        <span>Truy cập</span>
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
