// Reads the approximate visitor country from Vercel's own edge geolocation
// headers — no third-party IP-lookup service, no API key, no extra request
// hop. Returns { country: null } for local dev or any non-Vercel host,
// which the frontend treats as "keep the default/base experience".
module.exports = (req, res) => {
  const country = req.headers['x-vercel-ip-country'] || null;

  // Per-visitor geo data must never be cached/shared across requests.
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).json({ country });
};
