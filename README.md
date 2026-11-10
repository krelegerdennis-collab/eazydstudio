# EazyD Studio landing page

Static, mobile-first one-page site for **EazyD Studio** — Godot-ready pixel art packs, tools, Chrome extensions, and **Sapientia** (16-bit style JRPG in Godot 4).

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

## Demo build & caching
- Sapientia web build: versioned folder `play/sapientia-<hash>/` (hash = first 8 chars of sha256 over pck+wasm+js+html). Current: **`play/sapientia-a23222c7/`** from [Sapientia-RPG](https://github.com/krelegerdennis-collab/Sapientia-RPG) **`finish/wm1`** @ `3406666556f1533ed1a807e187633dedd83c0692` (Godot 4.3-stable Web export). Ship a new build in a new folder and update `play/index.html`; see `BUILD.txt` inside the folder for provenance.
- GitHub Pages headers can't be changed: every file gets `Cache-Control: max-age=600` and gzip is applied automatically (`.wasm` ~35 MB → ~8 MB, `.pck` ~14 MB → ~12.8 MB on the wire). Versioned folders mean a new build never mixes with stale cached files, but long-lived immutable caching isn't possible on Pages.
- Desktop loads the demo only when the hero card is in view and the browser is idle (or right away on "Play demo"); mobile only after "Play demo" → "Load demo".
- Iframe gets `?input=kb` (desktop) / `?input=touch` (mobile); the current build ignores it (touch HUD is drawn in-canvas), a game-side patch is needed to hide it.

- Hoshimi Haven web build: same pattern, `play/hoshimi-haven-<hash>/` + redirect in `play/hoshimi-haven/index.html`. Refresh it from the hoshimi-haven repo with `tools/web_deploy.sh <path-to-this-repo>` (takes the latest Nightly), then commit here.
