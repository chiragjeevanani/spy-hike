import React from 'react';

/**
 * Reusable skeleton screen loaders for Admin Panel sections.
 */

// Card skeleton for grid-based admin views (Treks, Trips, Coupons, Organizers)
export function AdminSkeletonCard({ darkMode }) {
  return (
    <div className={`p-0 rounded-2xl border overflow-hidden shadow-sm animate-pulse ${
      darkMode ? 'bg-[#152243] border-slate-800' : 'bg-white border-slate-100'
    }`}>
      <div className="h-36 w-full skeleton-loader" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-4 w-1/2 rounded-md skeleton-loader" />
          <div className="h-3 w-1/5 rounded-md skeleton-loader" />
        </div>
        <div className="h-3 w-3/4 rounded-md skeleton-loader" />
        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="h-8 flex-1 rounded-xl skeleton-loader" />
          <div className="h-8 w-8 rounded-xl skeleton-loader" />
          <div className="h-8 w-8 rounded-xl skeleton-loader" />
        </div>
      </div>
    </div>
  );
}

// Table row skeleton for table-based views (Users, Bookings, Payouts, Trek Requests)
export function AdminSkeletonTableRow({ darkMode, cols = 5 }) {
  return (
    <tr className={`border-b ${darkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3.5 px-4">
          <div className={`h-4 rounded-md skeleton-loader ${i === 0 ? 'w-3/4' : i === cols - 1 ? 'w-12 ml-auto' : 'w-1/2'}`} />
        </td>
      ))}
    </tr>
  );
}

// Full Table view skeleton container
export function AdminSkeletonTable({ darkMode, rows = 6, cols = 5 }) {
  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm ${
      darkMode ? 'bg-[#152243] border-slate-800' : 'bg-white border-slate-100'
    }`}>
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div className="h-4 w-1/4 rounded-md skeleton-loader" />
        <div className="h-8 w-32 rounded-xl skeleton-loader" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
              darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'
            }`}>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="py-3 px-4">
                  <div className="h-3 w-16 rounded-md skeleton-loader" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <AdminSkeletonTableRow key={i} darkMode={darkMode} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// State Grouped Skeleton specifically for Trek Categories page
export function AdminSkeletonStateGroup({ darkMode, count = 2 }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, gIdx) => (
        <div key={gIdx} className="space-y-4">
          {/* Group header banner skeleton */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm ${
            darkMode ? 'bg-[#152243] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl skeleton-loader shrink-0" />
              <div className="space-y-2">
                <div className="h-4 w-36 rounded-md skeleton-loader" />
                <div className="h-3 w-24 rounded-md skeleton-loader" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg skeleton-loader" />
          </div>

          {/* Cards grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AdminSkeletonCard darkMode={darkMode} />
            <AdminSkeletonCard darkMode={darkMode} />
            <AdminSkeletonCard darkMode={darkMode} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Summary Stat Cards skeleton (for Dashboard, Analytics, Payouts)
export function AdminSkeletonStatCards({ darkMode, count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`p-5 rounded-2xl border flex items-center justify-between shadow-sm ${
          darkMode ? 'bg-[#152243] border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="space-y-2">
            <div className="h-3 w-20 rounded-md skeleton-loader" />
            <div className="h-6 w-28 rounded-md skeleton-loader" />
          </div>
          <div className="w-10 h-10 rounded-xl skeleton-loader shrink-0" />
        </div>
      ))}
    </div>
  );
}
