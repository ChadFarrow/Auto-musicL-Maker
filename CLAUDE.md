# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

Auto musicL Maker generates **musicL playlist XML** (Podcasting 2.0) by extracting `<podcast:remoteItem>` track references out of a source RSS feed and re-emitting them as a new `podcast:medium=musicL` feed. It never downloads or hosts audio — the output is a playlist feed that points at tracks by `feedGuid`/`itemGuid` for musicL-compatible apps to resolve.

There are two entry points that produce the same output shape: a **browser UI** (`docs/editor.html`) and **Node CLI scripts** (`scripts/`).

## Commands

```bash
npm install
npm run dev      # nodemon server/index.js → http://127.0.0.1:3007/playlist/maker
npm start        # node server/index.js (no reload)

node scripts/create-doerfelverse-playlist.js   # example generator; writes docs/<name>-playlist.xml
```

- **No test suite.** `npm test` is a stub that exits 1.
- `npm run update-playlists` points at `scripts/update-all-playlists.js`, which **does not exist** in the repo — the script is missing, not just untested.
- To add a new playlist generator, copy `scripts/create-playlist-template.js`, replace its `[PLACEHOLDER]` tokens (`[FEED_URL]`, `[FUNCTION_NAME]`, `[FILENAME]`, etc.), and run it.

## Architecture

### The core pipeline (same in every entry point)
Fetch feed → parse XML → collect **all** `<podcast:remoteItem>` elements (keep only those with both `feedGuid` and `itemGuid`) → emit a single-`<channel>` RSS 2.0 doc containing user metadata, a `<podcast:txt purpose="source-feed">` attribution tag, `<podcast:medium>musicL</podcast:medium>`, a generated UUIDv4 `<podcast:guid>`, and one `<podcast:remoteItem>` per extracted track. Output has **no XML declaration**.

### Duplicated generation logic — keep these in sync
The playlist-building code is copy-pasted across three places. A change to the output format (a new channel field, attribution format, medium value) must be applied to **all** of them, or the "consistent structure across web/scripts/templates" guarantee the README makes breaks:
- `docs/editor.html` → `buildXml()` (client-side, DOM-based, runs in the browser)
- `scripts/create-playlist-template.js` → `generatePlaylistFromRemoteItems()` (Node, string-concatenation)
- Any generated `scripts/create-*-playlist.js` (copies of the template)

The blank reference is `docs/blank-playlist-template.xml`; `docs/doerfelverse-playlist-example.xml` is a full 126-track example of the target output.

### CORS proxy — two mirrored implementations
The browser can't fetch arbitrary feeds directly, so `docs/editor.html` fetches through `/api/proxy?url=<feed>`. That endpoint exists twice and the two copies must stay behaviorally identical (same SSRF host-blocking of localhost / `10.` / `192.168.` / `172.16–31.` and http/https-only checks):
- `server/index.js` — Express route for local dev
- `api/proxy.js` — Vercel serverless function for production

### Routing (dev mirrors prod)
`vercel.json` rewrites `/playlist/maker` → `docs/editor.html` and redirects `/` → `/playlist/maker`. `server/index.js` reproduces the same routes and serves `docs/` statically at both `/` and `/playlist/*` so relative asset paths resolve identically in dev and prod. Production is deployed at https://auto-music-l-maker.vercel.app/playlist/maker.

## Repo Noise to Ignore

The many dot-directories (`.taskmaster/`, `.roo/`, `.clinerules/`, `.cursor/`, `.windsurf/`, `.zed/`, `.gemini/`, `.kiro/`, `.trae/`) plus `.rules`, `.roomodes`, and `.mcp.json` are **Task Master AI** multi-editor scaffolding, not part of this app. `.env.example` (LLM provider keys) belongs to Task Master too — the playlist tool itself needs no API keys.
