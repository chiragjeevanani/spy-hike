import React from 'react';
import { Home, Compass, CalendarDays, Heart, User } from 'lucide-react';
import LiquidGlassNav from '../../../components/LiquidGlassNav';

const ACTIVE_CLASS = { light: 'text-forest-700', dark: 'text-elegant-orange' };

export default function BottomNav({ activeTab, onChangeTab, darkMode, wishlistCount }) {
  const tabs = [
    { id: 'Home', label: 'Home', icon: Home },
    { id: 'Explore', label: 'Explore', icon: Compass },
    { id: 'Bookings', label: 'Bookings', icon: CalendarDays },
    { id: 'Wishlist', label: 'Wishlist', icon: Heart, badge: wishlistCount },
    { id: 'Profile', label: 'Profile', icon: User },
  ];

  return (
    <LiquidGlassNav
      tabs={tabs}
      activeTab={activeTab}
      onChangeTab={onChangeTab}
      darkMode={darkMode}
      idPrefix="nav-tab-"
      activeClass={ACTIVE_CLASS}
    />
  );
}
