import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { BoardState } from '../game/board';
import type { Pending } from '../game/store';
import type { CoupleType, Level } from '../levels/types';

export type PersonNodeType = Node<{ name: string; selected: boolean }, 'person'>;
export type CoupleNodeType = Node<{ coupleType: CoupleType; selected: boolean }, 'couple'>;
export type ChildEdgeData = { coupleId: string; childId: string };

export function toFlowNodes(level: Level, board: BoardState, pending: Pending): Node[] {
  const people: PersonNodeType[] = level.people.map((p) => ({
    id: p.id,
    type: 'person',
    position: board.positions[p.id] ?? { x: 0, y: 0 },
    data: { name: p.name, selected: pending?.kind === 'person' && pending.id === p.id },
  }));
  const couples: CoupleNodeType[] = board.couples.map((c) => ({
    id: c.id,
    type: 'couple',
    position: board.positions[c.id] ?? { x: 0, y: 0 },
    data: { coupleType: c.type, selected: pending?.kind === 'couple' && pending.id === c.id },
  }));
  return [...people, ...couples];
}

export function toFlowEdges(board: BoardState): Edge[] {
  const edges: Edge[] = [];
  for (const c of board.couples) {
    for (const member of c.members) {
      edges.push({
        id: `couple:${c.id}:${member}`, source: member, sourceHandle: 'couple', target: c.id, targetHandle: 'in',
        type: 'straight', className: 'edge-couple',
      });
    }
    for (const child of c.children) {
      // React Flow paints the marker colour through an inline style, so a theme variable resolves.
      edges.push({
        id: `child:${c.id}:${child}`, source: c.id, sourceHandle: 'out', target: child, targetHandle: 'in',
        type: 'smoothstep', className: 'edge-child', markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--link-child)' },
        data: { coupleId: c.id, childId: child } satisfies ChildEdgeData,
      });
    }
  }
  return edges;
}

export function mergeFlowNodes(previous: Node[], next: Node[]): Node[] {
  const byId = new Map(previous.map((n) => [n.id, n]));
  return next.map((n) => {
    const prev = byId.get(n.id);
    if (!prev) return n;
    const merged: Node = { ...n };
    if (prev.measured !== undefined) merged.measured = prev.measured;
    if (prev.width !== undefined) merged.width = prev.width;
    if (prev.height !== undefined) merged.height = prev.height;
    return merged;
  });
}
