# BLACKJAK

**House Rules. Bad Decisions. One More Hand.**

BlackJak is a mobile-first blackjack game from OFFICIAL INSPIRE, inspired in personality by Jak Gold. The project keeps recognizable blackjack at its core and builds around it with a black-and-gold table aesthetic, reactive dealer commentary, fictional REP progression, achievements, and an optional arcade-style **Jak's House** ruleset.

## Current status

**BlackJak Demo v0.1.0 release candidate. Prompts 0–11 are implemented, including Classic play, Jak's House, local progression, Daily Hand, audio/haptics, accessibility/mobile QA, offline PWA support, release smoke coverage, and CI validation.**

Current demo features:

- Vite + TypeScript foundation
- responsive mobile-first black/gold table UI
- standard 52-card blackjack rules engine
- injectable Fisher-Yates RNG for deterministic tests
- ace-aware hard/soft hand evaluation
- dealer stands on all 17s, including soft 17
- Hit / Stand / Double / Split
- v1 split policy: equal blackjack point values may split (for example K + 10)
- natural blackjack pays 3:2
- split 21 pays as a normal win
- fictional practice-chip bankroll starting at 1,000
- stake presets: 10 / 25 / 50 / 100 / MAX (MAX capped at 250)
- initial, Double, and Split stakes are validated against available chips
- zero-chip **Refill Practice Chips** recovery with no purchase or real-world value
- multiple split hands render independently with active-hand highlighting
- dealer hole card remains hidden until resolution
- repeat-hand flow without page refresh
- persistent chip balance and Classic stats in versioned local storage
- persistent hands / wins / losses / pushes / blackjacks
- original HTML/CSS card faces and backs
- premium charcoal-felt / black-lacquer / brass-gold private-table visual system
- redesigned title/menu, Stats panel, Settings shell, and zero-chip recovery presentation
- engraved-style BlackJak card backs and premium cream playing-card faces
- staggered card-deal motion with reduced-motion fallback
- dedicated BLACKJAK / win / loss / push / split-decision result presentation
- circular chip-style stake controls and polished action controls
- responsive presentation tuned for 320px, 360px, 390px, 430px, tablet, and desktop widths
- data-driven Jak dealer commentary with 90+ original short reactions across 23 gameplay contexts
- weighted dialogue selection with recent-line anti-repeat memory
- reactions for blackjacks, dealer blackjacks, wins/losses, pushes, risky hits, doubles, splits, streaks, busts, refills, and return visits
- compact JG monogram dealer identity placeholder; no unapproved photo likeness or cloned voice
- commentary stays non-blocking and updates as a subtitle/status layer during play
- persistent REP progression that never changes card odds or dealer behavior
- REP rewards for wins, natural BlackJak, successful doubles, split sweeps, five-card wins, and survived risky hits
- eight escalating titles from **Table Scrub** through **BlackJak**
- nine deterministic achievements: BLACKJAK, WHY WOULD YOU DO THAT?, SPLIT PERSONALITY, GOLDEN BOY, HOUSE MONEY, I CAN QUIT ANYTIME, AGAIN., JAKPOT, and ABSOLUTE BULLSHII
- persistent win/loss streak state and ten-hand blackjack history
- compact title/REP meter on the table plus full progression display on Stats
- non-blocking achievement unlock toasts
- backward-compatible profile hydration for saves created before Prompt 5
- separate **Jak's House** arcade mode with explicit "not standard blackjack" labeling
- generic House modifier framework isolated from Classic `startRound`
- **Gold Card:** every third paid House hand turns the player's first opening card into a visibly gold Ace that counts as 1 or 11
- **Run It Back:** House sessions start with one token; after a net-losing House round, spend it to redeal the same base stake from a fresh deck with no additional initial chip charge
- while the Run It Back token is empty, completing five House rounds earns another token
- Run It Back replays do not increment the paid House-hand counter, so Gold Card scheduling stays deterministic
- **Hot Hand:** consecutive all-winning House rounds add +25% REP per win after the first, capped at a 2× REP multiplier; losses, pushes, and mixed split results reset it
- live House modifier status cards, Gold Card presentation, Hot Hand bonus readout, and replay-token controls
- House outcomes reuse the same chips, stats, achievements, and dealer personality while modifier logic stays separate
- project-safe synthesized WebAudio cues for cards, chips, controls, wins, losses, blackjack, and achievements
- optional synthesized room ambience with browser-autoplay-safe first-interaction activation
- persistent master feedback, SFX, ambience, haptics, and volume preferences
- defensive Vibration API feedback that silently degrades on unsupported browsers
- expanded persistent stats: win rate, doubles attempted/won, splits, split sweeps, busts, longest streaks, peak chips, lifetime REP, risky 16+ hits, and five-card wins
- deterministic **Daily Hand** challenge generated from local calendar date + stable challenge version
- Daily Hand always generates a playable decision state rather than an auto-resolved opening natural
- one scored Daily completion per local date with a flat +75 REP award; refreshes cannot repeatedly farm the reward
- Daily Hand uses a virtual wager and does not alter practice chips or ordinary Classic/House win-loss stats
- local Daily completion streak plus Web Share API result sharing with clipboard fallback
- installable PWA manifest with dedicated 192×192 and 512×512 black/gold app icons
- production Vite base path pinned to `/BlackJak/` for GitHub Pages asset correctness
- generated versioned service worker that precaches the actual hashed production JS/CSS/app-shell files
- offline navigation fallback plus cached static asset delivery after first successful PWA install/load
- content-hashed cache names and automatic removal of obsolete BlackJak caches
- safe update flow: new service workers wait until the player explicitly accepts the in-app update prompt
- install prompt, offline-mode status, and update-available UI
- GitHub Pages Actions workflow that installs dependencies, tests, typechecks, builds the PWA, uploads `dist/`, and deploys Pages
- accessible focus states, semantic controls, live result feedback, and 44px+ touch targets
- stable keyboard focus restoration across full-screen rerenders and mode changes
- keyboard shortcuts: **H** Hit, **S** Stand, **D** Double, **P** Split, **N** new/deal hand, **Esc** back to menu
- screen-reader card objects with rank/suit names while visible suit symbols preserve non-color distinction
- consolidated game-state live regions to avoid dealer/result/status announcement spam
- stale-control guards that ignore detached buttons after rapid double taps/rerenders
- unresolved Classic/House stakes stay in memory until resolution, so refresh/abandon does not permanently consume an unfinished wager
- House modifier/session state rolls back when an unresolved House hand is abandoned
- 320px/mobile text-overflow hardening, compact split-hand containment, safe-area/landscape fallbacks, and touch-action tuning
- corrupted/malformed local-storage envelopes safely fall back instead of leaking invalid state
- GitHub Actions now separates build health from Pages availability so a disabled Pages site does not turn a valid build into a failed workflow
- Vitest coverage for deck, hands, rules, round state, storage corruption/fallback, accessible card markup, and session economy

## Development Roadmap

See **[BlackJak-Development-Prompts.md](./BlackJak-Development-Prompts.md)**.

Prompt 11 is complete. The demo is at **v0.1.0 release-candidate** status; post-demo expansion work remains intentionally out of scope until this build is stable.

## Controls

Touch/click controls are always available. Keyboard users can Tab / Shift+Tab through the interface and use these shortcuts when a table action is available:

- **H** — Hit
- **S** — Stand
- **D** — Double
- **P** — Split
- **N** — Deal / Deal Again / start the Daily Hand when available
- **Esc** — return to the menu

## Local progression and saves

BlackJak stores chips, REP, achievements, stats, Daily Hand completion, and feedback settings locally in the browser. There is no account or backend requirement in v0.1.0. Clearing browser/site data removes that local progress.

REP is a progression score only. It never changes deck order, odds, dealer behavior, or Classic blackjack payouts.

## Install / PWA

On a supported browser, load the production build once while online. When the browser exposes an install prompt, BlackJak can be installed as a standalone PWA. After the service worker has cached a successful production load, the app shell and local-first game state remain available offline.

The target production path is:

```text
https://officialinspire.github.io/BlackJak/
```

GitHub Pages must first be enabled once at **Settings → Pages → Build and deployment → GitHub Actions** for that URL to deploy.

## Local development

Requires **Node.js 22+**.

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

### Validation

```bash
npm test
npm run typecheck
npm run build
npm run release:check
```

`npm run release:check` is the v0.1.0 release gate and runs the complete test suite, explicit TypeScript validation, and the production PWA build.

## Project structure

```text
src/
  config/      App constants and release/game configuration
  data/        Dealer dialogue, progression, and House modifier definitions
  feedback/    Synthesized audio and haptic feedback
  game/        Pure rules, round/session state, House mode, progression, and Daily Hand
  pwa/         Install/update/network-status registration behavior
  storage/     Versioned local persistence and safe hydration
  styles/      Core, premium, mode-specific, PWA, and QA responsive styles
  types/       App/profile/preference types
  ui/          Card markup and DOM rendering/event flow
tests/         Vitest engine, persistence, accessibility-markup, and release-smoke suites
public/        Manifest, install icons, and Pages static files
scripts/       Post-build service-worker generation
.github/       CI and conditional GitHub Pages deployment workflow
```

The repository intentionally has no runtime framework dependency beyond browser APIs; Vite, TypeScript, and Vitest are development dependencies.

## Classic BlackJak v1 rules contract

- one standard 52-card deck per round for the current demo engine
- dealer hits 16 and below
- dealer stands on hard and soft 17+
- blackjack = initial two-card 21
- natural blackjack pays 3:2
- normal win pays 1:1
- push returns the wager
- Double Down is available only on the first two cards and requires bankroll for the additional stake
- Split is available only on the first two cards, when both cards have equal blackjack point value, and requires bankroll for the second stake
- no insurance
- no surrender
- no side bets


## Jak's House rules

**Jak's House is an arcade mode, not standard blackjack.** Classic BlackJak remains available separately and does not use these modifiers.

### Gold Card

Every third **paid** House hand changes the player's first opening card into a Gold Card. The card is rendered in gold and counts exactly like an Ace: **1 or 11**, whichever standard Ace value best fits the hand. A Run It Back replay keeps the same House hand number, so if the original hand was a Gold Card hand, its replay is too.

### Run It Back

A House session begins with **one token**. After a House round with negative net chip result, the token can be spent to redeal the **same base stake** using a fresh shuffled deck. No new initial stake is charged, but optional Double/Split actions still require their normal additional fictional-chip stake. The original result remains in local stats/history; the replay is another resolved hand. While no token is held, completing five House rounds awards one replacement token.

### Hot Hand

Hot Hand changes **REP rewards only**, never deck order, card values, payouts, or dealer behavior.

- first consecutive all-winning House round: 1× REP
- second: 1.25×
- third: 1.5×
- fourth: 1.75×
- fifth and beyond: 2× cap

A loss, push, or mixed split result resets the House Hot Hand streak.


## Audio, haptics, and game feel

Prompt 7 uses the browser's Web Audio API to synthesize lightweight original cues at runtime rather than downloading third-party sound packs. Supported cues include card/deal movement, chip/button feedback, win/loss/blackjack stings, and achievement unlocks.

Audio begins only after a user gesture because browsers restrict autoplay. Settings persist locally:

- Master feedback
- SFX
- Room ambience
- Haptics
- Volume

Haptics use `navigator.vibrate()` defensively and never block gameplay when unsupported. Reduced-motion behavior remains independent of audio/haptic settings.

## Daily Hand

The **Daily Hand** is a local deterministic challenge and requires no backend.

- Seed input: local `YYYY-MM-DD` date + `daily-v1` challenge version.
- Everyone using the same build/date receives the same starting player hand and dealer up-card.
- The generator skips opening states that auto-resolve so each Daily Hand contains an actual player decision.
- Reloading before resolution recreates the same challenge.
- The first resolved completion for a local date awards **+75 REP**.
- Further refreshes/replays that date cannot award more Daily REP.
- Daily uses a virtual 25-chip rules-engine wager for outcome math; it does **not** debit/credit the player's practice-chip bankroll.
- Daily results do not inflate ordinary Classic/House win/loss statistics.
- Completion streaks persist locally.
- Sharing uses Web Share API when available and clipboard copy as fallback; no personal information is included.



## PWA, offline support, and GitHub Pages

Prompt 9 makes BlackJak installable and offline-capable without adding a third-party PWA runtime dependency.

### Production URL and base path

The production build uses Vite base path:

```text
/BlackJak/
```

Target GitHub Pages URL:

```text
https://officialinspire.github.io/BlackJak/
```

This keeps generated JS, CSS, manifest, icon, and service-worker URLs inside the repository's Pages subpath.

### Offline strategy

`npm run build` now performs three steps:

1. TypeScript validation.
2. Vite production build.
3. `scripts/build-sw.mjs` scans the completed `dist/` tree and generates `dist/sw.js`.

Generating the service worker **after** Vite is important because Vite fingerprints production JS/CSS filenames. The generated worker precaches the real output filenames rather than guessing them.

Each build creates a content-derived cache name. On activation, older BlackJak app caches are removed. Same-origin requests outside `/BlackJak/` are ignored.

After the first successful production load/service-worker install, the cached app shell includes the built application, manifest, icons, and hashed assets. Local progress remains in browser local storage, so Classic play, House play, chips, REP, achievements, settings, stats, and deterministic Daily Hand data remain local.

### Safe updates

A new service worker does **not** immediately replace an active worker during a running game. When a newer build finishes installing, BlackJak shows an update notice. Choosing **Update** sends `SKIP_WAITING` to the waiting worker and reloads only after it takes control.

This avoids mixing old HTML/JavaScript with a new cache in the middle of a hand.

### Installability

The manifest includes standalone display mode, BlackJak theme/background colors, and dedicated 192×192 / 512×512 PNG icons. Supporting browsers may expose BlackJak as an installable app; the UI also listens for `beforeinstallprompt` and surfaces an Install control when the browser provides that event.

### GitHub Pages deployment

`.github/workflows/pages.yml` runs CI on pull requests, pushes to `main`, and manual dispatch. It:

- installs dependencies with Node 22
- runs Vitest
- runs TypeScript typecheck
- builds the PWA and generated service worker
- verifies the expected production files exist
- checks whether this repository's GitHub Pages site is already enabled
- configures/uploads/deploys Pages only when Pages is available
- preserves a normal `dist/` artifact and finishes successfully when Pages has not yet been enabled

This prevents a repository-administration limitation from masking a healthy application build. The connected workflow token can deploy an existing Pages site, but it cannot create/enable Pages for the first time. If Pages is still disabled, use **Settings → Pages → Build and deployment → GitHub Actions** once; a later push or manual run will deploy automatically. The workflow uses `cancel-in-progress: false`, so rapid successive commits queue rather than cancelling one another.


## Accessibility, keyboard, and mobile QA

Prompt 10 is a hardening pass rather than a feature expansion.

### Keyboard controls

Normal Tab / Shift+Tab navigation works throughout the app. At an active table:

- **H** — Hit
- **S** — Stand
- **D** — Double
- **P** — Split
- **N** — Deal / Deal Again / start the Daily Hand when that control is available
- **Esc** — return to the menu

Keyboard shortcuts are ignored while typing or adjusting form controls, and key-repeat is ignored to avoid accidental repeated actions.

### Focus and screen readers

Full-screen DOM rerenders preserve the focused control when an equivalent control still exists. On a real screen change, focus moves to the new main region instead of disappearing back to the browser body. Cards expose rank/suit names as playing-card objects, active player hands expose total/wager/state, and the current game-status line is the primary polite live region. Dealer commentary and the visual result banner remain readable without competing with that status announcement.

### Mobile and touch behavior

The responsive QA layer keeps controls at roughly 44px or larger, applies `touch-action: manipulation` to tap controls, ignores stale detached controls after rerenders, tightens split hands at 320–360px, prevents horizontal page overflow, wraps long commentary/control text, respects safe-area insets, and allows short landscape screens to scroll instead of compressing the table into overlapping content.

### Refresh and corrupted storage behavior

An unfinished Classic or House wager is held in memory and committed only when the round resolves. Refreshing or abandoning an unresolved hand therefore restores the last committed bankroll rather than charging for a round that no longer exists. Malformed JSON, wrong-version storage envelopes, missing values, and blocked browser storage all fall back safely.


## Current limitations

- **Single-player/local-first demo:** no multiplayer, backend account system, cloud save, or global leaderboard.
- **Browser-local persistence:** clearing site data removes chips, REP, stats, achievements, Daily completion, and settings.
- **Classic v1 scope:** no insurance, surrender, side bets, or real-money functionality.
- **Jak collaboration assets:** the current JG presentation is a placeholder-safe identity treatment; no unapproved photo likeness or cloned voice is included.
- **PWA deployment dependency:** GitHub Pages must be enabled once in repository settings before the production URL can deploy.
- **Automated browser E2E:** v0.1.0 uses deterministic engine/state tests plus GitHub Actions production-build validation; a full cross-browser/device automation lab is a future improvement.

## Roadmap after v0.1.0

Post-demo work is intentionally deferred until the release candidate is stable. Potential later work includes approved Jak Gold voice/likeness assets, additional dealer rooms, cosmetic card/chip themes, expanded House modifiers, richer Daily analytics, multiplayer/pass-and-play experiments, cloud saves, leaderboards, seasonal events, and deeper achievement content.

See **[BlackJak-Development-Prompts.md](./BlackJak-Development-Prompts.md)** for the original staged development roadmap and **[CHANGELOG.md](./CHANGELOG.md)** for release history.

## Release validation

The v0.1.0 release-candidate pass reviews package scripts/dependencies, PWA configuration, deployment behavior, TODO/scaffold residue, repository assets, TypeScript diagnostics, test output, and production-build output.

A dedicated release-smoke suite covers:
- fresh profile/default bankroll and zero-chip refill
- natural blackjack settlement, REP, stats, and achievement unlock
- bust, Double, and Split resolution paths
- profile/progression and feedback-settings persistence
- Jak's House isolation and Gold Card scheduling
- deterministic Daily Hand and one-award-per-date behavior

GitHub Actions remains the source of truth for the final build gate.

## Practice-chip economy

BlackJak is an entertainment game using **fictional practice chips and REP only**. Practice chips cannot be purchased or exchanged for money or prizes. If the local practice-chip balance reaches zero, the game provides a free refill to the baseline stack.

## Design principle

> **Don't reinvent blackjack. Reinvent the feeling of sitting at the table.**

## Credits

- **Design, development, and publishing:** OFFICIAL INSPIRE
- **Jak Gold collaboration credit:** *Placeholder — replace with approved collaboration / likeness / voice credit before any build using those assets.*
- The current v0.1.0 build uses original/project-safe interface art, a JG monogram placeholder, browser-synthesized audio, and no unapproved cloned voice or photo likeness.

## OFFICIAL INSPIRE

https://www.inspireclothing.art/
