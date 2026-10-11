import type { Couple, CoupleType, Person } from '../levels/types';

export interface Position { x: number; y: number }
export interface BoardState {
  positions: Record<string, Position>;
  couples: Couple[];
}

export const PERSON_WIDTH = 160;
export const PERSON_HEIGHT = 64;
const CELL_W = 220;
const CELL_H = 140;
const MARGIN = 40;

export const emptyBoard = (): BoardState => ({ positions: {}, couples: [] });

export function initialLayout(people: Person[]): Record<string, Position> {
  const columns = Math.max(1, Math.ceil(Math.sqrt(people.length)));
  const positions: Record<string, Position> = {};
  people.forEach((person, i) => {
    positions[person.id] = { x: MARGIN + (i % columns) * CELL_W, y: MARGIN + Math.floor(i / columns) * CELL_H };
  });
  return positions;
}

export const coupleId = (a: string, b: string): string => `c-${[a, b].sort().join('-')}`;

export const findCouple = (board: BoardState, a: string, b: string): Couple | undefined =>
  board.couples.find((c) => c.id === coupleId(a, b));

export function canCreateCouple(board: BoardState, a: string, b: string): boolean {
  return a !== b && !findCouple(board, a, b);
}

export function createCouple(board: BoardState, a: string, b: string, type: CoupleType): BoardState {
  const id = coupleId(a, b);
  const pa = board.positions[a] ?? { x: 0, y: 0 };
  const pb = board.positions[b] ?? { x: 0, y: 0 };
  // Couple nodes use origin [0.5, 0], so x is the dot's centre: the midpoint of the two cards.
  const dot: Position = {
    x: (pa.x + pb.x) / 2 + PERSON_WIDTH / 2,
    y: Math.max(pa.y, pb.y) + PERSON_HEIGHT + 40,
  };
  return {
    positions: { ...board.positions, [id]: dot },
    couples: [...board.couples, { id, type, members: [a, b], children: [] }],
  };
}

export function retypeCouple(board: BoardState, id: string, type: CoupleType): BoardState {
  const existing = board.couples.find((c) => c.id === id);
  if (!existing || existing.type === type) return board;
  return { ...board, couples: board.couples.map((c) => (c.id === id ? { ...c, type } : c)) };
}

export function removeCouple(board: BoardState, id: string): BoardState {
  if (!board.couples.some((c) => c.id === id)) return board;
  const { [id]: _removed, ...positions } = board.positions;
  return { positions, couples: board.couples.filter((c) => c.id !== id) };
}

export function canAddChild(board: BoardState, id: string, personId: string): boolean {
  const couple = board.couples.find((c) => c.id === id);
  if (!couple) return false;
  if (couple.members.includes(personId)) return false;
  return !board.couples.some((c) => c.children.includes(personId));
}

export function addChild(board: BoardState, id: string, personId: string): BoardState {
  return {
    ...board,
    couples: board.couples.map((c) => (c.id === id ? { ...c, children: [...c.children, personId] } : c)),
  };
}

export function removeChild(board: BoardState, id: string, personId: string): BoardState {
  const existing = board.couples.find((c) => c.id === id);
  if (!existing || !existing.children.includes(personId)) return board;
  return {
    ...board,
    couples: board.couples.map((c) =>
      c.id === id ? { ...c, children: c.children.filter((ch) => ch !== personId) } : c),
  };
}

export function moveNode(board: BoardState, nodeId: string, position: Position): BoardState {
  const current = board.positions[nodeId];
  if (current && current.x === position.x && current.y === position.y) return board;
  return { ...board, positions: { ...board.positions, [nodeId]: position } };
}
