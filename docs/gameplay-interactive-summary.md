# Interactive gameplay smoke (PR #7 branch, local static server)

**Generated:** 2026-11-07 (UTC)  
**Machine JSON:** `/opt/cursor/artifacts/gameplay-interactive-report.json` (not committed; CI/agent artifacts)  
**Method:** Playwright Chromium — pointer + keyboard on `<canvas>`, homepage card navigation, portrait/landscape/desktop viewports.

## Scope

| Game | Entry URLs tested | Real UI after input? |
|------|-------------------|----------------------|
| **SAPIENTIA** | `/play/sapientia-a276a8f8/`, homepage card | Yes — name prompt after gesture (`gameplay-int-sapientia-desktop-03-after-input.png`) |
| **Hoshimi Haven** | `/play/hoshimi-haven/`, homepage card | Yes — Nyoko tutorial in landscape (`gameplay-int-hoshimi-landscape-03-after-input.png`); **portrait blocked** by `#hh-rotate` |
| **Scrap Rider** | `/scrap-rider/play/`, homepage card | Yes — level select `SCRAP RIDER` / First Ride (`gameplay-int-scrap-rider-desktop-03-after-input.png`); **portrait blocked** by `#rotate` |

## Deep follow-up (canvas UI)

Godot draws menus on canvas (no DOM “First Ride” / “Next” nodes). Follow-up used normalized canvas clicks:

| Step | Result | Screenshot |
|------|--------|------------|
| Scrap Rider — canvas click level-1 card | **Entered level** “1 First Ride” with HUD + touch controls (`Hold GAS to start`) | `gameplay-int-scrap-rider-desktop-05-after-level1-click.png` |
| Hoshimi — canvas click tutorial Next | Click delivered; tutorial dialogue still on step 1 (Godot may need precise hit target or additional taps) | `gameplay-int-hoshimi-landscape-05-after-next.png` |

## Blockers & limits

- **Portrait mobile:** Hoshimi + Scrap show rotate-to-landscape overlays — expected, not a load failure.
- **Audio:** No in-game mute affordances observed; Sapientia registers `AudioContext` after input — **audible output not verified** in headless Chromium.
- **Heuristics:** `gameplayStartLikely` from WebGL pixel reads can be true while rotate overlays are visible — treat screenshots as source of truth.
- **Environment:** Local `http://127.0.0.1:8765` static host; cold-cache WASM/PCK timing may differ from GitHub Pages preview.

## Return navigation

Desktop/landscape runs: **return to homepage** via site chrome succeeded (per-game `*-04-return-home.png` in artifact bundle).

Not a merge/publish gate — Dennis should confirm on-target devices before calling builds production-ready.
