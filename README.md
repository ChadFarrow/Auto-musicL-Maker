Auto musicL Maker

A simple tool to generate a musicL playlist XML from any Podcasting 2.0 music feed.

Live: https://auto-music-l-maker.vercel.app/playlist/maker

Getting started
- npm install
- npm run dev
- Open http://127.0.0.1:3007/playlist/maker

How to
1. Paste an XML feed URL into the box
2. Click Load or press Enter
3. Enter Author, Title, Description, Image URL
4. If this is a new feed click "Generate GUID"
5. Click Generate XML
6. The generated XML appears in the Output section
7. Click Download XML to save the playlist

Notes
- The app preserves the original channel <link> from the source feed
- The generator sets podcast:medium to musicL and emits one <item> wrapper that contains all <podcast:remoteItem> entries found in the source feed (falls back to episode GUIDs if none exist)
- A local dev proxy exists at /api/proxy to avoid CORS; production uses a Vercel serverless function at api/proxy.js
