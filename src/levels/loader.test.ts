import { readFileSync } from 'node:fs';
import { loadLevel, loadLevelIndex, mediaUrl, LevelLoadError } from './loader';
import { validateLevel } from './validate';
import { scoreBoard } from '../scoring/score';

const okJson = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

const validLevel = {
  id: 'lvl', title: 'T',
  people: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
  solution: { couples: [{ id: 'c1', type: 'married', members: ['a', 'b'], children: [] }], links: [] },
  clues: [],
};

afterEach(() => vi.restoreAllMocks());

describe('mediaUrl', () => {
  it('prefixes relative paths with the level folder', () => {
    expect(mediaUrl('lvl', 'photo.jpg')).toBe('/levels/lvl/photo.jpg');
  });
  it('keeps http(s) URLs untouched', () => {
    expect(mediaUrl('lvl', 'https://x.test/a.png')).toBe('https://x.test/a.png');
    expect(mediaUrl('lvl', 'http://x.test/a.png')).toBe('http://x.test/a.png');
  });
});

describe('loadLevelIndex', () => {
  it('fetches and validates index.json', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => okJson([{ id: 'tutorial', tutorial: true }]));
    expect(await loadLevelIndex()).toEqual([{ id: 'tutorial', tutorial: true }]);
    expect(fetch).toHaveBeenCalledWith('/levels/index.json');
  });
});

describe('loadLevel', () => {
  it('fetches, parses and validates a level', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => okJson(validLevel));
    const level = await loadLevel('lvl');
    expect(level.title).toBe('T');
    expect(fetch).toHaveBeenCalledWith('/levels/lvl/level.json');
  });

  it('rejects with the HTTP status on 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));
    await expect(loadLevel('nope')).rejects.toThrow(LevelLoadError);
    await expect(loadLevel('nope')).rejects.toThrow('nope');
    await expect(loadLevel('nope')).rejects.toThrow('404');
  });

  it('rejects on invalid JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{not json', { status: 200 }));
    await expect(loadLevel('lvl')).rejects.toThrow(LevelLoadError);
  });

  it('rejects with the validation message on an inconsistent level', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      okJson({ ...validLevel, solution: { couples: [{ id: 'c1', type: 'married', members: ['a', 'zz'], children: [] }], links: [] } }));
    await expect(loadLevel('lvl')).rejects.toThrow('unknown person "zz"');
  });
});

it.each(['tutorial', 'level-1'])('ships a valid %s level', (id) => {
  const raw = JSON.parse(readFileSync(`public/levels/${id}/level.json`, 'utf8'));
  expect(() => validateLevel(raw)).not.toThrow();
});

it('level-1 solution scores as complete against itself', () => {
  const raw = JSON.parse(readFileSync('public/levels/level-1/level.json', 'utf8'));
  const level = validateLevel(raw);
  expect(scoreBoard(level.solution.couples, level.solution.couples).complete).toBe(true);
  expect(scoreBoard([], level.solution.couples).total).toBe(9);
});
