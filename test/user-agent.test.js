// The shared User-Agent: its form, and that the proxy and the scripts send it.
const test = require('node:test');
const assert = require('node:assert/strict');
const https = require('node:https');
const { PassThrough } = require('node:stream');
const pkg = require('../package.json');
const { APP_NAME, APP_VERSION, APP_LINK, USER_AGENT } = require('../lib/user-agent.js');

test('USER_AGENT is `<AppName>/<version> (+<link>)` with the package.json version', () => {
  assert.equal(APP_NAME, 'Auto-musicL-Maker');
  assert.equal(APP_VERSION, pkg.version);
  assert.equal(APP_LINK, 'https://auto-music-l-maker.vercel.app');
  assert.equal(USER_AGENT, `Auto-musicL-Maker/${pkg.version} (+https://auto-music-l-maker.vercel.app)`);
  assert.match(USER_AGENT, /^[A-Za-z][A-Za-z0-9-]*\/\d+\.\d+\.\d+ \(\+https:\/\/\S+\)$/);
  assert.doesNotMatch(USER_AGENT, /@|Mozilla|Chrome|Safari/);
});

test('the Vercel feed proxy sends USER_AGENT upstream', async (t) => {
  const seen = [];
  t.mock.method(https, 'get', (url, options, onResponse) => {
    seen.push({ url, userAgent: options.headers['User-Agent'] });
    const upstream = new PassThrough();
    upstream.statusCode = 200;
    upstream.headers = { 'content-type': 'application/xml' };
    process.nextTick(() => { onResponse(upstream); upstream.end('<rss/>'); });
    return { on() { return this; } };
  });
  const handler = require('../api/proxy.js');
  const res = new PassThrough();
  res.status = () => res;
  res.json = () => res;
  res.setHeader = () => {};
  const done = new Promise((resolve) => res.on('finish', resolve));
  await handler({ query: { url: 'https://feeds.example.com/feed.xml' } }, res);
  await done;
  assert.deepEqual(seen, [{ url: 'https://feeds.example.com/feed.xml', userAgent: USER_AGENT }]);
});

test('the CLI fetchFeed sends USER_AGENT', async (t) => {
  const seen = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    seen.push({ url, userAgent: options.headers['User-Agent'] });
    return { ok: true, status: 200, text: async () => '<rss/>' };
  });
  const { fetchFeed } = require('../scripts/lib/fetch-feed.js');
  assert.equal(await fetchFeed('https://feeds.example.com/feed.xml'), '<rss/>');
  assert.deepEqual(seen, [{ url: 'https://feeds.example.com/feed.xml', userAgent: USER_AGENT }]);
});
