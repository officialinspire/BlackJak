# BLACKJAK

**House Rules. Bad Decisions. One More Hand.**

BlackJak is a mobile-first blackjack game from OFFICIAL INSPIRE, inspired in personality by Jak Gold. The project keeps recognizable blackjack at its core and builds around it with a black-and-gold table aesthetic, reactive dealer commentary, fictional REP progression, achievements, and an optional arcade-style **Jak's House** ruleset.

## Current status

**Prompts 0–1 implemented:**

- Vite + TypeScript foundation
- responsive black/gold menu and game-table shell
- accessible focus/reduced-motion/touch foundations
- versioned local-storage helper
- isolated blackjack rules engine
- standard 52-card deck and injectable Fisher-Yates RNG
- ace-aware hand evaluation
- hard/soft totals, blackjack and bust detection
- dealer stands on all 17s (including soft 17)
- Hit / Stand / Double / Split action rules
- v1 split policy: any two equal-value cards may split (for example K + 10)
- 3:2 natural-blackjack payout model
- split 21 is treated as a normal win, not a natural blackjack
- round state machine with split-hand support
- developer gameplay harness wired to Classic BlackJak
- Vitest unit coverage for deck, hand, dealer, payout, actions, and round transitions

The developer harness is intentionally **not** the final player economy. Prompt 2 will add fictional betting controls, bankroll persistence, repeated-round UX, and production gameplay flow.

## Development Roadmap

See **[BlackJak-Development-Prompts.md](./BlackJak-Development-Prompts.md)**.

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
  config/      App constants
  game/        Pure blackjack rules/state engine
  storage/     Versioned browser persistence helpers
  styles/      Responsive visual system
  types/       App-level types
  ui/          DOM rendering helpers/components
tests/         Vitest rules/unit tests
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

## Gameplay economy

BlackJak is designed as an entertainment game using **fictional chips and REP only**. The development plan does not include real-money wagering, cash-out, purchasable gambling currency, or gambling-operator integrations.

## Design principle

> **Don't reinvent blackjack. Reinvent the feeling of sitting at the table.**

## OFFICIAL INSPIRE

https://www.inspireclothing.art/
