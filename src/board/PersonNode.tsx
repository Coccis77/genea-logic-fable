import { Handle, Position, type NodeProps } from '@xyflow/react';
import { PERSON_HEIGHT, PERSON_WIDTH } from '../game/board';
import type { PersonNodeType } from './flow';

export function PersonNode({ id, data }: NodeProps<PersonNodeType>) {
  return (
    <div
      className={`person-node${data.selected ? ' is-selected' : ''}`}
      style={{ width: PERSON_WIDTH, height: PERSON_HEIGHT }}
      data-tutorial={`person:${id}`}
    >
      <Handle type="target" position={Position.Top} id="in" className="hidden-handle" />
      <span className="person-name">{data.name}</span>
      <Handle type="source" position={Position.Bottom} id="couple" className="hidden-handle" />
    </div>
  );
}
