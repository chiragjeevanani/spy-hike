/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Megaphone, Send, Clock, Info, Copy } from 'lucide-react';
import { broadcastNotification, loadBroadcastHistory } from '../utils/storage';

export default function BroadcastView({ darkMode }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('Promo');
  const [target, setTarget] = useState('both');
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBroadcasts(loadBroadcastHistory());
  }, []);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      alert('Please fill in all fields.');
      return;
    }

    if (!window.confirm(`Send this announcement to: "${target === 'both' ? 'All' : target === 'users' ? 'Hikers' : 'Organizers'}"?`)) {
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    broadcastNotification(title, content, type, target);
    
    // reset form
    setTitle('');
    setContent('');
    setLoading(false);
    
    // refresh list
    setBroadcasts(loadBroadcastHistory());
  };

  const handleApplyTemplate = (tpl) => {
    setTitle(tpl.title);
    setContent(tpl.content);
    setType(tpl.type);
    setTarget(tpl.target);
  };

  const templates = [
    {
      title: '⛰️ Monsoon Trekking Safety Notice',
      content: 'Heavy rains expected. Please carry waterproof covers and wear boots with a good grip.',
      type: 'Updates',
      target: 'both'
    },
    {
      title: '🎉 Flat 20% off Summer Treks',
      content: 'Use code PEAK20 to get 20% off on all booking crossings. Limited spots available!',
      type: 'Promo',
      target: 'users'
    },
    {
      title: '📢 Profile Update Required',
      content: 'All organizers must verify their account details by the end of the month to keep listings active.',
      type: 'System',
      target: 'organizers'
    }
  ];

  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
    darkMode 
      ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' 
      : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;

  const labelCls = 'text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2';
  const inputCls = `w-full px-4 py-2.5 rounded-xl border outline-none text-xs font-semibold transition-all ${
    darkMode 
      ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-[#F27D26]/60' 
      : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-[#F27D26]/60'
  }`;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white">Announcement Center</h1>
        <p className="text-slate-400 text-xs mt-1.5 font-semibold">Send marketing promotions or urgent weather updates to hikers and organizers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form composer */}
        <div className={`${cardCls} lg:col-span-2`}>
          <h3 className="text-xs font-black uppercase tracking-wider mb-5 flex items-center gap-1.5">
            <Megaphone size={14} className="text-[#F27D26]" />
            <span>Create Announcement</span>
          </h3>

          <form onSubmit={handleBroadcast} className="space-y-4">
            
            {/* Title */}
            <div>
              <label className={labelCls}>Message Title</label>
              <input
                type="text"
                placeholder="e.g. ⛰️ Monsoon Safety Guidelines"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            {/* Content text */}
            <div>
              <label className={labelCls}>Message Details</label>
              <textarea
                rows={3}
                placeholder="Enter description here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Selection rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Category</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={inputCls}
                >
                  <option value="Promo">Promotion / Offer</option>
                  <option value="Updates">Weather / Route Alert</option>
                  <option value="Booking">Booking Update</option>
                  <option value="System">System Update</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Target Audience</label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className={inputCls}
                >
                  <option value="both">All (Hikers & Organizers)</option>
                  <option value="users">Hikers Only</option>
                  <option value="organizers">Organizers Only</option>
                </select>
              </div>
            </div>

            {/* Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 bg-[#F27D26] hover:bg-[#d96d1a] disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/15 active:scale-95 transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={13} />
                  <span>Send Announcement</span>
                </>
              )}
            </button>

          </form>
        </div>

        {/* Quick templates */}
        <div className={cardCls}>
          <h3 className="text-xs font-black uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Info size={14} className="text-blue-500" />
            <span>Presets / Templates</span>
          </h3>
          <div className="space-y-3.5">
            {templates.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleApplyTemplate(tpl)}
                className="w-full p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-[#F27D26]/40 text-left bg-slate-50/50 dark:bg-slate-900/20 block transition-all"
              >
                <div className="flex justify-between font-bold text-[11px] mb-1">
                  <span className="truncate max-w-44 text-[#F27D26]">{tpl.title}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-black">{tpl.target}</span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{tpl.content}</p>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Broadcast List History */}
      <div className={`${cardCls} overflow-hidden p-0 border border-slate-100 dark:border-slate-800`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
          <h3 className="text-xs font-black uppercase tracking-wider">Announcement History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}>
                <th className="py-3.5 px-6">Announcement Details</th>
                <th className="py-3.5 px-6">Target Audience</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6 text-right">Time Sent</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-semibold ${
              darkMode ? 'divide-slate-850' : 'divide-slate-100'
            }`}>
              {broadcasts.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-slate-400">
                    No announcement history available.
                  </td>
                </tr>
              ) : (
                broadcasts.map((bh) => (
                  <tr key={bh.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="py-4 px-6 max-w-sm">
                      <div className="flex flex-col">
                        <span className="font-bold">{bh.title}</span>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 line-clamp-1 leading-normal">{bh.content}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 uppercase tracking-wider font-bold text-[10px]">
                      {bh.target === 'both' ? 'All' : bh.target === 'users' ? 'Hikers Only' : 'Organizers Only'}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[10px] px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-400">
                        {bh.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right text-slate-400 text-[10px]">
                      {new Date(bh.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
