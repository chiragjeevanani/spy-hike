# Running the test suites

Install dependencies in `backend` and `frontend`, then run:

```sh
cd backend
npm test
```

```sh
cd frontend
npm test
npm run test:e2e
npm run lint:errors
npm run build
```

Backend tests use ephemeral MongoDB instances. Playwright starts its own
in-memory API on port **4013** and Vite on **5183**, disables Redis and online
payments, and refuses to reuse existing servers. It does not use the Atlas
database configured in `backend/.env`.

If either test port is occupied, choose other unused ports:

```sh
E2E_API_PORT=4014 E2E_PORT=5194 npm run test:e2e
```

Do not point tests at the normal development API: local and production currently
share the same database. Browser tests create accounts, trips and bookings and
change admin settings inside their temporary database.

The browser suite uses Chromium with mobile and desktop viewports. Failures save
screenshots and traces in `frontend/test-results`. The suites cover customer,
organizer and admin flows, including account isolation, organizer comparison,
booking/inventory, rewards, moderation and expired-trip renewal. They do not
exercise real payment settlement, SMS delivery, or production deployment.

## Verified on 2026-10-14 — server-validated organizer sessions

| Suite | Result |
| --- | --- |
| Frontend unit | 34 passed |
| Backend unit | 4 passed |
| Backend API | 317 passed |
| Full browser E2E | 111 passed in one run |
| Frontend build and lint errors | Passed |

Organizer startup now resolves the live server account before showing protected
screens. Saved browser profiles cannot authenticate an organizer. The frontend
API response cache and backend in-process cache fallback have been removed.
Organizer private records are no longer persisted or restored as an offline
fallback, and bank details and reward redemption require server confirmation.

Regression coverage includes the actual organizer signup button with an old
approved profile; missing, invalid and deleted-account tokens; verification
outages and retry; server-saved payout details followed by dashboard navigation;
cross-tab logout; and rejection of local reward success after a failed API call.
The organizer loyalty tests now earn and redeem rewards through the real test
API rather than seeding offline booking records.

Old private records are cleared on startup. Customer booking, notification and
chat lists also start empty and load from the API. Production data was not
modified by these test runs. Changes must be deployed separately for production.

## Organizer walkthrough and approval push notifications

Completing or skipping the first organizer walkthrough opens the partner form
directly. A separate walkthrough-completed preference survives reloads without
being treated as proof of an authenticated account.

New organizer registrations and hiker-to-organizer applications notify every
admin. Approval creates one congratulations notification per account lifecycle,
with a link to `/organizer/dashboard`, where verified approved organizers
continue with payout setup. Admin notifications link to `/admin/organizers`.

To enable device delivery, open the admin bell and select **Enable admin push
notifications**. A pending organizer can select **Enable approval notifications**.
The frontend and backend Firebase configuration must be present. Tests mock
Firebase delivery; live OS/device delivery has not been verified automatically.

Push coverage checks admin and organizer device registration, multiple devices,
account switching, logout, expired device tokens, foreground and background
handling, deep links, duplicate approval prevention, and old-session isolation.
The in-app admin bell also reads real server notifications when push is unavailable.
