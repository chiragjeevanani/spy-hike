import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Compass,
  Mountain,
  ClipboardList,
  Ticket,
  TicketPercent,
  BarChart3,
  Megaphone,
  Gift,
  Settings,
  LogOut,
  Shield,
  ChevronLeft,
  Menu,
  Banknote,
  LayoutTemplate,
  ShieldCheck,
  Sparkles,
  Image as ImageIcon,
  Crown,
  Flame,
} from "lucide-react";
import { loadAllOrganizers } from "../utils/storage";
import { getToken } from "../../../lib/apiClient";
import trekRequestsApi from "../../../lib/trekRequestsApi";
import promotionsApi from "../../../lib/promotionsApi";
import ConfirmDialog from "../../../components/ConfirmDialog";
import AppLogo from "../../../components/AppLogo";

export default function AdminSidebar({
  activeTab,
  onSelectTab,
  onLogout,
  collapsed,
  setCollapsed,
  darkMode,
  mobileOpen,
  onCloseMobile,
}) {
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [pendingPromotionCount, setPendingPromotionCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Compute pending applications dynamically
  useEffect(() => {
    const checkPending = () => {
      const orgs = loadAllOrganizers();
      const pending = orgs.filter((o) => o.isPendingApproval && !o.isApproved);
      setPendingCount(pending.length);
    };
    const checkPendingRequests = () => {
      if (!getToken()) return;
      trekRequestsApi
        .listAll({ status: "Pending" })
        .then((list) =>
          setPendingRequestCount(Array.isArray(list) ? list.length : 0),
        )
        .catch(() => {});
    };
    const checkPendingPromotions = () => {
      if (!getToken()) return;
      promotionsApi
        .listAll({ status: "Pending" })
        .then((list) =>
          setPendingPromotionCount(Array.isArray(list) ? list.length : 0),
        )
        .catch(() => {});
    };

    checkPending();
    checkPendingRequests();
    checkPendingPromotions();
    // Poll every 30 seconds to keep dashboard badge updated without excessive API calls
    const interval = setInterval(() => {
      checkPending();
      checkPendingRequests();
      checkPendingPromotions();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "Users", label: "Users", icon: Users },
    {
      id: "Organizers",
      label: "Organizers",
      icon: Building2,
      badge: pendingCount,
    },
    {
      id: "Promotions",
      label: "Promotion Requests",
      icon: Crown,
      badge: pendingPromotionCount,
    },
    {
      id: "PromotedOrganizers",
      label: "Promoted Organizers",
      icon: Flame,
    },
    { id: "Treks", label: "Trek Categories", icon: Mountain },
    {
      id: "TrekRequests",
      label: "Category Requests",
      icon: ClipboardList,
      badge: pendingRequestCount,
    },
    { id: "Trips", label: "Trips", icon: Compass },
    { id: "Bookings", label: "Bookings", icon: Ticket },
    { id: "Payouts", label: "Payouts", icon: Banknote },
    { id: "Coupons", label: "Coupons", icon: TicketPercent },
    { id: "Analytics", label: "Analytics", icon: BarChart3 },
    { id: "Broadcast", label: "Broadcast", icon: Megaphone },
    { id: "Loyalty", label: "Loyalty", icon: Gift },
    { id: "Banners", label: "Home Banners", icon: ImageIcon },
    { id: "Landing", label: "Landing Page", icon: LayoutTemplate },
    { id: "Legal", label: "Legal & Support", icon: ShieldCheck },
    { id: "OnboardingCMS", label: "Onboarding CMS", icon: Sparkles },
    { id: "Settings", label: "Settings", icon: Settings },
  ];

  const handleSelectNav = (id) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      <div
        className={`h-screen sticky top-0 flex flex-col border-r transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] z-45 shrink-0 ${
          darkMode
            ? "bg-[#0E162F] border-slate-800 text-slate-200"
            : "bg-white border-slate-200 text-slate-700"
        } ${collapsed ? "w-20" : "w-64"} ${
          mobileOpen
            ? "fixed inset-y-0 left-0 z-50 w-72 flex shadow-2xl translate-x-0"
            : "hidden md:flex"
        }`}>
        {/* Sidebar Header Brand */}
        <div
          className={`p-5 flex items-center border-b ${
            collapsed ? "justify-center" : "justify-between"
          } ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
          <div
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center cursor-pointer active:scale-95 transition-transform overflow-hidden"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <AppLogo
              size={36}
              className="shrink-0 transition-transform duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-105 active:scale-95"
            />
            <div
              className={`transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden flex flex-col select-none ${
                collapsed
                  ? "max-w-0 opacity-0 scale-90 translate-x-[-10px] ml-0"
                  : "max-w-[150px] opacity-100 scale-100 translate-x-0 ml-3"
              }`}>
              <span className="font-display font-black text-sm tracking-tight text-slate-800 dark:text-white leading-none whitespace-nowrap">
                Find Your Trek
              </span>
              <span className="text-[10px] font-bold text-[#F27D26] uppercase tracking-wider mt-1 whitespace-nowrap">
                Admin Console
              </span>
            </div>
          </div>

          {/* Toggle Collapse - only show when not collapsed */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className={`p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                darkMode
                  ? "border-slate-800 bg-slate-900 text-slate-400"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}>
              <ChevronLeft
                size={16}
                className="transition-transform duration-300"
              />
            </button>
          )}
        </div>

        {/* Nav List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectNav(item.id)}
                className={`flex items-center text-sm font-semibold tracking-wide transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] group relative ${
                  collapsed
                    ? "justify-center mx-auto w-12 h-12 rounded-2xl"
                    : "w-full justify-start px-3.5 py-3 gap-3.5 rounded-xl"
                } ${
                  isActive
                    ? "bg-[#F27D26] text-white shadow-lg shadow-orange-500/15"
                    : darkMode
                      ? "hover:bg-slate-800/60 text-slate-400 hover:text-slate-100"
                      : "hover:bg-slate-50 text-slate-600 hover:text-[#F27D26]"
                }`}>
                <Icon
                  size={18}
                  className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-white" : ""}`}
                />

                <span
                  className={`transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden whitespace-nowrap ${
                    collapsed
                      ? "max-w-0 opacity-0 scale-90 translate-x-[-10px]"
                      : "max-w-[150px] opacity-100 scale-100 translate-x-0"
                  }`}>
                  {item.label}
                </span>

                {/* Pending Badge */}
                {item.badge > 0 && !collapsed && (
                  <span
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-black ${
                      isActive
                        ? "bg-white text-[#F27D26]"
                        : "bg-rose-500 text-white animate-pulse"
                    }`}>
                    {item.badge}
                  </span>
                )}

                {/* Tooltip on Collapsed */}
                {collapsed && (
                  <div className="absolute left-20 bg-slate-900 text-white text-xs font-bold px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-md translate-x-2 group-hover:translate-x-0 z-50 whitespace-nowrap">
                    {item.label}
                    {item.badge > 0 && ` (${item.badge})`}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div
          className={`p-4 border-t ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold tracking-wide transition-colors group relative ${
              darkMode
                ? "hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"
                : "hover:bg-rose-50 text-slate-600 hover:text-rose-600"
            }`}>
            <LogOut
              size={18}
              className="shrink-0 group-hover:translate-x-0.5 transition-transform"
            />
            {!collapsed && <span className="animate-fadeIn">Logout</span>}

            {collapsed && (
              <div className="absolute left-20 bg-rose-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-md translate-x-2 group-hover:translate-x-0 z-50 whitespace-nowrap">
                Logout
              </div>
            )}
          </button>
        </div>

        <ConfirmDialog
          open={showLogoutConfirm}
          title="Log Out?"
          message="Are you sure you want to log out of the admin console?"
          confirmLabel="Log Out"
          onConfirm={() => {
            setShowLogoutConfirm(false);
            onLogout();
          }}
          onCancel={() => setShowLogoutConfirm(false)}
          darkMode={darkMode}
        />
      </div>
    </>
  );
}
