# BlackJak — Modular Development Prompts

Repository: https://github.com/officialinspire/BlackJak

BlackJak is a mobile-first, browser-based blackjack game inspired in personality by Jak Gold and built for the OFFICIAL INSPIRE game library. The design goal is simple: keep blackjack recognizable and satisfying, then layer on a distinctive black-and-gold visual identity, humorous dealer commentary, fictional REP progression, unlockables, and an optional arcade-like "Jak's House" mode.

> **Implementation status:** Prompts 0–11 are complete for the **BlackJak Demo v0.1.0 release candidate**. The Post-Demo Expansion Backlog remains intentionally deferred until the release candidate is stable.

## Product guardrails

- This is an entertainment game using fictional chips and REP only.
- No real-money wagering, cash-out, crypto, purchasable gambling currency, or links to gambling operators.
- Classic mode must use documented blackjack rules and never silently alter odds.
- Arcade modifiers belong only in the clearly labeled "Jak's House" mode.
- Mobile-first, responsive, keyboard accessible, and installable as a PWA.
- Avoid heavy frameworks and unnecessary dependencies.
- Prefer a lightweight stack: Vite + TypeScript + semantic HTML/CSS.
- Keep core rules/state separate from rendering so the rules can be unit-tested.
- Do not introduce copyrighted casino art/assets. Create original CSS/SVG graphics or clearly documented placeholders.
- Preserve existing functionality at every phase.
- Each prompt should leave the project runnable.
- Before finishing each phase: run available tests, run a production build, fix errors, update documentation if behavior changed, commit changes, and push to the repository's current working branch. If working through a PR workflow, keep the PR branch current rather than bypassing it.

---

# PROMPT 0 — Project Foundation & Architecture

You are working in the repository:

https://github.com/officialinspire/BlackJak

Build the initial foundation for **BLACKJAK**, a mobile-first blackjack game for OFFICIAL INSPIRE.

## Goal

Create a clean, production-oriented starting point that later prompts can expand without major rewrites.

## Technical direction

Use:

- Vite
- TypeScript
- semantic HTML
- modular CSS
- Vitest for unit tests
- no heavy UI framework unless the repository already contains one

Create a sensible source structure such as:

- `src/game/` — blackjack rules, deck, hand evaluation, state machine
- `src/ui/` — rendering and UI helpers
- `src/data/` — dialogue, achievements, configuration
- `src/storage/` — local persistence helpers
- `src/styles/`
- `src/types/`
- `tests/` or colocated `*.test.ts` files
- `public/` — icons/static placeholders

## Product identity

Game title: **BLACKJAK**

Working tagline:

**HOUSE RULES. BAD DECISIONS. ONE MORE HAND.**

Initial art direction:

- matte black
- warm gold
- cream/off-white
- worn card-table atmosphere
- subtle film grain/noise effect created in CSS if practical
- elegant card typography
- premium/streetwise rather than generic neon-casino visuals

## Foundation requirements

Create:

1. A responsive app shell.
2. Title/menu screen.
3. Placeholder buttons for:
   - Classic BlackJak
   - Jak's House
   - Stats
   - Settings
4. A basic game-table screen shell containing:
   - dealer zone
   - player zone
   - chip/REP HUD placeholder
   - action bar placeholder
5. Basic routing/state switching without requiring a routing library.
6. Central configuration/constants file.
7. A minimal local-storage wrapper with versioned keys.
8. Global error-safe initialization.
9. Accessibility foundations:
   - semantic buttons
   - visible focus states
   - reduced-motion support
   - legible color contrast
   - touch targets ~44px or larger
10. README setup instructions.

## Tests

Add basic tests for any foundational utilities created.

## Do not implement yet

Do not build full blackjack gameplay, betting logic, achievements, dialogue systems, or PWA behavior in this phase.

## Acceptance criteria

- `npm install` works.
- `npm run dev` starts the project.
- `npm test` passes.
- `npm run build` succeeds.
- The UI works at narrow phone widths and desktop widths.
- Menu buttons can move between placeholder screens/states without console errors.
- No dead code or unexplained dependencies.

Commit and push all completed changes.

---

# PROMPT 1 — Blackjack Rules Engine

Continue working in:

https://github.com/officialinspire/BlackJak

Preserve Prompt 0 architecture and UI.

## Goal

Implement a deterministic, well-tested blackjack rules engine **before** connecting it to the polished UI.

## Classic BlackJak rules for v1

Use a standard 52-card deck.

Cards:
- suits: spades, hearts, diamonds, clubs
- ranks: 2–10, J, Q, K, A
- face cards = 10
- ace = 1 or 11 as appropriate

Game behavior:
- player starts with two cards
- dealer starts with two cards
- one dealer card is hidden during player action
- player may Hit or Stand
- Double Down allowed on the initial two-card hand
- Split allowed when the initial two cards have the same rank/value according to a clearly documented rule; choose one policy and test it
- support split hands cleanly in the data model
- blackjack is an initial two-card 21
- natural blackjack payout multiplier = 3:2
- normal win = 1:1
- push returns stake
- dealer hits through 16
- dealer stands on all 17s for v1, including soft 17
- bust > 21
- no insurance in v1
- no surrender in v1
- no side bets

## Architecture

Implement separate testable modules for:

- card/deck creation
- Fisher-Yates shuffle using injectable RNG
- card values
- hand evaluation
- soft/hard hand detection
- blackjack detection
- bust detection
- dealer action logic
- winner/outcome resolution
- payout calculation
- allowed player actions
- round state machine

Use an injectable seeded or mockable RNG interface so tests can force known draws.

## Important

Do not make UI code responsible for game rules.

The rules layer should be usable without a DOM.

## Tests

Thoroughly test at minimum:

- ace adjustment
- multiple aces
- blackjack
- player bust
- dealer bust
- push
- dealer draws to 17+
- dealer soft 17 behavior
- double-down eligibility
- split eligibility
- split-hand outcomes
- payout calculations
- deterministic deck order under injected RNG/mock deck

## Temporary developer harness

Connect enough of the engine to the existing game-table view that a developer can deal a round and inspect state, even if the UI remains visually basic.

## Acceptance criteria

- Rules are isolated from UI.
- Unit tests cover important rule branches.
- No `Math.random()` calls are scattered through game logic; randomness is centralized/injectable.
- Build and tests pass.

Commit and push all completed changes.

---

# PROMPT 2 — Playable Classic BlackJak Demo

Continue from the completed rules engine.

## Goal

Turn Classic BlackJak into a complete playable single-player loop.

## Implement the full round loop

Flow:

1. Player enters Classic BlackJak.
2. Starting fictional bankroll is loaded or initialized.
3. Player chooses a fictional chip stake.
4. Deal animation begins.
5. Player receives two cards.
6. Dealer receives two cards, one face-down.
7. Available buttons reflect valid actions:
   - Hit
   - Stand
   - Double
   - Split when eligible
8. Player acts.
9. Dealer reveals the hole card and resolves its hand.
10. Outcome is displayed.
11. Fictional chip balance updates.
12. Player can immediately start another hand.

## Fictional currency

Use clearly fictional chips.

Default starting chips: choose a sensible value such as 1,000.

Suggested stake controls:
- 10
- 25
- 50
- 100
- Max, capped sensibly

Prevent:
- betting zero
- betting more chips than available
- invalid double stakes
- invalid split stakes

If the player reaches zero chips, provide a harmless **Refill Practice Chips** action that restores a baseline amount. Do not introduce purchases or real-money mechanics.

## UX

Prioritize:
- portrait phone layout
- one-thumb reach
- fast transitions
- readable cards
- immediate feedback
- minimal modal interruption

Desktop should also look intentional.

## Cards

Build original card components using HTML/CSS/SVG rather than external copyrighted packs.

Cards should:
- show rank and suit
- distinguish red/black suits accessibly, not by color alone
- support face-down state
- animate dealing/flipping with reduced-motion fallback

## Persistence

Persist:
- chip balance
- total hands
- wins
- losses
- pushes
- blackjacks

Use versioned local storage.

## Acceptance criteria

A user can play repeated Classic BlackJak rounds on mobile or desktop without refreshing the page.

All existing tests pass and add integration/state tests for the main gameplay loop.

Build and test before committing.

Commit and push all completed changes.

---

# PROMPT 3 — Black/Gold Art Direction & Premium Table Presentation

Continue from the playable Classic BlackJak demo.

## Goal

Make the game visually feel like **BlackJak**, not a generic tutorial project.

## Art direction

Create an original interface inspired by:

- matte black cards/table surfaces
- warm metallic gold accents
- cream typography
- worn wood or black felt
- understated luxury
- streetwise/private-back-room energy
- subtle analog texture/film grain
- low-light table-lamp atmosphere

Avoid:
- generic green casino felt
- slot-machine neon overload
- copied casino branding
- excessive skeuomorphism

## Screens

Polish:
- splash/title
- main menu
- classic table
- round result presentation
- stats panel
- settings
- empty/zero-chip recovery state

## Micro-interactions

Add tasteful:
- card deal motion
- card flip
- chip movement/stack response
- blackjack gold flash
- bust impact
- win/lose/push result transitions
- button press feedback

Respect `prefers-reduced-motion`.

## Responsive design

Test at representative widths:
- 320px
- 360px
- 390px
- 430px
- 768px
- desktop

No horizontal scrolling during gameplay.

## Acceptance criteria

- Game has a consistent visual system.
- No important controls are below inaccessible viewport areas on common phone sizes.
- Cards remain legible.
- Animations do not block rapid replay.
- Reduced-motion mode is functional.
- Build/tests pass.

Commit and push all completed changes.

---

# PROMPT 4 — Jak Dealer Personality & Reactive Commentary

Continue from the polished Classic BlackJak demo.

## Goal

Give BlackJak a recognizable personality through a data-driven dealer/commentary system inspired by Jak Gold.

Do **not** require voice acting or a photographic likeness yet.

## Commentary system

Create a structured dialogue/event engine.

Possible event keys:

- game_start
- player_blackjack
- dealer_blackjack
- player_bust
- dealer_bust
- player_win
- player_loss
- push
- hit_17
- hit_18
- hit_19
- hit_20
- survived_risky_hit
- double_win
- double_loss
- split_started
- split_sweep
- split_disaster
- losing_streak
- winning_streak
- refill_chips
- idle
- return_player

Dialogue should be stored in data files, not hard-coded into components.

Use weighted/random selection with anti-repetition logic.

## Tone

Dry, confident, amused, occasionally absurd.

Examples of energy—not mandatory exact wording:

- "Oh, you're stupid stupid."
- "Never doubted you."
- "Maybe cards aren't your ministry."
- "Business."
- "Now we're talking."
- "You deserve whatever happens next."

Write a substantial original starter bank, roughly 80–120 short lines across contexts.

Avoid harassment/slurs directed at protected groups and keep the humor playful.

## Presentation

Add a dealer/commentary area that works on mobile without obscuring cards.

Possible UI:
- dealer speech line beneath dealer name
- short subtitle-like strip
- timed but dismissible/replaceable reactions

Dialogue must not slow gameplay.

## Optional identity placeholder

Use a stylized original dealer silhouette/monogram/avatar placeholder such as:
- JG monogram
- gold-ringed hand silhouette
- black/gold portrait frame

Do not generate or impersonate Jak's actual likeness or voice without supplied/approved assets.

## Acceptance criteria

- Commentary reacts correctly to events.
- Repeated lines are uncommon.
- System is easy to extend.
- Gameplay is never blocked by dialogue.
- Tests cover event selection/anti-repeat behavior where reasonable.
- Build/tests pass.

Commit and push all completed changes.

---

# PROMPT 5 — REP, Titles, Achievements & Long-Term Progression

Continue from the existing game.

## Goal

Add a lightweight progression system that rewards interesting play without altering Classic blackjack odds.

## REP

Introduce **REP** as a persistent, fictional progression score separate from chips.

Suggested initial rewards:
- normal win: +50 REP
- blackjack: +100 REP
- double-down win: +150 REP
- win both split hands: +150 REP
- survive a hit starting from 16+: bonus REP
- five-card non-bust win: bonus REP

Tune values for fun rather than grind.

Losses should generally not remove REP.

## Titles

Create progression titles such as:
- Table Scrub
- Weekend Gambler
- Bad Influence
- Double Down Demon
- House Problem
- Golden Hand
- Jak's Favorite
- BlackJak

Use REP thresholds or achievements to unlock titles.

## Achievements

Implement a data-driven achievement system.

Starter achievements:

- **BLACKJAK** — Get your first natural blackjack.
- **WHY WOULD YOU DO THAT?** — Hit on 20.
- **SPLIT PERSONALITY** — Win both hands after a split.
- **GOLDEN BOY** — Win 10 hands.
- **HOUSE MONEY** — Reach a large fictional chip balance.
- **I CAN QUIT ANYTIME** — Play 100 hands.
- **AGAIN.** — Start another hand after a five-loss streak.
- **JAKPOT** — Get three blackjacks within ten completed hands.
- **ABSOLUTE BULLSHII** — Dealer reaches 21 with five cards.

## UX

Add:
- compact REP meter
- current title
- achievement toast
- achievements/stats screen
- no intrusive full-screen popups during active play

## Persistence and migrations

Persist progression with explicit storage schema versioning.

Do not wipe an existing player's chip/stats data when adding REP.

## Acceptance criteria

- REP never affects card odds or deck state.
- Achievements are deterministic and testable.
- Persistent data migrates safely.
- Unlock notifications are non-blocking.
- Build/tests pass.

Commit and push all completed changes.

---

# PROMPT 6 — Jak's House Arcade Mode

Continue from the stable Classic mode.

## Goal

Create a clearly separate **JAK'S HOUSE** mode with arcade modifiers.

Classic BlackJak must remain unchanged and accessible.

## Mode identity

On mode selection, clearly explain:

**Classic BlackJak**
Standard blackjack rules.

**Jak's House**
Blackjack-inspired arcade rules. House modifiers may alter a round.

## Implement only 3 modifiers for the first demo

Choose and implement these:

### 1. GOLD CARD

Once per designated round or when triggered, a visibly gold special card can behave as a flexible-value card. Define the exact behavior in code/docs so it is deterministic and understandable.

Do not contaminate the Classic deck/rules.

### 2. RUN IT BACK

Award a rare one-use token allowing the player to replay/redeal a losing round under a clearly defined rule. Decide whether the deck is reshuffled/replayed and document it to avoid ambiguity.

### 3. HOT HAND

Consecutive wins build a REP multiplier or bonus. This modifier affects rewards only, not card probability.

## Modifier framework

Build the mode as a generic modifier system so later modifiers can be added without editing core blackjack logic extensively.

Possible model:
- hooks/events around round start, draw, resolution, reward
- modifier metadata
- UI explanation
- active modifier indicator

## UX

Make it obvious whenever an arcade modifier is active.

Never present Jak's House outcomes as standard blackjack.

## Acceptance criteria

- Classic mode produces the same behavior/tests as before.
- House modifiers are isolated and extensible.
- User understands what each active modifier does.
- Tests cover each modifier.
- Build/tests pass.

Commit and push all completed changes.

---

# PROMPT 7 — Audio, Haptics & Game Feel

Continue from the stable game.

## Goal

Add satisfying, lightweight sensory feedback without making the game obnoxious.

## Sound categories

Support:
- card slide/deal
- card flip
- chip click/clack
- button tap
- win sting
- loss/bust sting
- blackjack sting
- achievement unlock
- ambient room loop placeholder/interface

Use original/generated project-safe audio assets if available in-repo. If assets are not available, create the audio architecture and document required filenames rather than downloading copyrighted sounds.

## Audio controls

Settings:
- master sound toggle
- music/ambience toggle
- SFX toggle
- volume if practical

Respect browser autoplay restrictions.

Persist preferences.

## Haptics

Where supported and appropriate on mobile:
- subtle button pulse
- deal result pulse
- stronger but brief blackjack/achievement pulse

Use the Vibration API defensively; game must work without it.

Provide haptics toggle.

## Game feel

Tune:
- animation timing
- result pacing
- fast replay
- no unnecessary delays between hands

## Acceptance criteria

- Game remains usable muted.
- Audio never prevents input.
- No console errors on browsers lacking vibration/audio support.
- Settings persist.
- Reduced-motion preference remains respected.
- Build/tests pass.

Commit and push all completed changes.

---

# PROMPT 8 — Stats, Daily Hand & Replay Hooks

Continue from the existing game.

## Goal

Add replayability without needing a backend.

## Expanded local stats

Track and display:
- hands played
- wins
- losses
- pushes
- win rate
- blackjacks
- doubles attempted/won
- splits attempted
- split sweeps
- busts
- longest win streak
- longest loss streak
- highest chip balance
- lifetime REP
- risky hits from 16+
- five-card wins

Use sane guards for division-by-zero.

## Daily Hand

Create a deterministic local **Daily Hand** challenge derived from the calendar date plus a stable seed.

Everyone running the same version/date should receive the same initial challenge state.

The Daily Hand should:
- show the starting player hand
- show dealer up-card
- allow one attempt or a clearly documented retry policy
- record local completion/result for the day
- award a modest REP bonus once per day
- never award real-world value

Do not require a server.

## Share result

Optionally support a text-only share summary through Web Share API with copy-to-clipboard fallback, for example:

BLACKJAK DAILY HAND
Result: WIN
Move: DOUBLE
🔥 3-day streak

Do not leak personal data.

## Acceptance criteria

- Deterministic daily seed is tested.
- Same date/version gives same challenge.
- REP reward cannot be repeatedly farmed by refresh.
- Stats survive reload.
- Build/tests pass.

Commit and push all completed changes.

---

# PROMPT 9 — PWA, Offline Support & Installability

Continue from the stable BlackJak app.

## Goal

Make BlackJak a reliable installable PWA suitable for GitHub Pages and mobile play.

## Requirements

Add:
- web app manifest
- app name / short name
- theme/background colors
- display: standalone
- appropriate icons/placeholders generated from original BlackJak branding
- service worker
- offline app-shell caching
- safe update strategy
- offline fallback behavior

If using a Vite PWA plugin, keep configuration simple and document it.

## Important

Avoid the common stale-cache trap.

Use versioned cache names and an update flow that allows new releases to replace old cached assets.

## GitHub Pages

Configure paths/base URLs so deployment to:

https://officialinspire.github.io/BlackJak/

works correctly.

Add a GitHub Actions workflow for Pages deployment if repository permissions/workflow conventions allow it.

## Offline test

After first successful load/install:
- app shell should open offline
- Classic gameplay should work offline
- local stats/REP/chips should work offline
- assets required for gameplay should be cached

Any optional online-only feature must fail gracefully.

## Acceptance criteria

- Lighthouse/installability basics are satisfied where practical.
- No broken asset paths under GitHub Pages subpath hosting.
- Offline gameplay works after first load.
- Service worker updates do not permanently strand users on old versions.
- Build/tests pass.

Commit and push all completed changes.

---

# PROMPT 10 — Accessibility, Mobile QA & Bug-Fix Pass

Continue from the completed demo.

## Goal

Perform a dedicated quality pass instead of adding new features.

## Test interaction modes

Verify:
- Android Chrome touch
- iPhone/Safari-style narrow viewport assumptions
- desktop Chrome/Firefox-like behavior
- keyboard-only navigation
- reduced motion
- muted audio
- offline/PWA mode

## Mobile checks

Specifically inspect:
- accidental double taps
- zoom/layout jumping
- viewport height changes when browser chrome appears/disappears
- safe-area insets
- portrait orientation
- landscape fallback
- button spacing
- card overlap
- long commentary text
- split-hand layout
- small 320px width
- fast repeated "deal again" interactions

## Accessibility

Ensure:
- buttons have accessible names
- current game state is understandable to screen readers
- status/results use appropriate live regions without spamming
- red/black suits have non-color distinction
- focus order is logical
- focus is not lost after state transitions
- text scaling does not destroy layout
- minimum contrast is reasonable

## Robustness

Test:
- repeated new rounds
- split then double if rules permit
- bankroll edge cases
- storage corruption fallback
- refresh mid-round behavior
- service worker update
- no-network launch
- extremely fast clicking/tapping
- invalid state transitions

Fix issues found.

Do not add major new features in this phase.

## Acceptance criteria

- Zero known blocking gameplay bugs.
- No uncaught console exceptions during normal play.
- No horizontal overflow at target mobile widths.
- Core tests pass.
- Production build passes.
- README accurately describes current features and controls.

Commit and push all completed changes.

---

# PROMPT 11 — Demo Release Candidate & Repository Cleanup

Continue from the QA'd BlackJak project.

## Goal

Prepare a clean **BlackJak Demo v0.1.0** release candidate.

## Repository cleanup

Review:
- README
- package scripts
- dependency list
- dead assets/files
- comments/TODOs
- TypeScript warnings
- build warnings
- test output
- PWA configuration
- GitHub Pages deployment workflow

Remove obsolete scaffolding and unused dependencies.

## README

Document:
- what BlackJak is
- Classic vs Jak's House
- fictional chips/REP disclaimer
- controls
- local progression
- install/PWA instructions
- local development
- build/test commands
- project structure
- current limitations
- roadmap
- credits section with a placeholder for approved Jak Gold collaboration credit
- OFFICIAL INSPIRE attribution

## Versioning

Set project version to `0.1.0` if appropriate.

Add a concise changelog or release notes file.

## Final validation

Run:
- type checking
- linting if configured
- complete tests
- production build

Manually walk through:
- fresh first launch
- Classic hand
- blackjack
- bust
- double
- split
- zero-chip refill
- achievement unlock
- REP persistence
- Jak's House modifier
- stats
- Daily Hand
- settings
- offline/PWA behavior

Fix release-blocking issues.

Commit and push all completed changes.

Do not declare success if build/tests are failing.

---

# Post-Demo Expansion Backlog

Do not implement these until the demo is stable.

Potential later additions:

- approved Jak Gold voice lines
- approved likeness/artwork
- additional dealer rooms:
  - Kitchen Table
  - Back Room
  - Gold Room
  - Penthouse
  - The Void
- cosmetic card backs
- chip themes
- alternate dealer commentary packs
- more Jak's House modifiers
- optional global leaderboards
- cloud saves
- more Daily Hand analytics
- multiplayer/pass-and-play experiments
- seasonal events
- deeper achievement sets

The key design rule remains:

> **Don't reinvent blackjack. Reinvent the feeling of sitting at the table.**
