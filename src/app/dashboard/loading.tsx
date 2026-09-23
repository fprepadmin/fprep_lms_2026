import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="w-full space-y-6 animate-pulse p-2 sm:p-4">
      {/* Top Banner Skeleton */}
      <div className="h-28 w-full rounded-2xl bg-muted/40 border border-border/60 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />
        <div className="p-6 space-y-3">
          <div className="h-4 w-32 rounded-full bg-muted/80" />
          <div className="h-7 w-64 rounded-xl bg-muted/80" />
          <div className="h-3 w-80 rounded-full bg-muted/60" />
        </div>
      </div>

      {/* Grid Content Skeletons */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column Skeleton */}
        <div className="md:col-span-4 h-96 rounded-2xl bg-muted/30 border border-border/50 p-4 space-y-4">
          <div className="h-5 w-40 rounded-lg bg-muted/70" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-full rounded-xl bg-muted/40" />
            ))}
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="md:col-span-8 h-96 rounded-2xl bg-muted/30 border border-border/50 p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border/40 pb-4">
            <div className="h-6 w-48 rounded-lg bg-muted/70" />
            <div className="h-8 w-60 rounded-xl bg-muted/50" />
          </div>
          <div className="space-y-3 pt-2">
            <div className="h-32 w-full rounded-xl bg-muted/40" />
            <div className="h-20 w-full rounded-xl bg-muted/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
