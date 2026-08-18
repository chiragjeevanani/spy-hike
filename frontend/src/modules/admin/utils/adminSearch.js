/**
 * Utility helper for global debounced fuzzy search across all Admin Panel entities.
 */

import adminApi from '../../../lib/adminApi';
import treksApi from '../../../lib/treksApi';
import tripsApi from '../../../lib/tripsApi';
import bookingsApi from '../../../lib/bookingsApi';
import trekRequestsApi from '../../../lib/trekRequestsApi';
import { loadAllUsers, loadAllOrganizers } from './storage';

/**
 * Calculates fuzzy match score for a given text against query.
 * Returns a score > 0 if matched, 0 if no match.
 */
export function fuzzyScore(text, query) {
  if (!text || !query) return 0;
  const str = String(text).toLowerCase().trim();
  const q = String(query).toLowerCase().trim();
  if (!str || !q) return 0;

  // Exact match
  if (str === q) return 100;

  // Starts with
  if (str.startsWith(q)) return 85;

  // Word boundary match e.g. "Himachal" in "Sankri, Himachal Pradesh"
  const words = str.split(/[\s,._-]+/);
  for (const word of words) {
    if (word === q) return 80;
    if (word.startsWith(q)) return 70;
  }

  // Substring match
  if (str.includes(q)) return 60;

  // Multi-word query check: all words in q exist in str
  const qWords = q.split(/\s+/);
  if (qWords.length > 1) {
    const allMatch = qWords.every((qw) => str.includes(qw));
    if (allMatch) return 50;
  }

  // Sequence fuzzy match (characters appear in order)
  let qIdx = 0;
  for (let i = 0; i < str.length && qIdx < q.length; i++) {
    if (str[i] === q[qIdx]) {
      qIdx++;
    }
  }
  if (qIdx === q.length) return 30;

  return 0;
}

/**
 * Searches across all admin resources and returns results grouped by category.
 */
export async function performGlobalAdminSearch(query) {
  const q = (query || '').trim();
  if (!q) {
    return {
      organizers: [],
      users: [],
      treks: [],
      trips: [],
      bookings: [],
      requests: [],
      totalCount: 0,
    };
  }

  // Fetch or load all entity lists concurrently
  const [organizers, users, treks, trips, bookings, requests] = await Promise.all([
    adminApi.listOrganizers().catch(() => loadAllOrganizers()),
    adminApi.listUsers().catch(() => loadAllUsers()),
    treksApi.listAllTreks().catch(() => []),
    tripsApi.listAllTrips().catch(() => []),
    bookingsApi.listAll().catch(() => []),
    trekRequestsApi.listAll().catch(() => []),
  ]);

  const orgList = Array.isArray(organizers) ? organizers : loadAllOrganizers();
  const userList = Array.isArray(users) ? users : loadAllUsers();
  const trekList = Array.isArray(treks) ? treks : [];
  const tripList = Array.isArray(trips) ? trips : [];
  const bookingList = Array.isArray(bookings) ? bookings : [];
  const requestList = Array.isArray(requests) ? requests : [];

  // Match Organizers
  const matchedOrganizers = orgList
    .map((org) => {
      const score = Math.max(
        fuzzyScore(org.agencyName, q),
        fuzzyScore(org.name, q),
        fuzzyScore(org.email, q),
        fuzzyScore(org.mobile, q),
        fuzzyScore(org.location, q)
      );
      return { item: org, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => entry.item);

  // Match Hikers / Users
  const matchedUsers = userList
    .map((u) => {
      const score = Math.max(
        fuzzyScore(u.name, q),
        fuzzyScore(u.email, q),
        fuzzyScore(u.mobile || u.phone, q),
        fuzzyScore(u.hikingExperience, q)
      );
      return { item: u, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => entry.item);

  // Match Trek Categories
  const matchedTreks = trekList
    .map((t) => {
      const score = Math.max(
        fuzzyScore(t.title, q),
        fuzzyScore(t.location, q),
        fuzzyScore(t.state, q),
        fuzzyScore(t.city, q),
        fuzzyScore(t.difficulty, q)
      );
      return { item: t, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => entry.item);

  // Match Trips
  const matchedTrips = tripList
    .map((t) => {
      const score = Math.max(
        fuzzyScore(t.name, q),
        fuzzyScore(t.location, q),
        fuzzyScore(t.organizer?.name || t.organizer?.agencyName, q),
        fuzzyScore(t.difficulty, q)
      );
      return { item: t, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => entry.item);

  // Match Bookings
  const matchedBookings = bookingList
    .map((b) => {
      const score = Math.max(
        fuzzyScore(b.bookingId || b.id, q),
        fuzzyScore(b.userName, q),
        fuzzyScore(b.userEmail, q),
        fuzzyScore(b.tripName, q),
        fuzzyScore(b.status, q)
      );
      return { item: b, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => entry.item);

  // Match Category Requests
  const matchedRequests = requestList
    .map((r) => {
      const score = Math.max(
        fuzzyScore(r.title, q),
        fuzzyScore(r.location, q),
        fuzzyScore(r.organizerEmail, q),
        fuzzyScore(r.status, q)
      );
      return { item: r, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => entry.item);

  const totalCount =
    matchedOrganizers.length +
    matchedUsers.length +
    matchedTreks.length +
    matchedTrips.length +
    matchedBookings.length +
    matchedRequests.length;

  return {
    organizers: matchedOrganizers,
    users: matchedUsers,
    treks: matchedTreks,
    trips: matchedTrips,
    bookings: matchedBookings,
    requests: matchedRequests,
    totalCount,
  };
}
