// user-agent.js — the one User-Agent that every server-side request of this
// app sends: the feed proxy (api/proxy.js on Vercel, server/index.js locally)
// and the CLI scripts (scripts/lib/fetch-feed.js). Form:
// `<AppName>/<version> (+<link>)`, no email, no browser imitation. The
// version comes from package.json; the link is the live site.
//
// Until 2026-11-27 the proxy sent `Auto-musicL-Maker/1.0 (+<GitHub URL>)`
// and the scripts a `0.1` copy. Every probed feed host gave the same answer
// for the old and the new name on 2026-11-27.
const { version } = require('../package.json');

const APP_NAME = 'Auto-musicL-Maker';
const APP_VERSION = version;
const APP_LINK = 'https://auto-music-l-maker.vercel.app';
const USER_AGENT = `${APP_NAME}/${APP_VERSION} (+${APP_LINK})`;

module.exports = { APP_NAME, APP_VERSION, APP_LINK, USER_AGENT };
