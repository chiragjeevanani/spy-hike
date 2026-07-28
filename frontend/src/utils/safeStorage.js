/**
 * Safely writes a key/value pair to localStorage, handling QuotaExceededError
 * and sanitizing large objects/base64 strings if storage limit is reached.
 */
export function safeSetItem(key, value) {
  const jsonString = typeof value === 'string' ? value : JSON.stringify(value);
  try {
    localStorage.setItem(key, jsonString);
  } catch (err) {
    console.warn(`[safeStorage] Initial setItem failed for key "${key}":`, err);

    const isQuotaError =
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014;

    if (isQuotaError) {
      try {
        // Step 1: Evict non-essential / cached temporary items
        const disposableKeys = [
          'trekigo_landing_content',
          'trekigo_site_content',
          'trekigo_chats',
          'trekigo_org_chats',
          'trekigo_notifications',
          'trekigo_org_notifications'
        ];
        disposableKeys.forEach((k) => {
          if (k !== key) localStorage.removeItem(k);
        });

        // Step 2: If setting a trip list or complex array/object, sanitize large data URLs / images
        let targetValue = value;
        if (typeof value !== 'string' && Array.isArray(value)) {
          targetValue = value.map((item) => sanitizeOversizedFields(item));
        } else if (typeof value === 'object' && value !== null) {
          targetValue = sanitizeOversizedFields(value);
        }

        const sanitizedString = typeof targetValue === 'string' ? targetValue : JSON.stringify(targetValue);
        localStorage.setItem(key, sanitizedString);
        console.info(`[safeStorage] Successfully saved sanitized key "${key}" after clearing non-essential cache.`);
      } catch (retryErr) {
        console.error(`[safeStorage] Quota still exceeded for key "${key}". Suppressing error to prevent UI crash:`, retryErr);
      }
    }
  }
}

/**
 * Strips huge base64 strings (>50KB) from object properties to conserve storage space.
 */
function sanitizeOversizedFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = { ...obj };

  const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80';

  for (const prop in copy) {
    if (typeof copy[prop] === 'string' && copy[prop].startsWith('data:image/') && copy[prop].length > 50000) {
      copy[prop] = PLACEHOLDER_IMG;
    } else if (Array.isArray(copy[prop])) {
      copy[prop] = copy[prop].map((item) => {
        if (typeof item === 'string' && item.startsWith('data:image/') && item.length > 50000) {
          return PLACEHOLDER_IMG;
        }
        return item;
      });
    }
  }
  return copy;
}

export function safeGetItem(key, fallback = null) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return fallback;
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  } catch (e) {
    console.error(`[safeStorage] getItem failed for key "${key}":`, e);
    return fallback;
  }
}

export function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`[safeStorage] removeItem failed for key "${key}":`, e);
  }
}
