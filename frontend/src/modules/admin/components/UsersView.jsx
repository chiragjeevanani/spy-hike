import React, { useState, useEffect } from 'react';
import { Search, Filter, Ban, CheckCircle, Eye, Download, X } from 'lucide-react';
import { loadAllUsers, saveUserStatus } from '../utils/storage';

export default function UsersView({ darkMode }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [expFilter, setExpFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    setUsers(loadAllUsers());
  }, []);

  const handleStatusChange = (email, currentStatus) => {
    const nextStatus = currentStatus === 'Banned' ? 'Active' : 'Banned';
    if (!window.confirm(`Are you sure you want to change status to ${nextStatus} for ${email}?`)) return;
    saveUserStatus(email, nextStatus);
    setUsers(loadAllUsers()); // refresh
  };

  const handleExport = () => {
    alert('Exporting users list as CSV... (Simulated download complete)');
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                        u.email.toLowerCase().includes(search.toLowerCase());
    const matchGender = genderFilter === 'All' || u.gender === genderFilter;
    const matchExp = expFilter === 'All' || u.hikingExperience === expFilter;
    return matchSearch && matchGender && matchExp;
  });

  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
    darkMode 
      ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' 
      : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
      
      {/* Title */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white">Hikers & Users</h1>
          <p className="text-slate-400 text-xs mt-1.5 font-semibold">Manage hiker registrations, profiles, and account statuses.</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
        >
          <Download size={14} />
          <span>Export Users</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className={`${cardCls} py-4 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl border outline-none text-xs font-semibold transition-all ${
              darkMode 
                ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-[#F27D26]/60' 
                : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-[#F27D26]/60'
            }`}
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Gender</span>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border outline-none text-xs font-semibold ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Experience</span>
            <select
              value={expFilter}
              onChange={(e) => setExpFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border outline-none text-xs font-semibold ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className={`${cardCls} overflow-hidden p-0 border border-slate-100 dark:border-slate-800`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}>
                <th className="py-3.5 px-6">Hiker</th>
                <th className="py-3.5 px-6">Contacts</th>
                <th className="py-3.5 px-6">Trekking Level</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-semibold ${
              darkMode ? 'divide-slate-850' : 'divide-slate-100'
            }`}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.email} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors`}>
                    
                    {/* User Profile */}
                    <td className="py-4 px-6 flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-800 object-cover shrink-0"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold">{user.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{user.email}</span>
                      </div>
                    </td>

                    {/* Contacts */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span>{user.mobile || 'N/A'}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">Joined: {user.joinedDate || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Profile Specs */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          user.hikingExperience === 'Advanced' ? 'bg-rose-500/10 text-rose-500' :
                          user.hikingExperience === 'Intermediate' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {user.hikingExperience}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400`}>
                          Fit: {user.fitnessLevel}
                        </span>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-6">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
                        user.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {user.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className={`p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all`}
                        title="View Profile Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleStatusChange(user.email, user.status)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          user.status === 'Active' 
                            ? 'border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10' 
                            : 'border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                        }`}
                        title={user.status === 'Active' ? 'Ban Hiker' : 'Unban Hiker'}
                      >
                        {user.status === 'Active' ? <Ban size={14} /> : <CheckCircle size={14} />}
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative animate-scaleIn ${
            darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            {/* Profile Avatar Card */}
            <div className="flex flex-col items-center pb-5 mb-5 border-b border-slate-100 dark:border-slate-800">
              <img
                src={selectedUser.avatar}
                alt={selectedUser.name}
                className="w-20 h-20 rounded-full border-2 border-[#F27D26] object-cover mb-3"
              />
              <h3 className="font-display font-black text-lg">{selectedUser.name}</h3>
              <span className="text-xs text-slate-400 mt-0.5 font-semibold">{selectedUser.email}</span>
            </div>

            {/* Profile metadata info */}
            <div className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Phone</span>
                  <span>{selectedUser.mobile || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Age / Gender</span>
                  <span>{selectedUser.age} Yrs / {selectedUser.gender}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Trekking Level</span>
                  <span className="text-emerald-500">{selectedUser.hikingExperience}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Fitness Level</span>
                  <span>{selectedUser.fitnessLevel}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Emergency Contact</span>
                <span className="text-rose-500 bg-rose-500/5 px-2.5 py-1 rounded-lg inline-block mt-0.5">
                  {selectedUser.emergencyContact || 'Not Specified'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Bookings</span>
                  <span>{selectedUser.bookingsCount || 0} hikes</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Status</span>
                  <span className={selectedUser.status === 'Active' ? 'text-emerald-500' : 'text-rose-500'}>
                    {selectedUser.status}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
