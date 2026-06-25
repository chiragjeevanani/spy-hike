import React, { useState, useEffect } from 'react';
import { Building2, Check, X, Eye, Star, Globe, Phone, FileText } from 'lucide-react';
import { loadAllOrganizers, saveOrganizerStatus } from '../utils/storage';

export default function OrganizersView({ darkMode }) {
  const [organizers, setOrganizers] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('Pending'); // 'Pending' or 'All'
  const [selectedOrg, setSelectedOrg] = useState(null);

  useEffect(() => {
    setOrganizers(loadAllOrganizers());
  }, []);

  const handleApprovalAction = (email, approve, reject) => {
    const actionText = approve ? 'Approve' : (reject ? 'Reject' : 'Toggle Status');
    if (!window.confirm(`Are you sure you want to ${actionText} this organizer account?`)) return;
    
    saveOrganizerStatus(email, approve, reject);
    setOrganizers(loadAllOrganizers()); // refresh
  };

  const pendingList = organizers.filter(o => o.isPendingApproval && !o.isApproved);
  const allList = organizers;

  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
    darkMode 
      ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' 
      : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white">Organizer Approvals</h1>
        <p className="text-slate-400 text-xs mt-1.5 font-semibold">Review organizer registrations, license details, and manage active status.</p>
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
      {activeSubTab === 'Pending' ? (
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
                    onClick={() => setSelectedOrg(org)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500"
                  >
                    <Eye size={13} />
                    <span>View Profile</span>
                  </button>

                  <button
                    onClick={() => handleApprovalAction(org.email, false, true)}
                    className="flex items-center justify-center p-2 rounded-xl border border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                    title="Reject Application"
                  >
                    <X size={15} />
                  </button>

                  <button
                    onClick={() => handleApprovalAction(org.email, true, false)}
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
                        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 object-cover shrink-0"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold">{org.agencyName || 'Demo Agency'}</span>
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
                        onClick={() => setSelectedOrg(org)}
                        className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all"
                        title="View Profile Details"
                      >
                        <Eye size={14} />
                      </button>
                      
                      <button
                        onClick={() => handleApprovalAction(org.email, false, false)}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                          org.isApproved 
                            ? 'border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10' 
                            : 'border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                        }`}
                        title={org.isApproved ? 'Suspend Partner' : 'Approve Partner'}
                      >
                        {org.isApproved ? 'Suspend' : 'Activate'}
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details modal overlay */}
      {selectedOrg && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative animate-scaleIn ${
            darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <button
              onClick={() => setSelectedOrg(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            {/* Profile Avatar Card */}
            <div className="flex flex-col items-center pb-5 mb-5 border-b border-slate-100 dark:border-slate-800">
              <img
                src={selectedOrg.avatar}
                alt={selectedOrg.agencyName}
                className="w-20 h-20 rounded-xl border-2 border-[#F27D26] object-cover mb-3"
              />
              <h3 className="font-display font-black text-lg">{selectedOrg.agencyName}</h3>
              <span className="text-xs text-slate-400 mt-0.5 font-semibold">Rep: {selectedOrg.name}</span>
            </div>

            {/* Profile metadata info */}
            <div className="space-y-4 text-xs font-semibold">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">About Agency</span>
                <p className="leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg text-slate-500 dark:text-slate-400">
                  {selectedOrg.bio || 'No agency bio has been configured.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Phone</span>
                  <span>{selectedOrg.mobile || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Email Address</span>
                  <span>{selectedOrg.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Experience Years</span>
                  <span>{selectedOrg.yearsExperience} Years</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Government ID</span>
                  <span className="text-rose-500">{selectedOrg.govtIdType}: {selectedOrg.govtIdNumber}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Agency Rating</span>
                  <span className="flex items-center gap-1">
                    <Star size={11} className="text-amber-400 fill-amber-400" />
                    {selectedOrg.rating || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Approval Status</span>
                  <span className={selectedOrg.isApproved ? 'text-emerald-500' : 'text-amber-500'}>
                    {selectedOrg.isApproved ? 'Approved' : 'Pending Review'}
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
