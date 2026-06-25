import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, Calendar, IndianRupee, Compass, AlertCircle, 
  ArrowUpRight, Clock, Plus, Megaphone, CheckCircle2, TrendingUp 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

import { 
  loadAllUsers, loadAllOrganizers, loadAllTrips, loadAllBookings 
} from '../utils/storage';
import { 
  REVENUE_TREND_DATA, TRIP_CATEGORY_DATA, RECENT_LOGS 
} from '../utils/mockData';

export default function DashboardView({ onNavigate, darkMode }) {
  const [stats, setStats] = useState({
    users: 0,
    organizers: 0,
    bookings: 0,
    revenue: 0,
    commission: 0,
    trips: 0,
    pendingOrgs: 0
  });

  useEffect(() => {
    const users = loadAllUsers();
    const organizers = loadAllOrganizers();
    const trips = loadAllTrips();
    const bookings = loadAllBookings();

    const activeBookings = bookings.filter(b => b.status === 'Completed' || b.status === 'Upcoming');
    const totalRevenue = activeBookings.reduce((sum, b) => sum + (parseFloat(b.finalAmount) || 0), 0);
    const totalCommission = activeBookings.reduce((sum, b) => {
      const commission = b.commissionAmount !== undefined ? b.commissionAmount : (parseFloat(b.finalAmount) * 0.1);
      return sum + commission;
    }, 0);

    const pending = organizers.filter(o => o.isPendingApproval && !o.isApproved).length;

    setStats({
      users: users.length,
      organizers: organizers.length,
      bookings: bookings.length,
      revenue: Math.round(totalRevenue),
      commission: Math.round(totalCommission),
      trips: trips.length,
      pendingOrgs: pending
    });
  }, []);

  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
    darkMode 
      ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' 
      : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;

  const kpis = [
    { label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString('en-IN')}`, icon: IndianRupee, change: '+14% this month', color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Commission Earned', value: `₹${stats.commission.toLocaleString('en-IN')}`, icon: TrendingUp, change: 'Platform share', color: 'text-pink-500 bg-pink-500/10' },
    { label: 'Active Hikers', value: stats.users, icon: Users, change: '+24 new', color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Partner Organizers', value: stats.organizers, icon: Building2, change: stats.pendingOrgs > 0 ? `${stats.pendingOrgs} pending` : 'All verified', color: stats.pendingOrgs > 0 ? 'text-amber-500 bg-amber-500/10' : 'text-purple-500 bg-purple-500/10' },
    { label: 'Total Bookings', value: stats.bookings, icon: Calendar, change: '+8 this week', color: 'text-indigo-500 bg-indigo-500/10' },
    { label: 'Total Trips', value: stats.trips, icon: Compass, change: '15 regions', color: 'text-orange-500 bg-orange-500/10' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
      
      {/* Welcome Banner */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white">Admin Dashboard</h1>
          <p className="text-slate-400 text-xs mt-1.5 font-semibold">Track sales, user signups, and organizer registrations.</p>
        </div>
        <div className="flex gap-2.5">
          <button 
            onClick={() => onNavigate('Broadcast')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#F27D26] hover:bg-[#d96d1a] text-white shadow-lg shadow-orange-500/15"
          >
            <Megaphone size={14} />
            <span>Send Alert</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className={cardCls}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-400">
                  Live
                </span>
              </div>
              <span className="text-slate-400 text-xs font-bold">{kpi.label}</span>
              <div className="text-2xl font-black font-display tracking-tight mt-1.5">{kpi.value}</div>
              <p className="text-[10px] text-slate-400 font-semibold mt-2 flex items-center gap-1">
                <Clock size={11} />
                {kpi.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Line Chart */}
        <div className={`${cardCls} lg:col-span-2 flex flex-col h-[360px]`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-black tracking-wide uppercase">Monthly Revenue</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Total booking sales collected per month.</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/5 px-2.5 py-1 rounded-lg">
              <ArrowUpRight size={14} />
              <span>+18.4%</span>
            </div>
          </div>
          <div className="flex-1 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_TREND_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F27D26" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#F27D26" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                <XAxis dataKey="month" stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <YAxis stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <Tooltip 
                  contentStyle={darkMode ? { backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' } : { backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#334155' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#F27D26" strokeWidth={3} fillOpacity={1} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Pie Chart */}
        <div className={`${cardCls} flex flex-col h-[360px]`}>
          <div>
            <h3 className="text-sm font-black tracking-wide uppercase">Types of Treks</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Distribution of all listed treks.</p>
          </div>
          <div className="flex-1 w-full text-xs font-semibold relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={TRIP_CATEGORY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {TRIP_CATEGORY_DATA.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Summary Text */}
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black font-display text-slate-800 dark:text-white">100+</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hikes</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-400">
            {TRIP_CATEGORY_DATA.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Row: Recent Logs & Action Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity Logs */}
        <div className={`${cardCls} lg:col-span-2`}>
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-sm font-black tracking-wide uppercase">Recent Activity</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Latest bookings, updates, and registration status logs.</p>
            </div>
            <Clock size={16} className="text-slate-400 animate-pulse" />
          </div>
          <div className="space-y-4">
            {RECENT_LOGS.map((log) => (
              <div key={log.id} className="flex justify-between items-start gap-4 text-xs font-semibold pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                <div className="flex gap-3">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    log.type === 'Booking' ? 'bg-emerald-500' :
                    log.type === 'Organizer' ? 'bg-amber-500' :
                    log.type === 'Trip' ? 'bg-blue-500' : 'bg-rose-500'
                  }`} />
                  <span className={darkMode ? 'text-slate-200' : 'text-slate-700'}>{log.text}</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{log.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Portal */}
        <div className={cardCls}>
          <h3 className="text-sm font-black tracking-wide uppercase mb-5">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => onNavigate('Organizers')}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-400/50 bg-slate-50/50 dark:bg-slate-900/40 text-left transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Building2 size={16} />
                </div>
                <div className="leading-tight">
                  <span className="text-xs font-bold block">Review Organizers</span>
                  <span className="text-[9px] text-slate-400 font-semibold">Approve or reject pending registrations</span>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate('Users')}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-400/50 bg-slate-50/50 dark:bg-slate-900/40 text-left transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Users size={16} />
                </div>
                <div className="leading-tight">
                  <span className="text-xs font-bold block">Manage Hikers</span>
                  <span className="text-[9px] text-slate-400 font-semibold">View and update hiker accounts</span>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate('Trips')}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-400/50 bg-slate-50/50 dark:bg-slate-900/40 text-left transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Compass size={16} />
                </div>
                <div className="leading-tight">
                  <span className="text-xs font-bold block">Manage Trips</span>
                  <span className="text-[9px] text-slate-400 font-semibold">Moderate, pause, or remove listed trips</span>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-slate-400" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
