# BLACKJAK

**House Rules. Bad Decisions. One More Hand.**

BlackJak is a mobile-first blackjack game from OFFICIAL INSPIRE, inspired in personality by Jak Gold. The project keeps recognizable blackjack at its core and builds around it with a black-and-gold table aesthetic, reactive dealer commentary, fictional REP progression, achievements, and an optional arcade-style **Jak's House** ruleset.

## Current status

**Prompts 0–2 implemented. Classic BlackJak is now playable.**

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
- basic deal animation with reduced-motion fallback
- accessible focus states, semantic controls, live result feedback, and 44px+ touch targets
- Vitest coverage for deck, hands, rules, round state, storage fallback, and session economy

## Development Roadmap

See **[BlackJak-Development-Prompts.md](./BlackJak-Development-Prompts.md)**.

Prompt 3 is the dedicated visual/presentation polish pass. Prompt 4 adds Jak's reactive dealer personality.

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
