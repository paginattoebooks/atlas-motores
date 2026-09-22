// Serverless proxy for USD-based exchange rates.
//
// Why a proxy instead of calling the upstream API directly from the browser:
//   - lets us cache one shared response at Vercel's edge (s-maxage) so many
//     visitors reuse the same fetch instead of each one hitting the upstream
//     API individually;
//   - keeps the upstream provider swappable without touching frontend code;
//   - if a provider that requires a secret key is ever used instead, the key
//     stays server-side (process.env), never shipped to the browser.
//
// Default provider: https://open.er-api.com — free, no API key required.
const UPSTREAM_URL = 'https://open.er-api.com/v6/latest/USD';

module.exports = async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const upstream = await fetch(UPSTREAM_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!upstream.ok) throw new Error(`Upstream responded ${upstream.status}`);
    const data = await upstream.json();
    if (!data || data.result !== 'success' || !data.rates) throw new Error('Unexpected upstream payload');

    // Shared edge cache: one upstream call serves every visitor for 6h,
    // with a day of stale-while-revalidate so a slow/failed refresh never
    // blocks a response.
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json({
      base: 'USD',
      rates: data.rates,
      updated: data.time_last_update_utc || null
    });
  } catch (err) {
    // Never fail hard — the frontend falls back to original base-currency
    // prices when rates is null. Short cache so a transient outage recovers fast.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ base: 'USD', rates: null, error: true });
  }
};
