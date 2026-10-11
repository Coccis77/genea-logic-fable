import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CoupleNodeType } from './flow';

const LABELS = { married: 'Married', divorced: 'Divorced', partners: 'Partners' } as const;

export function CoupleNode({ id, data }: NodeProps<CoupleNodeType>) {
  return (
    <div className={`couple-node couple-${data.coupleType}${data.selected ? ' is-selected' : ''}`} data-testid={`couple-${id}`}>
      <Handle type="target" position={Position.Top} id="in" className="hidden-handle" />
      <span className="couple-dot" />
      <span className="couple-label">{LABELS[data.coupleType]}</span>
      <Handle type="source" position={Position.Bottom} id="out" className="hidden-handle" />
    </div>
  );
}
