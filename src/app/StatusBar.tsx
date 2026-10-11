import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { selectScore, useGameStore } from '../game/store';
import { ConfirmDialog } from './ConfirmDialog';
import { ThemeSelect } from './ThemeSelect';
import './status.css';

export function StatusBar() {
  const level = useGameStore((s) => s.level);
  const score = useGameStore(useShallow(selectScore));
  const hints = useGameStore((s) => s.hints);
  const lastCheck = useGameStore((s) => s.lastCheck);
  const { check, resetBoard, setHint, leaveLevel } = useGameStore.getState();
  const [hintsOpen, setHintsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!level || !score) return null;
  return (
    <header className="status-bar">
      <button type="button" className="tool-button" onClick={leaveLevel}>Menu</button>
      <h1 className="status-title">{level.title}</h1>
      {hints.showProgress && (
        <div className="progress" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={score.total} aria-valuenow={score.correct}>
          <div className="progress-fill" style={{ width: `${score.total ? (score.correct / score.total) * 100 : 0}%` }} />
        </div>
      )}
      {hints.showMistakes && <span className="mistakes">Mistakes: {score.mistakes}</span>}
      {lastCheck === 'incomplete' && <span className="check-message">Not quite yet.</span>}
      <div className="status-actions">
        <div className="hints">
          <button type="button" className="tool-button" aria-expanded={hintsOpen} onClick={() => setHintsOpen((o) => !o)}>Hints</button>
          {hintsOpen && (
            <div className="hints-menu">
              <label><input type="checkbox" checked={hints.showProgress} onChange={(e) => setHint('showProgress', e.target.checked)} /> Show progress</label>
              <label><input type="checkbox" checked={hints.showMistakes} onChange={(e) => setHint('showMistakes', e.target.checked)} /> Show mistakes</label>
            </div>
          )}
        </div>
        <button type="button" className="tool-button" onClick={() => setConfirmReset(true)}>Reset board</button>
        <ThemeSelect />
        <button type="button" className="tool-button tool-button-accent" data-tutorial="check" onClick={check}>Check</button>
      </div>
      {confirmReset && (
        <ConfirmDialog
          message="Reset the board? All links on this level will be removed."
          onConfirm={() => { resetBoard(); setConfirmReset(false); }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </header>
  );
}
