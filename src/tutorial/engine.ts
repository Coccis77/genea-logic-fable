import { findCouple, type BoardState } from '../game/board';
import type { TutorialStep } from '../levels/types';

export function normalizeEvent(event: string): string {
  const [name, ...args] = event.split(':');
  if (name === 'coupleCreated' && args.length === 2) return `${name}:${[...args].sort().join(':')}`;
  return event;
}

export const isFinished = (steps: TutorialStep[] | undefined, index: number): boolean =>
  !steps || index >= steps.length;

export function advance(steps: TutorialStep[], index: number, event: string): number {
  if (isFinished(steps, index)) return index;
  return normalizeEvent(steps[index].until) === normalizeEvent(event) ? index + 1 : index;
}

/** True when the board already shows what the step asks the player to build. */
export function isSatisfiedByBoard(step: TutorialStep, board: BoardState): boolean {
  const [name, ...args] = step.until.split(':');
  if (name === 'coupleCreated' && args.length === 2) return findCouple(board, args[0], args[1]) !== undefined;
  if (name === 'childLinked' && args.length === 1) return board.couples.some((c) => c.children.includes(args[0]));
  return false;
}

/** Moves past every consecutive step the board already satisfies. */
export function settle(steps: TutorialStep[], index: number, board: BoardState): number {
  let i = index;
  while (i < steps.length && isSatisfiedByBoard(steps[i], board)) i += 1;
  return i;
}
