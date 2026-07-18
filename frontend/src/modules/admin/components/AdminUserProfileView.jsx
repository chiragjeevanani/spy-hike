import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Edit3, Save, X, Trash2, Ban, CheckCircle2, Mail, Phone, Calendar,
  Award, HeartPulse, ShieldAlert, Users, IndianRupee, ExternalLink, Building2,
  Compass, Backpack, ChevronRight
} from 'lucide-react';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { getUserByEmail, getBookingsByUserEmail, getTripById } from '../utils/storage';
import adminApi from '../../../lib/adminApi';
import bookingsApi from '../../../lib/bookingsApi';
import { getToken } from '../../../lib/apiClient';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^\d{10}$/;


const GENDERS = ['Male', 'Female', 'Other'];
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const FITNESS_LEVELS = ['Low', 'Moderate', 'High'];

const blankForm = {
  name: '', email: '', mobile: '', age: 24, gender: 'Male',
  hikingExperience: 'Beginner', fitnessLevel: 'Moderate', emergencyContact: '',
};

export default function AdminUserProfileView({ email, onBack, onNavigateToUser, onNavigateToOrganizer, darkMode }) {
  const isNew = !email;
  const isApi = !isNew && !!getToken();

  // For local/mock users (offline fallback only when no API token is present)
  const localUser = (!isNew && !isApi) ? getUserByEmail(email) : null;

  // For real API users — fetched async when token is available
  const [apiUser, setApiUser] = useState(null);
  const [apiLoading, setApiLoading] = useState(isApi);

  useEffect(() => {
    if (!isApi) { setApiLoading(false); return; }
    setApiLoading(true);
    adminApi.getUser(email)
      .then((u) => {
        setApiUser(u);
        setForm({
          name: u.name || '', email: u.email || '', mobile: u.mobile || '',
          age: u.age || 24, gender: u.gender || 'Male',
          hikingExperience: u.hikingExperience || 'Beginner',
          fitnessLevel: u.fitnessLevel || 'Moderate',
          emergencyContact: u.emergencyContact || '',
        });
      })
      .catch(() => setApiUser(null))
      .finally(() => setApiLoading(false));
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unified existingUser — prefer API data over localStorage
  const existingUser = apiUser || localUser;

  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState(localUser ? {
    name: localUser.name || '', email: localUser.email || '', mobile: localUser.mobile || '',
    age: localUser.age || 24, gender: localUser.gender || 'Male',
    hikingExperience: localUser.hikingExperience || 'Beginner', fitnessLevel: localUser.fitnessLevel || 'Moderate',
    emergencyContact: localUser.emergencyContact || '',
  } : blankForm);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const toast = useToast();
  const fieldRefs = useRef({});

  // Real bookings from the backend when signed in; localStorage seed data
  // otherwise (offline / no backend) — same pattern as the organizer profile's
  // trips/bookings fetch.
  const [allBookings, setAllBookings] = useState([]);

  useEffect(() => {
    if (isNew || !email || !getToken()) return;
    bookingsApi.listAll().then(setAllBookings).catch(() => setAllBookings([]));
  }, [email, isNew]);

  const bookings = useMemo(() => {
    if (!existingUser) return [];
    if (getToken()) {
      const userEmail = existingUser.email.toLowerCase();
      return allBookings.filter((b) => b.userEmail?.toLowerCase() === userEmail);
    }
    return getBookingsByUserEmail(existingUser.email);
  }, [allBookings, existingUser]);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 3;

  useEffect(() => {
    setCurrentPage(1);
  }, [email, bookings.length]);

  const stats = useMemo(() => {
    const active = bookings.filter(b => b.status !== 'Cancelled');
    const distinctTreks = new Set(active.map(b => b.tripId || b.tripName));
    const totalSpend = active.reduce((s, b) => s + (parseFloat(b.finalAmount) || 0), 0);
    const totalMembers = active.reduce((s, b) => s + (parseInt(b.travelersCount) || 1), 0);
    const upcoming = bookings.filter(b => b.status === 'Upcoming').length;
    const completed = bookings.filter(b => b.status === 'Completed').length;
    const cancelled = bookings.filter(b => b.status === 'Cancelled').length;
    return { totalTreks: distinctTreks.size, totalSpend, totalMembers, upcoming, completed, cancelled };
  }, [bookings]);

  const totalPages = Math.ceil(bookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return bookings.slice(start, start + ITEMS_PER_PAGE);
  }, [bookings, currentPage]);

  const cardCls = `rounded-2xl border shadow-sm ${
    darkMode ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;
  const inputCls = `w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs font-semibold transition-all ${
    darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-[#F27D26]/60' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-[#F27D26]/60'
  }`;
  const labelCls = 'text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5';

  const FIELD_ORDER = ['name', 'email', 'mobile', 'age'];

  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Full name is required.';
    if (!form.email.trim()) errors.email = 'Email is required.';
    else if (!EMAIL_REGEX.test(form.email.trim())) errors.email = 'Enter a valid email address.';
    if (form.mobile.trim() && !MOBILE_REGEX.test(form.mobile.trim())) errors.mobile = 'Enter a valid 10-digit mobile number.';
    const ageNum = Number(form.age);
    if (Number.isNaN(ageNum) || ageNum < 12 || ageNum > 99) errors.age = 'Enter a valid age between 12 and 99.';
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      const message = errors[FIELD_ORDER.find((f) => errors[f])];
      setFieldErrors(errors);
      setFormError(message);
      toast.error(message);
      scrollToFirstError(fieldRefs.current, errors, FIELD_ORDER);
      return;
    }
    setFieldErrors({});
    setFormError('');
    setSaving(true);
    try {
      if (isNew) {
        const created = await adminApi.createUser(form);
        toast.success('Hiker account created successfully!');
        onNavigateToUser(created.email);
      } else {
        const updated = await adminApi.updateUser(existingUser.id, form);
        setApiUser(updated);
        setEditing(false);
        toast.success('Hiker profile updated successfully!');
      }
    } catch (err) {
      const message = err?.message || 'Could not save hiker profile.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    // Deactivated accounts (self-service) can only be reactivated, not
    // "unbanned" — they were never banned in the first place.
    const nextStatus = existingUser.status === 'Active' ? 'Banned' : 'Active';
    try {
      const updated = await adminApi.setUserStatus(existingUser.id, nextStatus);
      setApiUser(updated);
      toast.success(
        nextStatus === 'Banned' ? 'Hiker suspended.'
          : existingUser.status === 'Deactivated' ? 'Account reactivated.' : 'Hiker reinstated.'
      );
    } catch (err) {
      toast.error(err?.message || 'Could not update status.');
    }
    setShowStatusConfirm(false);
  };

  const handleDelete = async () => {
    try {
      await adminApi.deleteUser(existingUser.id);
      toast.success('Hiker account deleted.');
    } catch (err) {
      toast.error(err?.message || 'Could not delete user.');
      setShowDeleteConfirm(false);
      return;
    }
    setShowDeleteConfirm(false);
    onBack();
  };

  // Show loading spinner while fetching the real user from the API
  if (apiLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-[#F27D26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isNew && !existingUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <ShieldAlert size={40} className="text-slate-300" />
        <p className="text-sm font-bold text-slate-400">User not found — it may have been deleted.</p>
        <button onClick={() => onBack()} className="px-4 py-2 rounded-xl bg-[#F27D26] text-white text-xs font-bold">Back to Users</button>
      </div>
    );
  }

  const user = existingUser || form;

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
              {isNew ? 'Add New Hiker' : 'Hiker Profile'}
            </h1>
            <p className="text-slate-400 text-xs mt-1 font-semibold">
              {isNew ? 'Create a new hiker account manually.' : 'Full profile, activity, and account controls.'}
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
                existingUser.status === 'Active'
                  ? 'border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                  : 'border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
              }`}
            >
              {existingUser.status === 'Active' ? <Ban size={13} /> : <CheckCircle2 size={13} />}
              {existingUser.status === 'Active' ? 'Suspend' : existingUser.status === 'Deactivated' ? 'Reactivate' : 'Reinstate'}
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

        {/* Left column: identity + personal info */}
        <div className="lg:col-span-1 space-y-6">
          <div className={`${cardCls} p-6 flex flex-col items-center text-center`}>
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Hiker')}&background=F27D26&color=fff`}
              alt={user.name}
              className="w-24 h-24 rounded-full border-4 border-[#F27D26]/20 object-cover mb-4"
            />
            {!isNew && (
              <>
                <h2 className="font-display font-black text-lg">{existingUser.name}</h2>
                <span className="text-xs text-slate-400 font-semibold mt-0.5">{existingUser.email}</span>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase mt-3 ${
                  existingUser.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' :
                  existingUser.status === 'Deactivated' ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'
                }`}>
                  {existingUser.status}
                </span>
              </>
            )}
          </div>

          <div className={`${cardCls} p-6 space-y-4`}>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Personal Info</h3>
            {formError && (
              <div className="text-[11px] font-bold text-rose-500 bg-rose-500/10 rounded-lg px-3 py-2">{formError}</div>
            )}
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input
                    ref={el => { fieldRefs.current.name = { current: el }; }}
                    className={`${inputCls} ${fieldErrors.name ? 'border-rose-500 focus:border-rose-500' : ''}`}
                    value={form.name}
                    onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setFieldErrors(er => ({ ...er, name: '' })); }}
                  />
                  {fieldErrors.name && <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.name}</p>}
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input
                    ref={el => { fieldRefs.current.email = { current: el }; }}
                    className={`${inputCls} ${fieldErrors.email ? 'border-rose-500 focus:border-rose-500' : ''}`}
                    value={form.email}
                    disabled={!isNew}
                    onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setFieldErrors(er => ({ ...er, email: '' })); }}
                  />
                  {fieldErrors.email && <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <label className={labelCls}>Mobile</label>
                  <input
                    ref={el => { fieldRefs.current.mobile = { current: el }; }}
                    className={`${inputCls} ${fieldErrors.mobile ? 'border-rose-500 focus:border-rose-500' : ''}`}
                    value={form.mobile}
                    onChange={e => { setForm(p => ({ ...p, mobile: e.target.value.replace(/\D/g, '') })); setFieldErrors(er => ({ ...er, mobile: '' })); }}
                  />
                  {fieldErrors.mobile && <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.mobile}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className={labelCls}>Age</label>
                    <input
                      ref={el => { fieldRefs.current.age = { current: el }; }}
                      type="number"
                      className={`${inputCls} ${fieldErrors.age ? 'border-rose-500 focus:border-rose-500' : ''}`}
                      value={form.age}
                      onChange={e => { setForm(p => ({ ...p, age: e.target.value })); setFieldErrors(er => ({ ...er, age: '' })); }}
                    />
                    {fieldErrors.age && <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.age}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Gender</label>
                    <select className={inputCls} value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Trekking Level</label>
                    <select className={inputCls} value={form.hikingExperience} onChange={e => setForm(p => ({ ...p, hikingExperience: e.target.value }))}>
                      {EXPERIENCE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Fitness Level</label>
                    <select className={inputCls} value={form.fitnessLevel} onChange={e => setForm(p => ({ ...p, fitnessLevel: e.target.value }))}>
                      {FITNESS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Emergency Contact</label>
                  <input className={inputCls} placeholder="Name (+91 ...)" value={form.emergencyContact} onChange={e => setForm(p => ({ ...p, emergencyContact: e.target.value }))} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F27D26] text-white text-xs font-bold active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Save size={13} /> {saving ? 'Saving…' : (isNew ? 'Create Hiker' : 'Save Changes')}
                  </button>
                  {!isNew && (
                    <button
                      onClick={() => { setEditing(false); setFormError(''); setFieldErrors({}); }}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs font-semibold">
                <div className="flex items-center gap-2.5"><Phone size={13} className="text-[#F27D26] shrink-0" /> {existingUser.mobile || 'N/A'}</div>
                <div className="flex items-center gap-2.5"><Mail size={13} className="text-[#F27D26] shrink-0" /> {existingUser.email}</div>
                <div className="flex items-center gap-2.5"><Users size={13} className="text-[#F27D26] shrink-0" /> {existingUser.age} Yrs / {existingUser.gender}</div>
                <div className="flex items-center gap-2.5"><Award size={13} className="text-[#F27D26] shrink-0" /> {existingUser.hikingExperience} Trekker</div>
                <div className="flex items-center gap-2.5"><HeartPulse size={13} className="text-[#F27D26] shrink-0" /> Fitness: {existingUser.fitnessLevel}</div>
                <div className="flex items-center gap-2.5"><Calendar size={13} className="text-[#F27D26] shrink-0" /> Joined {existingUser.joinedDate || 'N/A'}</div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className={labelCls}>Emergency Contact</span>
                  <span className="text-rose-500 bg-rose-500/5 px-2.5 py-1 rounded-lg inline-block mt-0.5">
                    {existingUser.emergencyContact || 'Not specified'}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <span className={labelCls}>Notification Preferences</span>
                  <div className="flex flex-col gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${(existingUser.notificationBookings !== false) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-800'}`} />
                      <span>Bookings: {(existingUser.notificationBookings !== false) ? 'ON' : 'OFF'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${(existingUser.notificationUpdates !== false) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-800'}`} />
                      <span>Updates: {(existingUser.notificationUpdates !== false) ? 'ON' : 'OFF'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${existingUser.notificationPromo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-800'}`} />
                      <span>Bulletins: {existingUser.notificationPromo ? 'ON' : 'OFF'}</span>
                    </div>
                  </div>
                </div>

                {existingUser.referralCode && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className={labelCls}>Referral Info</span>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span>Referral Code: </span>
                        <span className="font-mono text-xs text-[#F27D26] select-all bg-[#F27D26]/5 px-2 py-0.5 rounded-md font-black">{existingUser.referralCode}</span>
                      </div>
                      {existingUser.referredBy && (
                        <div className="flex items-center gap-1.5">
                          <span>Referred By: </span>
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-md">{existingUser.referredBy}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {existingUser.referredUsers && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className={labelCls}>Referred Hikers ({existingUser.referredUsers.length})</span>
                    {existingUser.referredUsers.length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-semibold italic">No hikers referred yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {existingUser.referredUsers.map((ru) => (
                          <button
                            key={ru.id}
                            type="button"
                            onClick={() => onNavigateToUser(ru.id)}
                            className="text-[10px] font-bold bg-[#F27D26]/10 text-[#F27D26] hover:bg-[#F27D26]/20 px-2 py-1 rounded-full cursor-pointer active:scale-95 transition-all text-left flex items-center gap-1"
                          >
                            <span>👤 {ru.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: stats + booking history */}
        {!isNew && (
          <div className="lg:col-span-2 space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Treks Booked', value: stats.totalTreks, icon: Compass, color: 'text-blue-500 bg-blue-500/10' },
                { label: 'Total Members', value: stats.totalMembers, icon: Users, color: 'text-violet-500 bg-violet-500/10' },
                { label: 'Total Spend', value: `₹${stats.totalSpend.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-emerald-500 bg-emerald-500/10' },
                { label: 'Upcoming', value: stats.upcoming, icon: Backpack, color: 'text-amber-500 bg-amber-500/10' },
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

            {/* Booking history */}
            <div className={`${cardCls} p-0 overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex items-center justify-between`}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Booking History</h3>
                <span className="text-[10px] font-bold text-slate-400">{bookings.length} total</span>
              </div>

              {bookings.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">No bookings on record for this hiker yet.</div>
              ) : (
                <div className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {paginatedBookings.map(b => {
                    const trip = b.tripId ? getTripById(b.tripId) : null;
                    const orgEmail = b.organizerEmail || trip?.organizerEmail;
                    const coverImage = b.tripImage || trip?.coverImage;
                    return (
                      <div key={b.bookingId || b.id} className="flex items-center gap-4 px-6 py-4">
                        {coverImage ? (
                          <img src={coverImage} alt={b.tripName} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-slate-800" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400">
                            <Compass size={18} />
                          </div>
                        )}
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
                            <span className="flex items-center gap-1"><Calendar size={10} /> {b.selectedDate}</span>
                            <span className="flex items-center gap-1"><Users size={10} /> {b.travelersCount || 1} member{(b.travelersCount || 1) > 1 ? 's' : ''}</span>
                            <span className="flex items-center gap-1"><IndianRupee size={10} /> {parseFloat(b.finalAmount || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
                            <Building2 size={10} className="text-[#F27D26]" /> {b.organizerName || 'Independent Organizer'}
                          </div>
                        </div>
                        <button
                          onClick={() => orgEmail && onNavigateToOrganizer(orgEmail)}
                          disabled={!orgEmail}
                          className={`shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                            orgEmail
                              ? (darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600')
                              : 'opacity-30 cursor-not-allowed border-slate-200'
                          }`}
                        >
                          View Organizer <ChevronRight size={11} />
                        </button>
                      </div>
                    );
                  })}

                  {totalPages > 1 && (
                    <div className={`px-6 py-4 flex items-center justify-between border-t ${
                      darkMode ? 'border-slate-800' : 'border-slate-100'
                    }`}>
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          currentPage === 1
                            ? 'opacity-40 cursor-not-allowed border-slate-250 dark:border-slate-850 text-slate-400'
                            : (darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600')
                        }`}
                      >
                        Previous
                      </button>
                      <span className="text-[10px] font-bold text-slate-400">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          currentPage === totalPages
                            ? 'opacity-40 cursor-not-allowed border-slate-250 dark:border-slate-850 text-slate-400'
                            : (darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600')
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showStatusConfirm}
        title={
          existingUser?.status === 'Active' ? 'Suspend Hiker?' :
          existingUser?.status === 'Deactivated' ? 'Reactivate Account?' : 'Reinstate Hiker?'
        }
        message={
          existingUser?.status === 'Active'
            ? `${existingUser?.name} will be banned and unable to log in or make new bookings.`
            : existingUser?.status === 'Deactivated'
              ? `${existingUser?.name} deactivated their own account. Reactivating will let them log in again.`
              : `${existingUser?.name} will regain full access to book and use the app.`
        }
        confirmLabel={existingUser?.status === 'Active' ? 'Suspend' : existingUser?.status === 'Deactivated' ? 'Reactivate' : 'Reinstate'}
        tone={existingUser?.status === 'Active' ? 'danger' : 'default'}
        onConfirm={handleToggleStatus}
        onCancel={() => setShowStatusConfirm(false)}
        darkMode={darkMode}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Hiker Account?"
        message={`This permanently removes ${existingUser?.name}'s profile from the admin console. Their past booking records will remain for accounting purposes.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        darkMode={darkMode}
      />
    </div>
  );
}
