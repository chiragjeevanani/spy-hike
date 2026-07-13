import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutTemplate, Save, RotateCcw, Plus, Trash2, ChevronUp, ChevronDown,
  ChevronRight, Eye, EyeOff, ExternalLink, GripVertical, Check,
} from 'lucide-react';
import landingApi from '../../../lib/landingApi';
import {
  DEFAULT_LANDING_CONTENT, mergeLandingContent, resolveIcon, ICON_OPTIONS, ICON_COLOR_OPTIONS,
} from '../../landing/landingContent';

// ─── Small styled primitives ───────────────────────────────────────────────

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

function Toggle({ checked, onChange, darkMode }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-emerald-500' : darkMode ? 'bg-slate-700' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

// Reorderable / removable wrapper around one list item's fields.
function ItemCard({ index, count, onMove, onRemove, darkMode, children }) {
  return (
    <div className={`rounded-xl border p-3.5 relative ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'}`}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <GripVertical size={12} /> Item {index + 1}
        </span>
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

// Simple string-array editor (used for a portal's feature checklist).
function StringList({ items = [], onChange, placeholder, darkMode }) {
  return (
    <div className="space-y-2">
      {items.map((val, i) => (
        <div key={i} className="flex items-center gap-2">
          <TextInput value={val} onChange={(v) => onChange(items.map((x, xi) => (xi === i ? v : x)))} placeholder={placeholder} darkMode={darkMode} />
          <button type="button" onClick={() => onChange(items.filter((_, xi) => xi !== i))} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"><Trash2 size={13} /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ''])} className="text-[11px] font-bold text-[#F27D26] flex items-center gap-1 hover:underline"><Plus size={12} /> Add</button>
    </div>
  );
}

function IconPicker({ value, onChange, darkMode }) {
  const Preview = resolveIcon(value);
  return (
    <div className="flex items-center gap-2">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-800' : 'bg-slate-200/70'}`}>
        <Preview size={16} className="text-[#F27D26]" />
      </div>
      <select value={value ?? 'Compass'} onChange={(e) => onChange(e.target.value)} className={inputCls(darkMode)}>
        {ICON_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
    </div>
  );
}

// ─── Section shell (collapsible) ────────────────────────────────────────────

function Section({ id, title, subtitle, open, onToggle, visible, onToggleVisible, onReset, darkMode, children }) {
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
        <div className="flex items-center gap-2 shrink-0">
          {onReset && (
            <button type="button" onClick={onReset} title="Reset section to defaults" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><RotateCcw size={13} /></button>
          )}
          {onToggleVisible && (
            <button type="button" onClick={() => onToggleVisible(!visible)} title={visible ? 'Section visible' : 'Section hidden'} className={`p-1.5 rounded-lg ${visible ? 'text-emerald-500' : 'text-slate-400'} hover:bg-slate-100 dark:hover:bg-slate-800`}>
              {visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          )}
        </div>
      </div>
      {open && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100 dark:border-slate-800">{children}</div>}
    </div>
  );
}

const AddBtn = ({ onClick, label }) => (
  <button type="button" onClick={onClick} className="w-full py-2.5 rounded-xl border border-dashed border-[#F27D26]/40 text-[#F27D26] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#F27D26]/5 transition-colors">
    <Plus size={14} /> {label}
  </button>
);

// ─── Main view ──────────────────────────────────────────────────────────────

export default function LandingCmsView({ darkMode }) {
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null); // last-saved snapshot for dirty check
  const [openSection, setOpenSection] = useState('hero');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [savedMode, setSavedMode] = useState('synced'); // 'synced' | 'local'

  useEffect(() => {
    landingApi.adminGetContent()
      .then((c) => { const m = mergeLandingContent(c); setDraft(m); setSaved(JSON.stringify(m)); })
      .catch(() => { const m = mergeLandingContent(null); setDraft(m); setSaved(JSON.stringify(m)); });
  }, []);

  const dirty = useMemo(() => draft && saved && JSON.stringify(draft) !== saved, [draft, saved]);

  // Mutation helpers ---------------------------------------------------------
  const setSection = (section, patch) => setDraft((d) => ({ ...d, [section]: { ...d[section], ...patch } }));
  const setList = (section, key, list) => setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: list } }));
  const updateItem = (section, key, index, patch) =>
    setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: d[section][key].map((it, i) => (i === index ? (typeof patch === 'object' && !Array.isArray(patch) ? { ...it, ...patch } : patch) : it)) } }));
  const addItem = (section, key, blank) => setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: [...d[section][key], blank] } }));
  const removeItem = (section, key, index) => setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: d[section][key].filter((_, i) => i !== index) } }));
  const moveItem = (section, key, index, dir) => setDraft((d) => {
    const arr = [...d[section][key]]; const j = index + dir;
    if (j < 0 || j >= arr.length) return d;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    return { ...d, [section]: { ...d[section], [key]: arr } };
  });
  const resetSection = (section) => setDraft((d) => ({ ...d, [section]: JSON.parse(JSON.stringify(DEFAULT_LANDING_CONTENT[section])) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Offline-first: always persists locally; syncs to the server when the
      // backend is reachable. Never hard-fails on a network error.
      const { content, synced } = await landingApi.saveContent(draft);
      const m = mergeLandingContent(content);
      setDraft(m); setSaved(JSON.stringify(m));
      setSavedMode(synced ? 'synced' : 'local');
      setJustSaved(true); setTimeout(() => setJustSaved(false), 2600);
    } finally { setSaving(false); }
  };

  if (!draft) {
    return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading landing content…</div>;
  }

  const toggle = (id) => setOpenSection((s) => (s === id ? null : id));
  const sectionProps = (id) => ({ id, open: openSection === id, onToggle: () => toggle(id), darkMode });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
      {/* Title + actions */}
      <div className="flex justify-between items-center flex-wrap gap-4 sticky top-0 z-10 -mx-6 px-6 py-3 backdrop-blur-md bg-white/70 dark:bg-[#0B132B]/70 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <LayoutTemplate className="text-[#F27D26]" size={22} /> Landing Page
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Edit every section of the public marketing page.{' '}
            {dirty
              ? <span className="text-amber-500">Unsaved changes</span>
              : savedMode === 'local'
                ? <span className="text-amber-500">Saved locally — backend offline, changes aren’t live for other visitors yet</span>
                : 'All changes saved'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all">
            <ExternalLink size={14} /> Preview
          </a>
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
      </div>

      {/* HEADER / NAV */}
      <Section {...sectionProps('header')} title="Header & Navigation" subtitle="Logo, nav links, top CTA" onReset={() => resetSection('header')}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Logo Text"><TextInput value={draft.header.logoText} onChange={(v) => setSection('header', { logoText: v })} darkMode={darkMode} /></Field>
          <Field label="Header CTA Label"><TextInput value={draft.header.ctaLabel} onChange={(v) => setSection('header', { ctaLabel: v })} darkMode={darkMode} /></Field>
        </div>
        <Field label="Navigation Links">
          <div className="space-y-2.5">
            {draft.header.navLinks.map((l, i) => (
              <ItemCard key={i} index={i} count={draft.header.navLinks.length} onMove={(idx, d) => moveItem('header', 'navLinks', idx, d)} onRemove={(idx) => removeItem('header', 'navLinks', idx)} darkMode={darkMode}>
                <div className="grid grid-cols-2 gap-2.5">
                  <TextInput value={l.label} onChange={(v) => updateItem('header', 'navLinks', i, { label: v })} placeholder="Label" darkMode={darkMode} />
                  <TextInput value={l.href} onChange={(v) => updateItem('header', 'navLinks', i, { href: v })} placeholder="#anchor" darkMode={darkMode} />
                </div>
              </ItemCard>
            ))}
            <AddBtn onClick={() => addItem('header', 'navLinks', { label: 'new', href: '#features' })} label="Add Nav Link" />
          </div>
        </Field>
      </Section>

      {/* HERO */}
      <Section {...sectionProps('hero')} title="Hero" subtitle="Headline, subtitle, CTAs, metrics" onReset={() => resetSection('hero')}>
        <Field label="Badge"><TextInput value={draft.hero.badge} onChange={(v) => setSection('hero', { badge: v })} darkMode={darkMode} /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Title (lead)"><TextInput value={draft.hero.titleLead} onChange={(v) => setSection('hero', { titleLead: v })} darkMode={darkMode} /></Field>
          <Field label="Title (highlighted)" hint="Rendered in the orange→forest gradient"><TextInput value={draft.hero.titleHighlight} onChange={(v) => setSection('hero', { titleHighlight: v })} darkMode={darkMode} /></Field>
        </div>
        <Field label="Subtitle"><TextArea value={draft.hero.subtitle} onChange={(v) => setSection('hero', { subtitle: v })} darkMode={darkMode} /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Primary CTA"><TextInput value={draft.hero.primaryCta} onChange={(v) => setSection('hero', { primaryCta: v })} darkMode={darkMode} /></Field>
          <Field label="Secondary CTA"><TextInput value={draft.hero.secondaryCta} onChange={(v) => setSection('hero', { secondaryCta: v })} darkMode={darkMode} /></Field>
        </div>
        <Field label="Metrics">
          <div className="space-y-2.5">
            {draft.hero.metrics.map((m, i) => (
              <ItemCard key={i} index={i} count={draft.hero.metrics.length} onMove={(idx, d) => moveItem('hero', 'metrics', idx, d)} onRemove={(idx) => removeItem('hero', 'metrics', idx)} darkMode={darkMode}>
                <div className="grid grid-cols-2 gap-2.5">
                  <TextInput value={m.label} onChange={(v) => updateItem('hero', 'metrics', i, { label: v })} placeholder="4.9★" darkMode={darkMode} />
                  <TextInput value={m.sub} onChange={(v) => updateItem('hero', 'metrics', i, { sub: v })} placeholder="Hiker Rating" darkMode={darkMode} />
                </div>
              </ItemCard>
            ))}
            <AddBtn onClick={() => addItem('hero', 'metrics', { label: '0', sub: 'Metric' })} label="Add Metric" />
          </div>
        </Field>
      </Section>

      {/* FEATURES */}
      <Section {...sectionProps('features')} title="Features" subtitle="Section heading + feature cards" visible={draft.features.visible} onToggleVisible={(v) => setSection('features', { visible: v })} onReset={() => resetSection('features')}>
        <Field label="Heading"><TextInput value={draft.features.heading} onChange={(v) => setSection('features', { heading: v })} darkMode={darkMode} /></Field>
        <Field label="Subheading"><TextArea value={draft.features.subheading} onChange={(v) => setSection('features', { subheading: v })} darkMode={darkMode} rows={2} /></Field>
        <Field label="Feature Cards">
          <div className="space-y-2.5">
            {draft.features.items.map((f, i) => (
              <ItemCard key={i} index={i} count={draft.features.items.length} onMove={(idx, d) => moveItem('features', 'items', idx, d)} onRemove={(idx) => removeItem('features', 'items', idx)} darkMode={darkMode}>
                <div className="grid grid-cols-2 gap-2.5">
                  <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Icon</span><IconPicker value={f.icon} onChange={(v) => updateItem('features', 'items', i, { icon: v })} darkMode={darkMode} /></div>
                  <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Icon Color</span>
                    <select value={f.iconColor || 'text-spy-orange'} onChange={(e) => updateItem('features', 'items', i, { iconColor: e.target.value })} className={inputCls(darkMode)}>
                      {ICON_COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <TextInput value={f.title} onChange={(v) => updateItem('features', 'items', i, { title: v })} placeholder="Feature title" darkMode={darkMode} />
                <TextArea value={f.desc} onChange={(v) => updateItem('features', 'items', i, { desc: v })} placeholder="Description" darkMode={darkMode} rows={2} />
              </ItemCard>
            ))}
            <AddBtn onClick={() => addItem('features', 'items', { icon: 'Compass', iconColor: 'text-spy-orange', title: 'New Feature', desc: '' })} label="Add Feature" />
          </div>
        </Field>
      </Section>

      {/* EXPEDITIONS */}
      <Section {...sectionProps('expeditions')} title="Expeditions" subtitle="Heading + CTA (trek cards pull live from the catalog)" visible={draft.expeditions.visible} onToggleVisible={(v) => setSection('expeditions', { visible: v })} onReset={() => resetSection('expeditions')}>
        <Field label="Heading"><TextInput value={draft.expeditions.heading} onChange={(v) => setSection('expeditions', { heading: v })} darkMode={darkMode} /></Field>
        <Field label="Subheading"><TextArea value={draft.expeditions.subheading} onChange={(v) => setSection('expeditions', { subheading: v })} darkMode={darkMode} rows={2} /></Field>
        <Field label="Catalog CTA Label"><TextInput value={draft.expeditions.ctaLabel} onChange={(v) => setSection('expeditions', { ctaLabel: v })} darkMode={darkMode} /></Field>
      </Section>

      {/* PORTALS */}
      <Section {...sectionProps('portals')} title="Portal Gateways" subtitle="The 3 role launch cards" visible={draft.portals.visible} onToggleVisible={(v) => setSection('portals', { visible: v })} onReset={() => resetSection('portals')}>
        <Field label="Heading"><TextInput value={draft.portals.heading} onChange={(v) => setSection('portals', { heading: v })} darkMode={darkMode} /></Field>
        <Field label="Subheading"><TextArea value={draft.portals.subheading} onChange={(v) => setSection('portals', { subheading: v })} darkMode={darkMode} rows={2} /></Field>
        <div className="space-y-2.5">
          {draft.portals.items.map((p, i) => (
            <div key={p.key || i} className={`rounded-xl border p-3.5 space-y-2.5 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'}`}>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#F27D26]">{p.key} portal</span>
              <div className="grid grid-cols-2 gap-2.5">
                <TextInput value={p.title} onChange={(v) => updateItem('portals', 'items', i, { title: v })} placeholder="Title" darkMode={darkMode} />
                <TextInput value={p.badge} onChange={(v) => updateItem('portals', 'items', i, { badge: v })} placeholder="Badge" darkMode={darkMode} />
              </div>
              <TextArea value={p.desc} onChange={(v) => updateItem('portals', 'items', i, { desc: v })} placeholder="Description" darkMode={darkMode} rows={2} />
              <TextInput value={p.cta} onChange={(v) => updateItem('portals', 'items', i, { cta: v })} placeholder="Button label" darkMode={darkMode} />
              <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Feature Checklist</span>
                <StringList items={p.features} onChange={(list) => updateItem('portals', 'items', i, { features: list })} placeholder="Feature" darkMode={darkMode} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section {...sectionProps('testimonials')} title="Testimonials" subtitle="Reviewer quotes" visible={draft.testimonials.visible} onToggleVisible={(v) => setSection('testimonials', { visible: v })} onReset={() => resetSection('testimonials')}>
        <Field label="Heading"><TextInput value={draft.testimonials.heading} onChange={(v) => setSection('testimonials', { heading: v })} darkMode={darkMode} /></Field>
        <Field label="Subheading"><TextArea value={draft.testimonials.subheading} onChange={(v) => setSection('testimonials', { subheading: v })} darkMode={darkMode} rows={2} /></Field>
        <Field label="Reviews">
          <div className="space-y-2.5">
            {draft.testimonials.items.map((t, i) => (
              <ItemCard key={i} index={i} count={draft.testimonials.items.length} onMove={(idx, d) => moveItem('testimonials', 'items', idx, d)} onRemove={(idx) => removeItem('testimonials', 'items', idx)} darkMode={darkMode}>
                <div className="grid grid-cols-2 gap-2.5">
                  <TextInput value={t.name} onChange={(v) => updateItem('testimonials', 'items', i, { name: v })} placeholder="Name" darkMode={darkMode} />
                  <TextInput value={t.role} onChange={(v) => updateItem('testimonials', 'items', i, { role: v })} placeholder="Role" darkMode={darkMode} />
                </div>
                <TextInput value={t.avatar} onChange={(v) => updateItem('testimonials', 'items', i, { avatar: v })} placeholder="Avatar image URL" darkMode={darkMode} />
                <TextArea value={t.comment} onChange={(v) => updateItem('testimonials', 'items', i, { comment: v })} placeholder="Quote" darkMode={darkMode} />
                <div className="grid grid-cols-2 gap-2.5">
                  <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Rating</span>
                    <select value={t.rating ?? 5} onChange={(e) => updateItem('testimonials', 'items', i, { rating: Number(e.target.value) })} className={inputCls(darkMode)}>
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
                    </select>
                  </div>
                  <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Trek</span>
                    <TextInput value={t.trek} onChange={(v) => updateItem('testimonials', 'items', i, { trek: v })} placeholder="Trek name" darkMode={darkMode} />
                  </div>
                </div>
              </ItemCard>
            ))}
            <AddBtn onClick={() => addItem('testimonials', 'items', { name: 'New Reviewer', role: 'Trekker', avatar: '', comment: '', rating: 5, trek: '' })} label="Add Testimonial" />
          </div>
        </Field>
      </Section>

      {/* FAQ */}
      <Section {...sectionProps('faq')} title="FAQ" subtitle="Questions & answers" visible={draft.faq.visible} onToggleVisible={(v) => setSection('faq', { visible: v })} onReset={() => resetSection('faq')}>
        <Field label="Heading"><TextInput value={draft.faq.heading} onChange={(v) => setSection('faq', { heading: v })} darkMode={darkMode} /></Field>
        <Field label="Subheading"><TextArea value={draft.faq.subheading} onChange={(v) => setSection('faq', { subheading: v })} darkMode={darkMode} rows={2} /></Field>
        <Field label="Questions">
          <div className="space-y-2.5">
            {draft.faq.items.map((f, i) => (
              <ItemCard key={i} index={i} count={draft.faq.items.length} onMove={(idx, d) => moveItem('faq', 'items', idx, d)} onRemove={(idx) => removeItem('faq', 'items', idx)} darkMode={darkMode}>
                <TextInput value={f.q} onChange={(v) => updateItem('faq', 'items', i, { q: v })} placeholder="Question" darkMode={darkMode} />
                <TextArea value={f.a} onChange={(v) => updateItem('faq', 'items', i, { a: v })} placeholder="Answer" darkMode={darkMode} />
              </ItemCard>
            ))}
            <AddBtn onClick={() => addItem('faq', 'items', { q: 'New question?', a: '' })} label="Add Question" />
          </div>
        </Field>
      </Section>

      {/* FOOTER */}
      <Section {...sectionProps('footer')} title="Footer" subtitle="Links + copyright" onReset={() => resetSection('footer')}>
        <Field label="Footer Links">
          <div className="space-y-2.5">
            {draft.footer.links.map((l, i) => (
              <ItemCard key={i} index={i} count={draft.footer.links.length} onMove={(idx, d) => moveItem('footer', 'links', idx, d)} onRemove={(idx) => removeItem('footer', 'links', idx)} darkMode={darkMode}>
                <div className="grid grid-cols-2 gap-2.5">
                  <TextInput value={l.label} onChange={(v) => updateItem('footer', 'links', i, { label: v })} placeholder="Label" darkMode={darkMode} />
                  <TextInput value={l.href} onChange={(v) => updateItem('footer', 'links', i, { href: v })} placeholder="#anchor" darkMode={darkMode} />
                </div>
              </ItemCard>
            ))}
            <AddBtn onClick={() => addItem('footer', 'links', { label: 'Link', href: '#features' })} label="Add Footer Link" />
          </div>
        </Field>
        <Field label="Copyright"><TextInput value={draft.footer.copyright} onChange={(v) => setSection('footer', { copyright: v })} darkMode={darkMode} /></Field>
        <Field label="Sub-text"><TextInput value={draft.footer.subtext} onChange={(v) => setSection('footer', { subtext: v })} darkMode={darkMode} /></Field>
      </Section>

      <div className="h-4" />
    </div>
  );
}
