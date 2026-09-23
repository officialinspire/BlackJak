# Changelog

All notable changes to BlackJak are documented here.

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
