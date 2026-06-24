/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Lock, Shield, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

export default function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');
    
    // Simulate login lag
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (email === 'admin@spyhike.com' && password === 'admin123') {
      const adminProfile = {
        isAuthenticated: true,
        email: 'admin@spyhike.com',
        name: 'System Administrator',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
        role: 'Super Admin',
      };
      onLoginSuccess(adminProfile);
    } else {
      setError('Invalid admin credentials. Use admin@spyhike.com / admin123');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 font-sans px-4 relative overflow-hidden">
      {/* Background visual details */}
      <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] bg-orange-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-emerald-100/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[440px] bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 z-10">
        
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/10">
            <Shield className="text-[#F27D26]" size={32} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">
            Spy Hike Console
          </div>
          <h1 className="text-2xl font-bold text-slate-800 font-display">Administrator Portal</h1>
          <p className="text-sm text-slate-400 mt-1.5">Sign in to manage users, organizers, and platform settings</p>
        </div>

        {/* Error Dialog */}
        {error && (
          <div className="mb-6 flex gap-2.5 items-start p-4 rounded-xl text-xs bg-rose-50 border border-rose-100 text-rose-600 animate-fadeIn">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form elements */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Admin Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/15 outline-none bg-slate-50/50 text-slate-800 text-sm font-medium transition-all"
                placeholder="admin@spyhike.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Security Key</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/15 outline-none bg-slate-50/50 text-slate-800 text-sm font-medium transition-all"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#F27D26] hover:bg-[#d96d1a] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-98 transition-all"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Access Console</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo hints */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-600">Quick Demo Access:</span>
            <div className="mt-1 flex justify-between font-mono text-[10px]">
              <div>Email: <span className="text-[#F27D26] font-semibold">admin@spyhike.com</span></div>
              <div>Secret: <span className="text-[#F27D26] font-semibold">admin123</span></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
