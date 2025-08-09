const express = require('express');
const path = require('path');
const url = require('url');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3007;

const docsDir = path.resolve(__dirname, '../docs');
app.use(express.static(docsDir));
// Also serve docs under /playlist/* so relative asset paths match production
app.use('/playlist', express.static(docsDir));

app.get('/playlist/maker', (req, res) => {
  res.sendFile(path.join(docsDir, 'editor.html'));
});

app.get('/playlist', (_req, res) => {
  res.redirect('/playlist/maker');
});

// Simple RSS proxy for local development to avoid CORS when fetching external feeds
// Usage: /api/proxy?url=https://example.com/feed.xml
app.get('/api/proxy', async (req, res) => {
  try {
    const target = req.query.url;
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }

    let parsed;
    try {
      parsed = new url.URL(target);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const protocol = parsed.protocol;
    if (protocol !== 'http:' && protocol !== 'https:') {
      return res.status(400).json({ error: 'Only http/https URLs are allowed' });
    }

    const host = parsed.hostname || '';
    // Block obvious private/internal hosts to reduce SSRF risk
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '::1'
    ];
    if (
      blockedHosts.includes(host) ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return res.status(403).json({ error: 'Host is not allowed' });
    }

    const agent = protocol === 'https:' ? https : http;
    agent.get(target, {
      headers: {
        'User-Agent': 'Auto-musicL-Maker/1.0 (+https://github.com/ChadFarrow/Auto-musicL-Maker)'
      }
    }, (upstream) => {
      const status = upstream.statusCode || 502;
      if (status >= 400) {
        res.status(status);
      }
      const ct = upstream.headers['content-type'] || 'application/xml; charset=utf-8';
      res.setHeader('Content-Type', ct);
      res.setHeader('Access-Control-Allow-Origin', '*');
      upstream.pipe(res);
    }).on('error', (err) => {
      res.status(502).json({ error: 'Upstream fetch failed', details: String(err && err.message || err) });
    });
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', details: String(err && err.message || err) });
  }
});

app.get('/', (_req, res) => {
  res.redirect('/playlist/maker');
});

app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, '127.0.0.1', () => {
  console.log('Server listening on http://127.0.0.1:' + PORT + '/playlist/maker');
});

