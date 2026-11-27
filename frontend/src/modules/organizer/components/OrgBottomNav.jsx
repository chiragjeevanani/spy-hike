import React from 'react';
import { LayoutDashboard, Map, CalendarCheck, User } from 'lucide-react';
import LiquidGlassNav from '../../../components/LiquidGlassNav';

const TABS = [
  { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'Trips', label: 'My Trips', icon: Map },
  { id: 'Bookings', label: 'Bookings', icon: CalendarCheck },
  { id: 'Profile', label: 'Profile', icon: User },
];

const ACTIVE_CLASS = { light: 'text-spy-orange', dark: 'text-spy-orange' };

// Same floating liquid-glass bar as the hiker app (fixed to the viewport and
// lifted above Android's on-screen nav buttons via safe-area-inset-bottom).
export default function OrgBottomNav({ activeTab, onChangeTab, darkMode }) {
  return (
    <LiquidGlassNav
      tabs={TABS}
      activeTab={activeTab}
      onChangeTab={onChangeTab}
      darkMode={darkMode}
      idPrefix="org-nav-tab-"
      activeClass={ACTIVE_CLASS}
    />
  );
}
