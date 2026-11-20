// fetch-feed.js — read a feed for the CLI scripts.
// Uses Node's fetch, so http:// and https:// both work and redirects are
// followed. A non-2xx answer throws, so a 404 or an error page can never be
// read as a feed with no songs and overwrite a good playlist file (#14).
async function fetchFeed(url, { timeoutMs = 30000 } = {}) {
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': 'Auto-musicL-Maker/0.1 (+https://github.com/ChadFarrow/Auto-musicL-Maker)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

module.exports = { fetchFeed };
