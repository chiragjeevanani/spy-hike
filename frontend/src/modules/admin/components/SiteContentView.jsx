import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, Save, RotateCcw, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, Check,
} from 'lucide-react';
import contentApi from '../../../lib/contentApi';
import { DEFAULT_SITE_CONTENT, mergeSiteContent } from '../../../utils/siteContent';

// ─── Small styled primitives (mirrors LandingCmsView.jsx) ──────────────────

function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">{label}</span>}
      {children}
      {hint && <span className="text-[10px] text-slate-400 mt-1 block">{hint}</span>}
    </label>
  );
}

const inputCls = (dark) =>
  `w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs font-semibold transition-all focus:border-[#F27D26]/60 ${
    dark ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400'
  }`;

function TextInput({ value, onChange, placeholder, darkMode }) {
  return <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls(darkMode)} />;
}

function TextArea({ value, onChange, placeholder, darkMode, rows = 3 }) {
  return <textarea rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls(darkMode)} resize-none leading-relaxed`} />;
}

function ItemCard({ index, count, onMove, onRemove, darkMode, children }) {
  return (
    <div className={`rounded-xl border p-3.5 relative ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'}`}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Item {index + 1}</span>
        <div className="flex items-center gap-1">
          <button type="button" disabled={index === 0} onClick={() => onMove(index, -1)} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30"><ChevronUp size={13} /></button>
          <button type="button" disabled={index === count - 1} onClick={() => onMove(index, 1)} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30"><ChevronDown size={13} /></button>
          <button type="button" onClick={() => onRemove(index)} className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500"><Trash2 size={13} /></button>
        </div>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

const AddBtn = ({ onClick, label }) => (
  <button type="button" onClick={onClick} className="w-full py-2.5 rounded-xl border border-dashed border-[#F27D26]/40 text-[#F27D26] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#F27D26]/5 transition-colors">
    <Plus size={14} /> {label}
  </button>
);

function Section({ title, subtitle, open, onToggle, onReset, darkMode, children }) {
  return (
    <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-[#152243] border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
      <div className="flex items-center justify-between px-5 py-4 gap-3">
        <button type="button" onClick={onToggle} className="flex items-center gap-2.5 flex-1 text-left min-w-0">
          <ChevronRight size={16} className={`text-slate-400 transition-transform shrink-0 ${open ? 'rotate-90' : ''}`} />
          <div className="min-w-0">
            <h3 className="font-black font-display text-sm text-slate-800 dark:text-white truncate">{title}</h3>
            {subtitle && <p className="text-[10px] text-slate-400 truncate">{subtitle}</p>}
          </div>
        </button>
        {onReset && (
          <button type="button" onClick={onReset} title="Reset section to defaults" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"><RotateCcw size={13} /></button>
        )}
      </div>
      {open && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100 dark:border-slate-800">{children}</div>}
    </div>
  );
}

// ─── Main view ──────────────────────────────────────────────────────────────
// Admin CMS for the Privacy Policy and Support pages shown in the customer
// app's Profile > Settings, and the support email/phone shown on the
// "account deactivated" popup — all editable here, no redeploy needed.

export default function SiteContentView({ darkMode }) {
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [openSection, setOpenSection] = useState('privacyPolicy');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [savedMode, setSavedMode] = useState('synced');

  useEffect(() => {
    contentApi.adminGetContent()
      .then((c) => { const m = mergeSiteContent(c); setDraft(m); setSaved(JSON.stringify(m)); })
      .catch(() => { const m = mergeSiteContent(null); setDraft(m); setSaved(JSON.stringify(m)); });
  }, []);

  const dirty = useMemo(() => draft && saved && JSON.stringify(draft) !== saved, [draft, saved]);

  const setSectionField = (section, patch) => setDraft((d) => ({ ...d, [section]: { ...d[section], ...patch } }));
  const updateItem = (section, key, index, patch) =>
    setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: d[section][key].map((it, i) => (i === index ? { ...it, ...patch } : it)) } }));
  const addItem = (section, key, blank) => setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: [...d[section][key], blank] } }));
  const removeItem = (section, key, index) => setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: d[section][key].filter((_, i) => i !== index) } }));
  const moveItem = (section, key, index, dir) => setDraft((d) => {
    const arr = [...d[section][key]]; const j = index + dir;
    if (j < 0 || j >= arr.length) return d;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    return { ...d, [section]: { ...d[section], [key]: arr } };
  });
  const resetSection = (section) => setDraft((d) => ({ ...d, [section]: JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT[section])) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { content, synced } = await contentApi.saveContent(draft);
      const m = mergeSiteContent(content);
      setDraft(m); setSaved(JSON.stringify(m));
      setSavedMode(synced ? 'synced' : 'local');
      setJustSaved(true); setTimeout(() => setJustSaved(false), 2600);
    } finally { setSaving(false); }
  };

  if (!draft) {
    return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading legal & support content…</div>;
  }

  const toggle = (id) => setOpenSection((s) => (s === id ? null : id));

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
      <div className="flex justify-between items-center flex-wrap gap-4 sticky top-0 z-10 -mx-6 px-6 py-3 backdrop-blur-md bg-white/70 dark:bg-[#0B132B]/70 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldCheck className="text-[#F27D26]" size={22} /> Legal & Support
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Edit the Privacy Policy and Support pages shown in the customer app, plus the support contact shown to deactivated accounts.{' '}
            {dirty
              ? <span className="text-amber-500">Unsaved changes</span>
              : savedMode === 'local'
                ? <span className="text-amber-500">Saved locally — backend offline, changes aren’t live for other visitors yet</span>
                : 'All changes saved'}.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 ${justSaved ? (savedMode === 'local' ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-[#F27D26] hover:bg-[#d96d1a]'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {justSaved
            ? <><Check size={14} /> {savedMode === 'local' ? 'Saved locally' : 'Saved'}</>
            : saving ? 'Saving…' : <><Save size={14} /> Save Changes</>}
        </button>
      </div>

      {/* PRIVACY POLICY */}
      <Section title="Privacy Policy" subtitle="Shown in Profile → Help Center → Privacy Policy" open={openSection === 'privacyPolicy'} onToggle={() => toggle('privacyPolicy')} onReset={() => resetSection('privacyPolicy')} darkMode={darkMode}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Heading"><TextInput value={draft.privacyPolicy.heading} onChange={(v) => setSectionField('privacyPolicy', { heading: v })} darkMode={darkMode} /></Field>
          <Field label="Effective Date"><TextInput value={draft.privacyPolicy.effectiveDate} onChange={(v) => setSectionField('privacyPolicy', { effectiveDate: v })} darkMode={darkMode} /></Field>
        </div>
        <Field label="Intro"><TextArea value={draft.privacyPolicy.intro} onChange={(v) => setSectionField('privacyPolicy', { intro: v })} darkMode={darkMode} rows={2} /></Field>

        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Policy Sections</span>
        {draft.privacyPolicy.sections.map((sec, i) => (
          <ItemCard key={i} index={i} count={draft.privacyPolicy.sections.length} darkMode={darkMode}
            onMove={(idx, dir) => moveItem('privacyPolicy', 'sections', idx, dir)}
            onRemove={(idx) => removeItem('privacyPolicy', 'sections', idx)}
          >
            <Field label="Title"><TextInput value={sec.title} onChange={(v) => updateItem('privacyPolicy', 'sections', i, { title: v })} darkMode={darkMode} /></Field>
            <Field label="Body"><TextArea value={sec.body} onChange={(v) => updateItem('privacyPolicy', 'sections', i, { body: v })} darkMode={darkMode} rows={3} /></Field>
          </ItemCard>
        ))}
        <AddBtn label="Add Policy Section" onClick={() => addItem('privacyPolicy', 'sections', { title: '', body: '' })} />
      </Section>

      {/* SUPPORT */}
      <Section title="Support Page & Contact" subtitle="Shown in Profile → Support Desk, and to deactivated accounts" open={openSection === 'support'} onToggle={() => toggle('support')} onReset={() => resetSection('support')} darkMode={darkMode}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Heading"><TextInput value={draft.support.heading} onChange={(v) => setSectionField('support', { heading: v })} darkMode={darkMode} /></Field>
          <Field label="Hours"><TextInput value={draft.support.hours} onChange={(v) => setSectionField('support', { hours: v })} darkMode={darkMode} placeholder="e.g. Mon–Sat, 9:00 AM – 7:00 PM IST" /></Field>
        </div>
        <Field label="Intro"><TextArea value={draft.support.intro} onChange={(v) => setSectionField('support', { intro: v })} darkMode={darkMode} rows={2} /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Support Email" hint="Shown on the deactivated/banned account popup"><TextInput value={draft.support.email} onChange={(v) => setSectionField('support', { email: v })} darkMode={darkMode} placeholder="support@findyourtrek.com" /></Field>
          <Field label="Support Phone" hint="Shown on the deactivated/banned account popup"><TextInput value={draft.support.phone} onChange={(v) => setSectionField('support', { phone: v })} darkMode={darkMode} placeholder="+91 99999 88888" /></Field>
        </div>
        <Field label="WhatsApp (optional)"><TextInput value={draft.support.whatsapp} onChange={(v) => setSectionField('support', { whatsapp: v })} darkMode={darkMode} placeholder="+91 99999 88888" /></Field>

        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Support Desk FAQs</span>
        {draft.support.faqs.map((f, i) => (
          <ItemCard key={i} index={i} count={draft.support.faqs.length} darkMode={darkMode}
            onMove={(idx, dir) => moveItem('support', 'faqs', idx, dir)}
            onRemove={(idx) => removeItem('support', 'faqs', idx)}
          >
            <Field label="Question"><TextInput value={f.q} onChange={(v) => updateItem('support', 'faqs', i, { q: v })} darkMode={darkMode} /></Field>
            <Field label="Answer"><TextArea value={f.a} onChange={(v) => updateItem('support', 'faqs', i, { a: v })} darkMode={darkMode} rows={2} /></Field>
          </ItemCard>
        ))}
        <AddBtn label="Add FAQ" onClick={() => addItem('support', 'faqs', { q: '', a: '' })} />
      </Section>
    </div>
  );
}
