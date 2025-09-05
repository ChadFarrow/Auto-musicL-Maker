Auto musicL Maker

A comprehensive tool for generating musicL playlist XML files from Podcasting 2.0 music feeds, featuring both a web interface and automated playlist generation scripts.

## 🎵 Generated Playlists

This project includes a curated musicL playlist from the Into The Doerfel-Verse podcast:

**Into The Doerfel-Verse Music Playlist** (126 tracks)
- Source: https://www.doerfelverse.com/feeds/intothedoerfelverse.xml
- Music tracks from Into The Doerfel-Verse podcast featuring The Doerfels band and Value4Value artists

## 🛠️ Web Interface

Live: https://auto-music-l-maker.vercel.app/playlist/maker

### Getting Started
- npm install
- npm run dev
- Open http://127.0.0.1:3007/playlist/maker

### How to Use
1. Paste an XML feed URL into the box
2. Click Load or press Enter
3. Enter Author, Title, Description, Image URL
4. If this is a new feed click "Generate GUID"
5. Click Generate XML
6. The generated XML appears in the Output section
7. Click Download XML to save the playlist

## 🔧 Automated Playlist Generation

### Available Scripts
- `node scripts/create-doerfelverse-playlist.js` - Generate Into The Doerfel-Verse playlist
- `node scripts/create-playlist-template.js` - Template for creating new playlists

### Features
- Automatically extracts existing `podcast:remoteItem` elements from source feeds
- Generates RFC 4122 v4 UUIDs for playlist and item GUIDs
- Standardized XML structure with `<author>` at top, `<image>` above `<podcast:medium>`
- Blank image URLs ready for custom artwork
- Consistent formatting across all playlists

## 📝 Technical Notes
- The app preserves the original channel `<link>` from the source feed
- The generator sets `podcast:medium` to `musicL` and extracts all `<podcast:remoteItem>` entries found in the source feed
- A local dev proxy exists at `/api/proxy` to avoid CORS; production uses a Vercel serverless function at `api/proxy.js`
- All playlists follow the same XML structure for consistency