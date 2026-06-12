import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1',
  timeout: 30000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Auto-logout on 401 (token expired/invalid) — except on login page
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── IN-MEMORY RESPONSE CACHE ────────────────────────────────
// Caches GET responses so repeated navigation doesn't re-fetch static data.
// TTL: 60s for stats/leaderboard/master data. Cleared on logout.
const _cache = new Map();

const CACHE_TTL = {
  '/stats/summary':                        60_000,
  '/stats/by-tech-stack':                  60_000,
  '/stats/recent-activity':                30_000,
  '/stats/leaderboard':                    60_000,
  '/stats/reviewer-stats':                 60_000,
  '/stats/reviewer-metrics':               60_000,
  '/stats/sla-breach':                     30_000,
  '/master/tech-stacks':                  300_000,
  '/master/topics':                       300_000,
  '/master/smes':                         120_000,
  '/admin/users':                          30_000,
  '/admin/settings':                      120_000,
  '/mcqs':                                 20_000,
  '/mcqs?status=READY_FOR_REVIEW&page=0&size=100': 20_000,
  '/reviews':                              20_000,
  '/admin/mcqs':                           20_000,
  '/inbox/unread-count':                   15_000,
  '/reviews':                              20_000,
  '/admin/audit-log':                      30_000,
  '/auth/demo-users':                     600_000,  // never changes
};

// Endpoints to prefetch per role
const PREFETCH_COMMON = [
  '/stats/summary',
  '/stats/by-tech-stack',
  '/stats/recent-activity',
  '/stats/leaderboard',
  '/stats/reviewer-stats',
  '/master/tech-stacks',
  '/inbox/unread-count',
  '/mcqs',
  '/auth/demo-users',
];
const PREFETCH_ADMIN = [
  '/stats/sla-breach',
  '/stats/reviewer-metrics',
  '/admin/users',
  '/admin/settings',
  '/admin/mcqs',
  '/master/smes',
  '/reviews',
  '/admin/audit-log',
  '/mcqs?status=READY_FOR_REVIEW&page=0&size=100',
];
const PREFETCH_SME = [
  '/reviews',
];

function cacheKey(url) { return url.split('?')[0] === url ? url : url; }

export function cachedGet(url, config) {
  const hit = _cache.get(url);
  const ttl = CACHE_TTL[url] || CACHE_TTL[url.split('?')[0]];
  if (hit && ttl && Date.now() - hit.ts < ttl) {
    return Promise.resolve(hit.res);
  }
  return API.get(url, config).then((res) => {
    if (ttl) _cache.set(url, { res, ts: Date.now() });
    return res;
  });
}

export function clearApiCache() { _cache.clear(); }

// Returns true if a URL has a warm (non-expired) cache entry
export function isCacheWarm(url) {
  const hit = _cache.get(url);
  const ttl = CACHE_TTL[url] || CACHE_TTL[url.split('?')[0]];
  return !!(hit && ttl && Date.now() - hit.ts < ttl);
}

// Synchronously returns cached data (the axios response .data) or null if cache is cold
export function getCacheSync(url) {
  const hit = _cache.get(url);
  const ttl = CACHE_TTL[url] || CACHE_TTL[url.split('?')[0]];
  if (hit && ttl && Date.now() - hit.ts < ttl) return hit.res.data;
  return null;
}

// Fire all prefetch calls in background — populates cache before user navigates
export function prefetchAll(role) {
  const token = localStorage.getItem('token');
  if (!token) return;
  const urls = [
    ...PREFETCH_COMMON,
    ...(role === 'ADMIN' ? PREFETCH_ADMIN : PREFETCH_SME),
  ];
  // Stagger slightly to avoid hammering the backend all at once
  urls.forEach((url, i) => {
    setTimeout(() => cachedGet(url).catch(() => {}), i * 80);
  });
}

export default API;
