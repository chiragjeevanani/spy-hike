/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const ADMIN_USER_KEY = 'spyhike_admin_user';
const ADMIN_DARK_MODE_KEY = 'spyhike_admin_darkmode';

// Default Admin State
export const DEFAULT_ADMIN = {
  isAuthenticated: false,
  email: '',
  name: 'System Administrator',
  avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
  role: 'Super Admin',
};

// Static seed users to make the user table look rich and realistic
const MOCK_DB_USERS = [
  {
    id: 'u-1',
    name: 'Chirag Jeevanani',
    email: 'chiragjeevanani333@gmail.com',
    mobile: '+91 98765 43210',
    age: 24,
    gender: 'Male',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    hikingExperience: 'Intermediate',
    fitnessLevel: 'High',
    emergencyContact: 'Asha Jeevanani (+91 98765 43219)',
    joinedDate: '2026-03-12',
    status: 'Active',
    bookingsCount: 3
  },
  {
    id: 'u-2',
    name: 'Ananya Iyer',
    email: 'ananya.iyer@gmail.com',
    mobile: '+91 88888 77777',
    age: 22,
    gender: 'Female',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    hikingExperience: 'Beginner',
    fitnessLevel: 'Moderate',
    emergencyContact: 'K. Iyer (+91 88888 77770)',
    joinedDate: '2026-04-15',
    status: 'Active',
    bookingsCount: 1
  },
  {
    id: 'u-3',
    name: 'Vikram Malhotra',
    email: 'vikram.m@yahoo.com',
    mobile: '+91 99999 11111',
    age: 29,
    gender: 'Male',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    hikingExperience: 'Advanced',
    fitnessLevel: 'High',
    emergencyContact: 'S. Malhotra (+91 99999 11110)',
    joinedDate: '2026-01-20',
    status: 'Active',
    bookingsCount: 4
  },
  {
    id: 'u-4',
    name: 'Sneha Patel',
    email: 'sneha.patel@outlook.com',
    mobile: '+91 77777 66666',
    age: 26,
    gender: 'Female',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    hikingExperience: 'Intermediate',
    fitnessLevel: 'Low',
    emergencyContact: 'R. Patel (+91 77777 66660)',
    joinedDate: '2026-05-02',
    status: 'Banned',
    bookingsCount: 0
  }
];

// Helper to load admin user
export const loadAdminUser = () => {
  try {
    const val = localStorage.getItem(ADMIN_USER_KEY);
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return DEFAULT_ADMIN;
};

export const saveAdminUser = (user) => {
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
};

export const loadAdminDarkMode = () => {
  try {
    const val = localStorage.getItem(ADMIN_DARK_MODE_KEY);
    if (val !== null) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return false; // Light mode by default!
};

export const saveAdminDarkMode = (val) => {
  localStorage.setItem(ADMIN_DARK_MODE_KEY, JSON.stringify(val));
};

// ─── Users storage ──────────────────────────────────────────────────────────
export const loadAllUsers = () => {
  // Sync the current active user from 'spyhike_user' with the mock list
  try {
    const activeUser = localStorage.getItem('spyhike_user');
    const list = [...MOCK_DB_USERS];
    if (activeUser) {
      const parsed = JSON.parse(activeUser);
      // Find and update active user's properties
      const idx = list.findIndex(u => u.email === parsed.email);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...parsed, status: list[idx].status || 'Active' };
      } else {
        list.unshift({
          id: 'u-active',
          name: parsed.name || 'Active User',
          email: parsed.email || 'user@example.com',
          mobile: parsed.mobile || '',
          age: parsed.age || 24,
          gender: parsed.gender || 'Male',
          avatar: parsed.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          hikingExperience: parsed.hikingExperience || 'Intermediate',
          fitnessLevel: parsed.fitnessLevel || 'High',
          emergencyContact: parsed.emergencyContact || '',
          joinedDate: '2026-06-20',
          status: 'Active',
          bookingsCount: 2
        });
      }
    }
    
    // Check if admin has banned/modified status in local admin storage
    const adminUserFlags = localStorage.getItem('spyhike_admin_user_flags');
    if (adminUserFlags) {
      const flags = JSON.parse(adminUserFlags);
      return list.map(u => {
        if (flags[u.email]) {
          return { ...u, status: flags[u.email] };
        }
        return u;
      });
    }
    return list;
  } catch (e) {
    console.error(e);
    return MOCK_DB_USERS;
  }
};

export const saveUserStatus = (email, status) => {
  try {
    const stored = localStorage.getItem('spyhike_admin_user_flags');
    const flags = stored ? JSON.parse(stored) : {};
    flags[email] = status;
    localStorage.setItem('spyhike_admin_user_flags', JSON.stringify(flags));

    // Also update the active user's local state status if they match
    const activeUser = localStorage.getItem('spyhike_user');
    if (activeUser) {
      const parsed = JSON.parse(activeUser);
      if (parsed.email === email) {
        // Just note the status change in the database
        // In full app, it blocks user logins
      }
    }
  } catch (e) {
    console.error(e);
  }
};

// ─── Organizers storage ──────────────────────────────────────────────────────
export const loadAllOrganizers = () => {
  try {
    const stored = localStorage.getItem('spyhike_org_accounts');
    const accounts = stored ? JSON.parse(stored) : [];
    
    // If empty, seed with the demo organizer
    if (accounts.length === 0) {
      const demoOrg = {
        name: 'Himalayan Guides Ltd',
        email: 'demo@himalayan.com',
        mobile: '+91 98765 09876',
        agencyName: 'Himalayan Guides Ltd',
        agencyWebsite: 'https://himalayan.com',
        govtIdType: 'Aadhaar',
        govtIdNumber: '1234-5678-9012',
        yearsExperience: 8,
        bio: 'Premium Himalayan expedition organizers with 8+ years experience.',
        avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=150&q=80',
        rating: 4.9,
        totalTrips: 42,
        totalBookings: 380,
        isApproved: true,
        isPendingApproval: false
      };
      accounts.push(demoOrg);
      localStorage.setItem('spyhike_org_accounts', JSON.stringify(accounts));
    }
    
    return accounts;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const saveOrganizerStatus = (email, approve, reject = false) => {
  try {
    const stored = localStorage.getItem('spyhike_org_accounts');
    if (!stored) return;
    const accounts = JSON.parse(stored);
    const idx = accounts.findIndex(a => a.email === email);
    if (idx >= 0) {
      if (approve) {
        accounts[idx].isApproved = true;
        accounts[idx].isPendingApproval = false;
      } else if (reject) {
        accounts[idx].isApproved = false;
        accounts[idx].isPendingApproval = false;
        accounts[idx].isRejected = true; // flag rejection
      } else {
        // Toggle suspend/reactivate
        accounts[idx].isApproved = !accounts[idx].isApproved;
      }
      localStorage.setItem('spyhike_org_accounts', JSON.stringify(accounts));
      
      // If it matches the current logged-in organizer, update their active profile state
      const currentOrg = localStorage.getItem('spyhike_org_user');
      if (currentOrg) {
        const parsed = JSON.parse(currentOrg);
        if (parsed.email === email) {
          parsed.isApproved = accounts[idx].isApproved;
          parsed.isPendingApproval = accounts[idx].isPendingApproval;
          localStorage.setItem('spyhike_org_user', JSON.stringify(parsed));
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
};

// ─── Trips storage ───────────────────────────────────────────────────────────
export const loadAllTrips = () => {
  try {
    // Read from the shared user-facing list
    const val = localStorage.getItem('spyhike_trips');
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  return [];
};

export const saveTripStatus = (tripId, status) => {
  try {
    const val = localStorage.getItem('spyhike_trips');
    if (val) {
      const trips = JSON.parse(val);
      const idx = trips.findIndex(t => t.id === tripId);
      if (idx >= 0) {
        trips[idx].status = status;
        localStorage.setItem('spyhike_trips', JSON.stringify(trips));
      }
    }
    
    // Sync to org trips too
    const orgVal = localStorage.getItem('spyhike_org_trips');
    if (orgVal) {
      const orgTrips = JSON.parse(orgVal);
      const oIdx = orgTrips.findIndex(t => t.id === tripId);
      if (oIdx >= 0) {
        orgTrips[oIdx].status = status;
        localStorage.setItem('spyhike_org_trips', JSON.stringify(orgTrips));
      }
    }
  } catch (e) {
    console.error(e);
  }
};

export const deleteTripAdmin = (tripId) => {
  try {
    const val = localStorage.getItem('spyhike_trips');
    if (val) {
      const trips = JSON.parse(val).filter(t => t.id !== tripId);
      localStorage.setItem('spyhike_trips', JSON.stringify(trips));
    }
    const orgVal = localStorage.getItem('spyhike_org_trips');
    if (orgVal) {
      const orgTrips = JSON.parse(orgVal).filter(t => t.id !== tripId);
      localStorage.setItem('spyhike_org_trips', JSON.stringify(orgTrips));
    }
  } catch (e) {
    console.error(e);
  }
};

// ─── Bookings storage ────────────────────────────────────────────────────────
export const loadAllBookings = () => {
  try {
    const userBookingsVal = localStorage.getItem('spyhike_bookings');
    const userBookings = userBookingsVal ? JSON.parse(userBookingsVal) : [];
    
    const orgBookingsVal = localStorage.getItem('spyhike_org_bookings');
    const orgBookings = orgBookingsVal ? JSON.parse(orgBookingsVal) : [];

    // Merge by unique id or bookingId
    const merged = [...userBookings];
    orgBookings.forEach(ob => {
      const exists = merged.some(b => b.bookingId === ob.bookingId || b.id === ob.id);
      if (!exists) {
        merged.push({
          id: ob.id,
          bookingId: ob.bookingId,
          tripId: ob.tripId,
          tripName: ob.tripName,
          selectedDate: ob.selectedDate,
          hikersCount: ob.hikersCount || ob.travelersCount || 1,
          finalAmount: ob.finalAmount,
          status: ob.status,
          userName: ob.userName || 'Active User',
          userEmail: ob.userEmail || 'user@example.com',
          bookingDate: ob.bookingDate || new Date().toISOString(),
          organizerName: ob.organizerName || 'Himalayan Guides Ltd',
        });
      }
    });

    return merged;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const saveBookingStatusAdmin = (bookingId, status) => {
  try {
    const userBookingsVal = localStorage.getItem('spyhike_bookings');
    if (userBookingsVal) {
      const bookings = JSON.parse(userBookingsVal);
      const idx = bookings.findIndex(b => b.bookingId === bookingId || b.id === bookingId);
      if (idx >= 0) {
        bookings[idx].status = status;
        localStorage.setItem('spyhike_bookings', JSON.stringify(bookings));
      }
    }
    const orgBookingsVal = localStorage.getItem('spyhike_org_bookings');
    if (orgBookingsVal) {
      const bookings = JSON.parse(orgBookingsVal);
      const idx = bookings.findIndex(b => b.bookingId === bookingId || b.id === bookingId);
      if (idx >= 0) {
        bookings[idx].status = status;
        localStorage.setItem('spyhike_org_bookings', JSON.stringify(bookings));
      }
    }
  } catch (e) {
    console.error(e);
  }
};

// ─── Broadcaster & notifications ─────────────────────────────────────────────
export const broadcastNotification = (title, content, type, target) => {
  const newNotif = {
    id: `an-${Date.now()}`,
    title,
    content,
    timestamp: new Date().toISOString(),
    type: type || 'System',
    read: false,
  };

  try {
    // Broadcaster logic: write to user notification list
    if (target === 'users' || target === 'both') {
      const uVal = localStorage.getItem('spyhike_notifications');
      const uNotifs = uVal ? JSON.parse(uVal) : [];
      uNotifs.unshift(newNotif);
      localStorage.setItem('spyhike_notifications', JSON.stringify(uNotifs));
    }
    // And organizer notification list
    if (target === 'organizers' || target === 'both') {
      const oVal = localStorage.getItem('spyhike_org_notifications');
      const oNotifs = oVal ? JSON.parse(oVal) : [];
      oNotifs.unshift({
        ...newNotif,
        id: `aon-${Date.now()}`
      });
      localStorage.setItem('spyhike_org_notifications', JSON.stringify(oNotifs));
    }
    
    // Store broadcast history
    const bhVal = localStorage.getItem('spyhike_admin_broadcasts');
    const bh = bhVal ? JSON.parse(bhVal) : [];
    bh.unshift({
      ...newNotif,
      target,
    });
    localStorage.setItem('spyhike_admin_broadcasts', JSON.stringify(bh));
  } catch (e) {
    console.error(e);
  }
};

export const loadBroadcastHistory = () => {
  try {
    const val = localStorage.getItem('spyhike_admin_broadcasts');
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return [
    {
      id: 'an-seed-1',
      title: '⛰️ Monsoon Trail Openings',
      content: 'All hikers are advised to verify equipment guidelines before departure.',
      timestamp: '2026-06-20T10:00:00Z',
      type: 'Updates',
      target: 'both'
    }
  ];
};

// Reset database
export const resetDemoData = () => {
  localStorage.removeItem('spyhike_admin_user_flags');
  localStorage.removeItem('spyhike_admin_broadcasts');
  localStorage.removeItem('spyhike_org_accounts');
  // Trigger organizer seed rebuild
  loadAllOrganizers();
};
