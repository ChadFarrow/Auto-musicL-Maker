const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const { DOMParser } = require('xmldom');

/**
 * Aggregate the podcast episodes listed at localbitcoiners.com/feeds into ONE
 * Podcasting 2.0 `podcastL` playlist (the spoken-word analog of `musicL`).
 *
 * Unlike the single-feed scripts in this folder, this one:
 *   1. Fetches the localbitcoiners.com/feeds directory page (HTML).
 *   2. Extracts the episodes listed there. Two paths, tried in order:
 *        a. Page-direct: feedGuid/itemGuid pairs embedded in the page.
 *        b. Feed-fetch:  the feed URLs found on the page are fetched and each
 *           feed's episodes are turned into remoteItems (channel <podcast:guid>
 *           as feedGuid + each <item>'s <guid> as itemGuid) — the same pattern
 *           the web editor uses (docs/editor.html) as its fallback.
 *   3. Dedupes and emits <podcast:medium>podcastL</podcast:medium> with one
 *      <podcast:remoteItem> per episode to docs/localbitcoins-community-playlists.xml.
 *
 * NOTE: This requires network access to localbitcoiners.com AND to every show's
 * feed host. Run it locally (or in an environment whose egress policy allows
 * those hosts):  node scripts/create-localbitcoins-community-playlists.js
 */

const DIRECTORY_URL = 'https://localbitcoiners.com/feeds';
const OUTPUT_PATH = path.join(__dirname, '../docs/localbitcoins-community-playlists.xml');
const PLAYLIST_TITLE = 'LocalBitcoins Community Playlists';
const PLAYLIST_AUTHOR = 'ChadF';
const PLAYLIST_DESCRIPTION =
  'A podcastL playlist aggregating podcast episodes listed at ' + DIRECTORY_URL;
const USER_AGENT =
  'Mozilla/5.0 (compatible; Auto-musicL-Maker/1.0; +https://auto-music-l-maker.vercel.app/)';
const FETCH_TIMEOUT_MS = 30000;
const CONCURRENCY = 4;

async function createLocalbitcoinsCommunityPlaylists() {
  console.log('🎙️  Creating "' + PLAYLIST_TITLE + '" podcastL playlist...');
  console.log('📡 Fetching directory page: ' + DIRECTORY_URL);

  const html = await fetchUrl(DIRECTORY_URL);
  console.log('   Loaded ' + html.length + ' bytes of HTML');

  let remoteItems = [];

  // Path A: episodes embedded directly in the page (feedGuid + itemGuid pairs).
  const direct = extractDirectRemoteItems(html);
  if (direct.length > 0) {
    console.log('✅ Found ' + direct.length + ' episode(s) referenced directly on the page');
    remoteItems = direct;
  } else {
    // Path B: discover feed URLs on the page, then fetch each feed's episodes.
    const feedUrls = extractFeedUrls(html, DIRECTORY_URL);
    console.log('🔎 Discovered ' + feedUrls.length + ' candidate feed URL(s) on the page');
    if (feedUrls.length === 0) {
      throw new Error(
        'No episodes or feed URLs could be extracted from ' +
          DIRECTORY_URL +
          '. The page structure was not recognized — inspect the HTML and adjust ' +
          'extractDirectRemoteItems()/extractFeedUrls().'
      );
    }

    const perFeed = await mapLimit(feedUrls, CONCURRENCY, async (feedUrl) => {
      try {
        const xml = await fetchUrl(feedUrl);
        const episodes = extractEpisodesFromFeed(xml, feedUrl);
        console.log('   • ' + episodes.length + ' episode(s) — ' + feedUrl);
        return episodes;
      } catch (err) {
        console.warn('   ⚠️  Skipping feed (' + err.message + '): ' + feedUrl);
        return [];
      }
    });
    remoteItems = perFeed.flat();
  }

  // Dedupe by feedGuid::itemGuid (falling back to feedUrl::itemGuid when no guid).
  const seen = new Set();
  const deduped = [];
  let missingGuid = 0;
  for (const it of remoteItems) {
    if (!it.itemGuid) continue;
    if (!it.feedGuid) missingGuid++;
    const key = (it.feedGuid || it.feedUrl || '') + '::' + it.itemGuid;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }

  if (deduped.length === 0) {
    throw new Error('Extracted 0 usable episodes — nothing to write.');
  }
  if (missingGuid > 0) {
    console.warn(
      '   ⚠️  ' +
        missingGuid +
        ' episode(s) had no channel <podcast:guid>; using feedUrl as a fallback reference.'
    );
  }

  const xml = generatePlaylist(deduped);
  fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');

  console.log('🎉 Playlist created!');
  console.log('📁 File: ' + OUTPUT_PATH);
  console.log('🎧 Episodes: ' + deduped.length);
}

/**
 * Extract feedGuid/itemGuid pairs embedded directly in the directory HTML/JSON.
 * Best-effort: looks for the two attributes appearing close together (as in a
 * <podcast:remoteItem> tag or an embedded JSON blob).
 */
function extractDirectRemoteItems(html) {
  const items = [];
  const seen = new Set();
  const re =
    /feedGuid["'\s:=>]+([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})[\s\S]{0,300}?itemGuid["'\s:=>]+([^"'<>\s]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const feedGuid = m[1].trim();
    const itemGuid = decodeEntities(m[2].trim());
    const key = feedGuid + '::' + itemGuid;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ feedGuid, itemGuid, feedUrl: '' });
  }
  return items;
}

/**
 * Extract candidate podcast feed URLs from the directory HTML using several
 * heuristics (OPML outlines, feed-looking hrefs/attributes, bare feed URLs).
 */
function extractFeedUrls(html, baseUrl) {
  const found = new Set();
  let m;

  // 1) OPML outlines: xmlUrl="..."
  const opmlRe = /xmlUrl\s*=\s*["']([^"']+)["']/gi;
  while ((m = opmlRe.exec(html))) found.add(m[1]);

  // 2) href / data-* attributes that look like feeds
  const attrRe = /(?:href|data-feed|data-feedurl|data-url|url)\s*=\s*["']([^"']+)["']/gi;
  while ((m = attrRe.exec(html))) {
    if (looksLikeFeed(m[1])) found.add(m[1]);
  }

  // 3) bare feed-looking URLs anywhere (text, embedded JSON)
  const bareRe = /https?:\/\/[^\s"'<>)\]]+/gi;
  while ((m = bareRe.exec(html))) {
    if (looksLikeFeed(m[0])) found.add(m[0]);
  }

  // Normalize to absolute URLs and dedupe.
  const abs = new Set();
  for (const u of found) {
    try {
      abs.add(new URL(decodeEntities(u), baseUrl).toString());
    } catch (_) {
      /* ignore malformed */
    }
  }
  return Array.from(abs);
}

function looksLikeFeed(u) {
  return /\.xml(\?|#|$)|\.rss(\?|#|$)|\/rss\b|\/feed\b|[?&]feed=|format=xml/i.test(u);
}

/**
 * Turn one feed's XML into remoteItems.
 * Prefers existing <podcast:remoteItem> entries (already a playlist/music feed);
 * otherwise pairs the channel <podcast:guid> with each episode <item>'s <guid>.
 */
function extractEpisodesFromFeed(xml, feedUrl) {
  const parser = new DOMParser({
    errorHandler: { warning() {}, error() {}, fatalError() {} },
  });
  const doc = parser.parseFromString(xml, 'text/xml');
  if (!doc) return [];

  const results = [];

  // Prefer explicit remoteItems if the feed already has them.
  const remotes = doc.getElementsByTagName('podcast:remoteItem');
  for (let i = 0; i < remotes.length; i++) {
    const fg = (remotes[i].getAttribute('feedGuid') || '').trim();
    const ig = (remotes[i].getAttribute('itemGuid') || '').trim();
    if (fg && ig) results.push({ feedGuid: fg, itemGuid: ig, feedUrl });
  }
  if (results.length > 0) return results;

  // Fallback: channel <podcast:guid> + each episode <item>/<guid>.
  const guidEls = doc.getElementsByTagName('podcast:guid');
  const feedGuid = guidEls.length ? (guidEls[0].textContent || '').trim() : '';

  const items = doc.getElementsByTagName('item');
  for (let i = 0; i < items.length; i++) {
    const guidNodes = items[i].getElementsByTagName('guid');
    const itemGuid = guidNodes.length ? (guidNodes[0].textContent || '').trim() : '';
    if (!itemGuid) continue;
    results.push({ feedGuid, itemGuid, feedUrl });
  }
  return results;
}

function generatePlaylist(remoteItems) {
  const now = new Date().toUTCString();
  const playlistGuid = generateUUIDv4();

  let xml =
    '<rss version="2.0" xmlns:podcast="https://podcastindex.org/namespace/1.0">\n' +
    '  <channel>\n' +
    '    <author>' + escapeXml(PLAYLIST_AUTHOR) + '</author>\n' +
    '    <title>' + escapeXml(PLAYLIST_TITLE) + '</title>\n' +
    '    <description>' + escapeXml(PLAYLIST_DESCRIPTION) + '</description>\n' +
    '    <link>' + escapeXml(DIRECTORY_URL) + '</link>\n' +
    '    <podcast:txt purpose="source-feed">' + escapeXml(DIRECTORY_URL) + '</podcast:txt>\n' +
    '    <language>en</language>\n' +
    '    <pubDate>' + now + '</pubDate>\n' +
    '    <lastBuildDate>' + now + '</lastBuildDate>\n' +
    '    <image>\n' +
    '      <url></url>\n' +
    '    </image>\n' +
    '    <podcast:medium>podcastL</podcast:medium>\n' +
    '    <podcast:guid>' + playlistGuid + '</podcast:guid>\n';

  for (const it of remoteItems) {
    if (it.feedGuid) {
      xml +=
        '    <podcast:remoteItem feedGuid="' + escapeXml(it.feedGuid) +
        '" itemGuid="' + escapeXml(it.itemGuid) + '" />\n';
    } else if (it.feedUrl) {
      xml +=
        '    <podcast:remoteItem feedUrl="' + escapeXml(it.feedUrl) +
        '" itemGuid="' + escapeXml(it.itemGuid) + '" />\n';
    }
  }

  xml += '  </channel>\n</rss>';
  return xml;
}

/**
 * fetch a URL as text, sending a browser-like User-Agent and following
 * up to `redirectsLeft` HTTP redirects (both common for directory pages/feeds).
 */
function fetchUrl(targetUrl, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch (_) {
      return reject(new Error('Invalid URL: ' + targetUrl));
    }
    const lib = parsed.protocol === 'http:' ? http : https;
    const req = lib.get(
      targetUrl,
      { headers: { 'User-Agent': USER_AGENT, Accept: '*/*' } },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirectsLeft <= 0) return reject(new Error('Too many redirects: ' + targetUrl));
          let next;
          try {
            next = new URL(res.headers.location, targetUrl).toString();
          } catch (_) {
            return reject(new Error('Bad redirect target from ' + targetUrl));
          }
          return resolve(fetchUrl(next, redirectsLeft - 1));
        }
        if (status < 200 || status >= 300) {
          res.resume();
          return reject(new Error('HTTP ' + status));
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.setTimeout(FETCH_TIMEOUT_MS, () => {
      req.destroy(new Error('Timeout after ' + FETCH_TIMEOUT_MS + 'ms'));
    });
  });
}

/** Run `fn` over `items` with at most `limit` concurrent executions. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = [];
  for (let i = 0; i < Math.min(limit, items.length); i++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function generateUUIDv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

if (require.main === module) {
  createLocalbitcoinsCommunityPlaylists()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  createLocalbitcoinsCommunityPlaylists,
  extractDirectRemoteItems,
  extractFeedUrls,
  extractEpisodesFromFeed,
  generatePlaylist,
  escapeXml,
};
