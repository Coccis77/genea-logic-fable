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
