---
name: build-source-convention
description: Wanderer AI build/source layout — edit _src.html not index.html; vite IIFE bundle; CSS link pattern
metadata: 
  node_type: memory
  type: project
  originSessionId: ccac6340-257a-4931-9666-a079248f160f
---

Wanderer AI build pipeline:
- **Source HTML is `_src.html`** (vite `rollupOptions.input`). `index.html` is the GENERATED output — `bash build.sh` runs `vite build` (IIFE bundle, `inlineDynamicImports`), then copies `dist/_src.html`→`index.html` and `dist/assets`→`assets/`. Always edit `_src.html`; never hand-edit `index.html`.
- JS: ESM modules in `js/parts/*.js`, bundled to one IIFE. New modules enter the bundle when imported from `js/main.js`. HTML `onclick="fn()"` requires the fn be added to the `Object.assign(window, {...})` block in `js/main.js`.
- CSS: authored as separate files in `css/parts/`, `<link href="css/parts/x.css?v=N">`'d from `_src.html`. **But vite BUNDLES them into the JS IIFE and injects them as `<style>` at runtime** (verified 2026-06-16): the generated `dist/index.html` has NO `<link rel=stylesheet>` and NO inline `<style>`, and there is NO `dist/css/` dir — every rule (e.g. `.sm-modal`, `radius-xl`) lives inside `dist/assets/_src-<hash>.js`. So the JS bundle hash is what actually busts CSS caching; bumping `?v=` is just source-side bookkeeping, not a real cache key.
- ⚠️ **Preview-after-CSS-edit gotcha:** because CSS is injected by the cached JS bundle, after a CSS edit + `build.sh` you MUST fully reload the preview page (`preview_eval location.reload()`). Querying computed styles / `smRulesPresent` on the already-open page shows STALE CSS from the old bundle (the new hashed `index.html` is only fetched on a real navigation). HMR/partial re-check is NOT enough here.
- State: slices in `js/state/*.js` composed into `S` via `js/state.js`. Game state lives in `js/state/w2.js`.
- Persistence: `SafeStorage.set/get` (00a) — a per-user KV cache hydrated from Supabase by `storageInit(sb, uid)` AFTER auth (in `03-auth-shell.js` initApp ~line 213). Per-user load hooks belong after `personalizationLoad()` (~line 293), NOT at module-load boot (cache empty then). Big blobs (voice) → IndexedDB (`00b-indexeddb.js`, `idbSaveRecording/idbGetRecording`).
- Verify: `npm run typecheck`, `npm run test:run` (vitest, 296 tests), `npm run dev` (serves _src.html on :3000), `bash build.sh` for prod parity. See [[wanderer-gamification-engine]].
- **build.sh is ATOMIC + LOCKED (2026-06-14)**: vite builds into `dist.tmp` (`--outDir dist.tmp --emptyOutDir`), then swaps `mv dist dist.old && mv dist.tmp dist`. WHY: vite empties `dist/` for the full ~15-18s transform; the preview server is plain `python3 -m http.server --directory dist` (`.claude/launch.json` → wanderer-dev :3000) which, when `dist/index.html` is briefly absent, serves a DIRECTORY LISTING or the bundle-less `_src.html` → the "stilsiz ham ekran" preview bug. Atomic swap shrinks that window from ~18s to microseconds. `mkdir dist.lock` guards against the every-turn [[auto-build-on-stop]] Stop hook overlapping a running build (would corrupt shared dist.tmp). Do NOT revert to in-place `vite build` + `mv dist/_src.html dist/index.html`.
