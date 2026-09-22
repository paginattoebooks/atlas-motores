// Fetches USD-based exchange rates once per session (via our own serverless
// proxy, which itself caches the upstream response at the edge) and reuses
// them for every price on the page. Persisted locally so repeat visits
// within the TTL window skip the network call entirely.
const CACHE_KEY = 'atlas_exchange_rates_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — matches the edge cache TTL in api/exchange-rates.js

let ratesPromise = null;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.rates || !parsed.fetchedAt) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, fetchedAt: Date.now() }));
  } catch {
    // Storage full/unavailable — conversion still works for this page view, just not cached.
  }
}

// Resolves to { base: 'USD', rates: {...} } or null when no rate data is available
// (never throws — callers must treat null as "keep the original price").
export function getRates() {
  if (ratesPromise) return ratesPromise;

  const cached = readCache();
  if (cached) {
    ratesPromise = Promise.resolve(cached);
    return ratesPromise;
  }

  ratesPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const response = await fetch('/api/exchange-rates', { cache: 'no-store', signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) return null;
      const data = await response.json();
      if (!data || data.error || !data.rates) return null;
      writeCache(data);
      return data;
    } catch {
      return null;
    }
  })();

  return ratesPromise;
}
