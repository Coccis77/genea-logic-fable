import type { Level } from '../levels/types';
import { loadSave, writeSave, defaultSave } from '../save/save';
import { initialGameState, selectBoard, selectScore, useGameStore } from './store';

const level: Level = {
  id: 'lvl', title: 'T',
  people: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }],
  solution: { couples: [{ id: 'c1', type: 'married', members: ['a', 'b'], children: ['c'] }], links: [] },
  clues: [{ id: 'k1', kind: 'letter', title: 'L', text: 't' }],
  tutorial: [
    { text: '1', until: 'toolSelected:married' },
    { text: '2', until: 'coupleCreated:b:a' },
    { text: '3', until: 'childLinked:c' },
    { text: '4', until: 'checked' },
  ],
};

const s = () => useGameStore.getState();
const board = () => selectBoard(s());

beforeEach(() => {
  useGameStore.setState({ ...initialGameState });
  s().openLevel(level);
});

const buildFamily = () => {
  s().selectTool('married');
  s().clickPerson('a');
  s().clickPerson('b');
  s().selectTool('child');
  s().clickCouple('c-a-b');
  s().clickPerson('c');
};

describe('openLevel', () => {
  it('lays out people and starts clean', () => {
    expect(s().screen).toBe('game');
    expect(board().positions.a).toEqual({ x: 40, y: 40 });
    expect(board().couples).toEqual([]);
    expect(s().tool).toBe('select');
  });

  it('restores a saved board and sanitises stale references', () => {
    const save = defaultSave();
    save.boards.lvl = {
      positions: { a: { x: 5, y: 5 }, ghost: { x: 1, y: 1 }, 'c-a-b': { x: 9, y: 9 }, 'c-a-zz': { x: 2, y: 2 } },
      couples: [
        { id: 'c-a-b', type: 'divorced', members: ['a', 'b'], children: ['c'] },
        { id: 'c-a-zz', type: 'married', members: ['a', 'zz'], children: [] },
        { id: 'c-b-c', type: 'partners', members: ['b', 'c'], children: ['ghost'] },
      ],
    };
    writeSave(save);
    s().openLevel(level);
    expect(board().couples.map((c) => c.id)).toEqual(['c-a-b']);
    expect(board().positions).toEqual({ a: { x: 5, y: 5 }, b: { x: 260, y: 40 }, c: { x: 40, y: 180 }, 'c-a-b': { x: 9, y: 9 } });
  });
});

describe('couple tools', () => {
  it('creates a couple on the second click and clears pending', () => {
    s().selectTool('married');
    s().clickPerson('a');
    expect(s().pending).toEqual({ kind: 'person', id: 'a' });
    s().clickPerson('b');
    expect(board().couples[0]).toMatchObject({ id: 'c-a-b', type: 'married' });
    expect(s().pending).toBeNull();
  });

  it('clicking the pending person again cancels; Escape cancels', () => {
    s().selectTool('partners');
    s().clickPerson('a');
    s().clickPerson('a');
    expect(s().pending).toBeNull();
    s().clickPerson('a');
    s().cancelPending();
    expect(s().pending).toBeNull();
  });

  it('an invalid second click changes nothing and keeps pending', () => {
    buildFamily();
    s().selectTool('divorced');
    s().clickPerson('a');
    s().clickPerson('b'); // pair already exists
    expect(board().couples).toHaveLength(1);
    expect(s().pending).toEqual({ kind: 'person', id: 'a' });
  });

  it('clicking a dot with a couple tool retypes it and keeps children', () => {
    buildFamily();
    s().selectTool('divorced');
    s().clickCouple('c-a-b');
    expect(board().couples[0]).toMatchObject({ type: 'divorced', children: ['c'] });
  });

  it('retyping to the same type does not push history', () => {
    buildFamily();
    const past = s().history.past.length;
    s().selectTool('married');
    s().clickCouple('c-a-b');
    expect(s().history.past.length).toBe(past);
  });

  it('select and erase tools ignore person clicks', () => {
    s().selectTool('select');
    s().clickPerson('a');
    s().selectTool('erase');
    s().clickPerson('a');
    expect(s().pending).toBeNull();
  });
});

describe('child tool', () => {
  it('links children while the dot stays pending', () => {
    buildFamily();
    expect(board().couples[0].children).toEqual(['c']);
    expect(s().pending).toEqual({ kind: 'couple', id: 'c-a-b' });
    s().clickPerson('c'); // already a child: nothing
    expect(board().couples[0].children).toEqual(['c']);
    s().clickBackground();
    expect(s().pending).toBeNull();
  });
});

describe('erase tool', () => {
  it('removes a child edge and a couple', () => {
    buildFamily();
    s().selectTool('erase');
    s().clickChildEdge('c-a-b', 'c');
    expect(board().couples[0].children).toEqual([]);
    s().clickCouple('c-a-b');
    expect(board().couples).toEqual([]);
  });

  it('other tools ignore child edge clicks', () => {
    buildFamily();
    s().selectTool('select');
    s().clickChildEdge('c-a-b', 'c');
    expect(board().couples[0].children).toEqual(['c']);
  });
});

describe('history', () => {
  it('undo and redo walk the board states', () => {
    buildFamily();
    s().undo();
    expect(board().couples[0].children).toEqual([]);
    s().undo();
    expect(board().couples).toEqual([]);
    s().redo();
    expect(board().couples).toHaveLength(1);
  });

  it('moveNode is undoable', () => {
    s().moveNode('a', { x: 1, y: 1 });
    expect(board().positions.a).toEqual({ x: 1, y: 1 });
    s().undo();
    expect(board().positions.a).toEqual({ x: 40, y: 40 });
  });

  it('resetBoard clears the board and the history', () => {
    buildFamily();
    s().resetBoard();
    expect(board().couples).toEqual([]);
    expect(s().history.past).toEqual([]);
    expect(board().positions.a).toEqual({ x: 40, y: 40 });
  });
});

describe('no-op mutations', () => {
  it('same-position moveNode pushes no history', () => {
    const past = s().history.past.length;
    s().moveNode('a', { x: 40, y: 40 });
    expect(s().history.past.length).toBe(past);
  });

  it('erase on a missing child edge pushes no history', () => {
    buildFamily();
    s().selectTool('erase');
    const past = s().history.past.length;
    s().clickChildEdge('c-a-b', 'zzz');
    expect(s().history.past.length).toBe(past);
  });

  it('child tool ignores unknown couple ids', () => {
    s().selectTool('child');
    s().clickCouple('nope');
    expect(s().pending).toBeNull();
  });
});

describe('check and scoring', () => {
  it('scores live', () => {
    expect(selectScore(s())).toEqual({ correct: 0, mistakes: 0, missing: 2, total: 2, complete: false });
    buildFamily();
    expect(selectScore(s())?.complete).toBe(true);
  });

  it('incomplete check sets lastCheck, next board change clears it', () => {
    s().check();
    expect(s().victory).toBe(false);
    expect(s().lastCheck).toBe('incomplete');
    s().moveNode('a', { x: 2, y: 2 });
    expect(s().lastCheck).toBe('none');
  });

  it('undo clears victory', () => {
    buildFamily();
    s().check();
    expect(s().victory).toBe(true);
    s().undo();
    expect(s().victory).toBe(false);
  });

  it('complete check sets victory and persists completion', () => {
    buildFamily();
    s().check();
    s().check();
    expect(s().victory).toBe(true);
    expect(s().completed).toEqual(['lvl']);
    expect(loadSave().completed).toEqual(['lvl']);
  });
});

describe('persistence', () => {
  it('saves the board on every change and keeps other levels', () => {
    const save = defaultSave();
    save.boards.other = { positions: {}, couples: [] };
    writeSave(save);
    s().openLevel(level);
    s().selectTool('married');
    s().clickPerson('a');
    s().clickPerson('b');
    const stored = loadSave();
    expect(stored.boards.lvl.couples).toHaveLength(1);
    expect(stored.boards.other).toBeDefined();
  });

  it('hints and theme persist and theme applies', () => {
    s().setHint('showProgress', true);
    s().setTheme('noir');
    expect(loadSave().hints.showProgress).toBe(true);
    expect(loadSave().theme).toBe('noir');
    expect(document.documentElement.dataset.theme).toBe('noir');
  });
});

describe('tutorial and clues', () => {
  it('tutorialNext advances a "next" step', () => {
    s().openLevel({ ...level, tutorial: [{ text: 'hi', until: 'next' }] });
    s().tutorialNext();
    expect(s().tutorialStep).toBe(1);
  });

  it('advances steps on the matching events only', () => {
    expect(s().tutorialStep).toBe(0);
    s().selectTool('child');
    expect(s().tutorialStep).toBe(0);
    s().selectTool('married');
    expect(s().tutorialStep).toBe(1);
    s().clickPerson('a');
    s().clickPerson('b');
    expect(s().tutorialStep).toBe(2);
    s().selectTool('child');
    s().clickCouple('c-a-b');
    s().clickPerson('c');
    expect(s().tutorialStep).toBe(3);
    s().check();
    expect(s().tutorialStep).toBe(4);
  });

  it('openClue tracks the open clue and emits', () => {
    const withClueStep: Level = { ...level, tutorial: [{ text: 'x', until: 'clueOpened:k1' }] };
    s().openLevel(withClueStep);
    s().openClue('k1');
    expect(s().openClueId).toBe('k1');
    expect(s().tutorialStep).toBe(1);
    s().closeClue();
    expect(s().openClueId).toBeNull();
  });

  it('leaveLevel returns to the menu', () => {
    s().leaveLevel();
    expect(s().screen).toBe('menu');
    expect(s().level).toBeNull();
  });
});
