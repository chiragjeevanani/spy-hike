import React from 'react';
import { Check, Compass, Flame } from 'lucide-react';

const EXPERIENCE = [
  { id: 'Beginner', title: 'Finding my footing', detail: 'New to hiking or comfortable with short, easy trails.' },
  { id: 'Intermediate', title: 'Ready for more', detail: 'Regular hikes, uneven terrain, and longer days outdoors.' },
  { id: 'Advanced', title: 'Chasing summits', detail: 'Experienced with steep climbs and demanding multi-day treks.' },
];
const FITNESS = [
  { id: 'Low', title: 'An easy pace', detail: 'Light walks with regular breaks feel comfortable.' },
  { id: 'Moderate', title: 'Building endurance', detail: 'Regular exercise and a few hours of walking feel manageable.' },
  { id: 'High', title: 'Going the distance', detail: 'Sustained cardio, long climbs, and active days feel comfortable.' },
];

export default function AthleticsExperienceFields({ darkMode, experience, fitness, onExperienceChange, onFitnessChange }) {
  const groups = [
    { name: 'experience', label: 'Your trail experience', hint: 'Think about the trails you have already explored.', Icon: Compass, options: EXPERIENCE, value: experience, onChange: onExperienceChange },
    { name: 'fitness', label: 'Your current fitness', hint: 'Choose what feels right for you today.', Icon: Flame, options: FITNESS, value: fitness, onChange: onFitnessChange },
  ];
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-forest-800 to-forest-600 p-5 sm:p-6 text-white">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">Every adventure starts with you</p>
        <p className="mt-2 text-xl font-display font-bold">Find your comfortable pace.</p>
        <p className="mt-2 text-sm leading-relaxed text-white/80">Experience and fitness are different. Choose each independently, and update them as you grow.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-white/15 px-3 py-1.5">{experience || 'Choose experience'} hiker</span>
          <span className="rounded-full bg-white/15 px-3 py-1.5">{fitness || 'Choose fitness'} fitness</span>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {groups.map(({ name, label, hint, Icon, options, value, onChange }) => (
          <fieldset key={name} className="min-w-0">
            <legend className="flex items-center gap-2 text-sm font-bold"><Icon size={18} className="text-spy-orange" /> {label}</legend>
            <p className={`mt-2 mb-3 text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{hint}</p>
            <div className="space-y-3">
              {options.map(option => (
                <label key={option.id} className={`relative flex cursor-pointer gap-3 rounded-2xl border p-4 transition focus-within:ring-2 focus-within:ring-spy-orange ${value === option.id ? (darkMode ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-forest-500 bg-forest-50') : (darkMode ? 'border-white/10 bg-white/[0.02] hover:border-white/25' : 'border-zinc-200 bg-white hover:border-zinc-300')}`}>
                  <input type="radio" name={name} value={option.id} checked={value === option.id} onChange={() => onChange(option.id)} className="sr-only" aria-label={option.id} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-emerald-400' : 'text-forest-600'}`}>{option.id}</span>
                    <span className="mt-1 block text-sm font-bold">{option.title}</span>
                    <span className={`mt-1.5 block text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{option.detail}</span>
                  </span>
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${value === option.id ? 'border-forest-600 bg-forest-600 text-white' : (darkMode ? 'border-white/20' : 'border-zinc-300')}`}>{value === option.id && <Check size={12} />}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <p className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Changes are saved only when you press Save changes.</p>
    </div>
  );
}
