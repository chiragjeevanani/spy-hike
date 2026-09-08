import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Star, Globe, Trash2, UserPlus, Crown, AlertCircle, Save } from 'lucide-react';
import { loadAllOrganizers, saveOrganizerStatus, deleteOrganizerAccount } from '../utils/storage';
import adminApi from '../../../lib/adminApi';
import promotionsApi from '../../../lib/promotionsApi';
import { getToken } from '../../../lib/apiClient';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PromotedBadge, { PROMOTED_RING_CLASS } from '../../../components/PromotedBadge';
import { useToast } from '../../../components/ToastProvider';
import { AdminSkeletonCard } from './AdminSkeleton';

// Today (and +N days) as yyyy-mm-dd, for the promote modal's date defaults.
const isoDate = (d) => d.toISOString().split('T')[0];
const todayStr = () => isoDate(new Date());
const plusDays = (n) => isoDate(new Date(Date.now() + n * 86400000));

export default function OrganizersView({ onOpenProfile, darkMode }) {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('Pending'); // 'Pending' or 'All'
  const [approvalAction, setApprovalAction] = useState(null); // { id, email, name, approve, reject, currentlyApproved }
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, email, name }
  const [promoteTarget, setPromoteTarget] = useState(null); // organizer being promoted
  const [promoteDates, setPromoteDates] = useState({ startDate: '', endDate: '' });
  const [promoteError, setPromoteError] = useState('');
  const [promoting, setPromoting] = useState(false);
  const toast = useToast();

  // Real registered organizers when the admin is signed in; localStorage seed
  // roster otherwise (offline / no backend).
  const refresh = () => {
    setLoading(true);
    if (getToken()) {
      adminApi.listOrganizers()
        .then((list) => setOrganizers(Array.isArray(list) ? list : loadAllOrganizers()))
        .catch(() => setOrganizers(loadAllOrganizers()))
        .finally(() => setLoading(false));
    } else {
      setOrganizers(loadAllOrganizers());
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleConfirmApproval = async () => {
    const { id, email, approve, reject, currentlyApproved } = approvalAction;
    const action = approve ? 'approve' : reject ? 'reject' : currentlyApproved ? 'suspend' : 'approve';
    if (getToken() && id) {
      try { await adminApi.setOrganizerStatus(id, action); toast.success('Organizer status updated.'); }
      catch (err) { toast.error(err?.message || 'Could not update organizer.'); }
    } else {
      saveOrganizerStatus(email, action === 'approve', action === 'reject');
    }
    setApprovalAction(null);
    refresh();
  };

  const handleConfirmDelete = async () => {
    if (getToken() && deleteTarget.id) {
      try { await adminApi.deleteOrganizer(deleteTarget.id); toast.success('Organizer deleted.'); }
      catch (err) { toast.error(err?.message || 'Could not delete organizer.'); }
    } else {
      deleteOrganizerAccount(deleteTarget.email);
    }
    setDeleteTarget(null);
    refresh();
  };

  const pendingList = organizers.filter(o => o.isPendingApproval && !o.isApproved);
  // Promoted organizers lead the roster — same priority they get everywhere else.
  const allList = [...organizers].sort((a, b) => Number(b.isPromoted) - Number(a.isPromoted));

  const openPromote = (org) => {
    setPromoteTarget(org);
    setPromoteDates({ startDate: todayStr(), endDate: plusDays(30) });
    setPromoteError('');
  };

  const handleConfirmPromote = async () => {
    setPromoteError('');
    setPromoting(true);
    try {
      await promotionsApi.promoteOrganizer(promoteTarget.id, promoteDates.startDate, promoteDates.endDate);
      toast.success(`${promoteTarget.agencyName} is now promoted!`);
      setPromoteTarget(null);
      refresh();
    } catch (err) {
      setPromoteError(err?.message || 'Could not promote this organizer.');
    } finally {
      setPromoting(false);
    }
  };

  const handleUnpromote = async (org) => {
    try {
      await promotionsApi.unpromoteOrganizer(org.id);
      toast.success(`${org.agencyName}'s promotion was removed.`);
      refresh();
    } catch (err) {
      toast.error(err?.message || 'Could not remove promotion.');
    }
  };

  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
    darkMode
      ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20'
      : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;

  const approvalDialogCopy = () => {
    if (!approvalAction) return {};
    if (approvalAction.approve) return { title: 'Approve Organizer?', message: `${approvalAction.name} will become a verified partner and can start posting trips.`, confirmLabel: 'Approve', tone: 'default' };
    if (approvalAction.reject) return { title: 'Reject Application?', message: `${approvalAction.name}'s partner application will be rejected.`, confirmLabel: 'Reject', tone: 'danger' };
    return {
      title: approvalAction.currentlyApproved ? 'Suspend Organizer?' : 'Activate Organizer?',
      message: approvalAction.currentlyApproved
        ? `${approvalAction.name} will be suspended and unable to post new trips or receive bookings.`
        : `${approvalAction.name} will regain full partner access.`,
      confirmLabel: approvalAction.currentlyApproved ? 'Suspend' : 'Activate',
      tone: approvalAction.currentlyApproved ? 'danger' : 'default',
    };
  };
  const dialogCopy = approvalDialogCopy();

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

      {/* Title */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white">Organizer Approvals</h1>
          <p className="text-slate-400 text-xs mt-1.5 font-semibold">Review organizer registrations, license details, and manage active status.</p>
        </div>
        <button
          onClick={() => onOpenProfile()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#F27D26] text-white active:scale-95 transition-all"
        >
          <UserPlus size={14} />
          <span>Add Organizer</span>
        </button>
      </div>

      {/* Tab Segment Toggles */}
      <div className="flex gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveSubTab('Pending')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ${
            activeSubTab === 'Pending'
              ? 'text-[#F27D26]'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>Pending Approvals ({pendingList.length})</span>
          {activeSubTab === 'Pending' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F27D26]" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('All')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ml-6 ${
            activeSubTab === 'All'
              ? 'text-[#F27D26]'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>All Organizers ({allList.length})</span>
          {activeSubTab === 'All' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F27D26]" />
          )}
        </button>
      </div>

      {/* Tab Render */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdminSkeletonCard darkMode={darkMode} />
          <AdminSkeletonCard darkMode={darkMode} />
          <AdminSkeletonCard darkMode={darkMode} />
          <AdminSkeletonCard darkMode={darkMode} />
        </div>
      ) : activeSubTab === 'Pending' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingList.length === 0 ? (
            <div className={`${cardCls} col-span-2 text-center py-12 text-slate-400`}>
              No pending registrations at the moment.
            </div>
          ) : (
            pendingList.map((org) => (
              <div key={org.email} className={cardCls}>

                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex gap-3">
                    <img
                      src={org.avatar}
                      alt={org.name}
                      className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-800 object-cover shrink-0"
                    />
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wide leading-tight">{org.agencyName}</h3>
                      <span className="text-[10px] font-bold text-[#F27D26]">{org.name}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-amber-500/10 text-amber-500 animate-pulse">
                    Review Required
                  </span>
                </div>

                {/* Info block */}
                <div className="space-y-2.5 text-xs font-semibold py-3 border-y border-slate-100 dark:border-slate-800 my-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">Email / Phone</span>
                    <span>{org.email} | {org.mobile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">Experience</span>
                    <span>{org.yearsExperience} Years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">Government ID</span>
                    <span className="text-rose-500">{org.govtIdType} ({org.govtIdNumber})</span>
                  </div>
                  {org.agencyWebsite && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[10px] uppercase">Website</span>
                      <a href={org.agencyWebsite} target="_blank" rel="noreferrer" className="text-[#F27D26] hover:underline flex items-center gap-1">
                        <Globe size={11} /> Link
                      </a>
                    </div>
                  )}
                </div>

                {/* Footer buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => onOpenProfile(org.email)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500"
                  >
                    <Eye size={13} />
                    <span>View Application</span>
                  </button>

                  <button
                    onClick={() => setApprovalAction({ id: org.id, email: org.email, name: org.agencyName, approve: false, reject: true })}
                    className="flex items-center justify-center p-2 rounded-xl border border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                    title="Reject Application"
                  >
                    <X size={15} />
                  </button>

                  <button
                    onClick={() => setApprovalAction({ id: org.id, email: org.email, name: org.agencyName, approve: true, reject: false })}
                    className="flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/10 transition-all active:scale-95"
                  >
                    <Check size={14} className="mr-1" />
                    <span>Approve</span>
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
      ) : (
        /* All Organizers view */
        <div className={`${cardCls} overflow-hidden p-0 border border-slate-100 dark:border-slate-800`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                  darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
                }`}>
                  <th className="py-3.5 px-6">Agency / Partner</th>
                  <th className="py-3.5 px-6">Government ID</th>
                  <th className="py-3.5 px-6">Trips & Bookings</th>
                  <th className="py-3.5 px-6">Rating & Experience</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-semibold ${
                darkMode ? 'divide-slate-850' : 'divide-slate-100'
              }`}>
                {allList.map((org) => (
                  <tr key={org.email} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">

                    {/* Agency name */}
                    <td className="py-4 px-6 flex items-center gap-3">
                      <img
                        src={org.avatar}
                        alt={org.name}
                        className={`w-9 h-9 rounded-xl border object-cover shrink-0 ${
                          org.isPromoted ? PROMOTED_RING_CLASS : 'border-slate-200 dark:border-slate-800'
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="font-bold flex items-center gap-1.5">
                          {org.agencyName || 'Demo Agency'}
                          {org.isPromoted && <PromotedBadge />}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{org.email}</span>
                      </div>
                    </td>

                    {/* govt ID type */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span>{org.govtIdType || 'N/A'}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{org.govtIdNumber || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Trips stats */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span>{org.totalTrips || 0} Posted Hikes</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{org.totalBookings || 0} Bookings count</span>
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span>{org.rating > 0 ? org.rating.toFixed(1) : 'New'}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({org.yearsExperience} yrs exp)</span>
                      </div>
                    </td>

                    {/* Verification Status */}
                    <td className="py-4 px-6">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
                        org.isApproved ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {org.isApproved ? 'Approved' : 'Suspended / Pending'}
                      </span>
                    </td>

                    {/* Action toggles */}
                    <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => onOpenProfile(org.email)}
                        className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all"
                        title="View Profile Details"
                      >
                        <Eye size={14} />
                      </button>

                      {org.isApproved && (
                        org.isPromoted ? (
                          <button
                            onClick={() => handleUnpromote(org)}
                            className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-500/20 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
                            title="Remove Promotion"
                          >
                            <Crown size={14} fill="currentColor" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openPromote(org)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500 hover:border-amber-200 dark:hover:border-amber-500/20 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
                            title="Promote Organizer"
                          >
                            <Crown size={14} />
                          </button>
                        )
                      )}

                      <button
                        onClick={() => setApprovalAction({ id: org.id, email: org.email, name: org.agencyName, approve: false, reject: false, currentlyApproved: org.isApproved })}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                          org.isApproved
                            ? 'border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                            : 'border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                        }`}
                        title={org.isApproved ? 'Suspend Partner' : 'Approve Partner'}
                      >
                        {org.isApproved ? 'Suspend' : 'Activate'}
                      </button>

                      <button
                        onClick={() => setDeleteTarget({ id: org.id, email: org.email, name: org.agencyName })}
                        className="p-1.5 rounded-lg border border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                        title="Delete Organizer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!approvalAction}
        title={dialogCopy.title}
        message={dialogCopy.message}
        confirmLabel={dialogCopy.confirmLabel}
        tone={dialogCopy.tone}
        onConfirm={handleConfirmApproval}
        onCancel={() => setApprovalAction(null)}
        darkMode={darkMode}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Organizer Account?"
        message={`This permanently removes ${deleteTarget?.name}'s partner account. Their posted trips and past bookings will remain for records.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        darkMode={darkMode}
      />

      {/* Promote modal — pick the date range this organizer stays promoted for */}
      {promoteTarget && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl relative animate-scaleIn ${
            darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <button onClick={() => setPromoteTarget(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X size={18} />
            </button>
            <h3 className="text-sm font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Crown size={14} className="text-amber-500" /> Promote {promoteTarget.agencyName}
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mb-5">
              Their trips will be highlighted and shown first wherever organizers compete for the same trek.
            </p>

            {promoteError && (
              <div className="flex gap-2 items-center p-2.5 rounded-xl text-[11px] font-bold bg-rose-500/10 text-rose-500 mb-4">
                <AlertCircle size={13} className="shrink-0" /> {promoteError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Promoted From</label>
                <input
                  type="date"
                  className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs font-semibold transition-all ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-amber-400/60' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-amber-400/60'
                  }`}
                  value={promoteDates.startDate}
                  onChange={(e) => setPromoteDates((d) => ({ ...d, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Promoted Until</label>
                <input
                  type="date"
                  min={promoteDates.startDate}
                  className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs font-semibold transition-all ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-amber-400/60' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-amber-400/60'
                  }`}
                  value={promoteDates.endDate}
                  onChange={(e) => setPromoteDates((d) => ({ ...d, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setPromoteTarget(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
                  darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPromote}
                disabled={promoting}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-60"
              >
                <Save size={13} /> {promoting ? 'Promoting...' : 'Confirm & Promote'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
