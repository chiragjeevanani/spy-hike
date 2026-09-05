import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_ONBOARDING_CONTENT,
  mergeOnboardingContent,
  loadOnboardingContentLocal,
  saveOnboardingContentLocal,
} from './onboardingContent';
import onboardingApi from '../lib/onboardingApi';

describe('onboardingContent utility & client', () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    const storageObj = {
      getItem: vi.fn((k) => mockStorage[k] || null),
      setItem: vi.fn((k, v) => { mockStorage[k] = String(v); }),
      removeItem: vi.fn((k) => { delete mockStorage[k]; }),
      clear: vi.fn(() => { mockStorage = {}; }),
    };
    vi.stubGlobal('localStorage', storageObj);
    vi.restoreAllMocks();
  });

  it('provides default customer and organizer onboarding configuration', () => {
    expect(DEFAULT_ONBOARDING_CONTENT.customer.visible).toBe(true);
    expect(DEFAULT_ONBOARDING_CONTENT.customer.slides).toHaveLength(3);
    expect(DEFAULT_ONBOARDING_CONTENT.organizer.visible).toBe(true);
    expect(DEFAULT_ONBOARDING_CONTENT.organizer.slides).toHaveLength(4);
    expect(DEFAULT_ONBOARDING_CONTENT.organizer.badgeText).toBe('Organizer Portal');
  });

  it('merges partial payload safely without losing unset fields', () => {
    const partial = {
      customer: {
        skipLabel: 'Custom Skip',
        slides: [
          {
            title: 'Only One Slide',
            description: 'Short desc',
            image: 'https://example.com/img.jpg',
            icon: 'Mountain',
            badge: 'Exclusive',
          },
        ],
      },
    };

    const merged = mergeOnboardingContent(partial);
    expect(merged.customer.skipLabel).toBe('Custom Skip');
    expect(merged.customer.slides).toHaveLength(1);
    expect(merged.customer.slides[0].title).toBe('Only One Slide');

    // Untouched organizer config is preserved from defaults
    expect(merged.organizer.badgeText).toBe('Organizer Portal');
    expect(merged.organizer.slides).toHaveLength(4);
  });

  it('handles null/undefined payloads gracefully by returning defaults', () => {
    expect(mergeOnboardingContent(null)).toEqual(DEFAULT_ONBOARDING_CONTENT);
    expect(mergeOnboardingContent(undefined)).toEqual(DEFAULT_ONBOARDING_CONTENT);
  });

  it('persists and loads onboarding content from localStorage', () => {
    const custom = {
      customer: {
        visible: false,
        skipLabel: 'Bypass',
        slides: [],
      },
      organizer: {
        visible: true,
        badgeText: 'Operator Basecamp',
        skipLabel: 'Dismiss',
        slides: [],
      },
    };

    saveOnboardingContentLocal(custom);
    const loaded = loadOnboardingContentLocal();
    expect(loaded.customer.visible).toBe(false);
    expect(loaded.customer.skipLabel).toBe('Bypass');
    expect(loaded.organizer.badgeText).toBe('Operator Basecamp');
  });

  it('onboardingApi.getContent falls back to local cache when network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const custom = {
      customer: {
        visible: true,
        skipLabel: 'Offline Skip',
        slides: DEFAULT_ONBOARDING_CONTENT.customer.slides,
      },
      organizer: DEFAULT_ONBOARDING_CONTENT.organizer,
    };
    saveOnboardingContentLocal(custom);

    const result = await onboardingApi.getContent();
    expect(result.customer.skipLabel).toBe('Offline Skip');
  });
});
