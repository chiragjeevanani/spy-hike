/**
 * Response cache for read-heavy public endpoints.
 *
 * Backed by Redis when REDIS_URL is set, and disabled otherwise. There is no in-process
 * fallback that can outlive database changes. Both paths honour the
 * same TTL and prefix-invalidation contract.
 *
 * Every operation fails open: if Redis is down, unreachable, or slow to
 * connect, reads miss and writes no-op rather than throwing. A cache outage
 * must degrade the API to "as fast as it was before", never to an error.
 *
 * What belongs here: the public catalog and site content — data that is read
 * constantly and written rarely. What does not: anything per-user (/me,
 * bookings, chats) or anything where staleness is a correctness bug, most
 * importantly live seat availability. A stale seat count sells a trip that no
 * longer exists.
 */
import { createClient } from 'redis';
import { env } from '../config/env.js';
import { tripToday } from '../utils/tripDate.js';

// Bumped when a cached response's shape changes, so a deploy can't serve
// yesterday's field set out of a warm cache.
const VERSION = 'v1';

let client = null;
let connecting = null;
let redisUsable = false;



async function connect() {
  if (!env.redisUrl) return null;
  if (client) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    const c = createClient({
      url: env.redisUrl,
      socket: {
        connectTimeout: 3000,
        // Give up reconnecting after a few tries; uncached reads cover us.
        reconnectStrategy: (retries) => (retries > 5 ? false : Math.min(retries * 200, 2000)),
      },
    });
    // Without a listener, a connection error is an unhandled 'error' event and
    // takes the process down.
    c.on('error', (err) => {
      if (redisUsable) console.warn('[cache] redis error, disabling response caching:', err.message);
      redisUsable = false;
    });
    c.on('ready', () => { redisUsable = true; });
    try {
      await c.connect();
      client = c;
      redisUsable = true;
      return c;
    } catch (err) {
      console.warn('[cache] redis unavailable, response caching disabled:', err.message);
      redisUsable = false;
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

/** Connects to Redis if configured. Safe to call when it is not. */
export async function initCache() {
  if (!env.redisUrl) {
    console.log('[cache] REDIS_URL not set — response caching disabled');
    return;
  }
  await connect();
  console.log(redisUsable ? '[cache] redis connected' : '[cache] redis unreachable — response caching disabled');
}

export async function closeCache() {
  if (client) {
    try { await client.quit(); } catch { /* already gone */ }
    client = null;
    redisUsable = false;
  }
}

const fullKey = (key) => `findyourtrek:${VERSION}:${key}`;

/** Returns the cached value for `key`, or null on a miss or any failure. */
export async function cacheGet(key) {
  const k = fullKey(key);
  if (redisUsable && client) {
    try {
      const raw = await client.get(k);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('[cache] get failed:', err.message);
      return null;
    }
  }
  return null;
}

/** Stores `value` under `key` for `ttlSeconds`. Never throws. */
export async function cacheSet(key, value, ttlSeconds) {
  const k = fullKey(key);
  if (redisUsable && client) {
    try {
      await client.set(k, JSON.stringify(value), { EX: ttlSeconds });
      return;
    } catch (err) {
      console.warn('[cache] set failed:', err.message);
      return;
    }
  }

}

/**
 * Drops every entry whose key starts with one of `prefixes` — e.g. 'trips'
 * clears all cached trip list pages regardless of their filter combination.
 * Uses SCAN (non-blocking) rather than KEYS.
 */
export async function cacheInvalidate(...prefixes) {
  if (prefixes.length === 0) return;

  if (redisUsable && client) {
    try {
      for (const prefix of prefixes) {
        const pattern = `${fullKey(prefix)}*`;
        for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 200 })) {
          await client.unlink(key);
        }
      }
      return;
    } catch (err) {
      console.warn('[cache] invalidate failed:', err.message);
      return;
    }
  }


}

/**
 * Express middleware caching a GET response body under `keyFn(req)`.
 * Only 200s with a JSON body are stored.
 */
export function cached(keyFn, ttlSeconds) {
  return async (req, res, next) => {
    let key;
    try {
      key = keyFn(req);
      // Each process stops using yesterday's catalog cache at midnight,
      // even when another worker performed the expiry sweep.
      if (key?.startsWith('trips:') || key?.startsWith('treks:')) key += `:day:${tripToday()}`;
    } catch {
      return next();
    }
    if (!key) return next();

    const hit = await cacheGet(key);
    if (hit) {
      res.set('X-Cache', 'HIT');
      return res.json(hit);
    }

    res.set('X-Cache', 'MISS');
    const send = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        // Fire-and-forget: a slow cache write must not delay the response.
        cacheSet(key, body, ttlSeconds).catch(() => {});
      }
      return send(body);
    };
    return next();
  };
}

// TTLs. The catalog is admin-curated and explicitly invalidated on write, so it
// can sit for a while; the trip list is shorter because seat counts ride along
// on it and a stale count is more annoying than a stale description.
export const TTL = {
  treks: 15 * 60,
  trips: 2 * 60,
  content: 30 * 60,
  categories: 30 * 60,
};
