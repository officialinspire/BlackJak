# Changelog

All notable changes to BlackJak are documented here.

## [0.2.1] — 2026-09-24 — Hardening

### Security
- Content-Security-Policy `<meta>` in the production build: same-origin scripts only, no plugins, and `base-uri`/`form-action` locked. `verify-dist` fails the build if it's missing or an inline script appears. The whole app was verified to run with zero CSP violations.
- Error and Daily share-status text is HTML-escaped before rendering (`src/util/html.ts`). A test guards against unescaped interpolation.
- Dev toolchain patched: Vite 7.1.7 → 7.3.6 and Vitest 3.2.4 → 3.2.7, clearing the high and critical dev-server advisories. One moderate Vitest mock-redirect advisory remains; it's test-runner only, unused here, and fixed only in Vitest 5.

### Changed
- CI installs with `npm ci` from a committed `package-lock.json`, for reproducible builds.

### Fixed
- The Daily Hand's cards now deal in even when a previous table hand showed the same cards.

## [0.2.0] — 2026-09-24 — Visual Demo

The illustrated art set replaces the CSS-drawn presentation. Blackjack rules, odds, payouts and saved progress are unchanged; existing v0.1.0 saves load as-is.

### Added
- Visual atlas for the art sheets: explicitly measured `SpriteRect`s for 19 dealer poses, 3 × 55 card cells, and menu/dialogue/table layout regions (`src/data/visual-atlas.ts`).
- Vite `?url` asset module so all seven PNG sheets are fingerprinted into `dist/assets/` and precached by the service worker.
- SVG `viewBox` atlas renderer (`src/ui/atlas.ts`) and a lazy dev inspector behind `?debugVisuals=1`.
- Atlas tests covering real PNG dimensions, bounds, duplicate keys/rects, and overlaps.

- Shared responsive `.game-scene` for Classic and Jak's House. The `blackjak-table.png` art replaces the CSS-generated table, with layers for the NPC placeholder, cards, dialogue/status, and HUD. Anchors come from `src/config/scene-layout.ts`, and styling lives in `src/styles/scene.css`.
- Jak replaces the JG monogram as the gameplay dealer. His poses come from `blackjak-sprite-sheet.png` and are driven by dialogue events through `src/data/dealer-visuals.ts`, with one-shot deal/draw/chips gestures (`src/ui/dealer.ts`, `src/styles/dealer.css`).
- Sprite-sheet card faces and backs for three decks (Standard, Jak's Cosmic, Inspire Mono) via a strict 52-card mapping in `src/data/card-atlas.ts`. Every cell was verified by eye.
- Persistent Card deck preference in Settings (defaults to Standard; missing or corrupted values fall back safely).
- The Gold Card now decorates the themed card with a gold tint, ring and tag.
- `DialogueStatusPanel`: a nine-slice `dialogue-status-bar.png` frame for Jak's dialogue, status, round results and REP/House notes, in a bar under the table (`src/ui/dialogue-panel.ts`, `src/config/dialogue-panel-layout.ts`, `src/styles/dialogue-panel.css`).
- `menu-bar.png` main menu with DOM buttons at normalized hit areas, and an in-game pause board (`model.pauseMenuOpen`) that hangs over the table without touching the round: Resume, Deck, Sound, and Main Menu with confirmation. Esc toggles it at a table. `?debugVisuals=1` outlines the hit areas.
- Game-first table shell: compact HUD (menu, chips, REP/title, deck), fixed-height action dock (`src/ui/table-dock.ts`, `src/styles/dock.css`) that is sticky on phones, immediate Deal again, clear enabled/disabled states, a compact Jak's House modifier strip, and deal-in animation limited to new cards.
- Game feel (`src/ui/fx.ts`, `src/styles/fx.css`): card slide and hole-card flip, chip bounce, action flash, blackjack pop and win lift, bust impact, dialogue panel arrival and line fade, dealer reaction squash, and achievement pop. All effects are 120–500ms one-shot cues and are off with reduced motion.
- A stale double-tap guard on the dock (260ms after the controls change shape; pointer only).
- Optimized runtime art: WebP copies of the seven sheets, generated from the untouched PNG sources (`scripts/optimize-assets.py`). Download weight drops from 13.8MB to 2.9MB, and the dealer sheet's overlapping-pose pixels are cleared.
- `scripts/verify-dist.mjs` build gate (precache completeness, referenced assets, no raw PNGs, image budget) and repeatable Playwright QA scripts in `scripts/qa/`.

### Known art issues
- In the Inspire deck, 7♠, 7♥ and 7♣ show six pips. They're flagged in `CARD_ART_ISSUES` and render as the drawn face until the art is fixed.

### Changed
- Jak's gesture holds shortened (deal 750ms, draw 600ms, chips 650ms).
- The table controls are now a single dock. Jak's House's large banner and modifier cards became a one-line pill strip with a collapsible rules note; the page heading is kept for screen readers.
- Achievement toasts on tables appear at the top so they never cover the dock.
- At a table, the HUD's "← Menu" button (and Esc) now opens the pause board instead of leaving the table and discarding the hand.
- Round results, REP, Hot Hand bonus and Run It Back token notes moved from the center-of-table banner and the controls into the panel's single live status line. The table's height floor dropped from 345px to 270px, because the felt no longer hosts dialogue.
- Jak's name and dealer context moved from the NPC nameplate to the panel's speaker tab.
- The dealer total now sits beside the dealer's cards. Dealer cards are slightly smaller on tall frames so Jak's face stays visible, and the empty dealer placeholder is gone.

### Fixed
- Final gameplay stress coverage now checks repeatable seeded rounds, exact P/D/P/D opening choreography, single-card hits, one-time hole flips, settled-card rerenders, rapid Deal taps, deck switching, and uncaught browser errors.
- The PWA update QA now restores `dist/sw.js` byte-for-byte in a `finally` block, including after browser or assertion failures, so running QA cannot contaminate the production build.
- The empty scene overlay layer covered the whole felt and intercepted taps on the cards.
- Dealer poses showed slivers of neighbouring poses (a red card corner, part of an arm) at the edges of their frame.
- The bust shake, dialogue line fade and achievement toast no longer replay on every re-render.
- The primary button no longer turns dark-on-dark while hovered (a sticky hover after a tap made Deal again look disabled).
- Sticky positioning on table screens (`overflow-x: clip` instead of `hidden`).
- Atlas sprites fitted into a box of a different shape no longer show slivers of neighbouring sheet cells (nested SVG viewport clips exactly to the rect).
- The CHIPS pill was hidden on phones in Jak's House, because the mobile rule hid the second HUD pill by position rather than by class.
- Table screens are game-first: the compact HUD is above, the table fills the available height without distortion, and the controls sit directly below. The Jak's House banner and modifier strip moved below the controls.
- The dealer commentary and the status live region now sit in the scene's dialogue/status layer.

No blackjack rules or round state changed.

## [0.1.0] — 2026-09-23 — Demo release candidate

### Added
- Complete Classic BlackJak loop with Hit, Stand, Double, Split, dealer play, 3:2 natural blackjack, fictional practice chips, refill recovery, and persistent stats.
- Premium black/gold mobile-first table presentation with original HTML/CSS playing cards.
- Reactive Jak dealer commentary, REP progression, titles, achievements, streaks, and expanded lifetime statistics.
- Separate **Jak's House** arcade mode with Gold Card, Run It Back, and Hot Hand modifiers that do not change Classic rules.
- Synthesized project-safe audio, optional ambience, haptics, persistent feedback settings, and reduced-motion support.
- Deterministic local **Daily Hand** with once-per-date REP reward and share/copy support.
- Installable PWA manifest, generated versioned service worker, offline app-shell caching, install/update notices, and GitHub Pages production base path.
- Keyboard shortcuts, screen-reader card/hand semantics, stable focus restoration, touch/mobile QA hardening, and corrupted-storage fallback.
- Release-smoke coverage spanning fresh defaults, Classic resolution paths, persistence, Jak's House isolation, and Daily Hand behavior.

### Changed
- Project version promoted from pre-release `0.0.1` to `0.1.0`.
- Unresolved Classic/House stakes now remain in memory until resolution so refresh/abandon does not charge an unfinished round.
- GitHub Actions now treats unavailable GitHub Pages as a safe deployment skip while preserving a built `dist/` artifact.
- GitHub Actions dependencies were upgraded to current Node-24-era major versions to remove the runner deprecation warning.

### Validation
- Release gate: `npm run release:check`.
- CI separately runs tests, TypeScript validation, production PWA build, and production artifact checks.
- GitHub Pages deploy remains conditional on enabling **Settings → Pages → Build and deployment → GitHub Actions** once for the repository.

### Current release limitations
- Single-player/local-first demo; no backend, multiplayer, cloud saves, or global leaderboard.
- No real-money wagering, purchases, cash-out, prizes, or operator integrations.
- Progression/settings are browser-local and can be lost if site data is cleared.
- Actual Jak Gold likeness/voice assets are not included; the current build uses the approved-safe placeholder presentation until collaboration assets/credit are explicitly approved.
- Automated browser E2E/device-lab coverage is not yet included; engine/state behavior is covered by Vitest and production builds are validated in GitHub Actions.
