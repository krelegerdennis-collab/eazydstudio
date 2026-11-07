# Web build verification (agent)

**Game `main`:** `0b30e5f152830106668d8da290782e0ce33fec5a` (matches `git ls-remote` at verification time)  
**Folder:** `play/sapientia-a276a8f8/`  
**Harness:** Chromium headless (Playwright) against `python3 -m http.server` — not a physical phone.

| Test | Result |
|------|--------|
| Portal thumbnail “Early version” badge | **Pass** |
| New Game → field gameplay (desktop) | **Pass** |
| Desktop ArrowRight movement (canvas hash delta) | **Pass** |
| Desktop Space interact (canvas hash delta) | **Pass** |
| `document.requestFullscreen()` (desktop) | **Pass** (entered and exited) |
| WASM/PCK/JS resource failures | **Pass** (none) |
| JS console errors | **Pass** (none) |
| New Game → field (touch landscape emulated 844×390) | **Pass** (name via HTML `input` + OK tap) |
| Touch joystick drag (emulate_touch_from_mouse) | **Pass** |
| Touch A-button tap (emulated) | **Pass** |
| Fullscreen in touch session | **Not run** (no in-export FS control; desktop API passed) |
| Physical iOS/Android device | **Not run** |

Artifact screenshots (copy for PR): `/opt/cursor/artifacts/sapientia-home-tile.png`, `sapientia-ingame-desktop.png`, `sapientia-touch-landscape-ingame.png`.  
Machine-readable log: `/opt/cursor/artifacts/sapientia-qa-report.json`.
