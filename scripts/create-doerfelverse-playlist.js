const path = require('path');
const { makePlaylist } = require('./lib/make-playlist.js');

// Into The Doerfel-Verse: the songs its episodes play, as a musicL playlist.
const config = {
  sourceFeedUrl: 'https://www.doerfelverse.com/feeds/intothedoerfelverse.xml',
  // Where docs/doerfelverse-playlist.xml is served. The playlist's
  // podcast:guid is the UUIDv5 of this URL, so it is the same on every run.
  playlistFeedUrl: 'https://auto-music-l-maker.vercel.app/playlist/doerfelverse-playlist.xml',
  title: 'Into The Doerfel-Verse Music Playlist',
  author: 'ChadF',
  description: 'Music tracks from Into The Doerfel-Verse podcast featuring The Doerfels band and Value4Value artists',
  link: 'https://www.doerfelverse.com/',
  language: 'en',
  outputPath: path.join(__dirname, '../docs/doerfelverse-playlist.xml'),
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
