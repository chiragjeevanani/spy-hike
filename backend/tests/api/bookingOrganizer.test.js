import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Booking from '../../src/models/Booking.js';
import User from '../../src/models/User.js';
import { hashPassword } from '../../src/utils/password.js';
import { signToken } from '../../src/utils/jwt.js';

const app = createApp();
const api = '/api/v1';

// The organizing agency block on a customer's ticket. A booking only stores
// `organizerEmail`, so these responses have to resolve the agency's real name
// and published contact details from the organizer's account — the ticket used
// to render a blank name, the login email as "support", and a hardcoded phone.

const CUSTOMER = { name: 'Ticket Holder', email: 'ticket-holder@example.com' };

async function seedCustomer() {
  const user = await User.create({
    name: CUSTOMER.name,
    email: CUSTOMER.email,
    passwordHash: await hashPassword('pass1234'),
    mobile: '9000000001',
    authProvider: 'password',
  });
  return signToken({ sub: user._id.toString(), role: 'customer', email: user.email });
}

async function seedOrganizer(over = {}) {
  return User.create({
    name: over.name || 'Dhruva Gogi',
    email: over.email || 'organizer-account@example.com',
    passwordHash: await hashPassword('pass1234'),
    mobile: over.mobile || '9812345678',
    avatar: over.avatar || 'https://example.com/agency.jpg',
    authProvider: 'password',
    isOrganizer: true,
    organizer: {
      agencyName: 'Himalayan Sherpa Guides',
      isApproved: true,
      isPendingApproval: false,
      ...(over.organizer || {}),
    },
  });
}

async function seedBooking(over = {}) {
  return Booking.create({
    bookingId: over.bookingId || `TG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    tripId: 'a-trek',
    tripName: 'A Trek',
    tripLocation: 'Manali, Himachal Pradesh',
    organizerEmail: over.organizerEmail ?? 'organizer-account@example.com',
    organizerName: over.organizerName,
    userEmail: CUSTOMER.email,
    userName: CUSTOMER.name,
    bookingDate: '2026-08-01',
    selectedDate: '2026-12-01',
    travelersCount: 1,
    finalAmount: 2599,
    status: 'Upcoming',
  });
}

describe('customer booking → organizing agency details', () => {
  let token;
  beforeEach(async () => { token = await seedCustomer(); });

  const getOne = (id) => request(app).get(`${api}/bookings/${id}`).set('Authorization', `Bearer ${token}`);
  const getAll = () => request(app).get(`${api}/bookings`).set('Authorization', `Bearer ${token}`);

  it('resolves the agency name, published support contacts and avatar', async () => {
    await seedOrganizer({
      organizer: { supportEmail: 'help@sherpaguides.com', supportPhone: '+91 90000 11111' },
    });
    const booking = await seedBooking();

    const res = await getOne(booking.bookingId);
    expect(res.status).toBe(200);
    expect(res.body.booking.organizer).toEqual({
      name: 'Himalayan Sherpa Guides',
      email: 'help@sherpaguides.com',
      phone: '+91 90000 11111',
      avatar: 'https://example.com/agency.jpg',
      verified: true,
    });
  });

  it('falls back to the account email and mobile when no support contacts are published', async () => {
    await seedOrganizer();
    const booking = await seedBooking();

    const { organizer } = (await getOne(booking.bookingId)).body.booking;
    expect(organizer.email).toBe('organizer-account@example.com');
    expect(organizer.phone).toBe('9812345678');
  });

  it('never invents a contact when the organizer account is gone', async () => {
    const booking = await seedBooking({ organizerEmail: 'deleted@example.com', organizerName: 'Old Agency' });

    const { organizer } = (await getOne(booking.bookingId)).body.booking;
    // The booking's own snapshot stands in for the name; nothing is fabricated
    // for the phone, and the email falls back to the address on the booking.
    expect(organizer.name).toBe('Old Agency');
    expect(organizer.phone).toBe('');
    expect(organizer.email).toBe('deleted@example.com');
    expect(organizer.verified).toBe(false);
  });

  it('reports an unapproved organizer as not verified', async () => {
    await seedOrganizer({ organizer: { isApproved: false, isPendingApproval: true } });
    const booking = await seedBooking();

    expect((await getOne(booking.bookingId)).body.booking.organizer.verified).toBe(false);
  });

  it('resolves every booking in the list, across different organizers', async () => {
    await seedOrganizer();
    await seedOrganizer({
      name: 'Second Owner',
      email: 'second@example.com',
      mobile: '9800000002',
      organizer: { agencyName: 'Second Summit Co', isApproved: true },
    });
    await seedBooking({ bookingId: 'TG-AAA111' });
    await seedBooking({ bookingId: 'TG-BBB222', organizerEmail: 'second@example.com' });

    const res = await getAll();
    expect(res.status).toBe(200);
    const names = res.body.bookings.map((b) => b.organizer.name).sort();
    expect(names).toEqual(['Himalayan Sherpa Guides', 'Second Summit Co']);
  });
});
