import { useGameStore } from '../game/store';

export function VictoryOverlay({ onNext, hasNext }: { onNext: () => void; hasNext: boolean }) {
  const victory = useGameStore((s) => s.victory);
  const level = useGameStore((s) => s.level);
  const leaveLevel = useGameStore((s) => s.leaveLevel);
  if (!victory || !level) return null;
  return (
    <div className="overlay">
      <div className="dialog" role="dialog" aria-label="Level complete">
        <h2>Level complete</h2>
        <p>You solved <strong>{level.title}</strong>.</p>
        <div className="dialog-actions">
          <button type="button" className="tool-button" onClick={leaveLevel}>Menu</button>
          <button type="button" className="tool-button tool-button-accent" disabled={!hasNext} onClick={onNext}>Next level</button>
        </div>
      </div>
    </div>
  );
}
