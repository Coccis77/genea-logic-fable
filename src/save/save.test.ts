import { defaultSave, loadSave, SAVE_KEY, writeSave } from './save';

describe('save', () => {
  it('returns the default save when nothing is stored', () => {
    expect(loadSave()).toEqual(defaultSave());
    expect(defaultSave()).toEqual({
      version: 1, completed: [], boards: {}, hints: { showProgress: false, showMistakes: false }, theme: 'detective-board',
    });
  });

  it('round-trips', () => {
    const data = defaultSave();
    data.completed.push('tutorial');
    data.boards['level-1'] = { positions: { a: { x: 1, y: 2 } }, couples: [{ id: 'c-a-b', type: 'married', members: ['a', 'b'], children: [] }] };
    data.hints.showProgress = true;
    data.theme = 'chalkboard';
    writeSave(data);
    expect(loadSave()).toEqual(data);
  });

  it('falls back to default on corrupted JSON', () => {
    localStorage.setItem(SAVE_KEY, '{oops');
    expect(loadSave()).toEqual(defaultSave());
  });

  it('falls back to default on a foreign shape', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ hello: 'world' }));
    expect(loadSave()).toEqual(defaultSave());
  });

  it('discards an unknown version', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...defaultSave(), version: 2, completed: ['x'] }));
    expect(loadSave().completed).toEqual([]);
  });

  it('falls back to the default theme when the theme is unknown', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...defaultSave(), theme: 'rainbow' }));
    expect(loadSave().theme).toBe('detective-board');
  });

  it('survives storage that throws on access (site data blocked)', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    try {
      expect(loadSave()).toEqual(defaultSave());
      expect(() => writeSave(defaultSave())).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
      else delete (window as { localStorage?: Storage }).localStorage;
    }
    expect(() => localStorage.getItem(SAVE_KEY)).not.toThrow();
  });
});
