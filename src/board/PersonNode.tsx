import { Handle, Position, type NodeProps } from '@xyflow/react';
import { PERSON_HEIGHT, PERSON_WIDTH } from '../game/board';
import type { PersonNodeType } from './flow';

export function formatYears(born?: number, died?: number): string | null {
  if (born !== undefined && died !== undefined) return `${born} – ${died}`;
  if (born !== undefined) return `b. ${born}`;
  if (died !== undefined) return `d. ${died}`;
  return null;
}

export function PersonNode({ id, data }: NodeProps<PersonNodeType>) {
  const years = formatYears(data.born, data.died);
  return (
    <div
      className={`person-node${data.selected ? ' is-selected' : ''}${data.highlighted ? ' tutorial-highlight' : ''}`}
      style={{ width: PERSON_WIDTH, height: PERSON_HEIGHT }}
      data-tutorial={`person:${id}`}
    >
      <Handle type="target" position={Position.Top} id="in" className="hidden-handle" />
      <span className="person-name">{data.name}</span>
      {years && <span className="person-years">{years}</span>}
      <Handle type="source" position={Position.Bottom} id="couple" className="hidden-handle" />
    </div>
  );
}
