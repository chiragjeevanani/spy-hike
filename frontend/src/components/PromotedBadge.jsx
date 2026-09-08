/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Crown } from 'lucide-react';

// The shared "promoted partner" visual language — a warm gold ring + glow,
// deliberately distinct from the app's orange brand accent (#F27D26) so a
// boosted card reads as its own premium tier rather than "another orange
// thing". Append PROMOTED_RING_CLASS onto a card's existing className when
// `isPromoted` is true; drop <PromotedBadge/> wherever that card also has
// room for a small pill. Holds contrast in both themes without needing a
// dark: variant.
export const PROMOTED_RING_CLASS =
  'ring-2 ring-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.18),0_10px_28px_-10px_rgba(217,119,6,0.55)]';

export default function PromotedBadge({ size = 'sm', className = '' }) {
  const sizeCls = size === 'md' ? 'text-[10px] px-2.5 py-1 gap-1.5' : 'text-[9px] px-2 py-0.5 gap-1';
  return (
    <span
      className={`inline-flex items-center ${sizeCls} rounded-full font-black uppercase tracking-wider text-amber-900 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 shadow-sm ${className}`}
    >
      <Crown size={size === 'md' ? 12 : 10} className="fill-amber-900/25 shrink-0" />
      Promoted
    </span>
  );
}
