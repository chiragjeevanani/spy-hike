import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Edit3, Save, X, Trash2, Ban, CheckCircle2, Mail, Phone, Star,
  Globe, FileBadge, Calendar, ShieldAlert, Users, IndianRupee, ExternalLink,
  Compass, ChevronRight, MapPin
} from 'lucide-react';
import ConfirmDialog from '../../../components/ConfirmDialog';
import {
  getOrganizerByEmail, saveOrganizerFields, createOrganizer, deleteOrganizerAccount,
  getTripsByOrganizerEmail, getBookingsByOrganizerEmail,
} from '../utils/storage';

const GOVT_ID_TYPES = ['Aadhaar', 'PAN', 'GST', 'Passport'];

// Local slug helper mirroring the traveller app's utils/trekGroups.js —
// kept as a tiny standalone copy rather than cross-importing between the
// admin and user modules, which otherwise stay fully independent.
const slugify = (name) => (name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const blankForm = {
  name: '', email: '', mobile: '', agencyName: '', agencyWebsite: '',
  govtIdType: 'Aadhaar', govtIdNumber: '', yearsExperience: 1, bio: '',
};

export default function AdminOrganizerProfileView({ email, onBack, onNavigateToOrganizer, onNavigateToUser, darkMode }) {
  const isNew = !email;
  const existingOrg = isNew ? null : getOrganizerByEmail(email);

  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState(existingOrg ? {
    name: existingOrg.name || '', email: existingOrg.email || '', mobile: existingOrg.mobile || '',
    agencyName: existingOrg.agencyName || '', agencyWebsite: existingOrg.agencyWebsite || '',
    govtIdType: existingOrg.govtIdType || 'Aadhaar', govtIdNumber: existingOrg.govtIdNumber || '',
    yearsExperience: existingOrg.yearsExperience || 1, bio: existingOrg.bio || '',
  } : blankForm);
  const [formError, setFormError] = useState('');
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const trips = useMemo(() => (existingOrg ? getTripsByOrganizerEmail(existingOrg.email) : []), [existingOrg?.email]);
  const bookings = useMemo(() => (existingOrg ? getBookingsByOrganizerEmail(existingOrg.email) : []), [existingOrg?.email]);

  const stats = useMemo(() => {
    const active = bookings.filter(b => b.status !== 'Cancelled');
    const totalRevenue = active.reduce((s, b) => s + (parseFloat(b.finalAmount) || 0), 0);
    const totalCommission = active.reduce((s, b) => {
      const c = b.commissionAmount !== undefined ? b.commissionAmount : (parseFloat(b.finalAmount) || 0) * 0.1;
      return s + c;
    }, 0);
    const totalTravelers = active.reduce((s, b) => s + (parseInt(b.hikersCount) || 1), 0);
    const publishedTrips = trips.filter(t => t.status === 'Published').length;
    return { totalRevenue, totalCommission, totalTravelers, publishedTrips, totalBookings: bookings.length };
  }, [bookings, trips]);

  const cardCls = `rounded-2xl border shadow-sm ${
    darkMode ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;
  const inputCls = `w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs font-semibold transition-all ${
    darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-[#F27D26]/60' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-[#F27D26]/60'
  }`;
  const labelCls = 'text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5';

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim() || !form.agencyName.trim()) {
      setFormError('Representative name, agency name and email are required.');
      return;
    }
    if (isNew) {
      const created = createOrganizer(form);
      onNavigateToOrganizer(created.email);
    } else {
      saveOrganizerFields(existingOrg.email, form);
      setEditing(false);
    }
  };

  const handleToggleStatus = () => {
    saveOrganizerFields(existingOrg.email, { isApproved: !existingOrg.isApproved, isPendingApproval: false });
    setShowStatusConfirm(false);
  };

  const handleDelete = () => {
    deleteOrganizerAccount(existingOrg.email);
    setShowDeleteConfirm(false);
    onBack();
  };

  if (!isNew && !existingOrg) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <ShieldAlert size={40} className="text-slate-300" />
        <p className="text-sm font-bold text-slate-400">Organizer not found — it may have been deleted.</p>
        <button onClick={() => onBack()} className="px-4 py-2 rounded-xl bg-[#F27D26] text-white text-xs font-bold">Back to Organizers</button>
      </div>
    );
  }

  const org = existingOrg || form;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

      {/* Header / breadcrumb back bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => onBack()} className={`p-2 rounded-xl border transition-all ${darkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white">
              {isNew ? 'Add New Organizer' : 'Organizer Profile'}
            </h1>
            <p className="text-slate-400 text-xs mt-1 font-semibold">
              {isNew ? 'Create a new partner account manually.' : 'Agency details, trips, revenue, and account controls.'}
            </p>
          </div>
        </div>

        {!isNew && (
          <div className="flex items-center gap-2.5">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${darkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <Edit3 size={13} /> Edit
              </button>
            )}
            <button
              onClick={() => setShowStatusConfirm(true)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                existingOrg.isApproved
                  ? 'border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                  : 'border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
              }`}
            >
              {existingOrg.isApproved ? <Ban size={13} /> : <CheckCircle2 size={13} />}
              {existingOrg.isApproved ? 'Suspend' : 'Activate'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all active:scale-95"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left column: identity + agency info */}
        <div className="lg:col-span-1 space-y-6">
          <div className={`${cardCls} p-6 flex flex-col items-center text-center`}>
            <img
              src={org.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(org.agencyName || 'Agency')}&background=F27D26&color=fff`}
              alt={org.agencyName}
              className="w-24 h-24 rounded-2xl border-4 border-[#F27D26]/20 object-cover mb-4"
            />
            {!isNew && (
              <>
                <h2 className="font-display font-black text-lg">{existingOrg.agencyName}</h2>
                <span className="text-xs text-slate-400 font-semibold mt-0.5">Rep: {existingOrg.name}</span>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase mt-3 ${
                  existingOrg.isApproved ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}>
                  {existingOrg.isApproved ? 'Approved' : 'Suspended / Pending'}
                </span>
              </>
            )}
          </div>

          <div className={`${cardCls} p-6 space-y-4`}>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Agency Info</h3>
            {formError && (
              <div className="text-[11px] font-bold text-rose-500 bg-rose-500/10 rounded-lg px-3 py-2">{formError}</div>
            )}
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Agency Name *</label>
                  <input className={inputCls} value={form.agencyName} onChange={e => setForm(p => ({ ...p, agencyName: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Representative Name *</label>
                  <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input className={inputCls} value={form.email} disabled={!isNew} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Mobile</label>
                  <input className={inputCls} value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Website</label>
                  <input className={inputCls} value={form.agencyWebsite} onChange={e => setForm(p => ({ ...p, agencyWebsite: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Govt ID Type</label>
                    <select className={inputCls} value={form.govtIdType} onChange={e => setForm(p => ({ ...p, govtIdType: e.target.value }))}>
                      {GOVT_ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Govt ID Number</label>
                    <input className={inputCls} value={form.govtIdNumber} onChange={e => setForm(p => ({ ...p, govtIdNumber: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Years Experience</label>
                  <input type="number" className={inputCls} value={form.yearsExperience} onChange={e => setForm(p => ({ ...p, yearsExperience: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Bio</label>
                  <textarea rows={3} className={`${inputCls} resize-none`} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F27D26] text-white text-xs font-bold active:scale-95 transition-all"
                  >
                    <Save size={13} /> {isNew ? 'Create Organizer' : 'Save Changes'}
                  </button>
                  {!isNew && (
                    <button
                      onClick={() => { setEditing(false); setFormError(''); }}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs font-semibold">
                <p className="leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg text-slate-500 dark:text-slate-400">
                  {existingOrg.bio || 'No agency bio has been configured.'}
                </p>
                <div className="flex items-center gap-2.5"><Phone size={13} className="text-[#F27D26] shrink-0" /> {existingOrg.mobile || 'N/A'}</div>
                <div className="flex items-center gap-2.5"><Mail size={13} className="text-[#F27D26] shrink-0" /> {existingOrg.email}</div>
                {existingOrg.agencyWebsite && (
                  <a href={existingOrg.agencyWebsite} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-[#F27D26] hover:underline">
                    <Globe size={13} className="shrink-0" /> {existingOrg.agencyWebsite}
                  </a>
                )}
                <div className="flex items-center gap-2.5"><FileBadge size={13} className="text-[#F27D26] shrink-0" /> {existingOrg.govtIdType}: {existingOrg.govtIdNumber}</div>
                <div className="flex items-center gap-2.5"><Calendar size={13} className="text-[#F27D26] shrink-0" /> {existingOrg.yearsExperience} yrs experience</div>
                <div className="flex items-center gap-2.5"><Star size={13} className="text-amber-400 fill-amber-400 shrink-0" /> {existingOrg.rating > 0 ? existingOrg.rating.toFixed(1) : 'No ratings yet'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: stats + trips + bookings */}
        {!isNew && (
          <div className="lg:col-span-2 space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Published Trips', value: stats.publishedTrips, icon: Compass, color: 'text-blue-500 bg-blue-500/10' },
                { label: 'Total Bookings', value: stats.totalBookings, icon: Users, color: 'text-violet-500 bg-violet-500/10' },
                { label: 'Gross Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-emerald-500 bg-emerald-500/10' },
                { label: 'Platform Commission', value: `₹${Math.round(stats.totalCommission).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-pink-500 bg-pink-500/10' },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className={`${cardCls} p-4`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${s.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="text-lg font-black font-display">{s.value}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{s.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Trips run by this organizer */}
            <div className={`${cardCls} p-0 overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex items-center justify-between`}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Trips Posted</h3>
                <span className="text-[10px] font-bold text-slate-400">{trips.length} total</span>
              </div>

              {trips.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-semibold">No trips posted by this organizer yet.</div>
              ) : (
                <div className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {trips.map(t => (
                    <div key={t.id} className="flex items-center gap-4 px-6 py-4">
                      <img src={t.coverImage} alt={t.name} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-slate-800" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm truncate">{t.name}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase shrink-0 ${
                            t.status === 'Published' ? 'bg-emerald-500/10 text-emerald-600' :
                            t.status === 'Draft' ? 'bg-slate-400/10 text-slate-500' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold mt-1 flex-wrap">
                          <span className="flex items-center gap-1"><MapPin size={10} /> {t.location}</span>
                          <span className="flex items-center gap-1"><IndianRupee size={10} /> {t.price} / person</span>
                        </div>
                      </div>
                      <a
                        href={`/app/trek/${slugify(t.name)}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                      >
                        Public Listing <ExternalLink size={11} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent bookings */}
            <div className={`${cardCls} p-0 overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex items-center justify-between`}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Bookings Received</h3>
                <span className="text-[10px] font-bold text-slate-400">{bookings.length} total</span>
              </div>

              {bookings.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-semibold">No bookings received yet.</div>
              ) : (
                <div className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {bookings.map(b => (
                    <div key={b.bookingId || b.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm truncate">{b.tripName}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase shrink-0 ${
                            b.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' :
                            b.status === 'Upcoming' ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {b.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold mt-1 flex-wrap">
                          <span>{b.userName || 'Active User'}</span>
                          <span className="flex items-center gap-1"><Calendar size={10} /> {b.selectedDate}</span>
                          <span className="flex items-center gap-1"><IndianRupee size={10} /> {parseFloat(b.finalAmount || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => b.userEmail && onNavigateToUser(b.userEmail)}
                        disabled={!b.userEmail}
                        className={`shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                          b.userEmail
                            ? (darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600')
                            : 'opacity-30 cursor-not-allowed border-slate-200'
                        }`}
                      >
                        View Hiker <ChevronRight size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showStatusConfirm}
        title={existingOrg?.isApproved ? 'Suspend Organizer?' : 'Activate Organizer?'}
        message={
          existingOrg?.isApproved
            ? `${existingOrg?.agencyName} will be suspended and unable to post new trips or receive bookings.`
            : `${existingOrg?.agencyName} will regain full partner access.`
        }
        confirmLabel={existingOrg?.isApproved ? 'Suspend' : 'Activate'}
        tone={existingOrg?.isApproved ? 'danger' : 'default'}
        onConfirm={handleToggleStatus}
        onCancel={() => setShowStatusConfirm(false)}
        darkMode={darkMode}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Organizer Account?"
        message={`This permanently removes ${existingOrg?.agencyName}'s partner account. Their posted trips and past bookings will remain for records.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        darkMode={darkMode}
      />
    </div>
  );
}
