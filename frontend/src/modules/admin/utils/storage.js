const ADMIN_USER_KEY = 'trekigo_admin_user';
const ADMIN_DARK_MODE_KEY = 'trekigo_admin_darkmode';
const ADMIN_USER_OVERRIDES_KEY = 'trekigo_admin_user_overrides';
const ADMIN_CREATED_USERS_KEY = 'trekigo_admin_created_users';
const ADMIN_DELETED_USERS_KEY = 'trekigo_admin_deleted_users';

// Default Admin State
export const DEFAULT_ADMIN = {
  isAuthenticated: false,
  email: '',
  name: 'System Administrator',
  avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
  role: 'Super Admin',
};

// Static seed users to make the user table look rich and realistic
const MOCK_DB_USERS = [];

// Synthetic booking history for the seed hikers above, so their admin profile
// pages have real, cross-linkable data to show (trip, organizer, spend) rather
// than just the flat `bookingsCount` number. Tied to real catalog trip IDs and
// to the one seed organizer account (see loadAllOrganizers) so the "view
// organizer" deep link on a booking always resolves to something real.
const MOCK_ADMIN_BOOKINGS = [];

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
const loadJSON = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return fallback;
};

export const loadAllUsers = () => {
  try {
    const list = [...MOCK_DB_USERS];

    // Sync the current live traveller session into the list
    const activeUser = localStorage.getItem('trekigo_user');
    if (activeUser) {
      const parsed = JSON.parse(activeUser);
      const idx = list.findIndex(u => u.email === parsed.email);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...parsed, status: list[idx].status || 'Active' };
      } else if (parsed.email) {
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

    // Admin-created users (full CRUD "Create")
    const created = loadJSON(ADMIN_CREATED_USERS_KEY, []);
    created.forEach(u => {
      if (!list.some(existing => existing.email === u.email)) list.push(u);
    });

    // Admin field overrides (full CRUD "Update" — status, name, any field)
    const overrides = loadJSON(ADMIN_USER_OVERRIDES_KEY, {});
    let result = list.map(u => (overrides[u.email] ? { ...u, ...overrides[u.email] } : u));

    // Admin-deleted users (full CRUD "Delete")
    const deleted = new Set(loadJSON(ADMIN_DELETED_USERS_KEY, []));
    result = result.filter(u => !deleted.has(u.email));

    return result;
  } catch (e) {
    console.error(e);
    return MOCK_DB_USERS;
  }
};

export const getUserByEmail = (email) => loadAllUsers().find(u => u.email === email) || null;

export const saveUserFields = (email, fields) => {
  const overrides = loadJSON(ADMIN_USER_OVERRIDES_KEY, {});
  overrides[email] = { ...overrides[email], ...fields };
  localStorage.setItem(ADMIN_USER_OVERRIDES_KEY, JSON.stringify(overrides));

  // Keep a currently-live traveller session in sync so status/profile edits
  // actually take effect for them, not just in the admin's own view of them.
  try {
    const activeUser = localStorage.getItem('trekigo_user');
    if (activeUser) {
      const parsed = JSON.parse(activeUser);
      if (parsed.email === email) {
        localStorage.setItem('trekigo_user', JSON.stringify({ ...parsed, ...fields }));
      }
    }
  } catch (e) { console.error(e); }
};

export const saveUserStatus = (email, status) => saveUserFields(email, { status });

export const createUser = (fields) => {
  const created = loadJSON(ADMIN_CREATED_USERS_KEY, []);
  const newUser = {
    id: `u-admin-${Date.now()}`,
    name: fields.name || 'New Hiker',
    email: fields.email,
    mobile: fields.mobile || '',
    age: fields.age || 24,
    gender: fields.gender || 'Male',
    avatar: fields.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fields.name || 'New Hiker')}&background=F27D26&color=fff`,
    hikingExperience: fields.hikingExperience || 'Beginner',
    fitnessLevel: fields.fitnessLevel || 'Moderate',
    emergencyContact: fields.emergencyContact || '',
    joinedDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    bookingsCount: 0,
  };
  created.push(newUser);
  localStorage.setItem(ADMIN_CREATED_USERS_KEY, JSON.stringify(created));
  return newUser;
};

export const deleteUser = (email) => {
  const deleted = new Set(loadJSON(ADMIN_DELETED_USERS_KEY, []));
  deleted.add(email);
  localStorage.setItem(ADMIN_DELETED_USERS_KEY, JSON.stringify([...deleted]));
};

// ─── Organizers storage ──────────────────────────────────────────────────────
export const loadAllOrganizers = () => {
  try {
    const stored = localStorage.getItem('trekigo_org_accounts');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const saveOrganizerStatus = (email, approve, reject = false) => {
  try {
    const stored = localStorage.getItem('trekigo_org_accounts');
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
      localStorage.setItem('trekigo_org_accounts', JSON.stringify(accounts));
      
      // If it matches the current logged-in organizer, update their active profile state
      const currentOrg = localStorage.getItem('trekigo_org_user');
      if (currentOrg) {
        const parsed = JSON.parse(currentOrg);
        if (parsed.email === email) {
          parsed.isApproved = accounts[idx].isApproved;
          parsed.isPendingApproval = accounts[idx].isPendingApproval;
          localStorage.setItem('trekigo_org_user', JSON.stringify(parsed));
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
};

export const getOrganizerByEmail = (email) => loadAllOrganizers().find(o => o.email === email) || null;

// Full-field update (name, agency info, bio, rating, experience, ...) — the
// "Update" in CRUD, distinct from saveOrganizerStatus's approve/reject toggle.
export const saveOrganizerFields = (email, fields) => {
  try {
    const accounts = loadAllOrganizers();
    const idx = accounts.findIndex(a => a.email === email);
    if (idx < 0) return;
    accounts[idx] = { ...accounts[idx], ...fields };
    localStorage.setItem('trekigo_org_accounts', JSON.stringify(accounts));

    // Keep a currently-live organizer session in sync
    const currentOrg = localStorage.getItem('trekigo_org_user');
    if (currentOrg) {
      const parsed = JSON.parse(currentOrg);
      if (parsed.email === email) {
        localStorage.setItem('trekigo_org_user', JSON.stringify({ ...parsed, ...fields }));
      }
    }
  } catch (e) {
    console.error(e);
  }
};

export const createOrganizer = (fields) => {
  const accounts = loadAllOrganizers();
  const newOrg = {
    name: fields.name || 'New Partner',
    email: fields.email,
    mobile: fields.mobile || '',
    agencyName: fields.agencyName || fields.name || 'New Agency',
    agencyWebsite: fields.agencyWebsite || '',
    govtIdType: fields.govtIdType || 'Aadhaar',
    govtIdNumber: fields.govtIdNumber || '',
    yearsExperience: fields.yearsExperience || 1,
    bio: fields.bio || '',
    avatar: fields.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fields.agencyName || fields.name || 'Partner')}&background=F27D26&color=fff`,
    rating: 0,
    totalTrips: 0,
    totalBookings: 0,
    isApproved: true,
    isPendingApproval: false,
  };
  accounts.push(newOrg);
  localStorage.setItem('trekigo_org_accounts', JSON.stringify(accounts));
  return newOrg;
};

export const deleteOrganizerAccount = (email) => {
  const accounts = loadAllOrganizers().filter(a => a.email !== email);
  localStorage.setItem('trekigo_org_accounts', JSON.stringify(accounts));
};

// ─── Trips storage ───────────────────────────────────────────────────────────
export const loadAllTrips = () => {
  try {
    // Read from the shared user-facing list
    const val = localStorage.getItem('trekigo_trips');
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  return [];
};

export const saveTripStatus = (tripId, status) => {
  try {
    const val = localStorage.getItem('trekigo_trips');
    if (val) {
      const trips = JSON.parse(val);
      const idx = trips.findIndex(t => t.id === tripId);
      if (idx >= 0) {
        trips[idx].status = status;
        localStorage.setItem('trekigo_trips', JSON.stringify(trips));
      }
    }
    
    // Sync to org trips too
    const orgVal = localStorage.getItem('trekigo_org_trips');
    if (orgVal) {
      const orgTrips = JSON.parse(orgVal);
      const oIdx = orgTrips.findIndex(t => t.id === tripId);
      if (oIdx >= 0) {
        orgTrips[oIdx].status = status;
        localStorage.setItem('trekigo_org_trips', JSON.stringify(orgTrips));
      }
    }
  } catch (e) {
    console.error(e);
  }
};

export const deleteTripAdmin = (tripId) => {
  try {
    const val = localStorage.getItem('trekigo_trips');
    if (val) {
      const trips = JSON.parse(val).filter(t => t.id !== tripId);
      localStorage.setItem('trekigo_trips', JSON.stringify(trips));
    }
    const orgVal = localStorage.getItem('trekigo_org_trips');
    if (orgVal) {
      const orgTrips = JSON.parse(orgVal).filter(t => t.id !== tripId);
      localStorage.setItem('trekigo_org_trips', JSON.stringify(orgTrips));
    }
  } catch (e) {
    console.error(e);
  }
};

export const getTripById = (tripId) => loadAllTrips().find(t => t.id === tripId) || null;

export const getTripsByOrganizerEmail = (email) => loadAllTrips().filter(t => t.organizerEmail === email);

// ─── Bookings storage ────────────────────────────────────────────────────────
export const loadAllBookings = () => {
  try {
    const userBookingsVal = localStorage.getItem('trekigo_bookings');
    const userBookings = userBookingsVal ? JSON.parse(userBookingsVal) : [];

    const orgBookingsVal = localStorage.getItem('trekigo_org_bookings');
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

    // Seed hiker bookings (see MOCK_ADMIN_BOOKINGS) — only added when nothing
    // with the same bookingId already exists, so real bookings always win.
    MOCK_ADMIN_BOOKINGS.forEach(mb => {
      if (!merged.some(b => b.bookingId === mb.bookingId)) merged.push(mb);
    });

    return merged;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const getBookingsByUserEmail = (email) =>
  loadAllBookings().filter(b => (b.userEmail || '').toLowerCase() === (email || '').toLowerCase());

// A booking may carry organizerEmail directly (seed data) or only a tripId —
// in that case resolve the organizer via the trip it points to.
export const getBookingsByOrganizerEmail = (email) => {
  const trips = loadAllTrips();
  const tripOrgByTripId = new Map(trips.map(t => [t.id, t.organizerEmail]));
  return loadAllBookings().filter(b => (b.organizerEmail || tripOrgByTripId.get(b.tripId)) === email);
};

export const saveBookingStatusAdmin = (bookingId, status) => {
  try {
    const userBookingsVal = localStorage.getItem('trekigo_bookings');
    if (userBookingsVal) {
      const bookings = JSON.parse(userBookingsVal);
      const idx = bookings.findIndex(b => b.bookingId === bookingId || b.id === bookingId);
      if (idx >= 0) {
        bookings[idx].status = status;
        localStorage.setItem('trekigo_bookings', JSON.stringify(bookings));
      }
    }
    const orgBookingsVal = localStorage.getItem('trekigo_org_bookings');
    if (orgBookingsVal) {
      const bookings = JSON.parse(orgBookingsVal);
      const idx = bookings.findIndex(b => b.bookingId === bookingId || b.id === bookingId);
      if (idx >= 0) {
        bookings[idx].status = status;
        localStorage.setItem('trekigo_org_bookings', JSON.stringify(bookings));
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
      const uVal = localStorage.getItem('trekigo_notifications');
      const uNotifs = uVal ? JSON.parse(uVal) : [];
      uNotifs.unshift(newNotif);
      localStorage.setItem('trekigo_notifications', JSON.stringify(uNotifs));
    }
    // And organizer notification list
    if (target === 'organizers' || target === 'both') {
      const oVal = localStorage.getItem('trekigo_org_notifications');
      const oNotifs = oVal ? JSON.parse(oVal) : [];
      oNotifs.unshift({
        ...newNotif,
        id: `aon-${Date.now()}`
      });
      localStorage.setItem('trekigo_org_notifications', JSON.stringify(oNotifs));
    }
    
    // Store broadcast history
    const bhVal = localStorage.getItem('trekigo_admin_broadcasts');
    const bh = bhVal ? JSON.parse(bhVal) : [];
    bh.unshift({
      ...newNotif,
      target,
    });
    localStorage.setItem('trekigo_admin_broadcasts', JSON.stringify(bh));
  } catch (e) {
    console.error(e);
  }
};

export const loadBroadcastHistory = () => {
  try {
    const val = localStorage.getItem('trekigo_admin_broadcasts');
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
  localStorage.removeItem('trekigo_admin_user_flags');
  localStorage.removeItem('trekigo_admin_broadcasts');
  localStorage.removeItem('trekigo_org_accounts');
  localStorage.removeItem(ADMIN_USER_OVERRIDES_KEY);
  localStorage.removeItem(ADMIN_CREATED_USERS_KEY);
  localStorage.removeItem(ADMIN_DELETED_USERS_KEY);
  // Trigger organizer seed rebuild
  loadAllOrganizers();
};
