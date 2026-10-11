import { validateLevel, LevelValidationError } from './validate';

const base = () => ({
  id: 'lvl',
  title: 'Test',
  people: [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
  ],
  solution: {
    couples: [{ id: 'c1', type: 'married', members: ['a', 'b'], children: ['c'] }],
    links: [],
  },
  clues: [
    { id: 'k1', kind: 'letter', title: 'L', text: 'hello' },
    { id: 'k2', kind: 'photo', title: 'P', src: 'p.jpg' },
    { id: 'k3', kind: 'audio', title: 'A', src: 'a.mp3', transcript: 't' },
  ],
});

const expectRejects = (raw: unknown, fragment: string) => {
  expect(() => validateLevel(raw)).toThrow(LevelValidationError);
  expect(() => validateLevel(raw)).toThrow(fragment);
};

describe('validateLevel', () => {
  it('accepts a valid level', () => {
    const level = validateLevel(base());
    expect(level.id).toBe('lvl');
    expect(level.solution.couples[0].members).toEqual(['a', 'b']);
  });

  it('accepts optional born/died years and rejects died before born', () => {
    const raw = base();
    raw.people[0] = { id: 'a', name: 'A', born: 1920, died: 1988 } as typeof raw.people[0];
    raw.people[1] = { id: 'b', name: 'B', born: 1925 } as typeof raw.people[1];
    expect(validateLevel(raw).people[0]).toEqual({ id: 'a', name: 'A', born: 1920, died: 1988 });
    raw.people[0] = { id: 'a', name: 'A', born: 1990, died: 1988 } as typeof raw.people[0];
    expectRejects(raw, 'died before born');
    raw.people[0] = { id: 'a', name: 'A', born: 1920.5 } as typeof raw.people[0];
    expectRejects(raw, 'born');
  });

  it('rejects a schema violation', () => {
    const raw = base();
    raw.solution.couples[0].type = 'engaged';
    expectRejects(raw, 'type');
  });

  it('rejects person ids outside [a-z0-9_] so couple ids cannot collide', () => {
    const raw = base();
    raw.people[0].id = 'jean-paul';
    expectRejects(raw, 'people.0.id');
    raw.people[0].id = 'Jean';
    expectRejects(raw, 'people.0.id');
    raw.people[0].id = 'jean_paul2';
    raw.solution.couples[0].members = ['jean_paul2', 'b'];
    expect(() => validateLevel(raw)).not.toThrow();
  });

  it('rejects duplicate person ids', () => {
    const raw = base();
    raw.people.push({ id: 'a', name: 'Dup' });
    expectRejects(raw, 'duplicate person id "a"');
  });

  it('rejects duplicate clue ids', () => {
    const raw = base();
    raw.clues.push({ id: 'k1', kind: 'letter', title: 'X', text: 'x' });
    expectRejects(raw, 'duplicate clue id "k1"');
  });

  it('rejects unknown couple member', () => {
    const raw = base();
    raw.solution.couples[0].members = ['a', 'zz'];
    expectRejects(raw, 'unknown person "zz"');
  });

  it('rejects a couple of a person with themselves', () => {
    const raw = base();
    raw.solution.couples[0].members = ['a', 'a'];
    expectRejects(raw, 'same person');
  });

  it('rejects two couples with the same pair', () => {
    const raw = base();
    raw.solution.couples.push({ id: 'c2', type: 'divorced', members: ['b', 'a'], children: [] });
    expectRejects(raw, 'same members');
  });

  it('rejects a child of two couples', () => {
    const raw = base();
    raw.people.push({ id: 'd', name: 'D' });
    raw.solution.couples.push({ id: 'c2', type: 'partners', members: ['a', 'd'], children: ['c'] });
    expectRejects(raw, 'child of more than one couple');
  });

  it('rejects a child of their own couple', () => {
    const raw = base();
    raw.solution.couples[0].children = ['a'];
    expectRejects(raw, 'child of a couple they belong to');
  });

  it('rejects non-empty links', () => {
    const raw = base();
    (raw.solution.links as unknown[]).push({ type: 'killed', from: 'a', to: 'b' });
    expectRejects(raw, 'links');
  });

  it('rejects tutorial targets that do not exist', () => {
    const raw = { ...base(), tutorial: [{ text: 'x', highlight: 'clue:nope', until: 'next' }] };
    expectRejects(raw, 'highlight "clue:nope"');
    const raw2 = { ...base(), tutorial: [{ text: 'x', until: 'toolSelected:hammer' }] };
    expectRejects(raw2, 'until "toolSelected:hammer"');
  });

  it('accepts a tutorial using every valid target and event form', () => {
    const raw = {
      ...base(),
      tutorial: [
        { text: 'a', until: 'next' },
        { text: 'b', highlight: 'check', until: 'checked' },
        { text: 'c', highlight: 'clue:k1', until: 'clueOpened:k1' },
        { text: 'd', highlight: 'tool:married', until: 'toolSelected:married' },
        { text: 'e', highlight: 'person:a', until: 'coupleCreated:a:b' },
        { text: 'f', until: 'childLinked:c' },
      ],
    };
    expect(validateLevel(raw).tutorial).toHaveLength(6);
  });

  it('rejects malformed tutorial targets with extra segments or missing arguments', () => {
    const step = (s: { highlight?: string; until: string }) => ({ ...base(), tutorial: [{ text: 'x', ...s }] });
    expectRejects(step({ highlight: 'clue:k1:junk', until: 'next' }), 'highlight "clue:k1:junk"');
    expectRejects(step({ highlight: '', until: 'next' }), 'highlight ""');
    expectRejects(step({ until: 'clueOpened:k1:junk' }), 'until "clueOpened:k1:junk"');
    expectRejects(step({ until: 'childLinked:a:b' }), 'until "childLinked:a:b"');
    expectRejects(step({ until: 'coupleCreated:a' }), 'until "coupleCreated:a"');
  });
});
