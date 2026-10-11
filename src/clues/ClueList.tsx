import type { Clue, ClueKind } from '../levels/types';

export const CLUE_ICONS: Record<ClueKind, string> = { letter: '✉', newspaper: '📰', photo: '🖼', audio: '🎧', video: '🎬' };

export function ClueList({ clues, onOpen }: { clues: Clue[]; onOpen: (id: string) => void }) {
  return (
    <ul className="clue-list">
      {clues.map((clue) => (
        <li key={clue.id}>
          <button type="button" className="clue-item" data-tutorial={`clue:${clue.id}`} onClick={() => onOpen(clue.id)}>
            <span className="clue-icon" aria-hidden="true">{CLUE_ICONS[clue.kind]}</span>
            <span>{clue.title}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
