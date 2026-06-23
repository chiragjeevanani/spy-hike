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

### K. Organizer Profile View (`/organizer/:organizerName`)
* **Structure**: Full-screen slide-over panel.
* **Hero Header**: Profile avatar, verified status badge, total active hikes count, star rating, safety rating (100% safety log), experience (8+ years), and certified guide badge.
* **Navigation Sub-tabs**:
  * **About**: Dynamic description of organizer capabilities and agency bio.
  * **Gallery**: Grid of recent snapshots compiled from their tours.
  * **Trips**: List of active expeditions run by this organizer (tapping any card routes back to their Trip details page).

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
* **User Profile Page Redesign**: Simplified profile stats to a clean 2-column layout (Booked Hikes and Distance Explored). Replaced the static "My Badges & Achievements" section with a dynamic, context-appropriate Ticket/Explore banner (shows live ticket QR info for upcoming departures, or a Call-To-Action link routing to trip exploration if no bookings are upcoming).
* **Streamlined Booking Flow (3-Step Wizard)**: Compressed the user's booking engine from 5 steps down to 3:
  * **Step 1**: Date selection and Traveler count are selected together.
  * **Step 2**: Traveler details (coordinates) input.
  * **Step 3**: Checkout, payments, and promo coupons.
* **Confetti Popper Effect**: Developed a custom `ConfettiPopper` component utilizing Framer Motion to display a colorful particle burst animation when a discount code is successfully applied on the checkout page.
* **Organizer Panel Trip Image Gallery**: Added a multi-file upload & URL entry gallery manager in the trip posting panel ([TripFormView.jsx](file:///c:/Users/chira/OneDrive/Desktop/Appzeto/spy-hike/frontend/src/modules/organizer/components/TripFormView.jsx)), allowing organizers to upload and manage dynamic slider images.
* **Organizer Profile Settings Refinement**: Removed the dark/light mode toggle from the organizer profile settings menu to align with page simplicity.

---

## 5. Organizer Panel Flow Details
*(Module: `src/modules/organizer/` — Accessed at `/organizer/*`)*

### Routing & Framework Architecture
* **Routing Entry**: `main.jsx` detects paths starting with `/organizer` and dynamically boots the `OrgApp.jsx` engine.
* **HTML5 Navigation**: Direct url routing using the `pushState` / `popstate` browser events, ensuring clean URL mapping.
* **Mobile-Lock Viewport**: Encased within the `spyhike-org-viewport` mockup card frame to guarantee design constraints matching the mobile application.

### A. Organizer Onboarding Flow (`/organizer/onboarding`)
* **Trigger**: Prompts automatically on first visit when `organizer.isOnboarded` is `false`.
* **Deck Walkthrough Slides (4 Screens)**:
  * **Slide 1: Welcome**: Portal overview highlighting thousands of active hikers.
  * **Slide 2: Post & Manage**: Creating listings with custom itineraries, pricing, and add-ons.
  * **Slide 3: Track Bookings**: Live reservation trackers, communication channels, and billing.
  * **Slide 4: Verification**: Instructions for filing government ID types for security review.
* **Action**: Skipping or finishing updates the onboarding flag to `true` and pushes path to `/organizer/login`.

### B. Organizer Authentication Flow (`/organizer/login` and `/organizer/register`)
* **Independent Routes**: Dedicated views for `/organizer/login` and `/organizer/register`.
* **Login Form**:
  * Fields: Email, Password.
  * Verification: Authenticates against `spyhike_org_accounts` records. Includes quick-fill demo partner credentials (`demo@himalayan.com` / `organizer123`).
  * Navigation Route: Approved profiles access the Dashboard (`/organizer/dashboard`), while unverified registrations go to Pending Approval (`/organizer/pending`).
* **Multi-Step Registration Wizard (3 steps)**:
  * **Step 1: Account Setup**: Input Full Name, Email, Mobile, Password.
  * **Step 2: Agency Details**: Input Agency Name, Website, Experience Years, and Agency Bio description.
  * **Step 3: Documents Review**: Dropdown choice for government credentials (Aadhaar, PAN, GST, Passport, TIN) and ID Number text.
  * **Action**: Saves registration state under `isPendingApproval: true`, updates accounts database, and redirects to pending view.

### C. Pending Approval View (`/organizer/pending`)
* **Trigger**: Activated for unapproved registrations.
* **Status Checklist UI**: Step-tracker mapping the verification steps (Application Submitted → Documents Under Review → Admin Verification → Go Live).
* **Demo Status Bypass**: Provides a "Check Approval Status" action button that simulates admin validation, updating `isApproved: true` and loading the dashboard.

### D. Dashboard (`/organizer/dashboard`)
* **Overview Analytics Grid (2x2)**: Displays cards for Total Revenue (₹), Live Trips, Upcoming Slots, and Avg Rating.
* **Quick Actions**: Tapping "Post New Trip" loads the form builder. Tapping "View Bookings" launches reservations list.
* **My Hikes Preview**: Lists the 3 most recently created expeditions with active status badges.
* **Upcoming Bookings Preview**: Quick look card list detailing traveler counts and totals for upcoming departures.
* **Notifications Bell**: Drawer displaying coordinator updates. Clicking triggers clear-all.

### E. Trip Management (`/organizer/trips`)
* **List View**: Displays all organizer's active, draft, or paused trips with cover image thumbnails, metadata values, and seat count progress meters.
* **Real-time Query Filter**: Input bar matching trip names and locations.
* **Status Category Filter**: Category pills selecting All, Published, Draft, or Paused items.
* **CRUD Triggers**: Action controls to Edit (`/organizer/trips/:id`), toggle status (Draft -> Published -> Paused), and Delete (with confirmation alert).
* **Shared Storage Synchronization**: Published trips are synced into user `spyhike_trips` to immediately update user explore grids.

### F. Trip Form Builder (`/organizer/trips/new` and `/organizer/trips/:id`)
* **Multi-Tab Navigation Capsules**:
  * **Basic Info**: Name, Location (City, State, Full location details), Cover Image upload/URL input (converts uploaded files to base64 with preview), Multi-Image Gallery manager (allows file uploads or pasting multiple URLs to populate the trip details slider, complete with preview grid and trash icons), and description.
  * **Trip Details**: Price per person, Duration, Group Size, Available Seats, Distance, Max elevation, Difficulty (Easy, Moderate, Difficult), Category pills, and dynamic Highlights builder (adding/removing lines).
  * **Inclusions**: Dynamic list elements for Included items, Not Included items, and cancellation policy rules.
  * **Itinerary**: Day-by-day builder to configure day index, title, and descriptions.
  * **FAQs**: Accordion QA constructor tool.
* **Actions**: "Save Draft" (Draft status) and "Publish Trip" (Published status).

### G. Bookings Management (`/organizer/bookings`)
* **Segment Filters**: All, Upcoming, Completed, and Cancelled reservations.
* **Details Drawer**: Clicking any booking card slides up a bottom drawer showing full invoices, traveler details (names, ages, genders), and emergency contact coordinates.
* **Search**: Real-time filter matching hiker names or booking IDs.

### H. Chat / Messaging (`/organizer/chats`)
* **Hiker Thread List**: Displays open traveler communications with last message preview and unread counts.
* **Messaging View**: Coordinates conversation bubble threads with orange text blocks for organizer replies.
* **Traveler Replies Simulation**: Sending a message triggers an automated mock response from the traveler after 2-3 seconds to simulate interactive coordination.

### I. Profile & Settings (`/organizer/profile`)
* **Stats Cards**: Trips Posted, Total Bookings, Avg Rating, Years Experience.
* **Metadata Fields**: Agency name, mobile, email, and website.
* **Edit Profile Modal**: Overlay dialog to modify Name, Agency Name, Mobile, Website, Bio, Experience, and Core Capabilities list.
* **Logout**: De-authorizes the session and routes back to login.

---

## 6. Organizer Panel Storage Schema

All organizer states use separate localStorage keys (prefixed `spyhike_org_`) to avoid conflicts with user app:

1. **Organizer User State (`spyhike_org_user`)**:
   ```json
   {
     "isAuthenticated": false,
     "isOnboarded": false,
     "isApproved": false,
     "isPendingApproval": false,
     "name": "",
     "email": "",
     "mobile": "",
     "agencyName": "",
     "agencyWebsite": "",
     "govtIdType": "Aadhaar",
     "govtIdNumber": "",
     "yearsExperience": 1,
     "bio": "",
     "avatar": "url",
     "rating": 0,
     "totalTrips": 0,
     "totalBookings": 0
   }
   ```
2. **Organizer Trips (`spyhike_org_trips`)**: Array of trip objects (same schema as user `spyhike_trips` + `organizerEmail` field).
3. **Organizer Bookings (`spyhike_org_bookings`)**: Array of booking objects with `organizerEmail` scoping.
4. **Organizer Notifications (`spyhike_org_notifications`)**: Same notification schema as user app.
5. **Organizer Chats (`spyhike_org_chats`)**: Array of `{ tripId, tripName, userName, userAvatar, messages[] }`.
6. **Registered Accounts (`spyhike_org_accounts`)**: Array of all registered organizer accounts (includes hashed passwords for demo).

---

## 7. Admin Panel Reference Notes
*(For use when building the Admin Panel)*

### Key Admin Responsibilities
1. **Review & Approve Organizer Applications**: Admin sets `isApproved: true` for organizer accounts pending approval.
2. **Trip Moderation**: Admin can view, pause, or remove any trip across all organizers.
3. **Booking Oversight**: View all bookings across user and organizer apps.
4. **User Management**: View all registered users, manage flags or bans.
5. **Revenue Dashboards**: Aggregate revenue across trips and organizers.
6. **Notification Broadcasts**: Send platform-wide promo or alert notifications.

### Shared localStorage Keys (Admin needs read access to all)
- `spyhike_user` — User profile
- `spyhike_bookings` — User bookings
- `spyhike_trips` — All published trips (shared between user and organizer)
- `spyhike_notifications` — User notifications
- `spyhike_org_user` — Current organizer profile
- `spyhike_org_accounts` — All organizer accounts
- `spyhike_org_trips` — Organizer-specific trips
- `spyhike_org_bookings` — Organizer bookings

### Admin Panel Routes (Suggested)
- `/admin` — Admin dashboard with key metrics
- `/admin/login` — Admin login (separate credentials)
- `/admin/organizers` — List all organizer applications with Approve/Reject actions
- `/admin/trips` — All trips across all organizers
- `/admin/users` — All registered users
- `/admin/bookings` — All bookings
- `/admin/analytics` — Revenue and engagement charts

