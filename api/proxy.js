// Vercel serverless proxy for fetching external RSS feeds (avoids CORS)
const http = require('http');
const https = require('https');

module.exports = async function handler(req, res) {
  try {
    const { url } = req.query || {};
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Missing url query parameter' });
      return;
    }
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      res.status(400).json({ error: 'Invalid URL' });
      return;
    }
    const protocol = parsed.protocol;
    if (protocol !== 'http:' && protocol !== 'https:') {
      res.status(400).json({ error: 'Only http/https URLs are allowed' });
      return;
    }
    const host = parsed.hostname || '';
    const blockedHosts = ['localhost', '127.0.0.1', '::1'];
    if (
      blockedHosts.includes(host) ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      res.status(403).json({ error: 'Host is not allowed' });
      return;
    }
    const agent = protocol === 'https:' ? https : http;
    agent.get(url, {
      headers: {
        'User-Agent': 'Auto-musicL-Maker/1.0 (+https://github.com/ChadFarrow/Auto-musicL-Maker)'
      }
    }, (upstream) => {
      const status = upstream.statusCode || 502;
      if (status >= 400) res.status(status);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/xml; charset=utf-8');
      upstream.pipe(res);
    }).on('error', (err) => {
      res.status(502).json({ error: 'Upstream fetch failed', details: String(err && err.message || err) });
    });
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', details: String(err && err.message || err) });
  }
}


