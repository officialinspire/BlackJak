export type HouseModifierId = 'gold-card' | 'run-it-back' | 'hot-hand';

export interface HouseModifierDefinition {
  id: HouseModifierId;
  name: string;
  shortDescription: string;
  rules: string;
}

export const HOUSE_MODIFIERS: readonly HouseModifierDefinition[] = [
  {
    id: 'gold-card',
    name: 'GOLD CARD',
    shortDescription: 'Every third paid House hand opens with a gold wild Ace.',
    rules: 'On every third paid Jak\'s House hand, the player\'s first opening card becomes a Gold Card. It counts exactly like an Ace: 1 or 11, whichever helps the hand. Classic BlackJak never uses Gold Cards.',
  },
  {
    id: 'run-it-back',
    name: 'RUN IT BACK',
    shortDescription: 'Spend a token after a net-losing House round for a free redeal.',
    rules: 'A Run It Back token redeals the same base stake from a freshly shuffled deck without charging another initial stake. The original result stays in history. The replay is a new resolved hand for stats and REP. You start a House session with one token; while empty, another token is earned after five completed House rounds.',
  },
  {
    id: 'hot-hand',
    name: 'HOT HAND',
    shortDescription: 'Consecutive House wins multiply REP, never card odds.',
    rules: 'The first consecutive House win pays normal REP. Each additional consecutive all-winning House round adds +25% to REP, capped at a 2× multiplier. A push, loss, or mixed split result resets the House hot streak.',
  },
] as const;
