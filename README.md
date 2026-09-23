# BLACKJAK

**House Rules. Bad Decisions. One More Hand.**

BlackJak is a mobile-first blackjack game from OFFICIAL INSPIRE, inspired in personality by Jak Gold. The project keeps recognizable blackjack at its core and builds around it with a black-and-gold table aesthetic, reactive dealer commentary, fictional REP progression, achievements, and an optional arcade-style **Jak's House** ruleset.

## Current status

**Prompts 0–5 implemented. Classic BlackJak is playable, polished, reactive, and now includes persistent REP, titles, and achievements.**

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
- accessible focus states, semantic controls, live result feedback, and 44px+ touch targets
- Vitest coverage for deck, hands, rules, round state, storage fallback, and session economy

## Development Roadmap

See **[BlackJak-Development-Prompts.md](./BlackJak-Development-Prompts.md)**.

Prompt 5 is complete. Prompt 6 adds the separate Jak's House arcade mode and modifier framework.

## Local development

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
```

## Project structure

```text
src/
  config/      App constants and stake configuration
  game/        Pure blackjack rules, round state, and session economy
  storage/     Versioned browser persistence and profile loading
  styles/      Responsive visual system
  types/       App/profile types
  ui/          DOM rendering helpers/components
tests/         Vitest rules and state/economy tests
public/        Static assets
```

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

## Practice-chip economy

BlackJak is an entertainment game using **fictional practice chips and REP only**. Practice chips cannot be purchased or exchanged for money or prizes. If the local practice-chip balance reaches zero, the game provides a free refill to the baseline stack.

## Design principle

> **Don't reinvent blackjack. Reinvent the feeling of sitting at the table.**

## OFFICIAL INSPIRE

https://www.inspireclothing.art/
