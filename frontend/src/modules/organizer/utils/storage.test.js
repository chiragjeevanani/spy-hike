import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loadOrgUser, saveOrgUser, saveOrgBookings, loadOrgBookings, saveOrgChats, loadOrgChats } from './storage';

const user = { id: 'same-user', email: 'same@example.com', isAuthenticated: true, sessionVersion: 0 };
beforeEach(() => {
  const data = new Map();
  vi.stubGlobal('localStorage', { getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) });
});
afterEach(() => vi.unstubAllGlobals());

describe('Organizer browser data ownership', () => {
  it('keeps the current account cache but clears it for a recreated organizer with the same email', () => {
    saveOrgUser(user);
    saveOrgBookings([{ organizerEmail: user.email, bookingId: 'old-booking' }]);
    saveOrgChats([{ id: 'private-chat' }]);
    saveOrgUser(user);
    expect(loadOrgBookings(user.email)).toHaveLength(1);
    saveOrgUser({ ...user, sessionVersion: 1 });
    expect(loadOrgBookings(user.email)).toEqual([]);
    expect(loadOrgChats()).toEqual([]);
  });

  it('clears an unscoped legacy cache on initial load', () => {
    localStorage.setItem('trekigo_org_user', JSON.stringify(user));
    localStorage.setItem('trekigo_org_chats', JSON.stringify([{ id: 'legacy-private-chat' }]));
    expect(loadOrgUser().id).toBe(user.id);
    expect(loadOrgChats()).toEqual([]);
  });

  it('clears private lists and loyalty state on logout and account switches', () => {
    saveOrgUser(user);
    saveOrgChats([{ id: 'private-chat' }]);
    localStorage.setItem('trekigo_loyalty_org_vouchers', '[{"id":"old-reward"}]');
    saveOrgUser({ ...user, isAuthenticated: false });
    expect(loadOrgChats()).toEqual([]);
    expect(localStorage.getItem('trekigo_loyalty_org_vouchers')).toBeNull();
    saveOrgUser(user);
    saveOrgChats([{ id: 'private-chat' }]);
    saveOrgUser({ ...user, id: 'another-user' });
    expect(loadOrgChats()).toEqual([]);
  });
});
