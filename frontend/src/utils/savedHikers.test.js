import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSavedHikers,
  saveSavedHikers,
  mergeNewHikers,
  removeSavedHiker,
  getSavedHikersStorageKey,
} from '../modules/user/utils/storage';

const store = new Map();
const localStorageMock = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, val) => store.set(key, String(val)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};
vi.stubGlobal('localStorage', localStorageMock);

describe('Saved Hikers Storage Utilities', () => {
  const testEmail = 'hiker@test.com';

  beforeEach(() => {
    localStorageMock.clear();
  });

  it('generates normalized storage keys per user email', () => {
    expect(getSavedHikersStorageKey('Hiker@Test.COM ')).toBe('ft_saved_hikers_hiker@test.com');
    expect(getSavedHikersStorageKey(null)).toBe('ft_saved_hikers_guest');
  });

  it('loads empty array when no hikers saved and no seeds', () => {
    const list = loadSavedHikers(testEmail);
    expect(list).toEqual([]);
  });

  it('seeds from currentUser profile if not already present', () => {
    const user = { name: 'Arjun Kapoor', age: 28, gender: 'Male', mobile: '9876543210' };
    const list = loadSavedHikers(testEmail, [], user);
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({
      name: 'Arjun Kapoor',
      age: 28,
      gender: 'Male',
      emergencyContact: '9876543210',
    });
  });

  it('seeds from past bookings list', () => {
    const pastBookings = [
      {
        travelers: [
          { name: 'Priya Sharma', age: 25, gender: 'Female', emergencyContact: '9123456789' },
          { name: 'Rohan Verma', age: 26, gender: 'Male', emergencyContact: '9123456780' },
        ],
      },
    ];
    const list = loadSavedHikers(testEmail, pastBookings);
    expect(list).toHaveLength(2);
    expect(list.map((h) => h.name)).toEqual(['Priya Sharma', 'Rohan Verma']);
  });

  it('merges new travelers without duplicating existing ones by normalized name', () => {
    saveSavedHikers(testEmail, [
      { name: 'Aman Verma', age: 24, gender: 'Male', emergencyContact: '9876543210' },
    ]);

    const updated = mergeNewHikers(testEmail, [
      { name: 'aman verma', age: 25, gender: 'Male', emergencyContact: '9999999999' }, // updated phone/age
      { name: 'Kavita Roy', age: 23, gender: 'Female', emergencyContact: '9888888888' }, // new
    ]);

    expect(updated).toHaveLength(2);
    const aman = updated.find((h) => h.name.toLowerCase() === 'aman verma');
    expect(aman.age).toBe(25);
    expect(aman.emergencyContact).toBe('9999999999');
    expect(updated.some((h) => h.name === 'Kavita Roy')).toBe(true);
  });

  it('removes a saved hiker by name', () => {
    saveSavedHikers(testEmail, [
      { name: 'Aman Verma', age: 24, gender: 'Male', emergencyContact: '9876543210' },
      { name: 'Kavita Roy', age: 23, gender: 'Female', emergencyContact: '9888888888' },
    ]);

    const afterRemove = removeSavedHiker(testEmail, 'aman verma');
    expect(afterRemove).toHaveLength(1);
    expect(afterRemove[0].name).toBe('Kavita Roy');
  });
});
