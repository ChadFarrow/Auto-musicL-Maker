Auto musicL Maker

A comprehensive tool for generating musicL playlist XML files from Podcasting 2.0 music feeds, featuring both a web interface and automated playlist generation scripts.

## 📋 Templates & Examples

### Blank Template
Use `docs/blank-playlist-template.xml` as a starting point for manual playlist creation. The template includes:
- Numbered placeholders for easy reference (e.g., `[1-AUTHOR_NAME]`, `[2-PLAYLIST_NAME]`)
- Step-by-step instructions in XML comments
- Complete XML structure with all required fields
- Direct link to example playlist for reference

### Example Playlist
See `docs/doerfelverse-playlist-example.xml` for a complete example of a generated musicL playlist with 126 tracks from the Into The Doerfel-Verse podcast. This example demonstrates the proper XML structure, source feed attribution, and musicL formatting.

## 🛠️ Web Interface

Live: https://auto-music-l-maker.vercel.app/playlist/maker

### Getting Started
- npm install
- npm run dev
- Open http://127.0.0.1:3007/playlist/maker

### How to Use
1. Paste an XML feed URL into the box
2. Click Load or press Enter
3. Fill in all playlist details:
   - Author, Title, Description
   - Website URL (link)
   - Language Code (defaults to 'en')
   - Playlist Date and Last Build Date (use "Now" buttons)
   - Image URL (optional)
   - GUID (click "Generate GUID" for new feeds)
4. Click Generate XML
5. The generated XML appears in the Output section
6. Click Download XML to save the playlist

## 🔧 Automated Playlist Generation

### Available Scripts
- `node scripts/create-playlist-template.js` - Template for creating new playlist generation scripts
- `node scripts/create-doerfelverse-playlist.js` - Example script for generating Into The Doerfel-Verse playlist

### Features
- **Complete Field Control**: Input fields for all playlist metadata (author, title, description, website URL, language, dates, image, GUID)
- **Automatic Extraction**: Extracts existing `podcast:remoteItem` elements from source feeds
- **Smart Defaults**: Auto-generates UUIDs, dates, and language codes with user override capability
- **Source Attribution**: Includes `<podcast:txt purpose="source-feed">` tags for proper attribution
- **Standards Compliant**: Follows Podcasting 2.0 musicL specifications
- **Clean Output**: No XML declaration, proper RSS 2.0 format
- **Consistent Structure**: Same XML structure across web interface, templates, and scripts

## 📝 Technical Notes
- The app preserves the original channel `<link>` from the source feed
- The generator sets `podcast:medium` to `musicL` and extracts all `<podcast:remoteItem>` entries found in the source feed
- A local dev proxy exists at `/api/proxy` to avoid CORS; production uses a Vercel serverless function at `api/proxy.js`
- All playlists follow the same XML structure for consistency