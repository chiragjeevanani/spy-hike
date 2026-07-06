# Spy Hike — Backend Context & Reference

> **Purpose of this file.** This is the single source of truth for the **backend** work on Spy Hike.
> I (the backend developer) am responsible for the backend ONLY — the frontend is built and
> maintained by a separate team. This document captures what the app is, how it works, the
> business logic, the data contracts the frontend already expects, the gaps the backend must
> fill, suggested features, open questions, and the locked technical decisions. When backend
> work starts, read this first. **No implementation plan is committed yet** — the frontend
> customer app is still actively changing, and the organizer + admin panels are not built yet.

_Last updated: 2026-06-23_

---

## 1. What Spy Hike is

Spy Hike is a **premium, mobile-first adventure / travel booking platform**. Customers browse and
book treks, hikes, camping, adventure tours, nature walks, and weekend trips. "Organizers" are
partner agencies who list these experiences at their own prices. The platform earns by taking a
commission on each booking.

It is structured as **three modules**:

| Module | Audience | Status (frontend) | Status (backend) |
|---|---|---|---|
| **Customer App** | End users / hikers | ✅ Built (still actively changing) | ❌ Not started — currently localStorage mock |
| **Organizer Panel** | Partner agencies who list trips | ❌ Not built yet | ❌ Not started |
| **Admin Panel** | Platform owner / operators | ❌ Not built yet | ❌ Not started |

The backend must eventually serve **all three modules**.

---

## 2. Current state of the codebase (as of this writing)

- **Frontend only.** Repo root contains `PROGRESS.md` and `frontend/`. There is **no backend** yet.
- **Stack (frontend):** React 19 + JavaScript (JSX) + Vite, Tailwind CSS v4, Framer Motion
  (`motion/react`), custom state-based routing synced to the HTML5 History API. `express` and
  `dotenv` are listed as deps but only for serving the built bundle — not an app backend.
- **All data is mocked in `localStorage`.** There are **no network/API calls** anywhere. Seeded
  mock data lives in:
  - `frontend/src/modules/user/data/trips.js` — categories, banners, destinations, and the full
    `HIKING_TRIPS` array (rich trip objects).
  - `frontend/src/modules/user/utils/storage.js` — load/save helpers + seed data for user,
    wishlist, bookings, notifications, chats, trips, dark mode.
- **Only the `user` (customer) module exists** under `frontend/src/modules/user/`. There is no
  `organizer` or `admin` module directory yet. The folder layout (`src/modules/<name>`) strongly
  implies organizer/admin will be sibling modules later.
- The "organizer" today is **not a real entity** — it is a denormalized object embedded inside
  each trip: `{ name, avatar, rating, verified }`. The app even routes to an organizer profile by
  **name** (`/organizer/:organizerName`) and synthesizes the bio/gallery/stats on the fly.

### localStorage keys in use (frontend)
`spyhike_user`, `spyhike_wishlist`, `spyhike_bookings`, `spyhike_notifications`,
`spyhike_chats`, `spyhike_trips`, `spyhike_darkmode`.

---

## 3. Locked technical decisions

These were decided during brainstorming (see the Decisions Log in §13):

- **Backend runtime/framework:** **Node.js + Express.**
- **Database:** **MongoDB** (document model — maps naturally to the nested trip JSON the frontend
  already uses). ⚠️ Because money flows are involved, financial writes (bookings, commission,
  payouts, rewards) must be handled carefully — use transactions (Mongo multi-document
  transactions / replica set) and an append-only ledger pattern for anything touching money.
- **Auth:** **Real JWT + role-based access** now. **Stub** OTP (MSG91/Twilio), Google OAuth, and
  Razorpay **behind interfaces** so they can be swapped for live providers later without changing
  callers.
- **Scope:** No phased plan committed yet. Build order will likely be Customer API → Organizer →
  Admin, but the frontend customer app is still in flux, so contracts may shift.

---

## 4. Core business logic & money flow

### 4.1 Commission model
- Organizer lists a trip at a **customer-facing price** (e.g. Hampta Pass = ₹10,000/person).
- Customer pays that price. The platform takes an **admin-configurable commission %** (default
  example: 10% → ₹1,000/person). Organizer payout = remainder (₹9,000/person).
- **Commission is invisible to the customer** and is NOT computed anywhere in the frontend today.
  It is purely a backend concern.
- Commission % should be configurable globally, with likely future **overrides per category or
  per organizer** (see suggestions).

### 4.2 Pricing math (current frontend behavior — `BookingFlow.jsx`)
```
base     = trip.price × travelersCount
discount = round(base × couponPercent / 100)
tax      = round((base − discount) × 0.05)     // labeled "National Park Taxes (5% GST)"
final    = base − discount + tax
```
- Coupons are **hardcoded** in the frontend: `SPYHIKE20` = 20%, `VALLEY50` = 15% (labeled as ₹50),
  `GHATS15` = 15%. Backend must make coupons data-driven.
- The backend must additionally compute, per booking: `commissionAmount`, `organizerPayout`, and
  feed the organizer ledger + reward progress. None of this exists in the frontend.

### 4.3 Target-based rewards (organizer)
- Organizer reaching **N successful bookings** (admin-configurable threshold, e.g. 100 / 200) earns
  a **reward** (admin-configurable — could be a cash bonus, reduced commission, badge, etc.).
- Backend needs a rewards/milestone engine that tracks progress and grants rewards.

### 4.4 Refunds & cancellation
- Each trip carries a `cancellationPolicy` (array of human-readable rules, e.g. "Full refund up to
  15 days before", "50% between 7–14 days", "No refund within 7 days").
- Today these are just display strings. The backend must turn them into **structured,
  policy-driven refund computation** based on days-before-departure, and handle the refund flow on
  cancellation. Booking status flips to `Cancelled` and a notification is sent.

### 4.5 Seat / inventory
- Trips carry `availableSeats` / `totalSeats`, but the frontend **never decrements** them on
  booking. The backend must own seat inventory — ideally per **departure date / batch**, since
  bookings select from fixed available dates (`BookingFlow` lists `2026-07-10`, `-07-20`, etc.).

---

## 5. Domain model (proposed MongoDB collections)

Derived from the frontend data shapes; refine when backend starts. IDs should be real
ObjectIds/UUIDs, but **API responses must remain shape-compatible with the frontend** (see §6).

- **users** — customers. Fields seen in frontend: `name, email, mobile, age, gender, avatar,
  hikingExperience (Beginner|Intermediate|Advanced), fitnessLevel (Low|Moderate|High),
  emergencyContact, isOnboarded, isAuthenticated`. Backend adds: `passwordHash, role, createdAt`.
- **organizers** — promote the embedded object to a first-class entity: `name, avatar, rating,
  verified, bio, gallery[], yearsExperience, safetyRecord, certifications, KYC docs, payout
  details, commissionOverride?, walletBalance`. Trips should reference `organizerId` (but the
  frontend currently keys by `organizer.name` — see §12 integration constraint).
- **trips** — rich object (see §6.1 for the full field list the frontend expects). Reference
  `organizerId`, `categoryId`. `reviews[]` currently embedded; consider a separate **reviews**
  collection with denormalized average back onto the trip (`rating`, `reviewsCount`).
- **departures / batches** — per-trip dated slots with seat inventory (new; not in frontend yet).
- **bookings** — see §6.2 for the shape. Backend adds `commissionAmount, organizerPayout,
  paymentStatus, paymentRef, refundAmount, userId, organizerId`.
- **reviews** — `tripId, userId, userName, userAvatar, rating (1–5), comment, date`.
- **coupons** — `code, type (percent|flat), value, validity, usageLimits, scope (global/category/
  organizer/trip)`.
- **notifications** — `title, content, timestamp, type (Booking|Payment|Organizer|Promo|Updates),
  read`.
- **chats** — `tripId, organizerName/organizerId, organizerAvatar, messages[{id, sender
  (user|organizer), text, timestamp}]`.
- **categories** — admin-managed (`id, label, icon`). Frontend `CATEGORIES_LIST`: Trekking, Hiking,
  Camping, Adventure Tours, Nature Walks, Weekend Trips.
- **adminConfig** — commission %, tax %, reward rules/thresholds, feature flags, etc.
- **ledger / transactions** — append-only money movements (booking income, commission, payout,
  refund, reward) per organizer/platform.
- **payouts** — organizer payout requests + settlement history.

---

## 6. Frontend data contracts (API must match these)

The frontend team will swap `localStorage` for API calls. To keep their changes minimal, backend
responses should **match the existing object shapes**. These are the authoritative shapes today.

### 6.1 Trip object (`data/trips.js`)
```
id, name, location, state, city, rating, reviewsCount, price, difficulty (Easy|Moderate|Difficult),
durationDays, availableSeats, totalSeats, category, featured?, coverImage, galleryImages[],
organizer { name, avatar, rating, verified },
description, highlights[], distanceKm, elevationMeters, maxGroupSize,
itinerary[{ day, title, description }],
included[], notIncluded[], safetyGuidelines[], cancellationPolicy[],
faqs[{ question, answer }],
reviews[{ id, userName, userAvatar, rating, comment, date }]
```
Also exported from the same file: `CATEGORIES_LIST`, `PROMOTIONAL_BANNERS`
(`{id,title,subtitle,tag,discount,code,img,tripId}`), `TRENDING_DESTINATIONS`
(`{id,name,state,hikes,img}`).

### 6.2 Booking object (`utils/storage.js`, `BookingFlow.jsx`)
```
id, bookingId (e.g. "SH-9921-U"), tripId, tripName, tripImage, tripLocation,
bookingDate, selectedDate, travelersCount,
travelers[{ name, age, gender, emergencyContact }],
couponUsed, couponDiscount, taxAmount, finalAmount,
status ("Upcoming" | "Completed" | "Cancelled"), organizerName
```

### 6.3 User object
```
isAuthenticated, isOnboarded, name, email, mobile, age, gender, avatar,
hikingExperience, fitnessLevel, emergencyContact, rememberMe
```

### 6.4 Notification / Chat — see §5 and `PROGRESS.md` §3 for exact shapes.

---

## 7. Customer app feature map (what the frontend does → what backend must provide)

Routes use custom History-API routing. Source: `frontend/src/modules/user/App.jsx` + components.

| Feature / route | Frontend behavior | Backend responsibility |
|---|---|---|
| **Onboarding** `/onboardingguide` | First-visit slide deck; sets `isOnboarded` | Persist onboarding flag on user |
| **Auth** `/login`, `/register` | Email/password, Mobile OTP (`1234`/`123456`), Google — all **simulated** | Real JWT + register/login; **stub** OTP & Google behind interfaces |
| **Home** `/` | Greeting, categories, promo carousel, popular carousel, AI recommendations (difficulty matched to `hikingExperience`/`fitnessLevel`), trending destinations, notifications drawer, dark mode | Serve trips/categories/banners/destinations; notifications API; recommendation logic could move server-side |
| **Explore/Search** `/explore` | Client-side filter over name/state/city/category | Server-side search/filter + pagination |
| **Trip Details** `/trip/:tripId` | Tabs: Overview / Guide / Reviews / FAQs | `GET /trips/:id` (full object incl. reviews) |
| **Booking Wizard** `/book/:tripId` | 5 steps: date → travelers → details → coupon → payment (Razorpay **simulated**); builds booking; creates 2 notifications + auto welcome chat | Create order, validate coupon, compute pricing **+ commission + payout**, decrement seats, persist booking, **stub** Razorpay (order create + webhook verify), emit notifications |
| **Bookings** `/bookings` | Tabs Upcoming/Completed/Cancelled; organizer chat drawer; review submission | List bookings by user; chat persistence; create review |
| **Booking Details** `/booking/:bookingId` | Download invoice (sim), chat, cancel (→ `Cancelled` + notification), rate | Booking detail; cancel + **refund computation**; invoice generation; review |
| **Wishlist** `/wishlist` | Bookmarked trip IDs in localStorage | Persist wishlist per user |
| **Profile** `/profile` | Edit profile, restart onboarding, logout | Update user; auth/session |
| **Organizer Profile** `/organizer/:organizerName` | Slide-over; bio/gallery/stats **synthesized** in frontend; trips filtered by `organizer.name` | Real organizer entity + profile API (see §12) |

---

## 8. Organizer Panel (not built yet — backend responsibilities to anticipate)

The organizer-facing product does not exist in the frontend yet, but the backend should be designed
to support it:
- Organizer **auth** (separate role) + onboarding/KYC + verification.
- **List/manage trips** (CRUD) with their own pricing, categories, itinerary, images, policies,
  departures/seat inventory.
- **Bookings dashboard** — see incoming bookings, statuses, traveler manifests.
- **Earnings**: per-booking commission breakdown, **wallet/ledger**, payout requests + settlement
  history.
- **Target-based rewards**: progress toward admin-configured milestones + granted rewards.
- **Chat** with customers; respond to reviews.

## 9. Admin Panel (not built yet — backend responsibilities to anticipate)

- Admin **auth** (highest role).
- **Configurable settings**: commission % (global + overrides), tax %, reward thresholds & reward
  definitions, categories (CRUD), coupons (CRUD), feature flags.
- **Organizer management**: approve/verify/suspend, KYC review, commission overrides.
- **Trip moderation**, **review moderation**.
- **Payouts**: review/approve organizer payouts, settlement.
- **Reporting/analytics**: GMV, commission earned, bookings, top organizers/trips.
- **Audit log** of config changes and money movements.

---

## 10. Gaps the backend must own (NOT present in the frontend today)

1. **Commission engine** — compute & record platform commission + organizer payout per booking.
2. **Organizer as a real entity + auth** (currently just a `name` string embedded in trips).
3. **Admin configuration store** (commission %, tax %, reward rules, categories, coupons).
4. **Target-based rewards engine** (milestones → rewards).
5. **Seat/inventory management** with departures/batches (frontend never decrements seats).
6. **Policy-driven refund computation** on cancellation (cancellationPolicy is display-only today).
7. **Data-driven coupons** (3 codes are hardcoded in `BookingFlow.jsx`).
8. **Real payment** — Razorpay order creation + webhook verification (frontend only simulates a
   2-second loader and fabricates a `bookingId`).
9. **Real auth** — OTP & Google are faked; JWT + roles needed.
10. **Server-side search/pagination**, **notifications delivery** (push/email/SMS), **review &
    organizer (KYC) moderation**.
11. **Money ledger / transactions** (append-only) + **payouts** collection.

---

## 11. Suggested features / enhancements (my recommendations)

- **Organizer wallet + payout requests + settlement history** (first-class money flow).
- **Refund/cancellation as a first-class, auditable flow** with policy-derived amounts.
- **Per-category and/or per-organizer commission overrides**, not just one global %.
- **Audit log** for all admin config changes and money movements (compliance + debugging).
- **Idempotency keys** on booking/payment endpoints to avoid double-charges/double-bookings.
- **Webhook-driven payment confirmation** rather than trusting the client.
- **Departures/batches** so a trip can run on multiple dates with independent seat counts.
- **Reward types beyond cash** (commission discount tiers, featured-listing perks, badges).

---

## 12. Integration constraints (important — I can't change the frontend)

- The frontend currently identifies organizers by **`organizer.name`** (routing
  `/organizer/:organizerName`, and `trips.filter(t => t.organizer.name === organizer.name)`). When
  the organizer becomes a real entity with an ID, the API must either keep returning the embedded
  `organizer { name, avatar, rating, verified }` object on each trip **and** support name-based
  lookup, or this must be **coordinated with the frontend team** before they migrate. Treat any
  shape change as a contract negotiation, not a unilateral backend change.
- **Contract-first mindset:** match the existing object shapes in §6 so the frontend can swap
  `localStorage` helpers (`loadX`/`saveX` in `utils/storage.js`) for API calls with minimal churn.
- The frontend `bookingId` format is `SH-XXXX-X` (e.g. `SH-9921-U`). Decide whether the backend
  owns this format (recommended) and returns it, so the client stops fabricating it.
- The customer app is **still actively changing** — re-verify these shapes against the live
  frontend before freezing any API contract.

---

## 13. Decisions log (brainstorming Q&A)

| Question | Decision |
|---|---|
| Backend stack | **Node.js + Express** |
| Database | **MongoDB** (document model) |
| Auth & integrations | **Real JWT + roles now; stub OTP / Google / Razorpay behind interfaces** |
| Scope / plan | **No plan yet.** Frontend customer app still changing; organizer + admin panels not built. This `context.md` is the reference for when backend work begins. |

---

## 14. Open questions to confirm before building (money-flow specifics)

1. **Coupon cost bearer:** when a customer uses a coupon, does the discount reduce the **organizer's
   payout** or the **platform's commission** (or split)? Affects payout math.
2. **Tax handling:** is the 5% "GST" collected-and-remitted (pass-through, excluded from payout), or
   part of revenue? Who is the merchant of record for GST?
3. **Commission base:** is commission a % of `base` (pre-tax, pre-discount) or of the net amount
   after discount? Frontend gives no guidance — needs a business decision.
4. **Gateway fees:** who absorbs Razorpay fees — platform or organizer?
5. **Reward definition:** what concretely is a "reward" (cash bonus / commission cut / perk)? How is
   it paid/applied?
6. **Refund timing & source:** instant vs manual, and refunded from platform float vs organizer
   wallet?
7. **Departures:** are trip dates truly fixed batches (as `BookingFlow` implies), or
   request-any-date? Drives the inventory model.

---

_Keep this file updated as the frontend evolves and as backend decisions are made._
