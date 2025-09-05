Auto musicL Maker

A comprehensive tool for generating musicL playlist XML files from Podcasting 2.0 music feeds, featuring both a web interface and automated playlist generation scripts.

## 🎵 Generated Playlists

This project includes 6 curated musicL playlists from popular Value4Value music podcasts:

1. **UpBeats Music Playlist** (794 tracks)
   - Source: https://feeds.rssblue.com/upbeats
   - Independent artists from the UpBeats podcast

2. **Flowgnar Music Playlist** (242 tracks)
   - Source: https://feeds.oncetold.net/80000060
   - Outdoor adventure music from Flowgnar podcast

3. **Sats and Sounds Music Playlist** (815 tracks)
   - Source: https://satsandsounds.com/saspodcast.xml
   - Value4Value artists from Sats and Sounds podcast

4. **Mutton, Mead & Music Playlist** (1,492 tracks)
   - Source: https://mmmusic-project.ams3.cdn.digitaloceanspaces.com/Mutton_Mead__Music/feed.xml
   - Independent artists from Mutton, Mead & Music podcast

5. **Behind the Sch3m3s Music Playlist** (819 tracks)
   - Source: https://music.behindthesch3m3s.com/b4ts feed/feed.xml
   - Independent artists from Behind the Sch3m3s podcast

6. **Mike's Mix Tape Music Playlist** (162 tracks)
   - Source: https://mikesmixtape.com/mikesmixtaperss.xml
   - Value4Value artists from Mike's Mix Tape podcast

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
- `node scripts/create-upbeats-playlist.js` - Generate UpBeats playlist
- `node scripts/create-flowgnar-playlist.js` - Generate Flowgnar playlist
- `node scripts/create-satsandsounds-playlist.js` - Generate Sats and Sounds playlist
- `node scripts/create-muttonmead-playlist.js` - Generate Mutton, Mead & Music playlist
- `node scripts/create-behindtheschemes-playlist.js` - Generate Behind the Sch3m3s playlist
- `node scripts/create-mikesmixtape-playlist.js` - Generate Mike's Mix Tape playlist

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
