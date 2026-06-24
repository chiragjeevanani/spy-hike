/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

import { 
  REVENUE_TREND_DATA, TRIP_CATEGORY_DATA, DIFFICULTY_DIST_DATA, 
  STATE_POPULARITY_DATA, TOP_ORGANIZERS_DATA, BOOKING_STATUS_DATA 
} from '../utils/mockData';

export default function AnalyticsView({ darkMode }) {
  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm flex flex-col h-[340px] ${
    darkMode 
      ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' 
      : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white">Analytics & Reports</h1>
        <p className="text-slate-400 text-xs mt-1.5 font-semibold">Visual reports for revenue, bookings, user growth, and popular regions.</p>
      </div>

      {/* Grid of charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Chart 1: Revenue Area Chart */}
        <div className={cardCls}>
          <div className="mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider">Monthly Revenue (₹ Thousands)</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Total platform revenue month-by-month.</p>
          </div>
          <div className="flex-1 w-full text-[10px] font-bold">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_TREND_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F27D26" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#F27D26" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                <XAxis dataKey="month" stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <YAxis stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#F27D26" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Bookings Monthly volume */}
        <div className={cardCls}>
          <div className="mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider">Monthly Bookings</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Number of bookings made each month.</p>
          </div>
          <div className="flex-1 w-full text-[10px] font-bold">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REVENUE_TREND_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                <XAxis dataKey="month" stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <YAxis stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: User growth trend */}
        <div className={cardCls}>
          <div className="mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider">Hiker Signups</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">New user registrations over time.</p>
          </div>
          <div className="flex-1 w-full text-[10px] font-bold">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={REVENUE_TREND_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                <XAxis dataKey="month" stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <YAxis stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Top Organizers bar */}
        <div className={cardCls}>
          <div className="mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider">Top Organizers by Revenue (₹ Thousands)</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Total sales generated by top organizers.</p>
          </div>
          <div className="flex-1 w-full text-[10px] font-bold">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TOP_ORGANIZERS_DATA} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                <XAxis type="number" stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <YAxis dataKey="name" type="category" stroke={darkMode ? "#64748b" : "#94a3b8"} width={110} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Geographic States popularity */}
        <div className={cardCls}>
          <div className="mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider">Trips by Location</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Number of trips listed in each state.</p>
          </div>
          <div className="flex-1 w-full text-[10px] font-bold">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={STATE_POPULARITY_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                <XAxis dataKey="state" stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <YAxis stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <Tooltip />
                <Bar dataKey="value" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Booking status distribution */}
        <div className={cardCls}>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider">Booking Status</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Breakdown of completed, upcoming, and cancelled bookings.</p>
          </div>
          <div className="flex-1 w-full text-[10px] font-bold relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={BOOKING_STATUS_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {BOOKING_STATUS_DATA.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center labels */}
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-black font-display text-slate-800 dark:text-white">Active</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Ratios</span>
            </div>
          </div>
          <div className="flex justify-around text-[10px] font-bold text-slate-400">
            {BOOKING_STATUS_DATA.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span>{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
