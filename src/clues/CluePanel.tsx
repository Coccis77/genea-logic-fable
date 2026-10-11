import { useGameStore } from '../game/store';
import { ClueDetail } from './ClueDetail';
import { ClueList } from './ClueList';
import './clues.css';

export function CluePanel() {
  const level = useGameStore((s) => s.level);
  const openClueId = useGameStore((s) => s.openClueId);
  const { openClue, closeClue } = useGameStore.getState();
  if (!level) return null;
  const clue = level.clues.find((c) => c.id === openClueId);
  return (
    <aside className="clue-panel" aria-label="Clues">
      <h2 className="clue-panel-title">Clues</h2>
      {clue ? <ClueDetail levelId={level.id} clue={clue} onBack={closeClue} /> : <ClueList clues={level.clues} onOpen={openClue} />}
    </aside>
  );
}
