/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PhoneFrame from './components/PhoneFrame';
import BottomNav from './components/BottomNav';
import Onboarding from './components/Onboarding';
import Auth from './components/Auth';
import HomeView from './components/HomeView';
import ExploreView from './components/ExploreView';
import TripDetailsView from './components/TripDetailsView';
import BookingFlow from './components/BookingFlow';
import BookingsView from './components/BookingsView';
import WishlistView from './components/WishlistView';
import ProfileView from './components/ProfileView';
import BookingDetailsView from './components/BookingDetailsView';
import OrganizerProfileView from './components/OrganizerProfileView';

import {
  loadUserState, saveUserState,
  loadWishlist, saveWishlist,
  loadBookings, saveBookings,
  loadNotifications, saveNotifications,
  loadChats, saveChats,
  loadTrips, saveTrips,
  loadDarkMode, saveDarkMode
} from './utils/storage';

const getInitialStateFromUrl = () => {
  const path = window.location.pathname;
  const user = loadUserState();
  
  let tab = 'Home';
  let trip = null;
  let bookingTrip = null;
  let selectedBooking = null;
  let selectedOrganizer = null;

  // 1. Onboarding Gate redirect rules
  if (!user.isOnboarded) {
    tab = 'Onboarding';
    if (path !== '/onboardingguide') {
      window.history.replaceState({ path: '/onboardingguide' }, '', '/onboardingguide');
    }
    return { tab, trip, bookingTrip, selectedBooking, selectedOrganizer };
  }

  // 2. Auth Gate redirect rules
  if (!user.isAuthenticated) {
    if (path === '/register') {
      tab = 'Register';
    } else {
      tab = 'Login';
      if (path !== '/login') {
        window.history.replaceState({ path: '/login' }, '', '/login');
      }
    }
    return { tab, trip, bookingTrip, selectedBooking, selectedOrganizer };
  }

  // 3. Authenticated & Onboarded redirect rules
  if (path === '/login' || path === '/register' || path === '/onboardingguide') {
    window.history.replaceState({ path: '/' }, '', '/');
    return { tab: 'Home', trip, bookingTrip, selectedBooking, selectedOrganizer };
  }

  // 4. Normal Tab / Detail routing parsing
  const allTrips = loadTrips();
  const allBookings = loadBookings();

  if (path === '/explore') {
    tab = 'Explore';
  } else if (path === '/bookings') {
    tab = 'Bookings';
  } else if (path === '/wishlist') {
    tab = 'Wishlist';
  } else if (path === '/profile') {
    tab = 'Profile';
  } else if (path.startsWith('/trip/')) {
    const tripId = path.replace('/trip/', '');
    const foundTrip = allTrips.find(t => t.id === tripId);
    if (foundTrip) {
      tab = 'Explore';
      trip = foundTrip;
    }
  } else if (path.startsWith('/book/')) {
    const tripId = path.replace('/book/', '');
    const foundTrip = allTrips.find(t => t.id === tripId);
    if (foundTrip) {
      tab = 'Explore';
      trip = foundTrip;
      bookingTrip = foundTrip;
    }
  } else if (path.startsWith('/booking/')) {
    const bookingId = path.replace('/booking/', '');
    const foundBooking = allBookings.find(b => b.id === bookingId);
    if (foundBooking) {
      tab = 'Bookings';
      selectedBooking = foundBooking;
    }
  } else if (path.startsWith('/organizer/')) {
    const orgNameEncoded = path.replace('/organizer/', '');
    const orgName = decodeURIComponent(orgNameEncoded);
    const foundTrip = allTrips.find(t => t.organizer.name === orgName);
    if (foundTrip) {
      tab = 'Explore';
      selectedOrganizer = foundTrip.organizer;
    }
  }
  return { tab, trip, bookingTrip, selectedBooking, selectedOrganizer };
};

export default function App() {
  // 1. Core State registers loaded from local persistence
  const [user, setUser] = useState(() => loadUserState());
  const [wishlist, setWishlist] = useState(() => loadWishlist());
  const [bookings, setBookings] = useState(() => loadBookings());
  const [notifications, setNotifications] = useState(() => loadNotifications());
  const [chats, setChats] = useState(() => loadChats());
  const [trips, setTrips] = useState(() => loadTrips());
  const [darkMode, setDarkMode] = useState(() => loadDarkMode());

  // 2. Navigation registers initialized from URL
  const [activeTab, setActiveTab] = useState(() => getInitialStateFromUrl().tab);
  const [selectedTrip, setSelectedTrip] = useState(() => getInitialStateFromUrl().trip);
  const [activeBookingTrip, setActiveBookingTrip] = useState(() => getInitialStateFromUrl().bookingTrip);
  const [selectedBooking, setSelectedBooking] = useState(() => getInitialStateFromUrl().selectedBooking);
  const [selectedOrganizer, setSelectedOrganizer] = useState(() => getInitialStateFromUrl().selectedOrganizer);

  // 3. Search & Filter dynamic bindings to propagate to Explore tab
  const [exploreSearchQuery, setExploreSearchQuery] = useState('');
  const [exploreCategory, setExploreCategory] = useState('All');

  const navigateTo = (path, replace = false, currentUser = user) => {
    if (replace) {
      window.history.replaceState({ path }, '', path);
    } else {
      window.history.pushState({ path }, '', path);
    }
    handleRouteChange(currentUser);
  };

  const handleRouteChange = (currentUser = user) => {
    const path = window.location.pathname;
    
    // Redirect rules based on user auth/onboard states
    if (!currentUser.isOnboarded) {
      setActiveTab('Onboarding');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
      if (path !== '/onboardingguide') {
        navigateTo('/onboardingguide', true, currentUser);
      }
      return;
    }

    if (!currentUser.isAuthenticated) {
      if (path === '/register') {
        setActiveTab('Register');
        setSelectedTrip(null);
        setActiveBookingTrip(null);
        setSelectedBooking(null);
        setSelectedOrganizer(null);
      } else {
        setActiveTab('Login');
        setSelectedTrip(null);
        setActiveBookingTrip(null);
        setSelectedBooking(null);
        setSelectedOrganizer(null);
        if (path !== '/login') {
          navigateTo('/login', true, currentUser);
        }
      }
      return;
    }

    // Authenticated & Onboarded: Redirect away from auth/onboard pages
    if (path === '/login' || path === '/register' || path === '/onboardingguide') {
      navigateTo('/', true, currentUser);
      return;
    }

    // Normal paths parsing
    if (path === '/' || path === '') {
      setActiveTab('Home');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
    } else if (path === '/explore') {
      setActiveTab('Explore');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
    } else if (path === '/bookings') {
      setActiveTab('Bookings');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
    } else if (path === '/wishlist') {
      setActiveTab('Wishlist');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
    } else if (path === '/profile') {
      setActiveTab('Profile');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
    } else if (path.startsWith('/trip/')) {
      const tripId = path.replace('/trip/', '');
      const foundTrip = trips.find(t => t.id === tripId);
      if (foundTrip) {
        setSelectedTrip(foundTrip);
        setActiveBookingTrip(null);
        setSelectedBooking(null);
        setSelectedOrganizer(null);
      } else {
        navigateTo('/', true, currentUser);
      }
    } else if (path.startsWith('/book/')) {
      const tripId = path.replace('/book/', '');
      const foundTrip = trips.find(t => t.id === tripId);
      if (foundTrip) {
        setSelectedTrip(foundTrip);
        setActiveBookingTrip(foundTrip);
        setSelectedBooking(null);
        setSelectedOrganizer(null);
      } else {
        navigateTo('/', true, currentUser);
      }
    } else if (path.startsWith('/booking/')) {
      const bookingId = path.replace('/booking/', '');
      const foundBooking = bookings.find(b => b.id === bookingId);
      if (foundBooking) {
        setActiveTab('Bookings');
        setSelectedTrip(null);
        setActiveBookingTrip(null);
        setSelectedBooking(foundBooking);
        setSelectedOrganizer(null);
      } else {
        navigateTo('/bookings', true, currentUser);
      }
    } else if (path.startsWith('/organizer/')) {
      const orgNameEncoded = path.replace('/organizer/', '');
      const orgName = decodeURIComponent(orgNameEncoded);
      const foundTrip = trips.find(t => t.organizer.name === orgName);
      if (foundTrip) {
        setSelectedOrganizer(foundTrip.organizer);
        setSelectedTrip(null);
        setActiveBookingTrip(null);
        setSelectedBooking(null);
      } else {
        navigateTo('/', true, currentUser);
      }
    } else {
      navigateTo('/', true, currentUser);
    }
  };

  useEffect(() => {
    const onPopState = () => handleRouteChange();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [trips, bookings, user]);

  // Sync state mutations to LocalStorage standard hooks
  useEffect(() => {
    saveUserState(user);
  }, [user]);

  useEffect(() => {
    saveWishlist(wishlist);
  }, [wishlist]);

  useEffect(() => {
    saveBookings(bookings);
  }, [bookings]);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  useEffect(() => {
    saveTrips(trips);
  }, [trips]);

  useEffect(() => {
    saveDarkMode(darkMode);
  }, [darkMode]);

  // Core Actions
  const handleToggleWishlist = (tripId) => {
    const isSaved = wishlist.includes(tripId);
    if (isSaved) {
      setWishlist(prev => prev.filter(id => id !== tripId));
    } else {
      setWishlist(prev => [...prev, tripId]);
    }
  };

  const handleApplyCategoryFromHome = (catName) => {
    setExploreCategory(catName);
    setExploreSearchQuery(''); // clear main search query to prevent clash
  };

  const handleApplySearchFromHome = (query) => {
    setExploreSearchQuery(query);
    setExploreCategory('All'); // clear category to prevent block
  };

  // Complete Onboarding walkthrough helper
  const handleCompleteOnboardingWalkthrough = () => {
    const updated = {
      ...user,
      isOnboarded: true
    };
    setUser(updated);
    navigateTo('/login', false, updated);
  };

  // Sign In success
  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    navigateTo('/', false, authenticatedUser);
  };

  // Logout session resets
  const handleLogoutResets = () => {
    setUser({
      isAuthenticated: false,
      isOnboarded: false,
      name: '',
      email: '',
      mobile: '',
      age: 24,
      gender: '',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      hikingExperience: 'Beginner',
      fitnessLevel: 'Moderate',
      emergencyContact: '',
      rememberMe: false
    });
    // Return view to initial tab
    navigateTo('/', true);
  };

  // Add review to data dynamically so it displays inside reviews tab instantly
  const handleAddReviewToTrip = (tripId, rating, comment) => {
    const newRatingReview = {
      id: 'rev-' + Date.now(),
      userName: user.name || 'Chirag Jeevanani',
      userAvatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      rating,
      comment,
      date: new Date().toISOString().split('T')[0]
    };

    const updatedTrips = trips.map(item => {
      if (item.id === tripId) {
        const updatedReviewsList = [newRatingReview, ...item.reviews];
        // Calculate newly averaged ratings value
        const totalRatingPoints = updatedReviewsList.reduce((acc, r) => acc + r.rating, 0);
        const newAveragedRating = Math.round((totalRatingPoints / updatedReviewsList.length) * 10) / 10;

        return {
          ...item,
          reviews: updatedReviewsList,
          reviewsCount: updatedReviewsList.length,
          rating: newAveragedRating
        };
      }
      return item;
    });

    setTrips(updatedTrips);
  };

  // Handle finalize successful booking setup
  const handleFinalizeBookingSetup = (resolvedBooking) => {
    // 1. Append booking object to local roster list
    setBookings(prev => [resolvedBooking, ...prev]);

    // 2. Generate customized push alerts inside Notification Center stream
    const confirmAlert = {
      id: 'n-new-confirm-' + Date.now(),
      title: '⛰️ Permit Slot Secured!',
      content: `Your high elevation pass to ${resolvedBooking.tripName} is active for ${resolvedBooking.selectedDate}. Booking ID: ${resolvedBooking.bookingId}`,
      timestamp: new Date().toISOString(),
      type: 'Booking',
      read: false
    };

    const paymentAlert = {
      id: 'n-new-pay-' + Date.now(),
      title: '💳 Refund Settlement Rules',
      content: `Total fee settlement values of ₹${resolvedBooking.finalAmount} was secured successfully is secure. Check your ledger files.`,
      timestamp: new Date().toISOString(),
      type: 'Payment',
      read: false
    };

    setNotifications(prev => [confirmAlert, paymentAlert, ...prev]);

    // 3. Auto-populate chat with organizer
    const welcomeMsg = `Hi Chirag! Verified guides from ${resolvedBooking.organizerName} have received your pass application. Looking forward to hiking soon!`;
    const newOrganizerMsg = {
      id: 'm-new-start-' + Date.now(),
      sender: 'organizer',
      text: welcomeMsg,
      timestamp: new Date().toISOString()
    };

    const existingChatSession = chats.find(c => c.tripId === resolvedBooking.tripId);
    if (existingChatSession) {
      const updatedMessages = [...existingChatSession.messages, newOrganizerMsg];
      setChats(prev => prev.map(c => 
        c.tripId === resolvedBooking.tripId ? { ...c, messages: updatedMessages } : c
      ));
    } else {
      const newChatSession = {
        tripId: resolvedBooking.tripId,
        organizerName: resolvedBooking.organizerName,
        organizerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        messages: [newOrganizerMsg]
      };
      setChats(prev => [...prev, newChatSession]);
    }

    // 4. Return viewport to listings or details cleanly
    navigateTo('/bookings');
  };

  // Switch Booking slot states (e.g. Cancel slots)
  const handleModifyBookingStatus = (bookingId, status) => {
    setBookings(prev => prev.map(b => 
      b.id === bookingId ? { ...b, status: status } : b
    ));

    // send notification
    if (status === 'Cancelled') {
      const bObj = bookings.find(b => b.id === bookingId);
      const cancelNotify = {
        id: 'n-cancel-' + Date.now(),
        title: '⚠️ Registration Cancelled',
        content: `Your slot configuration for ${bObj?.tripName || 'hiking trip'} has been cancelled. Refunds will reach your credit bank.`,
        timestamp: new Date().toISOString(),
        type: 'Updates',
        read: false
      };
      setNotifications(prev => [cancelNotify, ...prev]);
    }
  };

  const handleMarkNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Gather user drafted comments metadata
  const getUserDraftedReviews = () => {
    const list = [];
    trips.forEach(t => {
      t.reviews.forEach(r => {
        if (r.userName === user.name) {
          list.push({
            tripId: t.id,
            tripName: t.name,
            rating: r.rating,
            comment: r.comment,
            date: r.date
          });
        }
      });
    });
    return list;
  };

  // Global toggle theme function
  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleTriggerOnboardingWalkthrough = () => {
    setUser(prev => ({ ...prev, isOnboarded: false }));
  };

  // Helper selectors rendering view states inside viewport
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Home':
        return (
          <HomeView
            user={user}
            trips={trips}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onSelectTrip={(t) => navigateTo(`/trip/${t.id}`)}
            onSwitchTab={(tab) => navigateTo(tab === 'Home' ? '/' : `/${tab.toLowerCase()}`)}
            onApplyCategory={handleApplyCategoryFromHome}
            onApplySearch={handleApplySearchFromHome}
            notifications={notifications}
            onMarkNotificationRead={handleMarkNotificationRead}
            onClearNotifications={handleClearNotifications}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
          />
        );
      case 'Explore':
        return (
          <ExploreView
            trips={trips}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onSelectTrip={(t) => navigateTo(`/trip/${t.id}`)}
            searchQuery={exploreSearchQuery}
            onSetSearchQuery={setExploreSearchQuery}
            selectedCategory={exploreCategory}
            onSetCategory={setExploreCategory}
            darkMode={darkMode}
          />
        );
      case 'Bookings':
        return (
          <BookingsView
            bookings={bookings}
            trips={trips}
            onSelectTrip={(t) => navigateTo(`/trip/${t.id}`)}
            chats={chats}
            onSaveChats={setChats}
            onModifyBookingStatus={handleModifyBookingStatus}
            onAddReview={handleAddReviewToTrip}
            onSelectBooking={(b) => navigateTo(`/booking/${b.id}`)}
            darkMode={darkMode}
          />
        );
      case 'Wishlist':
        return (
          <WishlistView
            wishlist={wishlist}
            trips={trips}
            onToggleWishlist={handleToggleWishlist}
            onSelectTrip={(t) => navigateTo(`/trip/${t.id}`)}
            onTriggerBooking={(t) => navigateTo(`/book/${t.id}`)}
            darkMode={darkMode}
          />
        );
      case 'Profile':
        return (
          <ProfileView
            user={user}
            onUpdateUser={setUser}
            onLogout={handleLogoutResets}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
            userReviews={getUserDraftedReviews()}
            onTriggerOnboarding={handleTriggerOnboardingWalkthrough}
          />
        );
      default:
        return null;
    }
  };

  return (
    <PhoneFrame darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode}>
      
      {!user.isOnboarded ? (
        <Onboarding 
          onComplete={handleCompleteOnboardingWalkthrough} 
          darkMode={darkMode} 
        />
      ) : !user.isAuthenticated ? (
        <Auth 
          onSuccess={handleAuthSuccess} 
          darkMode={darkMode} 
          initialMode={activeTab === 'Register' ? 'REGISTER' : 'LOGIN_EMAIL'}
          onSwitchToRegister={() => navigateTo('/register')}
          onSwitchToLogin={() => navigateTo('/login')}
        />
      ) : (
        /* 3. Main Dashboard flow viewport screen */
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
          
          {/* Dynamic details page loaded absolute overlay */}
          <AnimatePresence mode="wait">
            {selectedTrip && !activeBookingTrip && (
              <motion.div
                key="overlay-trip-details"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className={`absolute inset-0 z-50 flex flex-col h-full ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
              >
                <TripDetailsView
                  trip={selectedTrip}
                  onBack={() => { if (window.history.state) { window.history.back(); } else { navigateTo('/explore'); } }}
                  wishlist={wishlist}
                  onToggleWishlist={handleToggleWishlist}
                  onTriggerBooking={(t) => navigateTo(`/book/${t.id}`)}
                  onSelectOrganizer={(org) => navigateTo(`/organizer/${encodeURIComponent(org.name)}`)}
                  darkMode={darkMode}
                />
              </motion.div>
            )}
          </AnimatePresence>
 
           {/* Dynamic Booking flow workflow absolute overlay loaded */}
           <AnimatePresence mode="wait">
             {activeBookingTrip && (
               <motion.div
                 key="overlay-booking-flow"
                 initial={{ y: '100%' }}
                 animate={{ y: 0 }}
                 exit={{ y: '100%' }}
                 transition={{ type: 'spring', damping: 26, stiffness: 200 }}
                 className={`absolute inset-0 z-45 flex flex-col h-full ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
               >
                 <BookingFlow
                   trip={activeBookingTrip}
                   onCancel={() => { if (window.history.state) { window.history.back(); } else { navigateTo(selectedTrip ? `/trip/${selectedTrip.id}` : '/explore'); } }}
                   onConfirmBooking={handleFinalizeBookingSetup}
                   darkMode={darkMode}
                 />
               </motion.div>
             )}
           </AnimatePresence>
 
           {/* Dynamic Booking Details page absolute overlay */}
           <AnimatePresence mode="wait">
             {selectedBooking && (
               <motion.div
                 key="overlay-booking-details"
                 initial={{ x: '100%' }}
                 animate={{ x: 0 }}
                 exit={{ x: '100%' }}
                 transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                 className={`absolute inset-0 z-50 flex flex-col h-full ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
               >
                 <BookingDetailsView
                   booking={selectedBooking}
                   onBack={() => { if (window.history.state) { window.history.back(); } else { navigateTo('/bookings'); } }}
                   onModifyBookingStatus={handleModifyBookingStatus}
                   onContactOrganizer={(b) => {
                     // Find organizing guide chat context
                     const existing = chats.find(c => c.tripId === b.tripId);
                     if (existing) {
                       // Switch to Bookings tab and open chat
                       navigateTo('/bookings');
                       // Trigger simulated chat click in BookingsView if needed, or simply trigger contact organizer
                     }
                     alert(`Connecting to ${b.organizerName} Support... Tapping "Chat Guide" inside Bookings will open the console chat drawer directly.`);
                     setSelectedBooking(null);
                   }}
                   onDownloadInvoice={(b) => {
                     alert(`Ledger statement receipt for Permit Code ${b.bookingId} downloaded successfully.`);
                   }}
                   onRateHike={(b) => {
                     const ratingInput = prompt('Rate your experience (1 to 5 stars):', '5');
                     if (!ratingInput) return;
                     const ratingVal = parseInt(ratingInput);
                     if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
                       alert('Invalid rating entry. Please input a number between 1 and 5.');
                       return;
                     }
                     const commentInput = prompt('Write a comment about this trek:');
                     if (commentInput !== null) {
                       handleAddReviewToTrip(b.tripId, ratingVal, commentInput || 'Incredible experience!');
                       alert('Review logged and average rating updated successfully!');
                     }
                   }}
                   darkMode={darkMode}
                 />
               </motion.div>
             )}
           </AnimatePresence>

           {/* Dynamic Organizer Profile page absolute overlay */}
           <AnimatePresence mode="wait">
             {selectedOrganizer && (
               <motion.div
                 key="overlay-organizer-profile"
                 initial={{ x: '100%' }}
                 animate={{ x: 0 }}
                 exit={{ x: '100%' }}
                 transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                 className={`absolute inset-0 z-55 flex flex-col h-full ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
               >
                 <OrganizerProfileView
                   organizer={selectedOrganizer}
                   trips={trips}
                   onBack={() => { if (window.history.state) { window.history.back(); } else { navigateTo('/explore'); } }}
                   onSelectTrip={(t) => {
                     setSelectedOrganizer(null);
                     navigateTo(`/trip/${t.id}`);
                   }}
                   darkMode={darkMode}
                 />
               </motion.div>
             )}
           </AnimatePresence>
 
          {/* Main Tabs view renderer */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
 
          {/* Sticky bottom navigation system */}
          <BottomNav
            activeTab={activeTab}
            onChangeTab={(tab) => {
              navigateTo(tab === 'Home' ? '/' : `/${tab.toLowerCase()}`);
              // Clear filters when user actively taps main tabs to feel fresh
              if (tab !== 'Explore') {
                setExploreSearchQuery('');
                setExploreCategory('All');
              }
            }}
            darkMode={darkMode}
            wishlistCount={wishlist.length}
          />
 
        </div>
      )}
 
    </PhoneFrame>
  );
}
