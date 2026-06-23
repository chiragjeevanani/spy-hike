# Spy Hike — Project Progress Log & Architecture Context

This file serves as a comprehensive progress summary of all architectural changes, design updates, interactive features, animations, and detailed user flow schemas integrated into the **Spy Hike** project.

---

## 1. Project Overview & Tech Stack
**Spy Hike** is a premium, high-fidelity mobile-first Adventure Mountain Trek Booking application.
* **Core**: React 19, JavaScript (JSX), and Vite.
* **Styling**: Vanilla CSS, Tailwind CSS.
* **Animation**: Framer Motion v12 (imported via `motion/react`).
* **Routing**: Custom state-based routing synced with the HTML5 History API (`window.history.pushState` / `popstate`).

---

## 2. User App Flow Details & Data Models
*(Use this reference schema when building the Organizer & Admin panels)*

### A. Onboarding Flow (`/onboardingguide`)
* **Trigger**: Triggered automatically on first visit when `user.isOnboarded` is `false` (default for new profiles).
* **Screens**: Slide-based introduction deck presenting Spy Hike capabilities.
* **Action**: Completing the walkthrough updates `isOnboarded: true` in local storage and redirects immediately to `/login`.

### B. Authentication Flow (`/login` and `/register`)
* **Independent Routes**: Dedicated paths for `/login` and `/register`.
* **Login Options**:
  * **Email & Password**: Verified against simulated credentials (e.g. `chiragjeevanani333@gmail.com` / `spyhike123`) or auto-creates standard credentials on-the-fly.
  * **Mobile OTP**: Uses simulated 6-digit OTP verification (OTP is `1234` or `123456`).
  * **Google Sign-In**: Instant simulated authentication button.
* **Registration Fields**: Full Name, Mobile Number, Email, Password, Age, and Gender. Registers the profile and redirects to the onboarding guide if not completed.
* **Post-Auth Flow**: Redirects to the homepage dashboard (`/`) and updates active navigation state.

### C. Homepage Dashboard (`/`)
* **Greeting Block**: Dynamic local greeting (Good morning/afternoon/evening) using user's name.
* **Curated Experience Categories**: Matches search tags (Mountain, Compass, Tent, Flame, Trees, CalendarDays) to automatically filter expeditions on the Explore page.
* **Promotional Banner Carousel**: Swipeable `-mx-3` carousel with automatic 5-second interval rotation. Features discount code claims that deep-link to the target trip details.
* **Popular Expeditions Carousel**: Horizontal scroll cards containing:
  * Wishlist heart bookmark toggle (syncs with local storage).
  * Coverage image, difficulty badge (`Easy` - green, `Moderate` - orange, `Difficult` - red).
  * Price formatting, location coordinates, ratings count, and average score.
* **AI Recommendations Engine**: Smart-matches treks by filtering difficulty depending on user profiles:
  * `Beginner` Experience -> `Easy` hikes only.
  * `Intermediate` Experience -> `Easy` or `Moderate` hikes.
  * `Advanced` Experience -> `Moderate` or `Difficult` hikes.
  * Display matches are further tailored dynamically to the user's `fitnessLevel` (e.g., Low, Moderate, High).
* **Trending Destinations Grid**: Matches regional grid items to run target search queries on the Explore page.
* **Notification Drawer overlay**: Absolute slide-in panel displaying transactional updates (Bookings, updates, payment ledger info) and "Clear All" logic.
* **Dark Mode Switch**: Theme preference toggler.

### D. Explore and Search View (`/explore`)
* **Real-time Query Filter**: Synchronized input checking trip names, states, cities, and categories.
* **List View**: Displays all matching card items without solid borders, utilizing harmony shadows.

### E. Trip Details View (`/trip/:tripId`)
* **Structure**: Full-screen slide-over panel.
* **Gallery Image Selector**: Interactive carousel indicator dots.
* **Dynamic Tab Capsule**: Animates using shared `layoutId` between:
  * **Overview**: Trek length, max altitude, difficulty rating, and detailed descriptions.
  * **Guide**: Local trekking agency credentials, guide badge, and verification status.
  * **Reviews**: User comments list with average ratings rating score calculators.
  * **FAQs**: Framer motion animated FAQ accordion drawers.
* **Call to Action**: Sticky footer button redirecting to booking flow.

### F. Booking Flow Wizard (`/book/:tripId`)
* **Step-by-Step Multi-wizard Dialog**:
  * **Step 1: Date Selection**: Select calendar slot date.
  * **Step 2: Hiker Count**: Increment/decrement quantity.
  * **Step 3: Services/Add-ons**: Toggle porter service, gear rental, and high-altitude health kit.
  * **Step 4: Invoice Summary**: Breaks down base fee, add-on costs, taxes, promo discounts, and calculates `finalAmount`.
  * **Step 5: Razorpay checkout simulation**: Executes payment simulation, updates the ledger, and creates new Booking status objects.
* **Actions Completed**: Appends booking object, posts two new notifications, initializes an automated welcome chat with the trip organizer, and redirects user to `/bookings`.

### G. Bookings Dashboard (`/bookings`)
* **Segmented Filter Tabs**: Upcoming, Completed, and Cancelled list sections.
* **Direct Organizer Chat Drawer**: Open communication channel simulation connecting hiker to verified trek organizer.
* **Review Submission Popup**: Users can rate trek guides (1-5 stars) and write comments which instantly updates ratings.

### H. Booking Details View (`/booking/:bookingId`)
* **Detailed Ticket**: Accessible via cards under `/bookings`.
* **Action Footer**:
  * **Download Invoice**: Ledger statement print simulation.
  * **Chat Guide**: Opens direct console organizer chat.
  * **Cancel Slot**: Updates booking status field value to `Cancelled` and sends notification alert.
  * **Rate Hike**: Instantly logs reviews.

### I. Wishlist (`/wishlist`)
* **Bookmarked Expeditions**: Lists all treks bookmarked by the user.

### J. Profile Settings (`/profile`)
* **User Profile Form**: Fields for Avatar, Name, Email, Mobile, Age, Gender, Hiking Experience level, Fitness level, and Emergency Contact.
* **Actions**: Restart onboarding walkthrough, or Logout (resets state variables and navigates back to login view).

---

## 3. Underlying Data Models & Storage Schema

All states are persisted to `localStorage` under specific keys:
1. **User State (`spyhike_user_state`)**:
   ```json
   {
     "isAuthenticated": false,
     "isOnboarded": false,
     "name": "",
     "email": "",
     "mobile": "",
     "age": 24,
     "gender": "Male",
     "avatar": "url",
     "hikingExperience": "Beginner",
     "fitnessLevel": "Moderate",
     "emergencyContact": "",
     "rememberMe": false
   }
   ```
2. **Wishlist State (`spyhike_wishlist`)**: Array of trip IDs: `["trip-1", "trip-3"]`
3. **Bookings List (`spyhike_bookings`)**:
   ```json
   {
     "id": "b-1729000000000",
     "bookingId": "SH-9821-XP",
     "tripId": "trip-1",
     "tripName": "Kedarkantha Winter Peak",
     "coverImage": "url",
     "selectedDate": "2026-10-12",
     "hikersCount": 2,
     "finalAmount": 18500,
     "status": "Upcoming", // "Upcoming", "Completed", "Cancelled"
     "organizerName": "Himalayan Guides Ltd",
     "basePrice": 9000,
     "addOnsCost": 500
   }
   ```
4. **Notifications (`spyhike_notifications`)**:
   ```json
   {
     "id": "n-1729000000000",
     "title": "Permit Slot Secured!",
     "content": "Message content...",
     "timestamp": "ISO-String",
     "type": "Booking", // "Booking", "Payment", "Updates"
     "read": false
   }
   ```
5. **Chats (`spyhike_chats`)**:
   ```json
   {
     "tripId": "trip-1",
     "organizerName": "Himalayan Guides Ltd",
     "organizerAvatar": "url",
     "messages": [
       {
         "id": "msg-1",
         "sender": "organizer", // "user" or "organizer"
         "text": "Hello there!",
         "timestamp": "ISO-String"
       }
     ]
   }
   ```

---

## 4. Past Refactoring & Architecture Upgrades

* **TypeScript to JavaScript Conversion**: Converted the entire codebase to standard JS/JSX to eliminate build steps.
* **Shadow-Based Borderless Design**: Transitioned aesthetics to clean, premium harmony shadows.
* **Framer Motion Integration**: Implemented accordion drawers, slide-over views, and shared `layoutId` indicators.
* **Frameless Locked Scroll**: Fixed scroll containers and disabled body scrollbars to lock bottom navigation.
