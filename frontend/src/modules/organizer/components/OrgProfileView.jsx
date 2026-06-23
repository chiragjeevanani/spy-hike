/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Building2, Mail, Phone, Globe, Star, Award, TrendingUp, LogOut, Moon, Sun, Edit3, ChevronRight, Save, X, Plus, Minus } from 'lucide-react';
import { saveOrgUser } from '../utils/storage';

export default function OrgProfileView({ organizer, onLogout, darkMode, onToggleDarkMode }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: organizer?.name || '',
    agencyName: organizer?.agencyName || '',
    mobile: organizer?.mobile || '',
    agencyWebsite: organizer?.agencyWebsite || '',
    bio: organizer?.bio || '',
    yearsExperience: organizer?.yearsExperience || 1,
    coreCapabilities: organizer?.coreCapabilities || ['Snow Expedition Specialists', 'Eco-Friendly Leave-No-Trace', 'Emergency Medical Rescue', 'Naturalist Guided Hiking'],
  });

  const handleSave = () => {
    const updated = { ...organizer, ...form };
    saveOrgUser(updated);
    setEditing(false);
    // Force re-render via reload-like pattern (parent should handle)
    window.location.reload();
  };

  const inputCls = `w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition ${
    darkMode ? 'bg-zinc-900 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/50' : 'bg-white border-zinc-200 text-zinc-800 focus:border-spy-orange/50'
  }`;
  const labelCls = `text-xs font-semibold tracking-wide uppercase mb-1.5 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`;

  const statItems = [
    { label: 'Trips Posted', value: organizer?.totalTrips || 0, icon: TrendingUp, color: 'text-spy-orange' },
    { label: 'Total Bookings', value: organizer?.totalBookings || 0, icon: Award, color: 'text-emerald-400' },
    { label: 'Avg Rating', value: organizer?.rating ? organizer.rating.toFixed(1) : '—', icon: Star, color: 'text-yellow-400' },
    { label: 'Yrs Experience', value: organizer?.yearsExperience || '—', icon: User, color: 'text-blue-400' },
  ];

  return (
    <div className={`h-full flex flex-col overflow-y-auto font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      
      {/* Profile header */}
      <div className={`relative px-5 pt-5 pb-6 ${darkMode ? 'bg-gradient-to-b from-zinc-900 to-transparent' : 'bg-gradient-to-b from-orange-50 to-transparent'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={organizer?.avatar}
                alt={organizer?.name}
                className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(organizer?.name || 'O')}&background=F27D26&color=fff&size=150`; }}
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-zinc-950 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-display font-black tracking-tight leading-tight">{organizer?.agencyName || organizer?.name}</h1>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{organizer?.email}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Award size={11} className="text-spy-orange" />
                <span className="text-[10px] font-bold text-spy-orange">Verified Partner</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={`p-2.5 rounded-xl transition ${darkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-white shadow-sm hover:shadow'}`}
          >
            <Edit3 size={16} className={darkMode ? 'text-zinc-400' : 'text-zinc-500'} />
          </button>
        </div>

        {organizer?.bio && (
          <p className={`mt-4 text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{organizer.bio}</p>
        )}
      </div>

      <div className="px-5 space-y-5 pb-8">
        
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`rounded-2xl p-3.5 ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`}
              >
                <Icon size={16} className={`${s.color} mb-2`} />
                <div className="text-lg font-display font-black">{s.value}</div>
                <div className={`text-[10px] font-medium mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Info card */}
        <div className={`rounded-2xl ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`}>
          {[
            { icon: Building2, label: 'Agency', value: organizer?.agencyName },
            { icon: Phone, label: 'Mobile', value: organizer?.mobile },
            { icon: Mail, label: 'Email', value: organizer?.email },
            { icon: Globe, label: 'Website', value: organizer?.agencyWebsite || '—' },
          ].map((item, i, arr) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`flex items-center gap-3 px-4 py-3.5 ${i < arr.length - 1 ? `border-b ${darkMode ? 'border-white/5' : 'border-zinc-100'}` : ''}`}>
                <Icon size={15} className="text-spy-orange shrink-0" />
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{item.label}</p>
                  <p className="text-sm font-semibold">{item.value || '—'}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Settings section */}
        <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`}>
          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-red-400 ${darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'} transition`}
          >
            <LogOut size={16} />
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </div>

      {/* Edit modal overlay */}
      {editing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 flex flex-col"
        >
          <div className={`flex-1 flex flex-col overflow-y-auto ${darkMode ? 'bg-zinc-950' : 'bg-gray-50'}`}>
            <div className={`px-5 pt-5 pb-4 shrink-0 flex items-center gap-3 ${darkMode ? 'bg-zinc-900/80 border-b border-white/5' : 'bg-white border-b border-zinc-100 shadow-sm'}`}>
              <button type="button" onClick={() => setEditing(false)} className={`p-2 rounded-xl ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}><X size={17} /></button>
              <h2 className="text-lg font-display font-black">Edit Profile</h2>
            </div>
            <div className="flex-1 px-5 py-5 space-y-4">
              <div className={`rounded-2xl p-4 space-y-4 ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`}>
                {[
                  { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your name' },
                  { label: 'Agency Name', key: 'agencyName', type: 'text', placeholder: 'Agency name' },
                  { label: 'Mobile', key: 'mobile', type: 'tel', placeholder: '+91 XXXXX XXXXX' },
                  { label: 'Website', key: 'agencyWebsite', type: 'url', placeholder: 'https://...' },
                  { label: 'Years Experience', key: 'yearsExperience', type: 'number', placeholder: '5' },
                ].map(field => (
                  <div key={field.key}>
                    <label className={labelCls}>{field.label}</label>
                    <input
                      type={field.type}
                      className={inputCls}
                      placeholder={field.placeholder}
                      value={form[field.key]}
                      onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <label className={labelCls}>About Agency</label>
                  <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Describe your agency..." value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelCls}>Core Capabilities</label>
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, coreCapabilities: [...p.coreCapabilities, ''] }))}
                      className="text-spy-orange text-xs font-bold flex items-center gap-0.5"
                    >
                      <Plus size={13} /> Add capability
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.coreCapabilities.map((cap, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          className={`${inputCls} flex-1`}
                          placeholder={`Capability ${idx + 1}`}
                          value={cap}
                          onChange={e => {
                            const arr = [...form.coreCapabilities];
                            arr[idx] = e.target.value;
                            setForm(p => ({ ...p, coreCapabilities: arr }));
                          }}
                        />
                        {form.coreCapabilities.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const arr = form.coreCapabilities.filter((_, i) => i !== idx);
                              setForm(p => ({ ...p, coreCapabilities: arr }));
                            }}
                            className="text-red-400 px-2"
                          >
                            <Minus size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                className="w-full py-3.5 rounded-2xl bg-spy-orange text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-spy-orange/20 active:scale-95 transition-all"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
