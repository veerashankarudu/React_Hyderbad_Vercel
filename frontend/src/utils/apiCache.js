/**
 * API Response Cache — stores GET responses in memory with TTL.
 * Avoids hitting the backend repeatedly for the same data.
 */
const cache = new Map();

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const SHORT_TTL = 60 * 1000;       // 1 minute
const LONG_TTL = 15 * 60 * 1000;   // 15 minutes

// Patterns that should be cached longer (rarely change)
const LONG_CACHE_PATTERNS = ['/tech-stacks', '/topics'];
// Patterns that change more often
const SHORT_CACHE_PATTERNS = ['/notifications', '/inbox'];

function getTTL(url) {
  if (LONG_CACHE_PATTERNS.some(p => url.includes(p))) return LONG_TTL;
  if (SHORT_CACHE_PATTERNS.some(p => url.includes(p))) return SHORT_TTL;
  return DEFAULT_TTL;
}

export function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache(key, data, customTTL) {
  const ttl = customTTL || getTTL(key);
  cache.set(key, { data, expiry: Date.now() + ttl });
}

export function invalidateCache(pattern) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

export function clearAllCache() {
  cache.clear();
}

// Approximate cache size for monitoring
export function cacheSize() {
  return cache.size;
}
