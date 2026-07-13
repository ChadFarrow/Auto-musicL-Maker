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
- `node scripts/create-localbitcoins-community-playlists.js` - Aggregates the podcast episodes listed at [localbitcoiners.com/feeds](https://localbitcoiners.com/feeds) into a single **`podcastL`** playlist (see below)

### Directory Aggregator (podcastL)

Unlike the single-feed scripts above, `create-localbitcoins-community-playlists.js` builds **one combined playlist from many feeds**. Because the source is podcast episodes (spoken word) rather than music, it sets `<podcast:medium>` to **`podcastL`** — the Podcasting 2.0 list medium that is the direct analog of `musicL`.

```
npm run create-localbitcoins-playlists
# or: node scripts/create-localbitcoins-community-playlists.js
```

It (1) fetches the directory page, (2) extracts episodes either directly from the page (embedded `feedGuid`/`itemGuid` pairs) or by discovering each feed URL and reading its channel `<podcast:guid>` + each episode's `<guid>`, and (3) dedupes and writes `docs/localbitcoins-community-playlists.xml`.

Options (CLI flag or env var; flags win):

| Flag | Env var | Purpose |
| --- | --- | --- |
| `--url=<page>` | `LBC_DIRECTORY_URL` | Directory page to scrape |
| `--out=<file>` | `LBC_OUTPUT_PATH` | Output XML path |
| `--dry-run` | `LBC_DRY_RUN=1` | Print the XML instead of writing it |

> **Requires network access** to `localbitcoiners.com` and to every show's feed host, so run it locally (or in an environment whose egress policy allows those hosts). The page-scraping heuristics (`extractDirectRemoteItems` / `extractFeedUrls`) are best-effort; if the directory's HTML structure differs, adjust those two functions.

### Features
- **Complete Field Control**: Input fields for all playlist metadata (author, title, description, website URL, language, dates, image, GUID)
- **Automatic Extraction**: Extracts existing `podcast:remoteItem` elements from source feeds
- **Smart Defaults**: Auto-generates UUIDs, dates, and language codes with user override capability
- **Source Attribution**: Includes `<podcast:txt purpose="source-feed">` tags for proper attribution
- **Standards Compliant**: Follows Podcasting 2.0 musicL specifications
- **Clean Output**: No XML declaration, proper RSS 2.0 format
- **Consistent Structure**: Same XML structure across web interface, templates, and scripts

## 🔍 How It Works

Auto-musicL-Maker creates musicL playlists by extracting music tracks from Podcasting 2.0 RSS feeds:

1. **Feed Loading**: Fetches the source RSS feed (via web interface or Node.js script)
2. **Track Extraction**: Automatically finds all `<podcast:remoteItem>` elements in the feed
   - These elements represent music tracks embedded in podcast episodes
   - Each `<podcast:remoteItem>` contains `feedGuid` and `itemGuid` attributes
3. **Playlist Generation**: Creates a new musicL RSS feed with:
   - User-provided metadata (author, title, description, website, language, dates, image)
   - Source feed attribution via `<podcast:txt purpose="source-feed">` tag
   - All extracted `<podcast:remoteItem>` entries as the playlist tracks
   - Unique UUID for the playlist GUID
   - `podcast:medium` set to `musicL` to identify it as a music playlist
4. **Output**: Generates clean RSS 2.0 XML without XML declaration, ready for hosting

The tool doesn't download or host the actual audio files - it creates a playlist feed that references the original tracks using their GUIDs, allowing musicL-compatible apps to stream the tracks from their original sources.

## 📝 Technical Notes
- The app preserves the original channel `<link>` from the source feed (or uses user-provided website URL)
- The generator sets `podcast:medium` to `musicL` and extracts all `<podcast:remoteItem>` entries found in the source feed
- A local dev proxy exists at `/api/proxy` to avoid CORS; production uses a Vercel serverless function at `api/proxy.js`
- All playlists follow the same XML structure for consistency