import React, { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

import {
  loadOrgUser,
  saveOrgUser,
  loadOrgTrips,
  loadOrgBookings,
  saveOrgBookings,
  loadOrgNotifications,
  saveOrgNotifications,
  loadOrgDarkMode,
  saveOrgDarkMode,
  loadOrgPayouts,
  saveOrgPayouts,
  loadOrgChats,
  saveOrgChats,
} from "./utils/storage";
import {
  syncOrganizerVouchers,
  markOrganizerVoucherUsed,
  hydrateOrganizerLoyalty,
} from "../../utils/loyalty";
import { resetPageScroll } from "../../utils/scroll";
import authApi from "../../lib/authApi";
import tripsApi from "../../lib/tripsApi";
import bookingsApi from "../../lib/bookingsApi";
import loyaltyApi from "../../lib/loyaltyApi";
import socialApi from "../../lib/socialApi";
import { getToken } from "../../lib/apiClient";
import { initPushNotifications } from "../../utils/pushNotifications";
import { useLivePoll, LIVE } from "../../utils/livePoll";
import {
  requestPushPermission,
  OrganizerAlerts,
} from "../../utils/pushNotificationService";
import { useToast } from "../../components/ToastProvider";
import ConfirmDialog from "../../components/ConfirmDialog";
import { safeSetItem } from "../../utils/safeStorage";

import OrgOnboarding from "./components/OrgOnboarding";
import OrgAuth from "./components/OrgAuth";
import PendingApprovalView from "./components/PendingApprovalView";
import NotFoundPage from "../../components/NotFoundPage";
import OrgBottomNav from "./components/OrgBottomNav";
import OrgDesktopNav from "./components/OrgDesktopNav";
import OrgDashboardView from "./components/OrgDashboardView";
import OrgTripsView from "./components/OrgTripsView";
import TripFormView from "./components/TripFormView";
import OrgBookingsView from "./components/OrgBookingsView";
import OrgProfileView from "./components/OrgProfileView";
import OrgLoyaltyView from "./components/OrgLoyaltyView";
import OrgNotificationsView from "./components/OrgNotificationsView";
import OrgFinancialsView from "./components/OrgFinancialsView";
import OrgCouponsView from "./components/OrgCouponsView";
import OrgScannerView from "./components/OrgScannerView";
import OrgChatsView from "./components/OrgChatsView";

// ─── Route helpers ───────────────────────────────────────────────────────────

const PATH_PREFIX = "/organizer";
// The traveller app (and its shared Traveller/Organizer login) now lives under /app.
const SHARED_LOGIN_PATH = "/app/login";

function getOrgTab(pathname) {
  const p = pathname.replace(PATH_PREFIX, "").replace(/^\//, "");
  if (!p || p === "" || p === "dashboard") return "Dashboard";
  if (p === "trips") return "Trips";
  if (p === "trips/new") return "NewTrip";
  if (p.startsWith("trips/") && p !== "trips/new") return "EditTrip";
  if (p === "bookings") return "Bookings";
  if (p === "profile") return "Profile";
  if (p === "register") return "Register";
  if (p === "pending") return "Pending";
  if (p === "onboarding") return "Onboarding";
  return "NotFound";
}

function tabToPath(tab, tripId = null) {
  if (tab === "Dashboard") return `${PATH_PREFIX}/dashboard`;
  if (tab === "Trips") return `${PATH_PREFIX}/trips`;
  if (tab === "NewTrip") return `${PATH_PREFIX}/trips/new`;
  if (tab === "EditTrip" && tripId) return `${PATH_PREFIX}/trips/${tripId}`;
  if (tab === "Bookings") return `${PATH_PREFIX}/bookings`;
  if (tab === "Profile") return `${PATH_PREFIX}/profile`;
  if (tab === "Register") return `${PATH_PREFIX}/register`;
  if (tab === "Pending") return `${PATH_PREFIX}/pending`;
  if (tab === "Onboarding") return `${PATH_PREFIX}/onboarding`;
  return `${PATH_PREFIX}/dashboard`;
}

// ─── Main organizer App ───────────────────────────────────────────────────────

export default function OrgApp() {
  const [darkMode, setDarkMode] = useState(loadOrgDarkMode());
  const [organizer, setOrganizer] = useState(loadOrgUser());
  const [activeTab, setActiveTab] = useState(() =>
    getOrgTab(window.location.pathname),
  );
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState(loadOrgNotifications());
  const [editingTrip, setEditingTrip] = useState(null);
  const [showOrgLoyalty, setShowOrgLoyalty] = useState(false);
  const [showOrgNotifications, setShowOrgNotifications] = useState(false);
  const [showOrgFinancials, setShowOrgFinancials] = useState(false);
  const [showOrgCoupons, setShowOrgCoupons] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showOrgChats, setShowOrgChats] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") === "chats" || Boolean(params.get("chatId"));
  });
  const [pendingOrgChatId, setPendingOrgChatId] = useState(() => {
    return new URLSearchParams(window.location.search).get("chatId") || null;
  });
  const [deleteTripTarget, setDeleteTripTarget] = useState(null);
  const toast = useToast();
  const [chats, setChats] = useState([]);
  const [payouts, setPayouts] = useState(loadOrgPayouts());
  const [navHidden, setNavHidden] = useState(false);

  // Load organizer-specific data. Trips + bookings come from the API for a
  // real (token-backed) session; both fall back to localStorage so the
  // seeded/offline paths keep working.
  const knownBookingIdsRef = useRef(null);
  const knownChatMsgCountRef = useRef(null);

  // Initial load for organizer data
  useEffect(() => {
    if (organizer?.isAuthenticated && organizer?.email) {
      if (organizer.isApproved) {
        tripsApi
          .listOrganizerTrips()
          .then(setTrips)
          .catch(() => setTrips(loadOrgTrips(organizer.email)));
        bookingsApi
          .listOrganizer()
          .then((list) => {
            if (Array.isArray(list) && list.length) setBookings(list);
          })
          .catch(() => {});
        if (getToken()) {
          bookingsApi
            .listPayouts()
            .then((list) => {
              if (Array.isArray(list)) setPayouts(list);
            })
            .catch(() => {});
        }
      }
      const orgBookings = loadOrgBookings(organizer.email);
      setBookings(orgBookings);

      const lifetimeBookings = Math.max(
        organizer.totalBookings || 0,
        orgBookings.length,
      );
      if (getToken()) {
        hydrateOrganizerLoyalty();
        socialApi
          .getOrganizerNotifications()
          .then((list) => {
            if (Array.isArray(list) && list.length) setNotifications(list);
          })
          .catch(() => {});
        socialApi
          .getOrganizerChats()
          .then((list) => {
            if (Array.isArray(list)) setChats(list);
          })
          .catch(() => {});
      } else {
        syncOrganizerVouchers(lifetimeBookings);
      }
      if (lifetimeBookings > (organizer.totalBookings || 0)) {
        const updated = { ...organizer, totalBookings: lifetimeBookings };
        saveOrgUser(updated);
        setOrganizer(updated);
      }
    }
  }, [organizer?.email, organizer?.isAuthenticated]);

  // Request browser push notification permission if supported
  useEffect(() => {
    if (organizer?.isAuthenticated && organizer?.isApproved)
      requestPushPermission();
  }, [organizer?.isAuthenticated, organizer?.isApproved]);

  // Live sync of Bookings, Messages and Notifications.
  //
  // Every read here passes LIVE (cache: false): these are the endpoints whose
  // whole point is to be current, and apiClient's 60s GET cache was otherwise
  // answering the poll with the same stale list — which is why a new booking
  // only showed up after the app was closed and reopened (a reload being the
  // one thing that clears that cache). useLivePoll also re-runs the moment the
  // app returns to the foreground, since a backgrounded webview's timers are
  // suspended.
  const pollLiveUpdates = useCallback(async () => {
    if (!getToken()) return;

    try {
      // 1. Live Sync Bookings
      const freshBookings = await bookingsApi.listOrganizer(LIVE);
      if (Array.isArray(freshBookings)) {
        if (knownBookingIdsRef.current !== null) {
          const newBookings = freshBookings.filter((b) => {
            const bId = b.id || b.bookingId || b._id;
            return bId && !knownBookingIdsRef.current.has(bId);
          });

          newBookings.forEach((newB) => {
            OrganizerAlerts.newBooking(newB, toast);
          });
        }

        const currentIds = new Set(
          freshBookings
            .map((b) => b.id || b.bookingId || b._id)
            .filter(Boolean),
        );
        knownBookingIdsRef.current = currentIds;
        setBookings(freshBookings);
        saveOrgBookings(freshBookings);
      }

      // 2. Live Sync Customer Chats & Messages
      const freshChats = await socialApi.getOrganizerChats(LIVE);
      if (Array.isArray(freshChats)) {
        if (knownChatMsgCountRef.current !== null) {
          freshChats.forEach((chat) => {
            const cId = String(chat.id || chat._id);
            const incomingUserMsgs = (chat.messages || []).filter(
              (m) => m.sender === "user",
            );
            const prevCount = knownChatMsgCountRef.current.get(cId) || 0;

            if (incomingUserMsgs.length > prevCount) {
              const latestUserMsg =
                incomingUserMsgs[incomingUserMsgs.length - 1];
              if (latestUserMsg) {
                const senderName = chat.userName || "Traveller";
                const msgText = latestUserMsg.text || "Sent a message";
                OrganizerAlerts.newMessage(senderName, msgText, toast);
              }
            }
          });
        }

        const newCounts = new Map();
        freshChats.forEach((c) => {
          const cId = String(c.id || c._id);
          const userMsgs = (c.messages || []).filter(
            (m) => m.sender === "user",
          );
          newCounts.set(cId, userMsgs.length);
        });
        knownChatMsgCountRef.current = newCounts;
        setChats(freshChats);
        saveOrgChats(freshChats);
      }

      // 3. Live Sync Notifications
      const freshNotifs = await socialApi.getOrganizerNotifications(LIVE);
      if (Array.isArray(freshNotifs)) {
        setNotifications(freshNotifs);
        saveOrgNotifications(freshNotifs);
      }
    } catch (err) {
      /* Ignore transient background network errors */
    }
  }, [organizer?.email, toast]);

  useLivePoll(pollLiveUpdates, {
    intervalMs: 5000,
    enabled: !!organizer?.isAuthenticated && !!organizer?.isApproved,
  });

  // History popstate — handle native hardware back button / swipe gestures for all overlays & modals
  useEffect(() => {
    const handlePop = () => {
      if (showOrgChats) {
        setShowOrgChats(false);
        return;
      }
      if (showOrgFinancials) {
        setShowOrgFinancials(false);
        return;
      }
      if (showOrgCoupons) {
        setShowOrgCoupons(false);
        return;
      }
      if (showOrgNotifications) {
        setShowOrgNotifications(false);
        return;
      }
      if (showOrgLoyalty) {
        setShowOrgLoyalty(false);
        return;
      }
      if (showScanner) {
        setShowScanner(false);
        return;
      }
      if (deleteTripTarget) {
        setDeleteTripTarget(null);
        return;
      }
      if (editingTrip) {
        setEditingTrip(null);
        return;
      }
      if (activeTab === "NewTrip" || activeTab === "EditTrip") {
        setActiveTab("Trips");
        return;
      }
      setActiveTab(getOrgTab(window.location.pathname));
    };

    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [
    showOrgChats,
    showOrgFinancials,
    showOrgCoupons,
    showOrgNotifications,
    showOrgLoyalty,
    showScanner,
    deleteTripTarget,
    editingTrip,
    activeTab,
  ]);

  // Dark mode
  useEffect(() => {
    saveOrgDarkMode(darkMode);
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // There's no organizer-specific login screen anymore — sign-in happens on the
  // single shared /login (Traveller/Organizer tabs), which hands off back here
  // once authenticated. Bounce anyone who lands here unauthenticated, except
  // the "Apply as Organizer" registration flow which still lives in this module.
  useEffect(() => {
    if (
      organizer.isOnboarded &&
      !organizer.isAuthenticated &&
      activeTab !== "Register"
    ) {
      window.location.href = SHARED_LOGIN_PATH;
    }
  }, [organizer.isOnboarded, organizer.isAuthenticated, activeTab]);

  // Opt into web push once signed in — no-ops silently if unsupported/denied.
  useEffect(() => {
    if (organizer.isAuthenticated) initPushNotifications();
  }, [organizer.isAuthenticated]);

  const openChats = () => {
    window.history.pushState({ modal: "chats" }, "");
    setShowOrgChats(true);
  };
  const openFinancials = () => {
    window.history.pushState({ modal: "financials" }, "");
    setShowOrgFinancials(true);
    refreshPayouts();
  };
  const openCoupons = () => {
    window.history.pushState({ modal: "coupons" }, "");
    setShowOrgCoupons(true);
  };
  const openLoyalty = () => {
    window.history.pushState({ modal: "loyalty" }, "");
    setShowOrgLoyalty(true);
  };
  const openNotifications = () => {
    window.history.pushState({ modal: "notifications" }, "");
    setShowOrgNotifications(true);
  };
  const openScanner = () => {
    window.history.pushState({ modal: "scanner" }, "");
    setShowScanner(true);
  };
  const closeCurrentOverlay = (setter) => {
    if (window.history.state?.modal) {
      window.history.back();
    } else {
      setter(false);
    }
  };

  const navigateTo = useCallback((tab, replace = false, tripId = null) => {
    // Open every page at the top, like a fresh screen, rather than wherever
    // the previous tab happened to be scrolled to.
    resetPageScroll();
    setShowOrgFinancials(false);
    setShowOrgCoupons(false);
    setShowOrgNotifications(false);
    setShowScanner(false);
    const path = tabToPath(tab, tripId);
    if (replace) {
      window.history.replaceState({ tab }, "", path);
    } else {
      window.history.pushState({ tab }, "", path);
    }
    if (path && path.startsWith("/organizer")) {
      safeSetItem("trekigo_last_route", path);
    }
    setActiveTab(tab);
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleOnboardingComplete = () => {
    const updated = { ...organizer, isOnboarded: true };
    saveOrgUser(updated);
    setOrganizer(updated);
    window.location.href = SHARED_LOGIN_PATH;
  };

  const handleAuthSuccess = (orgUser) => {
    setOrganizer(orgUser);
    if (!orgUser.isApproved && orgUser.isPendingApproval) {
      navigateTo("Pending", true);
    } else {
      tripsApi
        .listOrganizerTrips()
        .then(setTrips)
        .catch(() => setTrips(loadOrgTrips(orgUser.email)));
      setBookings(loadOrgBookings(orgUser.email));
      navigateTo("Dashboard", true);
    }
  };

  const handleLogout = () => {
    const reset = {
      ...organizer,
      isAuthenticated: false,
    };
    saveOrgUser(reset);
    setOrganizer(reset);
    setTrips([]);
    setBookings([]);

    // Also sign the shared traveller session out — otherwise the shared
    // /app/login screen sees an already-authenticated user and bounces
    // straight past the login form into the Traveller Home tab.
    try {
      const rawUser = localStorage.getItem("trekigo_user");
      if (rawUser) {
        const travellerUser = JSON.parse(rawUser);
        localStorage.setItem(
          "trekigo_user",
          JSON.stringify({ ...travellerUser, isAuthenticated: false }),
        );
      }
    } catch (e) {}

    window.location.href = SHARED_LOGIN_PATH;
  };

  // Auto-verify approval status from server on page load / refresh & poll if
  // pending, so an admin approval lands the organizer on their dashboard on its
  // own — no manual refresh.
  //
  // Reads /auth/organizer-status rather than /auth/me: it answers in organizer
  // terms whichever role the stored token is scoped to (a customer-scoped token
  // for the same unified account makes /auth/me return the *traveller* shape,
  // whose missing isApproved would demote an approved organizer back to
  // pending), and it re-mints an organizer token, healing exactly that case.
  // The call also bypasses the GET cache (see lib/authApi.js) — otherwise every
  // poll inside a 60s window replays the same stale "still pending" answer.
  useEffect(() => {
    if (!organizer?.isAuthenticated) return;

    const wasApproved = Boolean(organizer.isApproved);
    let cancelled = false;
    let announced = false; // one promotion toast per pending→approved transition

    const checkStatus = async () => {
      if (cancelled) return;
      try {
        if (!getToken()) return;
        const status = await authApi.getLinkedOrganizerStatus();
        // No organizer profile on this account (or an unreadable answer) —
        // leave the local session alone rather than corrupting it.
        if (cancelled || !status?.isOrganizer) return;

        const isNowApproved = Boolean(status.isApproved);
        const fresh = status.organizer || {};
        // Functional update: this runs on an interval, so merging into the
        // `organizer` captured at effect setup would undo anything edited since.
        setOrganizer((prev) => {
          const updated = {
            ...prev,
            ...fresh,
            isApproved: isNowApproved,
            isPendingApproval: !isNowApproved,
          };
          saveOrgUser(updated);
          return updated;
        });

        if (isNowApproved && !wasApproved && !announced) {
          announced = true;
          toast.success(
            "🎉 Your application has been approved! Welcome to Find Your Trek.",
          );
          tripsApi
            .listOrganizerTrips()
            .then((list) => {
              if (!cancelled) setTrips(list);
            })
            .catch(() => {});
          setBookings(loadOrgBookings(fresh.email || organizer.email));
          navigateTo("Dashboard", true);
        }
      } catch (err) {
        /* Ignore background network errors */
      }
    };

    // Run immediately on page load / mount
    checkStatus();

    if (organizer.isApproved)
      return () => {
        cancelled = true;
      };

    // Poll every 8 seconds while waiting for admin approval, and re-check the
    // moment the app comes back to the foreground — reopening the app should
    // reflect an approval that happened while it was closed, without waiting
    // out a poll tick.
    const timer = setInterval(checkStatus, 8000);
    const onWake = () => {
      if (document.visibilityState === "visible") checkStatus();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", checkStatus);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", checkStatus);
    };
  }, [
    organizer?.isAuthenticated,
    organizer?.email,
    organizer?.isApproved,
    navigateTo,
  ]);

  const handleToggleDarkMode = () => setDarkMode((p) => !p);

  // Re-fetch the real approval status from the API on "Check Status" click.
  const handleCheckApproval = async () => {
    try {
      const status = await authApi.getLinkedOrganizerStatus();
      if (!status?.isOrganizer) {
        toast.error("No organizer application found on this account.");
        return;
      }
      const fresh = status.organizer || {};
      const isNowApproved = Boolean(status.isApproved);
      const updated = {
        ...organizer,
        ...fresh,
        isApproved: isNowApproved,
        isPendingApproval: !isNowApproved,
      };
      saveOrgUser(updated);
      setOrganizer(updated);

      if (isNowApproved) {
        toast.success(
          "🎉 Your application has been approved! Welcome to Find Your Trek.",
        );
        tripsApi
          .listOrganizerTrips()
          .then(setTrips)
          .catch(() => {});
        setBookings(loadOrgBookings(updated.email));
        navigateTo("Dashboard", true);
      } else {
        toast.info(
          "Application still under review. We will notify you once approved.",
        );
      }
    } catch (e) {
      toast.error("Could not check status. Please verify connection.");
    }
  };

  // Re-fetch this organizer's trips from the API (source of truth).
  const refreshOrgTrips = useCallback(async () => {
    try {
      setTrips(await tripsApi.listOrganizerTrips());
    } catch {
      /* keep current state on transient failure */
    }
  }, []);

  // Re-fetch this organizer's payouts from the API (source of truth).
  const refreshPayouts = useCallback(async () => {
    if (!organizer.isAuthenticated) return;
    try {
      if (getToken()) {
        const list = await bookingsApi.listPayouts();
        if (Array.isArray(list)) {
          setPayouts(list);
          saveOrgPayouts(list);
        }
      } else {
        setPayouts(loadOrgPayouts());
      }
    } catch {
      setPayouts(loadOrgPayouts());
    }
  }, [organizer.isAuthenticated]);

  useEffect(() => {
    if (organizer.isAuthenticated) {
      refreshPayouts();
    }
  }, [organizer.isAuthenticated, activeTab, showOrgFinancials, refreshPayouts]);

  useEffect(() => {
    try {
      sessionStorage.setItem("fyt_last_module", "organizer");
      localStorage.setItem("fyt_last_module", "organizer");
    } catch (e) {}
  }, []);
  // passes the full form payload and the backend rebuilds the canonical trip.
  const handleSaveTrip = async (savedTrip) => {
    try {
      if (editingTrip?.id) {
        await tripsApi.updateTrip(editingTrip.id, savedTrip);
      } else {
        await tripsApi.createTrip(savedTrip);
      }
      await refreshOrgTrips();
      setEditingTrip(null);
      navigateTo("Trips", false);
      return true;
    } catch (err) {
      const detail = err?.details
        ? Object.values(err.details).join("\n")
        : err?.message;
      toast.error(`Could not save trip: ${detail || "Unknown error"}`);
      throw new Error(detail || err?.message || "Failed to save trip");
    }
  };

  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    navigateTo("EditTrip", false, trip.id);
  };

  const handleNewTrip = () => {
    setEditingTrip(null);
    navigateTo("NewTrip", false);
  };

  const handleToggleTripStatus = async (trip) => {
    const newStatus = trip.status === "Published" ? "Paused" : "Published";
    try {
      await tripsApi.setTripStatus(trip.id, newStatus);
      await refreshOrgTrips();
      toast.success(
        newStatus === "Published" ? "Trip published." : "Trip paused.",
      );
    } catch (err) {
      toast.error(
        `Could not update status: ${err?.message || "Unknown error"}`,
      );
    }
  };

  const handleDeleteTrip = (tripId) => setDeleteTripTarget(tripId);

  const confirmDeleteTrip = async () => {
    const tripId = deleteTripTarget;
    setDeleteTripTarget(null);
    try {
      await tripsApi.deleteTrip(tripId);
      await refreshOrgTrips();
      toast.success("Trip deleted.");
    } catch (err) {
      toast.error(`Could not delete trip: ${err?.message || "Unknown error"}`);
    }
  };

  // Applies an available zero-commission loyalty voucher to a specific
  // booking — the organizer keeps 100% of that booking's payout. Real sessions
  // redeem server-side (which verifies the voucher and zeroes commission);
  // offline/seeded falls back to the local ledger.
  const handleApplyLoyaltyReward = async (voucherId, bookingId) => {
    if (getToken()) {
      try {
        await loyaltyApi.organizerRedeemReward(bookingId);
        await refreshOrgTrips().catch(() => {});
        bookingsApi
          .listOrganizer()
          .then((list) => {
            if (list?.length) setBookings(list);
          })
          .catch(() => {});
        await hydrateOrganizerLoyalty();
        return;
      } catch (err) {
        toast.error(err?.message || "Could not apply reward.");
        return;
      }
    }
    markOrganizerVoucherUsed(voucherId, bookingId);
    const updated = bookings.map((b) =>
      b.id === bookingId || b.bookingId === bookingId
        ? { ...b, commissionAmount: 0, loyaltyRewardApplied: true }
        : b,
    );
    setBookings(updated);
    saveOrgBookings(updated);
  };

  const [autoEditProfile, setAutoEditProfile] = useState(false);

  const handleBottomNavChange = (tab) => navigateTo(tab);

  const handleDashboardNavigate = (tab, opts) => {
    if (tab === "NewTrip") {
      handleNewTrip();
      return;
    }
    if (tab === "Notifications") {
      setShowOrgNotifications(true);
      return;
    }
    if (opts?.edit || tab === "EditProfile") {
      setAutoEditProfile(true);
      navigateTo("Profile");
      return;
    }
    navigateTo(tab);
  };

  const handleMarkNotificationRead = (id) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    setNotifications(updated);
    saveOrgNotifications(updated);
    if (getToken()) socialApi.markOrganizerNotificationRead(id).catch(() => {});
  };

  const handleMarkAllNotificationsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    saveOrgNotifications(updated);
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    saveOrgNotifications([]);
  };

  // Reply in a customer↔organizer thread. Sends to the API and swaps in the
  // returned (authoritative) chat so the new message shows immediately.
  const handleSendOrgMessage = (chatId, text) => {
    if (!text?.trim()) return;
    socialApi
      .sendOrganizerMessage(chatId, text.trim())
      .then((chat) =>
        setChats((prev) => prev.map((c) => (c.id === chat.id ? chat : c))),
      )
      .catch((err) => toast.error(err?.message || "Could not send message."));
  };

  const handleMarkOrgChatRead = (chatId) => {
    setChats((prev) => {
      let changed = false;
      const updated = prev.map((c) => {
        if (String(c.id) === String(chatId)) {
          const hasUnread = (c.messages || []).some(
            (m) => m.sender === "user" && !m.read,
          );
          if (hasUnread) {
            changed = true;
            return {
              ...c,
              messages: (c.messages || []).map((m) =>
                m.sender === "user" ? { ...m, read: true } : m,
              ),
            };
          }
        }
        return c;
      });
      if (changed) {
        saveOrgChats(updated);
        if (getToken()) socialApi.markOrganizerChatRead(chatId).catch(() => {});
        return updated;
      }
      return prev;
    });
  };

  const handleSaveBankDetails = (bankDetails) => {
    const updated = { ...organizer, bankDetails };
    saveOrgUser(updated);
    setOrganizer(updated);
    // Persist to the API for a real session.
    if (getToken()) bookingsApi.saveBankDetails(bankDetails).catch(() => {});
  };

  // Requests a payout. A real session records it server-side (validated against
  // the available balance) and awaits admin settlement; the offline/seeded path
  // fakes the settlement delay.
  const handleRequestPayout = (amount) => {
    if (amount <= 0) return;

    if (getToken()) {
      bookingsApi
        .requestPayout(amount)
        .then(() => bookingsApi.listPayouts())
        .then((list) => {
          if (Array.isArray(list)) {
            setPayouts(list);
            saveOrgPayouts(list);
          }
          toast.success("Payout requested successfully!");
        })
        .catch((err) =>
          toast.error(err?.message || "Could not request payout."),
        );
      return;
    }

    const payoutId = `PO-${Date.now().toString().slice(-6)}`;
    const method = organizer?.bankDetails?.upiId?.trim()
      ? "UPI"
      : "Bank Transfer";
    const newPayout = {
      id: payoutId,
      amount,
      method,
      status: "Processing",
      requestedAt: new Date().toISOString(),
      completedAt: null,
      utr: null,
    };
    setPayouts((prev) => {
      const next = [...prev, newPayout];
      saveOrgPayouts(next);
      return next;
    });
    toast.success("Payout requested successfully!");
  };

  // ─── Routing render ────────────────────────────────────────────────────────

  const BOTTOM_NAV_TABS = ["Dashboard", "Trips", "Bookings", "Profile"];

  const renderContent = () => {
    // 1. Onboarding gate
    if (!organizer.isOnboarded) {
      return (
        <OrgOnboarding
          onComplete={handleOnboardingComplete}
          darkMode={darkMode}
        />
      );
    }

    // 2. Auth gate — sign-in lives on the shared /login now (redirected there by
    // the effect above); only the "Apply as Organizer" registration flow renders here.
    if (!organizer.isAuthenticated) {
      if (activeTab === "Register") {
        return (
          <OrgAuth
            onSuccess={handleAuthSuccess}
            onSwitchMode={() => {
              window.location.href = SHARED_LOGIN_PATH;
            }}
            darkMode={darkMode}
          />
        );
      }
      return null;
    }

    if (activeTab === "NotFound") {
      return (
        <NotFoundPage
          homePath="/organizer/dashboard"
          homeLabel="Return to Organizer Dashboard"
          darkMode={darkMode}
        />
      );
    }

    // 3. Pending approval
    if (organizer.isPendingApproval && !organizer.isApproved) {
      return (
        <PendingApprovalView
          organizer={organizer}
          onRefresh={handleCheckApproval}
          darkMode={darkMode}
        />
      );
    }

    // 4. Authenticated + approved — main app
    const mainContent = () => {
      if (showOrgFinancials) {
        return (
          <OrgFinancialsView
            organizer={organizer}
            bookings={bookings}
            payouts={payouts}
            onSaveBankDetails={handleSaveBankDetails}
            onRequestPayout={handleRequestPayout}
            onBack={() => closeCurrentOverlay(setShowOrgFinancials)}
            darkMode={darkMode}
          />
        );
      }

      if (showOrgCoupons) {
        return (
          <OrgCouponsView
            onBack={() => closeCurrentOverlay(setShowOrgCoupons)}
            darkMode={darkMode}
          />
        );
      }

      if (showOrgNotifications) {
        return (
          <OrgNotificationsView
            notifications={notifications}
            onMarkRead={handleMarkNotificationRead}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onClear={handleClearNotifications}
            onBack={() => closeCurrentOverlay(setShowOrgNotifications)}
            onNavigateTab={(tab) => {
              closeCurrentOverlay(setShowOrgNotifications);
              navigateTo(tab);
            }}
            darkMode={darkMode}
          />
        );
      }

      if (activeTab === "NewTrip") {
        return (
          <TripFormView
            trip={null}
            existingTrips={trips}
            onEditExistingTrip={(existingTrip) => {
              setEditingTrip(existingTrip);
              setActiveTab("EditTrip");
            }}
            organizer={organizer}
            organizerEmail={organizer.email}
            onSave={handleSaveTrip}
            onBack={() => navigateTo("Trips")}
            darkMode={darkMode}
          />
        );
      }
      if (activeTab === "EditTrip") {
        return (
          <TripFormView
            trip={editingTrip}
            existingTrips={trips}
            onEditExistingTrip={(existingTrip) => {
              setEditingTrip(existingTrip);
              setActiveTab("EditTrip");
            }}
            organizer={organizer}
            organizerEmail={organizer.email}
            onSave={handleSaveTrip}
            onBack={() => navigateTo("Trips")}
            darkMode={darkMode}
          />
        );
      }

      const tabContent = {
        Dashboard: (
          <OrgDashboardView
            organizer={organizer}
            trips={trips}
            bookings={bookings}
            notifications={notifications}
            onNavigate={handleDashboardNavigate}
            onViewTrip={handleEditTrip}
            onOpenLoyalty={openLoyalty}
            onOpenFinancials={openFinancials}
            onApproveReschedule={(bookingId) => {
              setBookings((prev) =>
                prev.map((b) =>
                  b.id === bookingId || b.bookingId === bookingId
                    ? {
                        ...b,
                        selectedDate: b.requestedDate || b.selectedDate,
                        rescheduleStatus: "Approved",
                        requestedDate: null,
                      }
                    : b,
                ),
              );
              toast.success("Reschedule request approved! Batch date updated.");
            }}
            onRejectReschedule={(bookingId, reason) => {
              setBookings((prev) =>
                prev.map((b) =>
                  b.id === bookingId || b.bookingId === bookingId
                    ? {
                        ...b,
                        rescheduleStatus: "Rejected",
                        rejectionReason: reason,
                      }
                    : b,
                ),
              );
              toast.error("Reschedule request declined.");
            }}
            onOpenScanner={openScanner}
            onOpenChats={openChats}
            chats={chats}
            darkMode={darkMode}
          />
        ),
        Trips: (
          <OrgTripsView
            trips={trips}
            onNewTrip={handleNewTrip}
            onEditTrip={handleEditTrip}
            onToggleStatus={handleToggleTripStatus}
            onDeleteTrip={handleDeleteTrip}
            darkMode={darkMode}
          />
        ),
        Bookings: (
          <OrgBookingsView
            bookings={bookings}
            onApplyLoyaltyReward={handleApplyLoyaltyReward}
            darkMode={darkMode}
          />
        ),
        Profile: (
          <OrgProfileView
            organizer={organizer}
            onLogout={handleLogout}
            onOpenLoyalty={openLoyalty}
            onOpenFinancials={openFinancials}
            onOpenCoupons={openCoupons}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
            onFullscreenChange={setNavHidden}
            autoEditProfile={autoEditProfile}
            onClearAutoEdit={() => setAutoEditProfile(false)}
          />
        ),
      };

      return tabContent[activeTab] || tabContent["Dashboard"];
    };

    const showBottomNav = BOTTOM_NAV_TABS.includes(activeTab) && !navHidden;
    const unreadNotifs = notifications.filter((n) => !n.read).length;
    const unreadChats = chats.reduce(
      (s, c) =>
        s +
        (c.messages || []).filter((m) => m.sender === "user" && !m.read).length,
      0,
    );

    const handleSwitchToTraveller = () => {
      localStorage.setItem("trekigo_active_role", "hiker");
      window.location.href = "/app";
    };

    return (
      <>
        {organizer.isAuthenticated &&
          !organizer.isPendingApproval &&
          !navHidden && (
            <OrgDesktopNav
              activeTab={
                activeTab === "NewTrip" || activeTab === "EditTrip"
                  ? "Trips"
                  : activeTab
              }
              onChangeTab={handleBottomNavChange}
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
              unreadChats={unreadChats}
              onOpenChats={openChats}
              unreadNotifs={unreadNotifs}
              onOpenNotifications={openNotifications}
              onOpenScanner={openScanner}
              organizer={organizer}
              onSwitchToTraveller={handleSwitchToTraveller}
            />
          )}

        {/* pb clears the now-`fixed` OrgBottomNav on mobile so a page's last
            bit of content never sits underneath it. */}
        <div
          className={`flex-1 relative overflow-y-auto flex flex-col ${showBottomNav ? "pb-20 md:pb-0" : ""}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              // overflow-hidden properly bounds this to the space the flex-1
              // parent actually has (per the flexbox min-height:auto rule) —
              // without it, a page that swaps to an internal sub-view purely
              // via local state (e.g. Profile -> Help & Support, which never
              // touches `activeTab` so this whole node never remounts) grows
              // this box to fit content instead, pushing the *outer*,
              // never-remounted wrapper into being the actual scroller —
              // and that one keeps whatever scrollTop the previous view left
              // it at, which is exactly why the new sub-view opened already
              // scrolled partway down.
              className="flex-1 flex flex-col overflow-hidden"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{ willChange: "opacity, transform" }}>
              {mainContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {showBottomNav && (
          <div className="md:hidden shrink-0">
            <OrgBottomNav
              activeTab={activeTab}
              onChangeTab={handleBottomNavChange}
              darkMode={darkMode}
            />
          </div>
        )}

        {/* Loyalty Rewards full-screen overlay */}
        <AnimatePresence>
          {showOrgLoyalty && (
            <motion.div
              key="overlay-org-loyalty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{ willChange: "opacity, transform" }}
              className={`fixed inset-0 z-50 flex flex-col ${darkMode ? "bg-zinc-950" : "bg-[#FAF8F2]"}`}>
              <div className="max-w-5xl mx-auto w-full h-full flex flex-col">
                <OrgLoyaltyView
                  organizer={organizer}
                  onBack={() => closeCurrentOverlay(setShowOrgLoyalty)}
                  onGoBookings={() => {
                    closeCurrentOverlay(setShowOrgLoyalty);
                    navigateTo("Bookings");
                  }}
                  darkMode={darkMode}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanner floating modal dialog */}
        <AnimatePresence>
          {showScanner && (
            <motion.div
              key="overlay-org-scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-hidden"
              onClick={() => closeCurrentOverlay(setShowScanner)}>
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 14 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 14 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg max-h-[90vh] flex flex-col my-auto"
                onClick={(e) => e.stopPropagation()}>
                <OrgScannerView
                  organizer={organizer}
                  trips={trips}
                  onBack={() => closeCurrentOverlay(setShowScanner)}
                  darkMode={darkMode}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages full-screen overlay — customer↔organizer chat threads */}
        <AnimatePresence>
          {showOrgChats && (
            <motion.div
              key="overlay-org-chats"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{ willChange: "opacity, transform" }}
              className={`fixed inset-0 z-50 flex flex-col ${darkMode ? "bg-zinc-950" : "bg-[#FAF8F2]"}`}>
              <div className="max-w-5xl mx-auto w-full h-full flex flex-col min-h-0">
                <OrgChatsView
                  chats={chats}
                  initialChatId={pendingOrgChatId}
                  onSendMessage={handleSendOrgMessage}
                  onMarkRead={handleMarkOrgChatRead}
                  onBack={() => {
                    setPendingOrgChatId(null);
                    closeCurrentOverlay(setShowOrgChats);
                  }}
                  darkMode={darkMode}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  };

  return (
    <div
      id="findyourtrek-org-root"
      // No overflow-x-hidden — #root (index.css) already clips horizontal
      // overflow for the whole app; setting only that one axis here forces
      // overflow-y to compute as 'auto' per the CSS overflow spec even when
      // left unset, silently making this div its own accidental scroll
      // container outside #root's overscroll-behavior/background fixes.
      className={`min-h-screen w-full flex flex-col transition-colors duration-300 relative ${
        darkMode
          ? "bg-elegant-bg text-elegant-text"
          : "bg-[#FAF8F2] text-zinc-900"
      }`}>
      {/* Ambient background glows for rich aesthetic */}
      {darkMode && (
        <>
          <div className="fixed top-[-150px] right-[-100px] w-[600px] h-[600px] bg-[#163321] rounded-full blur-[160px] opacity-35 pointer-events-none z-0" />
          <div className="fixed bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#F27D26] rounded-full blur-[180px] opacity-15 pointer-events-none z-0" />
        </>
      )}

      {/* Main Responsive App Viewport Container */}
      <div
        id="findyourtrek-org-viewport"
        className={`relative w-full flex-1 flex flex-col transition-all duration-300 z-10 ${
          darkMode
            ? "bg-elegant-app text-white"
            : "bg-transparent text-zinc-900"
        }`}>
        <div className="flex-1 flex flex-col relative w-full">
          {renderContent()}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTripTarget}
        title="Delete Trip?"
        message="This permanently removes this trip listing. This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={confirmDeleteTrip}
        onCancel={() => setDeleteTripTarget(null)}
        darkMode={darkMode}
      />
    </div>
  );
}
