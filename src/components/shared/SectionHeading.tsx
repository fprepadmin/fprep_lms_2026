import React from 'react';

interface SectionHeadingProps {
  badge?: string;
  badgeIcon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function SectionHeading({
  badge,
  badgeIcon,
  title,
  subtitle,
  action
}: SectionHeadingProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3.5 mb-5">
      <div className="space-y-1">
        {badge && (
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#1746D1]/8 dark:bg-blue-500/15 text-[#1746D1] dark:text-blue-300 border border-[#1746D1]/20 font-body">
            {badgeIcon} {badge}
          </span>
        )}
        <h2 className="text-xl sm:text-2xl font-black font-heading text-[#14213D] dark:text-white tracking-tight m-0">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium font-body m-0">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="shrink-0 self-start sm:self-auto">
          {action}
        </div>
      )}
    </div>
  );
}
