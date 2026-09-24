import { describe, expect, it } from 'vitest';
import { CardMotionPlanner, cardVisualId } from '../src/ui/card-motion';

const visual = (
  id: string,
  hidden: boolean,
  fingerprint: string,
  dealOrder: number,
  splitSourceId?: string,
) => ({ id, hidden, fingerprint, dealOrder, splitSourceId });

describe('card motion planner', () => {
  it('uses stable round, owner, hand and slot identities', () => {
    expect(cardVisualId(7, 'player', 'hand-2', 1)).toBe('7:player:hand-2:1');
    expect(cardVisualId(7, 'dealer', 'dealer', 0)).toBe('7:dealer:dealer:0');
  });

  it('plans the initial deal in true blackjack order independent of render order', () => {
    const planner = new CardMotionPlanner();
    planner.beginFrame();
    const dealerUp = planner.plan(visual('1:dealer:dealer:0', false, '6-spades', 1));
    const dealerHole = planner.plan(visual('1:dealer:dealer:1', true, '9-hearts', 3));
    const playerFirst = planner.plan(visual('1:player:hand-1:0', false, '10-clubs', 0));
    const playerSecond = planner.plan(visual('1:player:hand-1:1', false, '8-diamonds', 2));

    expect([playerFirst, dealerUp, playerSecond, dealerHole].map((plan) => plan.dealOrder)).toEqual([0, 1, 2, 3]);
    expect([playerFirst, dealerUp, playerSecond, dealerHole].map((plan) => plan.state)).toEqual(['NEW', 'NEW', 'NEW', 'NEW']);
  });

  it('settles unchanged cards on ordinary and static rerenders', () => {
    const planner = new CardMotionPlanner();
    const card = visual('2:player:hand-1:0', false, 'A-spades', 0);
    planner.beginFrame();
    expect(planner.plan(card).state).toBe('NEW');
    planner.commitFrame();

    planner.beginFrame();
    expect(planner.plan(card).state).toBe('SETTLED');
    planner.commitFrame();
    planner.beginFrame();
    expect(planner.plan(card).state).toBe('SETTLED');
  });

  it('distinguishes a hole reveal, a new card in an occupied slot, and a split move', () => {
    const planner = new CardMotionPlanner();
    const source = visual('3:player:hand-1:1', false, '8-hearts', 2);
    const hole = visual('3:dealer:dealer:1', true, 'K-clubs', 3);
    planner.beginFrame();
    planner.plan(source);
    planner.plan(hole);
    planner.commitFrame();

    planner.beginFrame();
    expect(planner.plan({ ...hole, hidden: false }).state).toBe('FLIPPING');
    expect(planner.plan({ ...source, fingerprint: '2-spades' }).state).toBe('NEW');
    expect(planner.plan(visual('3:player:hand-2:0', false, '8-hearts', 0, source.id)).state).toBe('MOVING/SPLIT');
  });
});
