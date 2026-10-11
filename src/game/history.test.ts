import { canRedo, canUndo, createHistory, HISTORY_LIMIT, push, redo, undo } from './history';

describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const h = createHistory(0);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });

  it('push, undo, redo', () => {
    let h = push(push(createHistory(0), 1), 2);
    expect(h.present).toBe(2);
    h = undo(h);
    expect(h.present).toBe(1);
    expect(canRedo(h)).toBe(true);
    h = undo(h);
    expect(h.present).toBe(0);
    expect(undo(h).present).toBe(0);
    h = redo(h);
    expect(h.present).toBe(1);
  });

  it('push after undo clears the future', () => {
    let h = push(push(createHistory(0), 1), 2);
    h = push(undo(h), 9);
    expect(canRedo(h)).toBe(false);
    expect(h.present).toBe(9);
    expect(undo(h).present).toBe(1);
  });

  it('caps the past', () => {
    let h = createHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 10; i += 1) h = push(h, i);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(h.past[0]).toBe(10);
  });
});
