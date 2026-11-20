// make-playlist.js — the CLI path: fetch a source feed, take its songs, write
// the musicL feed with the shared writer in docs/playlist-core.js (the same
// code the web maker runs).
const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');
const core = require('../../docs/playlist-core.js');
const { fetchFeed } = require('./fetch-feed.js');

/**
 * config: { sourceFeedUrl, playlistFeedUrl | guid, title, author, description,
 *           link, imageUrl, language, publisher: { feedGuid, feedUrl }, outputPath }
 * The playlist guid is `config.guid` when given, else the UUIDv5 of
 * `config.playlistFeedUrl` — so every run writes the same guid.
 */
async function makePlaylist(config) {
  const guid = (config.guid || core.podcastGuidFromUrl(config.playlistFeedUrl)).trim();
  if (!core.isUuid(guid)) {
    throw new Error('Set playlistFeedUrl (where the playlist is hosted) or a fixed guid.');
  }
  const xmlText = await fetchFeed(config.sourceFeedUrl);
  const doc = new DOMParser({ onError: () => {} }).parseFromString(xmlText, 'text/xml');
  if (!doc || !doc.documentElement) throw new Error('The source feed is not XML');
  const items = core.extractMusicRemoteItems(doc);
  if (items.length === 0) {
    throw new Error('The source feed lists no songs; the output file was not written.');
  }
  const xml = core.buildPlaylistXml({ ...config, guid, sourceFeedUrl: config.sourceFeedUrl, items });
  fs.writeFileSync(config.outputPath, xml, 'utf8');
  return { guid, count: items.length, outputPath: config.outputPath };
}

module.exports = { makePlaylist };
