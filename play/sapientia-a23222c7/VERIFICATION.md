# Web build verification (agent, pre-merge)

**Game branch:** `finish/wm1` @ `3406666556f1533ed1a807e187633dedd83c0692`  
**Folder:** `play/sapientia-a23222c7/`  
**Harness:** Chromium headless (Playwright) on local static server — not a physical phone.

| Test | Result |
|------|--------|
| `play/` redirect | Points to `sapientia-a23222c7/` |
| Home tile “Early version” label | **Pass** (meta `.pill` on Sapientia card) |
| New Game → field (desktop 1280×800) | **Pass** |
| Desktop movement / interact | **Pass** (canvas hash delta) |
| Resource / console errors (desktop) | **Pass** (none) |
| Touch landscape 844×390 (emulated) | **Fail** past name entry — harness could not tap **OK**; screenshot shows name UI only |
| Touch joystick / A in field | **Not run** (blocked on name gate) |

Artifacts: `/opt/cursor/artifacts/sapientia-wm1-pr-ingame-desktop.png`, `sapientia-wm1-pr-smoke.json`
