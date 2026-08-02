import React from 'react';

export default function Loading() {
  return (
    <div className="flex h-[75vh] w-full items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-3">
        {/* Vòng quay spinner chuyển động tuyến tính */}
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-xs font-bold text-muted-foreground animate-pulse">
          Đang tải dữ liệu học vụ...
        </span>
      </div>
    </div>
  );
}
