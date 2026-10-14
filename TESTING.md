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

## Verified on 2026-10-14

| Suite | Result |
| --- | --- |
| Frontend unit | 33 passed |
| Backend unit | 4 passed |
| Backend API | 312 passed |
| Browser E2E | All 101 cases verified across the full run and focused rerun |
| Frontend build and lint errors | Passed |

The final full browser run passed 100 of 101 tests. Its remaining failure was
an outdated assertion that pausing an organizer offer removes the canonical
trek entirely. The corrected check verifies zero bookable results, the retained
Coming soon preview, the Opening soon organizer screen, and no direct booking
action. Both catalog tests then passed in a focused rerun.

Testing also found and fixed offline organizer reward progress, updated session
and cache-owner fixtures, and removed browser navigation waits on remote images.
Production data was not modified by these test runs.
