// Each test replays one fault from issue #14 against the shared writer.
const test = require('node:test');
const assert = require('node:assert/strict');
const { DOMParser } = require('@xmldom/xmldom');
const core = require('../docs/playlist-core.js');

const NS = 'https://podcastindex.org/namespace/1.0';
const GUID = '11111111-2222-5333-8444-555555555555';

function strictParse(xml) {
  const errors = [];
  const doc = new DOMParser({
    onError: (level, msg) => { if (level !== 'warning') errors.push(msg); },
  }).parseFromString(xml, 'text/xml');
  assert.deepEqual(errors, [], 'output must be well-formed XML');
  return doc;
}

const source = `<?xml version="1.0"?>
<rss version="2.0" xmlns:podcast="https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <atom:link rel="self" href="https://show.example/feed.xml"/>
    <link>https://show.example/</link>
    <title>Show</title>
    <podcast:guid>${GUID}</podcast:guid>
    <podcast:publisher><podcast:remoteItem medium="publisher" feedGuid="aaaaaaaa-0000-5000-8000-000000000000"/></podcast:publisher>
    <item>
      <guid>ep-1</guid>
      <podcast:valueTimeSplit startTime="0" duration="60">
        <podcast:remoteItem feedGuid="f1" itemGuid="i1"/>
      </podcast:valueTimeSplit>
      <podcast:valueTimeSplit startTime="60" duration="60">
        <podcast:remoteItem medium="podcast" feedGuid="f2" itemGuid="guest-episode-42"/>
      </podcast:valueTimeSplit>
      <podcast:valueTimeSplit startTime="120" duration="60">
        <podcast:remoteItem medium="music" feedGuid="f3" itemGuid="https://example.com/?p=12&amp;ep=3"/>
      </podcast:valueTimeSplit>
    </item>
    <item>
      <guid>ep-2</guid>
      <podcast:valueTimeSplit startTime="0" duration="60">
        <podcast:remoteItem feedGuid="f1" itemGuid="i1"/>
      </podcast:valueTimeSplit>
    </item>
  </channel>
</rss>`;

test('the namespace is podcastindex.org/namespace/1.0', () => {
  const xml = core.buildPlaylistXml({ guid: GUID, items: [] });
  const doc = strictParse(xml);
  assert.equal(doc.getElementsByTagNameNS(NS, 'medium')[0].textContent, 'musicL');
  assert.equal(doc.getElementsByTagNameNS(NS, 'guid').length, 1);
});

test('the guid is stable and comes from the playlist URL', () => {
  // The podcast:guid spec vector.
  assert.equal(core.podcastGuidFromUrl('https://podnews.net/rss'), '9b024349-ccf0-5f69-a609-6b82873eab3c');
  assert.equal(core.podcastGuidFromUrl('podnews.net/rss/'), '9b024349-ccf0-5f69-a609-6b82873eab3c');
  const a = core.podcastGuidFromUrl('https://example.com/pl.xml');
  assert.equal(a, core.podcastGuidFromUrl('https://example.com/pl.xml'));
  assert.equal(core.podcastGuidFromUrl(''), '');
});

test('a build without a guid is refused, never minted', () => {
  assert.throws(() => core.buildPlaylistXml({ items: [] }), /podcast:guid/);
  assert.throws(() => core.buildPlaylistXml({ guid: 'not-a-uuid', items: [] }), /podcast:guid/);
});

test('every interpolation is escaped, and forbidden characters dropped', () => {
  const xml = core.buildPlaylistXml({
    guid: GUID,
    title: 'Mutton, Mead & Music Playlist',
    description: '<b>bold</b> \u000B "q"',
    link: 'https://x.example/?a=1&b=2',
    items: [{ feedGuid: 'f"1', itemGuid: 'https://example.com/?p=12&ep=3' }],
  });
  const doc = strictParse(xml);
  assert.equal(doc.getElementsByTagName('title')[0].textContent, 'Mutton, Mead & Music Playlist');
  const r = doc.getElementsByTagNameNS(NS, 'remoteItem')[0];
  assert.equal(r.getAttribute('itemGuid'), 'https://example.com/?p=12&ep=3');
  assert.equal(r.getAttribute('feedGuid'), 'f"1');
});

test('only music remoteItems inside a valueTimeSplit are taken, once each', () => {
  const doc = strictParse(source);
  const items = core.extractMusicRemoteItems(doc);
  assert.deepEqual(items.map((i) => i.itemGuid), ['i1', 'https://example.com/?p=12&ep=3']);
});

test('a feed with no songs gives no items (no episode fallback)', () => {
  const doc = strictParse(`<rss xmlns:podcast="${NS}"><channel><podcast:guid>${GUID}</podcast:guid>
    <podcast:publisher><podcast:remoteItem medium="publisher" feedGuid="x" itemGuid="y"/></podcast:publisher>
    <item><guid>ep</guid></item></channel></rss>`);
  assert.deepEqual(core.extractMusicRemoteItems(doc), []);
});

test('the publisher back-link is written and is not a song', () => {
  const pub = 'aaaaaaaa-0000-5000-8000-000000000000';
  const xml = core.buildPlaylistXml({
    guid: GUID,
    publisher: { feedGuid: pub, feedUrl: 'https://p.example/pub.xml' },
    items: [{ feedGuid: 'f1', itemGuid: 'i1' }],
  });
  const doc = strictParse(xml);
  const block = doc.getElementsByTagNameNS(NS, 'publisher')[0];
  const r = block.getElementsByTagNameNS(NS, 'remoteItem')[0];
  assert.equal(r.getAttribute('medium'), 'publisher');
  assert.equal(r.getAttribute('feedGuid'), pub);
  assert.ok(!r.getAttribute('itemGuid'));
  assert.equal(core.extractMusicRemoteItems(doc).length, 0);
  assert.throws(() => core.buildPlaylistXml({ guid: GUID, publisher: { feedGuid: 'nope' } }), /publisher/);
});

test('the channel link is the plain <link>, not atom:link', () => {
  const doc = strictParse(source);
  assert.equal(core.channelLink(doc.getElementsByTagName('channel')[0]), 'https://show.example/');
});

test('<image> carries title and link; an empty image is left out', () => {
  const doc = strictParse(core.buildPlaylistXml({ guid: GUID, title: 'T', link: 'https://l.example/', imageUrl: 'https://i.example/a.jpg' }));
  const img = doc.getElementsByTagName('image')[0];
  assert.equal(img.getElementsByTagName('title')[0].textContent, 'T');
  assert.equal(img.getElementsByTagName('link')[0].textContent, 'https://l.example/');
  assert.equal(strictParse(core.buildPlaylistXml({ guid: GUID })).getElementsByTagName('image').length, 0);
});
