import type { BoardState } from '../game/board';
import { advance, isFinished, isSatisfiedByBoard, normalizeEvent, settle } from './engine';

const steps = [
  { text: 'a', until: 'next' },
  { text: 'b', until: 'coupleCreated:paul:marie' },
  { text: 'c', until: 'checked' },
];

describe('tutorial engine', () => {
  it('normalizes coupleCreated member order', () => {
    expect(normalizeEvent('coupleCreated:paul:marie')).toBe('coupleCreated:marie:paul');
    expect(normalizeEvent('childLinked:lea')).toBe('childLinked:lea');
  });

  it('advances only on the matching event', () => {
    expect(advance(steps, 0, 'checked')).toBe(0);
    expect(advance(steps, 0, 'next')).toBe(1);
    expect(advance(steps, 1, 'coupleCreated:marie:paul')).toBe(2);
    expect(advance(steps, 2, 'checked')).toBe(3);
  });

  it('stays finished', () => {
    expect(advance(steps, 3, 'next')).toBe(3);
    expect(isFinished(steps, 3)).toBe(true);
    expect(isFinished(steps, 2)).toBe(false);
    expect(isFinished(undefined, 0)).toBe(true);
    expect(isFinished([], 0)).toBe(true);
  });

  const board: BoardState = {
    positions: {},
    couples: [{ id: 'c-marie-paul', type: 'divorced', members: ['marie', 'paul'], children: ['lea'] }],
  };
  const step = (until: string) => ({ text: 't', until });

  it('isSatisfiedByBoard checks couples in either member order and linked children', () => {
    expect(isSatisfiedByBoard(step('coupleCreated:marie:paul'), board)).toBe(true);
    expect(isSatisfiedByBoard(step('coupleCreated:paul:marie'), board)).toBe(true);
    expect(isSatisfiedByBoard(step('coupleCreated:paul:lea'), board)).toBe(false);
    expect(isSatisfiedByBoard(step('childLinked:lea'), board)).toBe(true);
    expect(isSatisfiedByBoard(step('childLinked:paul'), board)).toBe(false);
  });

  it('isSatisfiedByBoard is false for events the board cannot show', () => {
    for (const until of ['next', 'checked', 'clueOpened:k1', 'toolSelected:married']) {
      expect(isSatisfiedByBoard(step(until), board)).toBe(false);
    }
  });

  it('settle skips consecutive satisfied steps and stops at the first unsatisfied one', () => {
    const tour = [step('next'), step('coupleCreated:paul:marie'), step('childLinked:lea'), step('checked'), step('childLinked:lea')];
    expect(settle(tour, 0, board)).toBe(0);
    expect(settle(tour, 1, board)).toBe(3);
    expect(settle(tour, 3, board)).toBe(3);
    expect(settle(tour.slice(0, 3), 1, board)).toBe(3);
    expect(settle(tour, 5, board)).toBe(5);
  });
});
