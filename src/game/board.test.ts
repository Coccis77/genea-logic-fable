import {
  addChild, canAddChild, canCreateCouple, coupleId, createCouple, emptyBoard, findCouple,
  initialLayout, moveNode, PERSON_HEIGHT, removeChild, removeCouple, retypeCouple, type BoardState,
} from './board';

const people = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }, { id: 'd', name: 'D' }];
const fresh = (): BoardState => ({ positions: initialLayout(people), couples: [] });

describe('initialLayout', () => {
  it('lays people out on a grid', () => {
    const pos = initialLayout(people);
    expect(pos.a).toEqual({ x: 40, y: 40 });
    expect(pos.b).toEqual({ x: 260, y: 40 });
    expect(pos.c).toEqual({ x: 40, y: 180 });
    expect(pos.d).toEqual({ x: 260, y: 180 });
  });
});

describe('createCouple', () => {
  it('creates a couple with a deterministic id and a dot position', () => {
    const board = createCouple(fresh(), 'b', 'a', 'married');
    expect(board.couples).toEqual([{ id: 'c-a-b', type: 'married', members: ['b', 'a'], children: [] }]);
    expect(board.positions['c-a-b']).toEqual({ x: (40 + 260) / 2 + 80 - 6, y: 40 + PERSON_HEIGHT + 60 });
    expect(coupleId('b', 'a')).toBe('c-a-b');
  });

  it('does not mutate its input', () => {
    const before = fresh();
    createCouple(before, 'a', 'b', 'married');
    expect(before.couples).toEqual([]);
  });

  it('refuses self-couple and duplicate pairs', () => {
    const board = createCouple(fresh(), 'a', 'b', 'married');
    expect(canCreateCouple(board, 'a', 'a')).toBe(false);
    expect(canCreateCouple(board, 'b', 'a')).toBe(false);
    expect(canCreateCouple(board, 'a', 'c')).toBe(true);
  });

  it('allows a person in several couples (remarriage)', () => {
    let board = createCouple(fresh(), 'a', 'b', 'married');
    board = createCouple(board, 'a', 'c', 'divorced');
    expect(board.couples).toHaveLength(2);
    expect(findCouple(board, 'c', 'a')?.type).toBe('divorced');
  });
});

describe('retypeCouple', () => {
  it('changes the type and keeps the children', () => {
    let board = createCouple(fresh(), 'a', 'b', 'married');
    board = addChild(board, 'c-a-b', 'c');
    board = retypeCouple(board, 'c-a-b', 'divorced');
    expect(board.couples[0]).toMatchObject({ type: 'divorced', children: ['c'] });
  });
});

describe('removeCouple', () => {
  it('removes the couple, its children links and its dot position', () => {
    let board = createCouple(fresh(), 'a', 'b', 'married');
    board = addChild(board, 'c-a-b', 'c');
    board = removeCouple(board, 'c-a-b');
    expect(board.couples).toEqual([]);
    expect(board.positions['c-a-b']).toBeUndefined();
    expect(board.positions.a).toBeDefined();
  });
});

describe('children', () => {
  it('refuses a member as child, a double parenthood and an unknown couple', () => {
    let board = createCouple(fresh(), 'a', 'b', 'married');
    board = createCouple(board, 'c', 'd', 'partners');
    expect(canAddChild(board, 'c-a-b', 'a')).toBe(false);
    expect(canAddChild(board, 'c-a-b', 'c')).toBe(true);
    board = addChild(board, 'c-a-b', 'c');
    expect(canAddChild(board, 'c-c-d', 'c')).toBe(false); // c is a member there
    expect(canAddChild(board, 'c-a-b', 'c')).toBe(false); // already a child
    expect(canAddChild(board, 'c-a-b', 'd')).toBe(true);
    board = addChild(board, 'c-a-b', 'd');
    expect(canAddChild(board, 'c-c-d', 'd')).toBe(false);
    expect(canAddChild(board, 'c-zz', 'a')).toBe(false);
  });

  it('removeChild removes only that child', () => {
    let board = createCouple(fresh(), 'a', 'b', 'married');
    board = addChild(board, 'c-a-b', 'c');
    board = addChild(board, 'c-a-b', 'd');
    board = removeChild(board, 'c-a-b', 'c');
    expect(board.couples[0].children).toEqual(['d']);
  });
});

describe('moveNode', () => {
  it('updates one position', () => {
    const board = moveNode(fresh(), 'a', { x: 1, y: 2 });
    expect(board.positions.a).toEqual({ x: 1, y: 2 });
    expect(board.positions.b).toEqual({ x: 260, y: 40 });
  });
});

it('emptyBoard has no positions and no couples', () => {
  expect(emptyBoard()).toEqual({ positions: {}, couples: [] });
});

describe('no-op mutations return the same board', () => {
  const withCouple = (): BoardState => createCouple(fresh(), 'a', 'b', 'married');
  it('moveNode to the same position', () => {
    const b = fresh();
    expect(moveNode(b, 'a', { x: 40, y: 40 })).toBe(b);
  });
  it('removeChild when couple absent or child not listed', () => {
    const b = withCouple();
    expect(removeChild(b, 'nope', 'c')).toBe(b);
    expect(removeChild(b, 'c-a-b', 'c')).toBe(b);
  });
  it('removeCouple for a missing id', () => {
    const b = withCouple();
    expect(removeCouple(b, 'nope')).toBe(b);
  });
  it('retypeCouple when absent or same type', () => {
    const b = withCouple();
    expect(retypeCouple(b, 'nope', 'divorced')).toBe(b);
    expect(retypeCouple(b, 'c-a-b', 'married')).toBe(b);
  });
});
