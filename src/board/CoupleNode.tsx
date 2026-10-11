import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CoupleNodeType } from './flow';

const LABELS = { married: 'Married', divorced: 'Divorced', partners: 'Partners' } as const;

// Both handles sit at the dot's centre so edges start and end on the dot, not under the label.
const onDot = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } as const;

export function CoupleNode({ id, data }: NodeProps<CoupleNodeType>) {
  return (
    <div className={`couple-node couple-${data.coupleType}${data.selected ? ' is-selected' : ''}`} data-testid={`couple-${id}`}>
      <span className="couple-dot">
        <Handle type="target" position={Position.Top} id="in" className="hidden-handle" style={onDot} />
        <Handle type="source" position={Position.Bottom} id="out" className="hidden-handle" style={onDot} />
      </span>
      <span className="couple-label">{LABELS[data.coupleType]}</span>
    </div>
  );
}
