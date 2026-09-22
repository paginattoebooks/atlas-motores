// Approximate visitor country, resolved through our own serverless function
// (reads Vercel's edge geo headers) — no client-side calls to third-party
// geo-IP services, no API keys exposed in the frontend.
let countryPromise = null;

export function detectCountry() {
  if (countryPromise) return countryPromise;

  countryPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const response = await fetch('/api/geo', { cache: 'no-store', signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) return null;
      const data = await response.json();
      return data && data.country ? String(data.country).toUpperCase() : null;
    } catch {
      // Network failure, timeout or endpoint unavailable (e.g. local static preview) — safe null fallback.
      return null;
    }
  })();

  return countryPromise;
}
