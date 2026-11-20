/*
 * playlist-core.js — the one musicL playlist writer, shared by the web maker
 * (docs/editor.html loads it with a <script> tag) and the CLI scripts
 * (require('../docs/playlist-core.js')). No dependencies, no I/O, no DOM
 * construction: every function is pure, so `node --test` covers both writers.
 *
 * Rules it enforces (see issue #14):
 * - The Podcasting 2.0 namespace is https://podcastindex.org/namespace/1.0.
 * - Every interpolated value goes through escapeXml, attributes included.
 * - A playlist's <podcast:guid> is its own identity: the UUIDv5 of its own
 *   feed URL (the podcast:guid rule), or a guid the maker stored. It is never
 *   the source show's guid, and never a new random value on each build.
 * - Only songs are listed: remoteItems inside <podcast:valueTimeSplit> whose
 *   medium is absent or "music".
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlaylistCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PODCAST_NS = 'https://podcastindex.org/namespace/1.0';
  // The namespace UUID the podcast:guid tag defines for UUIDv5 feed guids.
  const PODCAST_GUID_NS = 'ead4c236-bf58-58c6-a2c6-a6b28d128cb6';

  // XML 1.0 forbids C0 controls other than tab, LF and CR, U+FFFE/U+FFFF and
  // lone surrogates, even when escaped. Drop them.
  function stripForbidden(value) {
    const s = String(value);
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff) {
        const next = s.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) { out += s[i] + s[i + 1]; i++; }
        continue;
      }
      if (c >= 0xdc00 && c <= 0xdfff) continue;
      if ((c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) || c === 0xfffe || c === 0xffff) continue;
      out += s[i];
    }
    return out;
  }

  function escapeXml(value) {
    return stripForbidden(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // --- SHA-1 (sync, so the guid can be computed in node and the browser alike)
  function sha1(bytes) {
    const ml = bytes.length * 8;
    const withPad = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
    withPad.set(bytes);
    withPad[bytes.length] = 0x80;
    const view = new DataView(withPad.buffer);
    view.setUint32(withPad.length - 4, ml >>> 0);
    view.setUint32(withPad.length - 8, Math.floor(ml / 0x100000000));
    let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
    const w = new Uint32Array(80);
    for (let off = 0; off < withPad.length; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
      for (let i = 16; i < 80; i++) {
        const x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
        w[i] = (x << 1) | (x >>> 31);
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4;
      for (let i = 0; i < 80; i++) {
        let f, k;
        if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
        else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
        else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
        else { f = b ^ c ^ d; k = 0xca62c1d6; }
        const t = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0;
        e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = t;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
    }
    const out = new Uint8Array(20);
    const ov = new DataView(out.buffer);
    [h0, h1, h2, h3, h4].forEach((h, i) => ov.setUint32(i * 4, h));
    return out;
  }

  function utf8(str) {
    return new TextEncoder().encode(str);
  }

  function uuidv5(name, namespace) {
    const ns = namespace.replace(/-/g, '').match(/../g).map((h) => parseInt(h, 16));
    const nameBytes = utf8(name);
    const input = new Uint8Array(16 + nameBytes.length);
    input.set(ns);
    input.set(nameBytes, 16);
    const hash = sha1(input).slice(0, 16);
    hash[6] = (hash[6] & 0x0f) | 0x50;
    hash[8] = (hash[8] & 0x3f) | 0x80;
    const hex = Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  /**
   * The podcast:guid of a feed URL, as the podcast:guid tag defines it: UUIDv5
   * in the podcast namespace, of the URL with its scheme and trailing slashes
   * removed. Returns '' for an empty URL.
   */
  function podcastGuidFromUrl(feedUrl) {
    const name = String(feedUrl || '').trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '');
    return name ? uuidv5(name, PODCAST_GUID_NS) : '';
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function isUuid(value) {
    return UUID_RE.test(String(value || '').trim());
  }

  function localName(node) {
    const n = node.localName || node.nodeName || '';
    const i = n.indexOf(':');
    return i === -1 ? n : n.slice(i + 1);
  }

  function elementsByLocalName(rootNode, name) {
    const out = [];
    const all = rootNode.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) if (localName(all[i]) === name) out.push(all[i]);
    return out;
  }

  /**
   * The songs a source feed plays: every <podcast:remoteItem> inside a
   * <podcast:valueTimeSplit>, with a feedGuid and an itemGuid, whose medium is
   * absent or "music". Deduplicated by feedGuid + itemGuid, in feed order.
   * Matches by local name, so a feed that declares the podcast namespace under
   * another URI is still read.
   */
  function extractMusicRemoteItems(doc) {
    const seen = new Set();
    const items = [];
    for (const vts of elementsByLocalName(doc, 'valueTimeSplit')) {
      for (const r of elementsByLocalName(vts, 'remoteItem')) {
        const feedGuid = (r.getAttribute('feedGuid') || '').trim();
        const itemGuid = (r.getAttribute('itemGuid') || '').trim();
        const medium = (r.getAttribute('medium') || '').trim().toLowerCase();
        if (!feedGuid || !itemGuid) continue;
        if (medium && medium !== 'music') continue;
        const key = feedGuid + '\u0000' + itemGuid;
        if (seen.has(key)) continue;
        seen.add(key);
        const item = { feedGuid, itemGuid };
        const feedUrl = (r.getAttribute('feedUrl') || '').trim();
        if (feedUrl) item.feedUrl = feedUrl;
        items.push(item);
      }
    }
    return items;
  }

  /**
   * The channel's own <link>: a direct child with no namespace, so an
   * <atom:link rel="self"/> that comes first is not taken for it.
   */
  function channelLink(channel) {
    const kids = channel.childNodes || [];
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      if (k.nodeType === 1 && (k.nodeName === 'link') && !k.namespaceURI) {
        return (k.textContent || '').trim();
      }
    }
    return '';
  }

  /**
   * Build the musicL feed. `opts`:
   *   guid (required, a UUID), title, author, description, link, language,
   *   pubDate, lastBuildDate, imageUrl, sourceFeedUrl,
   *   publisher: { feedGuid, feedUrl } (optional back-link),
   *   items: [{ feedGuid, itemGuid, feedUrl? }]
   * Throws if guid is missing or not a UUID.
   */
  function buildPlaylistXml(opts) {
    const o = opts || {};
    const guid = String(o.guid || '').trim();
    if (!isUuid(guid)) throw new Error('The playlist needs a podcast:guid (a UUID).');
    const now = new Date().toUTCString();
    const lines = [];
    const text = (tag, value) => {
      const v = value == null ? '' : String(value).trim();
      if (v) lines.push(`    <${tag}>${escapeXml(v)}</${tag}>`);
    };

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(`<rss version="2.0" xmlns:podcast="${PODCAST_NS}">`);
    lines.push('  <channel>');
    text('title', o.title);
    text('author', o.author);
    text('description', o.description);
    text('link', o.link);
    text('language', o.language || 'en');
    text('pubDate', o.pubDate || now);
    text('lastBuildDate', o.lastBuildDate || now);
    const imageUrl = String(o.imageUrl || '').trim();
    if (imageUrl) {
      lines.push('    <image>');
      lines.push(`      <url>${escapeXml(imageUrl)}</url>`);
      if (o.title) lines.push(`      <title>${escapeXml(String(o.title).trim())}</title>`);
      if (o.link) lines.push(`      <link>${escapeXml(String(o.link).trim())}</link>`);
      lines.push('    </image>');
    }
    lines.push('    <podcast:medium>musicL</podcast:medium>');
    lines.push(`    <podcast:guid>${escapeXml(guid)}</podcast:guid>`);
    if (o.sourceFeedUrl) {
      lines.push(`    <podcast:txt purpose="source-feed">${escapeXml(String(o.sourceFeedUrl).trim())}</podcast:txt>`);
    }
    const pub = o.publisher || {};
    const pubGuid = String(pub.feedGuid || '').trim();
    if (pubGuid) {
      if (!isUuid(pubGuid)) throw new Error('The publisher feedGuid must be a UUID.');
      const pubUrl = String(pub.feedUrl || '').trim();
      lines.push('    <podcast:publisher>');
      lines.push(
        `      <podcast:remoteItem medium="publisher" feedGuid="${escapeXml(pubGuid)}"` +
          (pubUrl ? ` feedUrl="${escapeXml(pubUrl)}"` : '') +
          ' />'
      );
      lines.push('    </podcast:publisher>');
    }
    for (const it of o.items || []) {
      lines.push(
        `    <podcast:remoteItem feedGuid="${escapeXml(it.feedGuid)}" itemGuid="${escapeXml(it.itemGuid)}"` +
          (it.feedUrl ? ` feedUrl="${escapeXml(it.feedUrl)}"` : '') +
          ' />'
      );
    }
    lines.push('  </channel>');
    lines.push('</rss>');
    return lines.join('\n') + '\n';
  }

  return {
    PODCAST_NS,
    escapeXml,
    podcastGuidFromUrl,
    isUuid,
    extractMusicRemoteItems,
    channelLink,
    buildPlaylistXml,
  };
});
