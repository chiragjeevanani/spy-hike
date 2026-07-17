import React from 'react';

export default function SkeletonCard({ darkMode }) {
  return (
    <div className={`rounded-3xl border overflow-hidden shadow-sm animate-pulse-subtle ${
      darkMode ? 'bg-[#30221a]/20 border-white/5' : 'bg-white border-zinc-150'
    }`}>
      {/* Cover skeleton */}
      <div className="h-44 w-full skeleton-loader" />
      
      {/* Details skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-4 w-2/3 rounded-md skeleton-loader" />
        <div className="h-3 w-1/2 rounded-md skeleton-loader" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-3 w-1/4 rounded-md skeleton-loader" />
          <div className="h-4 w-1/5 rounded-md skeleton-loader" />
        </div>
      </div>
    </div>
  );
}
