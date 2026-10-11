import { MarkerType } from '@xyflow/react';
import { addChild, createCouple, initialLayout } from '../game/board';
import type { Level } from '../levels/types';
import type { Node } from '@xyflow/react';
import { mergeFlowNodes, toFlowEdges, toFlowNodes } from './flow';

const level: Level = {
  id: 'l', title: 't',
  people: [{ id: 'a', name: 'Ann' }, { id: 'b', name: 'Bob' }, { id: 'c', name: 'Cy' }],
  solution: { couples: [], links: [] }, clues: [],
};
let board = createCouple({ positions: initialLayout(level.people), couples: [] }, 'a', 'b', 'married');
board = addChild(board, 'c-a-b', 'c');

describe('toFlowNodes', () => {
  it('maps people and couples with selection flags', () => {
    const nodes = toFlowNodes(level, board, { kind: 'couple', id: 'c-a-b' });
    expect(nodes.map((n) => n.id)).toEqual(['a', 'b', 'c', 'c-a-b']);
    expect(nodes[0]).toMatchObject({ type: 'person', position: { x: 40, y: 40 }, data: { name: 'Ann', selected: false } });
    expect(nodes[3]).toMatchObject({ type: 'couple', data: { coupleType: 'married', selected: true } });
  });
});

describe('toFlowEdges', () => {
  it('maps two couple edges and one child edge', () => {
    const edges = toFlowEdges(board);
    expect(edges.map((e) => e.id)).toEqual(['couple:c-a-b:a', 'couple:c-a-b:b', 'child:c-a-b:c']);
    expect(edges[0]).toMatchObject({ source: 'a', sourceHandle: 'couple', target: 'c-a-b', targetHandle: 'in', type: 'straight' });
    expect(edges[2]).toMatchObject({
      source: 'c-a-b', sourceHandle: 'out', target: 'c', targetHandle: 'in', type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed }, data: { coupleId: 'c-a-b', childId: 'c' },
    });
  });
});

describe('mergeFlowNodes', () => {
  const prev: Node[] = [
    { id: 'a', position: { x: 1, y: 1 }, data: { v: 'old' }, measured: { width: 10, height: 20 }, width: 10, height: 20 },
    { id: 'gone', position: { x: 0, y: 0 }, data: {} },
  ];
  const next: Node[] = [
    { id: 'a', position: { x: 5, y: 6 }, data: { v: 'new' } },
    { id: 'fresh', position: { x: 2, y: 2 }, data: {} },
  ];

  it('keeps measurements from previous but position and data from next', () => {
    expect(mergeFlowNodes(prev, next)[0]).toEqual({
      id: 'a', position: { x: 5, y: 6 }, data: { v: 'new' }, measured: { width: 10, height: 20 }, width: 10, height: 20,
    });
  });

  it('returns nodes absent from previous unchanged and drops nodes absent from next', () => {
    const merged = mergeFlowNodes(prev, next);
    expect(merged[1]).toBe(next[1]);
    expect(merged.map((n) => n.id)).toEqual(['a', 'fresh']);
  });
});
