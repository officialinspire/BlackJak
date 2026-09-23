import { DIALOGUE_BANK, type DialogueEvent, type DialogueLineInput } from '../data/dialogue';
import { systemRandom } from './deck';
import type { RandomSource } from './types';

export type { DialogueEvent } from '../data/dialogue';

export interface DialogueMemory {
  recentIds: string[];
}

export interface DialogueSelection {
  id: string;
  event: DialogueEvent;
  text: string;
}

export interface DialogueSelectionResult {
  selection: DialogueSelection;
  memory: DialogueMemory;
}

const MAX_RECENT_LINES = 4;

interface NormalizedLine {
  id: string;
  text: string;
  weight: number;
}

function normalizeLine(event: DialogueEvent, input: DialogueLineInput, index: number): NormalizedLine {
  if (typeof input === 'string') {
    return { id: `${event}:${index}`, text: input, weight: 1 };
  }

  const [text, weight] = input;
  return {
    id: `${event}:${index}`,
    text,
    weight: Number.isFinite(weight) && weight > 0 ? weight : 1,
  };
}

function chooseWeighted(lines: readonly NormalizedLine[], rng: RandomSource): NormalizedLine {
  if (lines.length === 0) throw new Error('Dialogue pool cannot be empty.');

  const sample = rng.next();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError('RandomSource.next() must return a finite number in [0, 1).');
  }

  const totalWeight = lines.reduce((sum, line) => sum + line.weight, 0);
  let cursor = sample * totalWeight;

  for (const line of lines) {
    cursor -= line.weight;
    if (cursor < 0) return line;
  }

  return lines[lines.length - 1];
}

export function selectDialogue(
  event: DialogueEvent,
  memory: DialogueMemory = { recentIds: [] },
  rng: RandomSource = systemRandom,
): DialogueSelectionResult {
  const all = DIALOGUE_BANK[event].map((input, index) => normalizeLine(event, input, index));
  const recent = new Set(memory.recentIds.slice(-MAX_RECENT_LINES));
  const filtered = all.filter((line) => !recent.has(line.id));
  const pool = filtered.length > 0 ? filtered : all;
  const chosen = chooseWeighted(pool, rng);

  return {
    selection: {
      id: chosen.id,
      event,
      text: chosen.text,
    },
    memory: {
      recentIds: [...memory.recentIds, chosen.id].slice(-MAX_RECENT_LINES),
    },
  };
}
