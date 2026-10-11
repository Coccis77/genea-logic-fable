import { advance, isFinished, normalizeEvent } from './engine';

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
});
