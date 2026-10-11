import {
  Background, Controls, ReactFlow, ReactFlowProvider, applyNodeChanges,
  type Edge, type Node, type NodeChange, type NodeMouseHandler, type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { selectBoard, useGameStore, type Tool } from '../game/store';
import { CoupleNode } from './CoupleNode';
import { PersonNode } from './PersonNode';
import { Toolbar } from './Toolbar';
import { mergeFlowNodes, toFlowEdges, toFlowNodes, type ChildEdgeData } from './flow';
import './board.css';

const nodeTypes = { person: PersonNode, couple: CoupleNode };
const SHORTCUTS: Record<string, Tool> = { v: 'select', m: 'married', d: 'divorced', p: 'partners', c: 'child', e: 'erase' };

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const { selectTool, cancelPending, undo, redo } = useGameStore.getState();
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape') { cancelPending(); return; }
      const tool = SHORTCUTS[key];
      if (tool) selectTool(tool);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

function BoardCanvas() {
  const level = useGameStore((s) => s.level);
  const board = useGameStore(selectBoard);
  const pending = useGameStore((s) => s.pending);
  const tool = useGameStore((s) => s.tool);
  const { clickPerson, clickCouple, clickChildEdge, clickBackground, moveNode } = useGameStore.getState();

  const [nodes, setNodes] = useState<Node[]>([]);
  useEffect(() => {
    if (level) setNodes((current) => mergeFlowNodes(current, toFlowNodes(level, board, pending)));
  }, [level, board, pending]);
  const edges = useMemo<Edge[]>(() => toFlowEdges(board), [board]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    if (node.type === 'person') clickPerson(node.id);
    else clickCouple(node.id);
  }, [clickPerson, clickCouple]);

  const onEdgeClick: EdgeMouseHandler = useCallback((_, edge) => {
    const data = edge.data as ChildEdgeData | undefined;
    if (data) clickChildEdge(data.coupleId, data.childId);
  }, [clickChildEdge]);

  if (!level) return null;
  return (
    <div className={`board tool-${tool}`}>
      <Toolbar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={clickBackground}
        onNodeDragStop={(_, node) => moveNode(node.id, node.position)}
        nodesDraggable={tool === 'select'}
        nodesConnectable={false}
        elementsSelectable={false}
        edgesFocusable={false}
        deleteKeyCode={null}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export function Board() {
  useShortcuts();
  return (
    <ReactFlowProvider>
      <BoardCanvas />
    </ReactFlowProvider>
  );
}
