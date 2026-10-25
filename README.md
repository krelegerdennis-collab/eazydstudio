# EazyD Studio landing page

Static, mobile-first one-page site for **EazyD Studio** — Godot-ready pixel art packs, tools, Chrome extensions, and **SAPIENTIA** (16-bit style JRPG in Godot 4).

## Run locally

No build step. Serve the folder with any static file server:

```bash
python3 -m http.server 41789
```

Open [http://127.0.0.1:41789](http://127.0.0.1:41789).

## Files

- `index.html` — page structure and content
- `styles.css` — dark pixel-art theme, responsive layout
- `scripts/capture-screenshots.mjs` — Playwright full-page slices for QA artifacts

## Screenshots

With the preview server running:

```bash
PREVIEW_URL=http://127.0.0.1:41789/ node scripts/capture-screenshots.mjs
```
