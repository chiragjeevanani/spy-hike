# Find Your Trek — Backend Context & Reference

> **Purpose of this file.** This is the single source of truth for the **backend** work on
> Find Your Trek (formerly "Trekigo", formerly "Spy Hike" — the project has been rebranded more than
> once throughout the codebase; storage keys still use the `trekigo_` prefix from the last rename
> and were intentionally left as-is — see §2). The frontend is built and maintained separately. This document captures what the
> app is, how it works, the business logic, the data contracts the frontend already expects, the
> gaps the backend must fill, and the locked technical decisions. Read this first before touching
> the backend.

_Last updated: 2026-07-09 — full rewrite. All three frontend modules (Customer, Organizer, Admin)
are now fully built. Everything still runs on localStorage; there is no backend/API of any kind
yet._

---

## 1. What Find Your Trek is

Find Your Trek is a **premium, mobile-first adventure/travel booking platform** — a three-sided
marketplace. Customers ("hikers") browse and book treks, hikes, camping, adventure tours, nature
walks, and weekend trips. "Organizers" are partner agencies who list these experiences at their
own prices. The platform (via Admin) takes a commission on each booking.

| Module | Audience | Frontend status | Backend status |
|---|---|---|---|
| **Customer App** (`/app`) | End users / hikers | ✅ Fully built, still actively evolving | ❌ Not started — localStorage mock |
| **Organizer Panel** (`/organizer`) | Partner agencies who list trips | ✅ Fully built | ❌ Not started — localStorage mock |
| **Admin Panel** (`/admin`) | Platform owner / operators | ✅ Fully built | ❌ Not started — localStorage mock |

All three are now real, navigable, feature-complete-looking mini-SPAs. The backend must serve all
three — there is no "smallest module" left to punt on.

---

## 2. Current state of the codebase

- **Frontend only**, at `frontend/`. Repo root also has `PROGRESS.md` (a running frontend
  changelog/architecture log — useful cross-reference) and this file.
- **Stack:** React 19 + JS/JSX + Vite 6, Tailwind CSS v4, Framer Motion (`motion/react`), Recharts
  (admin charts), Leaflet + OpenStreetMap/Nominatim (organizer map picker), `@zxing/browser` (QR/
  barcode scanning). Routing in every module is **custom**, driven by `window.history.pushState`/
  `popstate` — no router library anywhere.
- **Three independent mini-SPAs, one repo:** `frontend/src/modules/{user,organizer,admin}/`, each
  with its own `App.jsx`, `components/`, and (user/organizer/admin) `utils/storage.js`. A path
  prefix (`/app`, `/organizer`, `/admin`) picked in `main.jsx` decides which module boots.
  `frontend/src/modules/landing/` is the public marketing page with links into `/app` and
  `/organizer`.
- **Shared cross-module utilities** live at `frontend/src/utils/`: `loyalty.js` (rewards/voucher
  engine for both customer and organizer sides) and `coupons.js` (admin-managed discount coupons,
  consumed at customer checkout). These are the closest thing to real shared "services" in the
  codebase today.
- **All data is mocked in `localStorage`.** There are **no network/API calls** anywhere in the
  frontend. `express`/`dotenv` in `frontend/package.json` are only used to serve the built bundle
  in production, not as an app backend.
- **Rebrand history:** the project's localStorage keys were renamed from `spyhike_*` to `trekigo_*`
  early on, then the product itself was rebranded again to "Find Your Trek" — but the storage keys
  were deliberately **left as `trekigo_*`** during that second rename (an internal implementation
  detail invisible to users; renaming it would only risk breaking existing sessions for no visible
  benefit). **Any new backend work should keep using `trekigo_*` for storage/token keys** — the
  brand name shown to users, email domain, and demo credentials are "Find Your Trek" /
  `findyourtrek.com`.
- **Organizer is a real, authenticated entity now** (not just an embedded `{name, avatar, rating,
  verified}` object) — full registration/KYC-collection flow, own profile, own dashboard. However,
  trips still only embed a **denormalized snapshot** of the organizer (`trip.organizer = {name,
  avatar, rating, verified}`) rather than a live reference, and the customer-facing organizer
  profile route is still keyed by **name**, not ID (see §12 — this is still an open integration
  constraint, not yet resolved by the frontend team).

### localStorage keys in use today (all three modules, consolidated)

| Key | Module | Contents |
|---|---|---|
| `trekigo_user` | Customer | Active user/session object |
| `trekigo_wishlist` | Customer | Array of trip IDs |
| `trekigo_bookings` | Customer (shared/global source of truth) | Array of booking objects |
| `trekigo_notifications` | Customer | Notification inbox |
| `trekigo_chats` | Customer | Chat threads (user ↔ organizer) |
| `trekigo_trips` | **Shared/global** (written by organizer module, read by customer + admin) | Array of trip objects — the canonical trip catalog |
| `trekigo_darkmode` | Customer | Theme bool |
| `trekigo_org_user` | Organizer | Active organizer profile/session |
| `trekigo_org_trips` | Organizer | Organizer-scoped mirror of trips (kept in sync with `trekigo_trips` on every save/delete) |
| `trekigo_org_bookings` | Organizer | Organizer-scoped mirror of bookings |
| `trekigo_org_notifications` | Organizer | Organizer notification inbox |
| `trekigo_org_chats` | Organizer | **Dead/unwired** — `OrgChatsView` + its storage helpers exist but nothing renders/calls them |
| `trekigo_org_darkmode` | Organizer | Theme bool (default `true`) |
| `trekigo_org_payouts` | Organizer | Payout request history |
| `trekigo_org_accounts` | Organizer | Registration-time account list (`{email,password,name}`) — **not actually read by any login code** (see §8) |
| `trekigo_org_support_tickets` | Organizer | Help & Support ticket list (own key, bypasses `utils/storage.js`) |
| `trekigo_admin_user` | Admin | Admin session object |
| `trekigo_admin_darkmode` | Admin | Theme bool (default `false` — admin is light-mode-first) |
| `trekigo_admin_user_overrides` | Admin | Per-email field patches onto hiker records |
| `trekigo_admin_created_users` | Admin | Hikers created directly by admin |
| `trekigo_admin_deleted_users` | Admin | Soft-delete set (emails) for hikers |
| `trekigo_admin_broadcasts` | Admin | Sent-announcement history |
| `trekigo_commission_rate` | **Admin-set, customer-read** (plain stringified number, not JSON) | Global commission %, default `10` |
| `trekigo_coupons` | **Admin-managed, customer-read** | Array of coupon objects (see §6.5) |
| `trekigo_loyalty_config` | **Admin-managed, customer+organizer-read** | Rewards program config for both sides |
| `trekigo_loyalty_customer_vouchers` | Shared | Customer free-booking voucher ledger |
| `trekigo_loyalty_org_vouchers` | Shared | Organizer zero-commission voucher ledger |

Two notable **cross-module coupling smells** the backend should eliminate by having one canonical
collection per entity instead of synced mirrors:
- Trips exist in both `trekigo_trips` and `trekigo_org_trips`, manually kept in sync by the
  organizer module on every write.
- Bookings exist in both `trekigo_bookings` and `trekigo_org_bookings`, similarly synced (and
  admin's `loadAllBookings()` merges + de-dupes both by `bookingId`).
- The organizer module also reaches directly into the *customer* module's `trekigo_user` key on
  organizer logout (to prevent an auto-bounce-back-in), and the QR scanner reads `trekigo_bookings`
  directly (not just its own mirror).

---

## 3. Locked technical decisions

- **Backend runtime/framework:** **Node.js + Express.**
- **Database:** **MongoDB** (document model — maps naturally to the nested trip JSON). Financial
  writes (bookings, commission, payouts, rewards) must use transactions (Mongo multi-document
  transactions / replica set) and an **append-only ledger pattern** for anything touching money.
- **Auth:** **Real JWT + role-based access** (`customer` | `organizer` | `admin`) now. **Stub** OTP
  (MSG91/Twilio), Google OAuth, and Razorpay **behind interfaces** so they can be swapped for live
  providers later without changing callers.
- **Scope/build order:** All three frontend modules already exist and are waiting on real data, so
  the plan is to build **all three APIs together, in phases**, rather than shipping Customer alone
  first (see the separate implementation plan for phase breakdown).

---

## 4. Core business logic & money flow

### 4.1 Commission model (now partially wired in the frontend — read this carefully)
Unlike the previous version of this doc, commission is **no longer purely conceptual** — it has a
real, live setting and is actually computed and displayed, just entirely client-side/simulated:

- **Admin → Settings** (`SettingsView.jsx`) has a real, persisted **Commission Rate** field
  (0–100%), stored as a bare stringified number at `localStorage['trekigo_commission_rate']`
  (default `10` if absent). This is the *only* genuinely wired-through admin setting in the entire
  app — everything else in Settings (profile edit, password change, maintenance mode toggle) is
  cosmetic/`alert()`-only and not persisted.
- **Customer → `BookingFlow.jsx`** reads that rate live at checkout and computes:
  ```js
  commissionRate   = Number(localStorage.getItem('trekigo_commission_rate')) || 0
  commissionAmount = finalPayAmount * commissionRate / 100
  ```
  and stores both fields on the created booking, plus (implicitly) `organizerPayout =
  finalAmount - commissionAmount` (computed on the fly everywhere it's displayed, never itself
  persisted as a field).
- **Organizer → Financials/Dashboard/Bookings views** all fall back to a **hardcoded 10%**
  wherever a booking doesn't already carry an explicit `commissionAmount`:
  `commissionOf(b) = b.commissionAmount ?? b.finalAmount * 0.1`. This literal `0.1` is duplicated
  in at least 3 organizer files and does **not** read the admin's live commission-rate setting —
  i.e. **today the admin's commission-rate setting and the organizer-side fallback constant can
  silently disagree** if the admin ever changes the rate. The backend should have exactly one
  source of truth for commission % (admin-configurable, ideally per-booking snapshotted at
  creation time so historical bookings don't retroactively change value if the rate changes later).
- **Zero-commission override:** when an organizer redeems a loyalty voucher onto a specific
  `Upcoming` booking, that booking's `commissionAmount` is explicitly set to `0` and
  `loyaltyRewardApplied: true` is flagged — this must always win over the rate-based calculation.
- Commission is invisible to the customer (never shown in customer-facing checkout UI).

### 4.2 Pricing math (current frontend behavior — `BookingFlow.jsx`)
The pricing model is now **tiered**, not flat — this is a real change since the last version of
this doc:
```
Per traveler-type tier (from trip.pricingTiers, e.g. Solo / Couple / Group of 4+):
  tierSubtotal = tierCount × (tier.price + pickupAddOn)
baseCostTotal  = sum(tierSubtotal across all selected tiers)
discount       = coupon-driven — see §4.6 (flat ₹ or % , optionally capped, optional min-booking gate)
tax            = round((baseCostTotal − discount) × 0.05)   // "Taxes & Environmental Insurance (5% GST)" — hardcoded, NOT admin-configurable anywhere
final          = baseCostTotal − discount + tax
commission     = final × commissionRate / 100                // see §4.1
organizerPayout= final − commission
```
- `pickupAddOn` is the trip's single `pickup.price` (one boarding city, one flat per-person
  transport fee), added on top of the tier price per traveler — **only** when the trip actually
  has `pricingTiers` (legacy/seed trips without tiers use a flat fallback price with no separate
  pickup add-on, to avoid double-counting).
- Tax is a flat 5%, hardcoded in the frontend, **not** an admin setting (unlike commission).

### 4.3 Target-based rewards (loyalty program — now built on both sides)
Real, working (client-side) implementation exists — not just a suggestion anymore:
- **Customer side:** every `thresholdPersons` (admin-configurable, default 30) cumulative
  travelers booked (across any treks, summed from non-cancelled bookings) earns one **free-booking
  voucher**, redeemable at checkout in place of payment (zeroes tax and final amount).
- **Organizer side:** every `thresholdBookings` (admin-configurable, default 1000) lifetime
  bookings received via the app earns one **zero-commission voucher**, redeemable onto any single
  `Upcoming` booking (zeroes that booking's commission).
- Vouchers are minted lazily (`floor(lifetime / threshold)` vs. vouchers already issued) every time
  the relevant dashboard loads — idempotent, but entirely client-computed with no server
  authority. A real backend should own this as a proper milestone/ledger service instead of
  re-deriving it from whatever's in the browser's localStorage.
- Both sides support enable/disable + editable reward title/description/promotional banner (image
  + title + subtitle), managed entirely from **Admin → Loyalty**.

### 4.4 Refunds & cancellation
Still **not implemented** — a trip carries a `cancellationPolicy: string[]` (human-readable rules
only, e.g. "Full refund up to 15 days before"). Cancelling a booking (customer or admin) just flips
`status` to `Cancelled` and (customer side) sends a notification — **no refund amount is
computed anywhere**, and no money actually moves in either direction. The backend must turn this
into structured, policy-driven refund computation based on days-before-departure.

### 4.5 Seat / inventory
Still **not implemented**, confirmed on both sides of the marketplace now:
- Trips carry `availableSeats`/`totalSeats`/`maxGroupSize`, but **nothing anywhere in the codebase
  ever decrements them** — not customer checkout, not the organizer's own booking creation path.
- **There is no per-departure-date seat inventory.** `departureDates: string[]` is just a flat list
  of dates the organizer can toggle on/off when creating a trip (via a calendar picker) — capacity
  is a single trip-level number, not tracked per batch/date. The backend needs to decide/design a
  real `departures`/`batches` collection with its own seat counter if oversell prevention matters.

### 4.6 Coupons — now fully data-driven (this is new — previously hardcoded)
Coupons are **no longer hardcoded** in `BookingFlow.jsx`. There is now a real, admin-managed CRUD
system:
- **Admin → Coupons** (`CouponsView.jsx` + `frontend/src/utils/coupons.js`) lets the admin create/
  edit/delete coupons with: `type` (`flat` ₹ or `percentage` %), `value`, an optional
  `maxDiscount` cap (percentage type only), an optional `minBookingAmount` gate, and a required
  `expiresAt` date.
- **Auto-expiry:** any coupon whose `expiresAt` has passed is automatically flipped to `status:
  'Expired'` the next time coupons are loaded (self-healing on every read, no cron needed
  client-side — a real backend equivalent would want either a scheduled job or lazy-check-on-read
  the same way).
- **Manual Active ⇄ Inactive toggle**, but an `Expired` coupon can only be revived by editing its
  expiry to a future date (not by the toggle).
- Customer checkout calls `validateCouponCode(code, bookingAmount)` which enforces status +
  min-booking-amount, computes the discount (flat, or % optionally capped), and never discounts
  more than the booking total. `usedCount` increments on successful payment.
- 3 seed coupons ship pre-loaded: `FYT20` (20%), `VALLEY50` (₹50 flat), `GHATS15` (15%) —
  these back the promo banners shown on the customer home feed.

---

## 5. Domain model (proposed MongoDB collections)

Derived from the current frontend data shapes across all three modules. IDs should be real
ObjectIds, but **API responses must remain shape-compatible with the frontend** (see §6).

- **users** — hikers. `name, email, mobile, age, gender, avatar, hikingExperience
  (Beginner|Intermediate|Advanced), fitnessLevel (Low|Moderate|High), emergencyContact,
  isOnboarded, isAuthenticated, status (Active|Banned), bookingsCount, joinedDate`. Backend adds:
  `passwordHash, role: 'customer', createdAt`.
- **organizers** — a real, first-class entity now (not just embedded). Fields seen across
  registration + profile + admin management: `name, email, mobile, agencyName, agencyWebsite,
  socialMediaLink, govtIdType (Aadhaar|PAN|GST|Passport|TIN), govtIdNumber, yearsExperience, bio,
  coreCapabilities: string[], avatar, rating, totalTrips, totalBookings, isApproved,
  isPendingApproval, isRejected?, bankDetails { accountHolderName, bankName, accountNumber, ifsc,
  upiId, panNumber }`. Backend adds: `passwordHash, role: 'organizer', commissionOverride?,
  walletBalance, createdAt`. **Note:** the frontend's own "instant self-approval" demo shortcut
  (Pending Approval screen's "Check Approval Status" button) and the admin's separate real
  Approve/Reject workflow both toggle `isApproved`/`isPendingApproval` but are not obviously wired
  to the same underlying record in the current client-only implementation — the backend should
  make this genuinely one record with one real approval path (admin-only), and drop the
  client-side self-approval shortcut entirely.
- **trips** — see §6.1 for the full field list. Reference `organizerId` + `categoryId`, but the
  API must **also** return the embedded `organizer {name, avatar, rating, verified}` snapshot
  shape the frontend already expects (§12). `pricingTiers[]` (freeform label + per-person price,
  at least one required), `pickup {location, price}` (single boarding point + flat per-person
  transport fee), `startPoint {lat, lng, label}` (exact trek start pin), `departureDates:
  string[]`, `status (Draft|Published|Paused)`.
- **departures / batches** — per-trip dated slots with **real** seat inventory (new; today
  `departureDates` has no inventory attached at all — see §4.5).
- **bookings** — see §6.2. Backend adds `commissionRate` (snapshotted at booking time, not
  recomputed later), `commissionAmount, organizerPayout, paymentStatus, paymentRef,
  refundAmount, userId, organizerId, loyaltyRewardApplied`.
- **reviews** — `tripId, userId, userName, userAvatar, rating (1–5), comment, date`.
- **coupons** — matches §4.6 exactly: `code, type (flat|percentage), value, maxDiscount,
  minBookingAmount, expiresAt, status (Active|Inactive|Expired), usedCount`.
- **notifications** — `title, content, timestamp, type (Booking|Payment|Promo|System|Updates),
  read`, scoped per-user or per-organizer.
- **chats** — `tripId, organizerId (or userId, from the other side), messages[{id, sender
  (user|organizer), text, timestamp}]`. Note: the **organizer-side chat UI (`OrgChatsView`) exists
  in the codebase but is completely unwired** — not reachable from any nav, not fed real data.
  Don't assume organizer-side chat is a finished/validated feature spec; treat it as
  incomplete/orphaned until the frontend team wires it up.
- **categories** — admin-managed. Current `CATEGORIES_LIST`: Trekking, Hiking, Camping, Adventure
  Tours, Nature Walks, Weekend Trips (customer side); organizer's own trip form uses a slightly
  different set (`Trekking, Summit, Desert, Camping, Wildlife, Cultural`) — **these two category
  lists currently disagree** and should be reconciled into one canonical list.
- **adminConfig** — commission % (real setting today, see §4.1), reward rules/thresholds (real,
  see §4.3), coupons are their own collection now (not part of config), feature flags. Tax % is
  **not** currently admin-configurable anywhere (hardcoded 5% in the frontend) — worth deciding
  whether the backend should make it configurable too, for parity with commission.
- **ledger / transactions** — append-only money movements (booking income, commission, payout,
  refund, reward) per organizer/platform. Not present in the frontend at all (organizer
  "Financials" view computes everything on the fly from the bookings array, not from a ledger).
- **payouts** — organizer payout requests + settlement history. A frontend shape already exists
  (simulated): `{id, amount, method (UPI|Bank Transfer), status (Processing|Paid), requestedAt,
  completedAt, utr}` — payouts go `Processing` → (fake 2.2s timer) → `Paid` client-side today, no
  real settlement.
- **supportTickets** — new, organizer-only today: `{id, title, category, status (Open|Resolved),
  timestamp}`. Categories: `Payouts & Commission | Trip Listing Issue | Booking / Cancellation |
  Account / Verification | Other`.

---

## 6. Frontend data contracts (API must match these)

Backend responses should **match the existing object shapes** so the frontend can swap
`localStorage` helpers for API calls with minimal churn. These are the authoritative shapes today
across all three modules.

### 6.1 Trip object (organizer-authored via `TripFormView.jsx`; read everywhere)
```
id, organizerEmail,
organizer { name, avatar, rating, verified },     // denormalized snapshot — see §12
name, location, state, city,
pricingTiers [{ id, label, price }],              // e.g. Solo/Couple/"Group of 4+", per-person price; ≥1 required
pickup { location, price },                       // single boarding city + flat per-person transport fee
startPoint { lat, lng, label } | null,             // exact trek start pin (Leaflet/Nominatim-picked)
departureDates [ "YYYY-MM-DD" ],                  // flat list, no per-date inventory (see §4.5)
price,                                             // = pickup.price; used as the trip's headline "from ₹"
difficulty (Easy|Moderate|Difficult), durationDays, maxGroupSize, availableSeats,
distanceKm, elevationMeters,
category,                                          // ⚠️ organizer form's category set ≠ customer CATEGORIES_LIST — reconcile (see §5)
coverImage, galleryImages[],                       // URLs or base64 data: URIs from client-side FileReader
description, highlights[], included[], notIncluded[], safetyGuidelines[], cancellationPolicy[],
itinerary [{ day, title, description }],
faqs [{ question, answer }],
status (Draft|Published|Paused),
rating, reviewsCount, reviews[{ id, userName, userAvatar, rating, comment, date }],
createdAt, updatedAt
```
Also exported from `modules/user/data/trips.js`: `CATEGORIES_LIST`, `PROMOTIONAL_BANNERS`
(`{id,title,subtitle,tag,discount,code,img,tripId}`), `TRENDING_DESTINATIONS`
(`{id,name,state,hikes,img}`).

### 6.2 Booking object
```
id, bookingId (e.g. "TG-9821-XP"),                // frontend still fabricates this client-side — backend should own the format
tripId, tripName, tripImage, tripLocation,
organizerEmail, organizerName,
userEmail, userName,
bookingDate, selectedDate,
travelersCount,
travelers [{ name, age, gender, emergencyContact }],
travelerBreakdown [{ id, label, count, perPersonPrice, subtotal }],   // per-tier breakdown, new
pickupLocation, pickupPrice,
couponUsed, couponDiscount,
taxAmount, finalAmount,
commissionRate, commissionAmount,                  // see §4.1 — should be snapshotted at booking time
loyaltyRewardApplied,
status ("Upcoming" | "Completed" | "Cancelled")
```

### 6.3 User (customer) object
```
isAuthenticated, isOnboarded, name, email, mobile, age, gender, avatar,
hikingExperience, fitnessLevel, emergencyContact, rememberMe
```

### 6.4 Organizer object (own profile/session — distinct from the trip's embedded snapshot)
```
isAuthenticated, isOnboarded, isApproved, isPendingApproval,
name, email, mobile, agencyName, agencyWebsite, socialMediaLink,
govtIdType (Aadhaar|PAN|GST|Passport|TIN), govtIdNumber,
yearsExperience, bio, coreCapabilities[], avatar,
rating, totalTrips, totalBookings,
bankDetails { accountHolderName, bankName, accountNumber, ifsc, upiId, panNumber }
```

### 6.5 Coupon object — see §4.6 for full behavior
```
id, code, type (flat|percentage), value, maxDiscount, minBookingAmount,
expiresAt, status (Active|Inactive|Expired), usedCount, createdAt, updatedAt
```

### 6.6 Loyalty config + voucher objects — see §4.3
```
Config.customer { enabled, thresholdPersons, rewardTitle, rewardDescription, banner {enabled,image,title,subtitle} }
Config.organizer { enabled, thresholdBookings, rewardTitle, rewardDescription, banner {...} }
Voucher { id, earnedAt, milestoneNumber, status (available|used), usedRef, usedAt? }
```

### 6.7 Payout object (organizer) — see §5
```
{ id, amount, method (UPI|Bank Transfer), status (Processing|Paid),
  requestedAt, completedAt, utr }
```

### 6.8 Notification / Chat / Support Ticket — see §5 and `PROGRESS.md` for exact shapes.

---

## 7. Customer app feature map

Routes use custom History-API routing. Source: `frontend/src/modules/user/App.jsx` + components.

| Feature / route | Frontend behavior | Backend responsibility |
|---|---|---|
| **Onboarding** | First-visit slide deck; sets `isOnboarded` | Persist onboarding flag on user |
| **Auth** `/login`, `/register` | Email/password, Mobile OTP (`1234`/`123456`), Google — all simulated. Also carries the **Organizer role toggle** (see §8) | Real JWT + register/login; stub OTP & Google behind interfaces |
| **Home** `/` | Greeting, categories, promo carousel, popular carousel, AI recommendations (difficulty matched to `hikingExperience`/`fitnessLevel`), trending destinations, notifications drawer, dark mode | Serve trips/categories/banners/destinations; notifications API |
| **Explore/Search** `/explore` | Client-side filter over name/state/city/category | Server-side search/filter + pagination |
| **Trip Details** | Tabs: Overview / Itinerary / Checklist / Reviews; shows tiered "Batch Pricing" | `GET /trips/:id` (full object incl. reviews + pricingTiers) |
| **Booking Wizard** | 3 steps: date + tiered traveler-type counts → traveler details → coupon + checkout (payment simulated) | Create order, validate coupon, compute pricing + commission + payout, decrement seats, persist booking, stub Razorpay, emit notifications |
| **Bookings** | Tabs Upcoming/Completed/Cancelled; organizer chat drawer; review submission | List bookings by user; chat persistence; create review |
| **Booking Details** | Download invoice (sim), chat, cancel (→ `Cancelled` + notification), rate | Booking detail; cancel + refund computation; invoice generation; review |
| **Wishlist** | Bookmarked trip IDs | Persist wishlist per user |
| **Profile** | Edit profile, restart onboarding, logout | Update user; auth/session |
| **Organizer Profile** (customer-facing) | Slide-over; bio/gallery/stats synthesized; trips filtered by `organizer.name` | Real organizer entity + profile API, keyed by name **and** ID (§12) |

---

## 8. Organizer Panel feature map (now fully built — see full catalog notes below)

Module: `frontend/src/modules/organizer/`, routes under `/organizer/*`. Desktop bezel-free, mobile
mockup frame like the customer app.

| Feature / route | Frontend behavior | Backend responsibility |
|---|---|---|
| **Onboarding** | 4-slide static walkthrough | Persist onboarding flag |
| **Registration** (3-step wizard, `/organizer/register`) | Personal info → agency details → KYC doc type/number (no file upload despite copy claiming review) | Real organizer registration, real KYC file upload + admin review queue |
| **Login** | ⚠️ **Does not live in this module** — happens on the *shared* `/app/login` screen (customer module's `Auth.jsx`), which has an Organizer/Traveller role toggle. Only one hardcoded demo account can pass the Organizer gate; logging in this way yields an **already-approved** organizer, bypassing KYC/pending entirely | Real, unified auth service with proper roles — the current two-path (register-flow pending vs. shared-login instant-approve) split must be resolved into one real approval flow |
| **Pending Approval** | Static KYC status tracker + a demo-only "Check Approval Status" button that **instantly self-approves**, no real admin round-trip | Must be removed/replaced — approval should only ever happen via Admin |
| **Dashboard** | Net/gross revenue, live trip count, upcoming slots, avg rating, loyalty banner, previews | Aggregation queries |
| **Trip Management** (list, create, edit) | Full CRUD via `TripFormView.jsx` — see §6.1 for the exact contract (pricing tiers, pickup, start-point map, batch dates) | Trip CRUD API; validation matching current client-side rules (≥1 pricing tier, pickup required, startPoint required, ≥1 departure date) |
| **Bookings** | List + search/filter + detail drawer (traveler manifest, commission breakdown, loyalty-voucher redemption) | Bookings-by-organizer API; loyalty redemption endpoint |
| **Financials** (Overview/Statement/Payouts tabs) | Computes gross/commission/net/available-balance/pending-settlement entirely client-side from the bookings array; **simulated** payout request (`Processing`→`Paid` after 2.2s, fake UTR); bank/UPI details form; downloadable PDF report | Real ledger-backed financials; real payout request → settlement workflow; real bank/UPI validation |
| **Loyalty** | Progress ring + voucher ledger + redeem-to-booking flow (organizer side of §4.3) | Serve config + voucher ledger; redemption endpoint |
| **Chat** | **Built but completely unwired** — not reachable from nav, no real data flow | Don't build a matching API yet; flag to frontend team as an open item, not a locked spec |
| **Profile & Settings** | Edit profile (name, agency, bio, experience, core capabilities, social link); "Switch to Traveller"; logout | Update organizer profile; session handling |
| **Help & Support** | Support ticket submission (local-only today) + static FAQ | Real ticketing system (or at minimum persist submissions to a real inbox admin can see) |
| **QR/Barcode Scanner** | Camera-based scan of a booking code; looks up the booking (across two localStorage mirrors) and displays details; **no check-in state is ever recorded** — same ticket can be "verified" unlimited times | Backend should add a real check-in/redemption flag on the booking (`checkedInAt`, `checkedInBy`) so scanning is idempotent-safe and double-boarding-preventable — this is a genuine gap, not just a migration of existing behavior |

---

## 9. Admin Panel feature map (now fully built)

Module: `frontend/src/modules/admin/`, routes under `/admin/*`. Desktop-first (no mobile mockup
frame), light-mode-first, collapsible sidebar + fixed header.

| Feature / route | Frontend behavior | Backend responsibility |
|---|---|---|
| **Login** | Hardcoded demo credentials, no real backend | Real admin auth (JWT + `admin` role) |
| **Dashboard** | 6 KPI cards (users/organizers/trips/bookings/revenue/commission) computed from live data; **but all charts are 100% static demo data**, not derived from real storage | Real aggregation endpoints for both KPIs and the 4 charts (bookings-over-time, revenue-by-category, booking-status split, user-growth) |
| **Users** | Table + search/filters; Add/Ban/Unban/Delete/View | Full hiker CRUD + moderation |
| **Organizers** | Pending-approvals queue + full table; Approve/Reject/Suspend/Delete/View | Full organizer CRUD + **the real** KYC approval workflow (see §8 — this should become the *only* approval path) |
| **Trips** | Card grid + search/filters; view full itinerary modal; Publish/Pause toggle; Delete | Trip moderation API |
| **Bookings** | Table + search/filters; receipt modal (incl. computed organizer payout); Cancel; status update | Booking admin API incl. refund trigger on cancel (§4.4) |
| **Analytics** | **100% static demo charts** (`utils/mockData.js`) — not wired to real data at all | Real analytics endpoints (this view is currently the least "real" thing in the whole admin panel — treat as a from-scratch backend + frontend-reconnection job, not a migration) |
| **Broadcast** | Compose + send announcement (title/content/type/target); history table | Real notification broadcast + delivery (push/email/SMS per §10) |
| **Loyalty** | Config editor for both customer/organizer reward programs + banner image upload; read-only voucher counts | Config CRUD API; real image upload/storage (currently base64-inlined client-side) |
| **Coupons** | Full CRUD (§4.6) | Coupon CRUD API — this is the newest, most complete client-side spec to replicate faithfully |
| **Settings** | **Only the commission-rate field is real/persisted.** Profile edit, password change, maintenance-mode toggle are all cosmetic `alert()`s with no effect. Tax % is not here at all (hardcoded 5% elsewhere) | Real settings service: commission % (source of truth — see §4.1 discrepancy), consider adding tax % here too for parity, real profile/password change, real maintenance-mode flag the customer/organizer apps actually respect |

---

## 10. Gaps the backend must own (confirmed still true, some now more concrete)

1. **Single source of truth for commission %** — admin's live setting and the organizer-side
   hardcoded-10%-fallback currently disagree; fix by snapshotting `commissionRate` onto each
   booking at creation time from one authoritative config value.
2. **Real organizer approval workflow** — collapse the two currently-divergent paths (client-side
   self-approval demo button vs. admin's real approve/reject) into one.
3. **Real KYC document upload + review** (today: text fields only, no file, no verification).
4. **Seat/inventory management** with real per-departure-date capacity (today: trip-level counters
   that are never decremented anywhere).
5. **Policy-driven refund computation** on cancellation (today: display-only strings, no math, no
   money movement).
6. **Real payment** — Razorpay order creation + webhook verification (today: 2-second loader +
   fabricated booking ID/UTR on both the customer checkout and the organizer payout flow).
7. **Real check-in/redemption state** on bookings so the QR scanner can't "verify" the same ticket
   twice (today: pure read-only lookup, no write).
8. **Real auth everywhere** — OTP, Google, and even the admin login are simulated; JWT + roles
   needed across all three modules, replacing three independent hardcoded-credential gates.
9. **Server-side search/pagination**, **real notification delivery** (push/email/SMS — today
   everything is just a localStorage array), **review moderation**.
10. **Money ledger / transactions** (append-only) + **payouts** collection — today "Financials" is
    entirely recomputed on the fly from the bookings array, with no ledger backing it.
11. **Reconcile the two divergent category lists** (customer `CATEGORIES_LIST` vs. organizer trip
    form's category set).
12. **Decide the fate of organizer-side chat** — fully built UI, zero wiring; needs an explicit
    decision (finish it / cut it) rather than silently building an API for a dead feature.
13. **Real analytics** — the Admin Analytics view (and most of the Dashboard's charts) are static
    demo data today, not reading real storage at all.
14. **Admin Settings is mostly fake** — only commission % is real; profile edit, password change,
    and maintenance mode need real backing if they're to do anything.

---

## 11. Integration constraints (important — coordinate with the frontend team, don't unilaterally change shapes)

- The frontend still identifies organizers by **`organizer.name`** in the customer-facing profile
  route and trip-filtering logic, even though organizer is now a real authenticated entity
  elsewhere. The API must keep returning the embedded `organizer {name, avatar, rating, verified}`
  snapshot on each trip **and** support name-based lookup, until this is renegotiated with the
  frontend team.
- **Contract-first mindset:** match the shapes in §6 exactly so the frontend can swap its
  `localStorage` helpers (`loadX`/`saveX` across all three `utils/storage.js`-equivalents, plus the
  shared `utils/loyalty.js`/`utils/coupons.js`) for API calls with minimal churn.
- The frontend `bookingId` format is `TG-XXXX-X` (e.g. `TG-3301-A`). Recommend the backend owns
  this format going forward and returns it, so the client stops fabricating it.
- Coupons and loyalty config are the two areas where the frontend has *just* been made
  properly data-driven (backed by real CRUD, just still client-side) — treat these two as the
  closest thing to an already-agreed API contract; matching them closely will minimize rework.
- Three known **frontend-side inconsistencies to flag, not silently "fix" unilaterally**:
  commission-rate source-of-truth mismatch (§4.1), the two divergent category lists (§10.11), and
  organizer chat being unwired dead code (§10.12). Raise these with the frontend team as contract
  questions before the backend commits to a shape either way.
- The customer app is **still actively changing** — re-verify these shapes against the live
  frontend before freezing any API contract, same caveat as before.

---

## 12. Open questions to confirm before building (money-flow specifics — still open)

1. **Coupon cost bearer:** does a coupon discount reduce the **organizer's payout** or the
   **platform's commission** (or split)? Affects payout math. (Frontend today computes commission
   on `finalAmount`, which is already net of the coupon discount — so today's client-side math
   *implicitly* has the platform absorb the coupon cost inside a smaller commission base. Confirm
   this is the intended business rule before encoding it server-side.)
2. **Tax handling:** the 5% "GST" is collected client-side but never modeled as pass-through vs.
   revenue anywhere. Who is the merchant of record?
3. **Commission base:** confirmed today as `finalAmount` (post-discount, post-tax? — actually
   post-discount, and tax is computed on the post-discount base too, but commission is computed on
   `finalPayAmount` which **includes** tax — worth double-checking this is intended, since it means
   the platform is effectively taking a cut of the tax collection too).
4. **Gateway fees:** who absorbs Razorpay fees — platform or organizer?
5. **Reward definition:** confirmed as free-booking (customer) / zero-commission-on-one-booking
   (organizer) — both now concretely defined and implemented client-side (§4.3). Confirm this
   should carry over as-is.
6. **Refund timing & source:** instant vs. manual, refunded from platform float vs. organizer
   wallet? Still entirely unanswered — no refund logic exists anywhere yet.
7. **Departures:** are trip dates truly fixed batches (as the organizer's date-picker UI implies),
   or request-any-date? Still drives the inventory model decision, still unresolved.
8. **Organizer approval:** should the backend keep *any* self-service/instant-approval path (even
   gated), or should 100% of approvals require an admin action? The current frontend has both,
   disagreeing with each other (§10.2) — needs an explicit decision either way.

---

## 13. Decisions log

| Question | Decision |
|---|---|
| Backend stack | **Node.js + Express** |
| Database | **MongoDB** (document model) |
| Auth & integrations | **Real JWT + roles now; stub OTP / Google / Razorpay behind interfaces** |
| Scope / plan | **Build all three modules' APIs together, in phases** (see the separate phased implementation plan) — all three frontends are fully built and waiting on real data, so there is no longer a case for punting organizer/admin to "later" |

---

_Keep this file updated as the frontend evolves and as backend decisions are made._
