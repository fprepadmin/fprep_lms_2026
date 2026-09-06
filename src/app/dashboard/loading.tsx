import React from 'react';

export default function Loading() {
  return (
    <div className="space-y-8 w-full animate-fade-in select-none pointer-events-none">
      
      {/* 1. TOP GREETING BANNER SKELETON */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          {/* Badge */}
          <div className="h-5 w-40 rounded-full skeleton-shimmer" />
          {/* Title */}
          <div className="h-8 w-64 rounded-xl skeleton-shimmer" />
          {/* Description line */}
          <div className="h-4 w-full max-w-md rounded-lg skeleton-shimmer" />
          {/* Meta tags */}
          <div className="flex gap-4 pt-2">
            <div className="h-4 w-24 rounded-md skeleton-shimmer" />
            <div className="h-4 w-24 rounded-md skeleton-shimmer" />
            <div className="h-4 w-28 rounded-md skeleton-shimmer" />
          </div>
        </div>

        {/* Right Stats Widget Skeleton */}
        <div className="flex gap-6 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 shrink-0">
          <div className="space-y-2 text-center">
            <div className="h-8 w-14 rounded-lg skeleton-shimmer mx-auto" />
            <div className="h-3 w-20 rounded skeleton-shimmer" />
          </div>
          <div className="space-y-2 text-center border-l border-border pl-6">
            <div className="h-8 w-14 rounded-lg skeleton-shimmer mx-auto" />
            <div className="h-3 w-20 rounded skeleton-shimmer" />
          </div>
        </div>
      </div>

      {/* 2. STATS CARDS SKELETON */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="h-11 w-11 rounded-xl skeleton-shimmer shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-24 rounded skeleton-shimmer" />
              <div className="h-5 w-32 rounded-lg skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. TWO-COLUMN WORKSPACE SKELETON (FACEBOOK-STYLE FEED & SIDEBAR) */}
      <div className="grid gap-6 md:grid-cols-12 items-start">
        
        {/* CỘT TRÁI (COL-SPAN-8): FEED CARDS SKELETON */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Card 1 */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full skeleton-shimmer" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 rounded skeleton-shimmer" />
                  <div className="h-3 w-24 rounded skeleton-shimmer" />
                </div>
              </div>
              <div className="h-6 w-20 rounded-full skeleton-shimmer" />
            </div>
            
            <div className="space-y-2.5 pt-1">
              <div className="h-4 w-full rounded skeleton-shimmer" />
              <div className="h-4 w-5/6 rounded skeleton-shimmer" />
              <div className="h-4 w-2/3 rounded skeleton-shimmer" />
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <div className="h-9 w-28 rounded-xl skeleton-shimmer" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full skeleton-shimmer" />
                <div className="space-y-1.5">
                  <div className="h-4 w-44 rounded skeleton-shimmer" />
                  <div className="h-3 w-28 rounded skeleton-shimmer" />
                </div>
              </div>
              <div className="h-6 w-16 rounded-full skeleton-shimmer" />
            </div>
            
            <div className="space-y-2.5 pt-1">
              <div className="h-4 w-full rounded skeleton-shimmer" />
              <div className="h-4 w-4/5 rounded skeleton-shimmer" />
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <div className="h-9 w-32 rounded-xl skeleton-shimmer" />
            </div>
          </div>

        </div>

        {/* CỘT PHẢI (COL-SPAN-4): SIDEBAR SKELETON */}
        <div className="md:col-span-4 space-y-6">
          
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="h-4 w-32 rounded skeleton-shimmer border-b border-border pb-3" />
            
            <div className="space-y-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex items-center justify-between gap-3 border-b border-border/40 pb-2.5 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="h-7 w-7 rounded-lg skeleton-shimmer shrink-0" />
                    <div className="space-y-1 flex-1">
                      <div className="h-3.5 w-24 rounded skeleton-shimmer" />
                      <div className="h-2.5 w-16 rounded skeleton-shimmer" />
                    </div>
                  </div>
                  <div className="h-4 w-12 rounded skeleton-shimmer shrink-0" />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
