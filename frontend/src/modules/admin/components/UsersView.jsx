import React, { useState, useEffect } from 'react';
import { Search, Ban, CheckCircle, Eye, Download, Trash2, UserPlus } from 'lucide-react';
import { loadAllUsers, saveUserStatus, deleteUser } from '../utils/storage';
import adminApi from '../../../lib/adminApi';
import { getToken } from '../../../lib/apiClient';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/ToastProvider';

export default function UsersView({ onOpenProfile, darkMode }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [expFilter, setExpFilter] = useState('All');
  const [statusAction, setStatusAction] = useState(null); // { id, email, name, nextStatus }
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, email, name }
  const toast = useToast();

  const refresh = () => {
    setLoading(true);
    if (getToken()) {
      adminApi.listUsers()
        .then((list) => setUsers(Array.isArray(list) ? list : loadAllUsers()))
        .catch(() => setUsers(loadAllUsers()))
        .finally(() => setLoading(false));
    } else {
      setUsers(loadAllUsers());
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleConfirmStatusChange = async () => {
    if (getToken() && statusAction.id) {
      try { await adminApi.setUserStatus(statusAction.id, statusAction.nextStatus); toast.success('Hiker status updated.'); }
      catch (err) { toast.error(err?.message || 'Could not update status.'); }
    } else {
      saveUserStatus(statusAction.email, statusAction.nextStatus);
    }
    setStatusAction(null);
    refresh();
  };

  const handleConfirmDelete = async () => {
    if (getToken() && deleteTarget.id) {
      try { await adminApi.deleteUser(deleteTarget.id); toast.success('Hiker account deleted.'); }
      catch (err) { toast.error(err?.message || 'Could not delete hiker.'); }
    } else {
      deleteUser(deleteTarget.email);
    }
    setDeleteTarget(null);
    refresh();
  };

  const handleExport = () => {
    toast.success('Exporting users list as CSV... (Simulated download complete)');
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
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onOpenProfile()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#F27D26] text-white active:scale-95 transition-all"
          >
            <UserPlus size={14} />
            <span>Add Hiker</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
          >
            <Download size={14} />
            <span>Export Users</span>
          </button>
        </div>
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
              {loading ? (
                [1, 2, 3].map((n) => (
                  <tr key={n} className="animate-pulse-subtle">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full skeleton-loader shrink-0" />
                        <div className="flex flex-col gap-1.5 w-24">
                          <div className="h-3 rounded-md skeleton-loader w-full" />
                          <div className="h-2 rounded-md skeleton-loader w-2/3" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5 w-20">
                        <div className="h-3 rounded-md skeleton-loader w-full" />
                        <div className="h-2 rounded-md skeleton-loader w-2/3" />
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 rounded-full skeleton-loader w-14" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 rounded-full skeleton-loader w-12" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="h-8 rounded-lg skeleton-loader w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
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
                        user.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' :
                        user.status === 'Deactivated' ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {user.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => onOpenProfile(/^[0-9a-f]{24}$/i.test(user.id) ? user.id : user.email)}
                        className={`p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all`}
                        title="View Profile Details"
                      >
                        <Eye size={14} />
                      </button>
                      {user.status === 'Deactivated' ? (
                        // Self-deactivated accounts can only be reactivated by an admin —
                        // no "ban" action offered here since the user isn't banned.
                        <button
                          onClick={() => setStatusAction({ id: user.id, email: user.email, name: user.name, currentStatus: 'Deactivated', nextStatus: 'Active' })}
                          className="p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
                          title="Reactivate Account"
                        >
                          <CheckCircle size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setStatusAction({ id: user.id, email: user.email, name: user.name, currentStatus: user.status, nextStatus: user.status === 'Banned' ? 'Active' : 'Banned' })}
                          className={`p-1.5 rounded-lg border transition-all ${
                            user.status === 'Active'
                              ? 'border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                              : 'border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                          }`}
                          title={user.status === 'Active' ? 'Ban Hiker' : 'Unban Hiker'}
                        >
                          {user.status === 'Active' ? <Ban size={14} /> : <CheckCircle size={14} />}
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget({ id: user.id, email: user.email, name: user.name })}
                        className="p-1.5 rounded-lg border border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                        title="Delete Hiker"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!statusAction}
        title={
          statusAction?.nextStatus === 'Banned' ? 'Ban Hiker?' :
          statusAction?.currentStatus === 'Deactivated' ? 'Reactivate Account?' : 'Unban Hiker?'
        }
        message={
          statusAction?.nextStatus === 'Banned'
            ? `${statusAction?.name} will be banned and unable to log in or make new bookings.`
            : statusAction?.currentStatus === 'Deactivated'
              ? `${statusAction?.name} deactivated their own account. Reactivating will let them log in again.`
              : `${statusAction?.name} will regain full access to the app.`
        }
        confirmLabel={statusAction?.nextStatus === 'Banned' ? 'Ban' : statusAction?.currentStatus === 'Deactivated' ? 'Reactivate' : 'Unban'}
        tone={statusAction?.nextStatus === 'Banned' ? 'danger' : 'default'}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setStatusAction(null)}
        darkMode={darkMode}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Hiker Account?"
        message={`This permanently removes ${deleteTarget?.name}'s profile from the admin console.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        darkMode={darkMode}
      />

    </div>
  );
}
