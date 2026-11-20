const path = require('path');
const { makePlaylist } = require('./lib/make-playlist.js');

/**
 * TEMPLATE for a musicL playlist made from the songs a show plays.
 *
 * 1. Copy this file to scripts/create-<name>-playlist.js.
 * 2. Fill in the config below.
 * 3. Run: node scripts/create-<name>-playlist.js
 *
 * playlistFeedUrl is where you will host the output file. The playlist's
 * podcast:guid is the UUIDv5 of that URL, so it never changes between runs.
 * If the playlist already has a guid, set `guid` instead and keep it.
 */
const config = {
  sourceFeedUrl: 'https://example.com/show-feed.xml',
  playlistFeedUrl: 'https://example.com/my-playlist.xml',
  // guid: '00000000-0000-0000-0000-000000000000',
  title: 'My Show Music Playlist',
  author: 'ChadF',
  description: 'The songs played on My Show',
  link: 'https://example.com/',
  imageUrl: '',
  language: 'en',
  // Optional: your medium="publisher" feed, so it can list this playlist.
  // publisher: { feedGuid: '…', feedUrl: 'https://example.com/publisher.xml' },
  outputPath: path.join(__dirname, '../docs/my-playlist.xml'),
};

if (require.main === module) {
  makePlaylist(config)
    .then(({ count, guid, outputPath }) => {
      console.log(`✅ ${count} songs, guid ${guid}`);
      console.log(`📁 ${outputPath}`);
    })
    .catch((err) => {
      console.error('❌', err.message);
      process.exit(1);
    });
}

module.exports = { config };
