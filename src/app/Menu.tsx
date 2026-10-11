import { useGameStore } from '../game/store';
import type { LevelIndexEntry } from '../levels/types';
import { ErrorScreen } from './ErrorScreen';
import { ThemeSelect } from './ThemeSelect';
import { useLevelIndex } from './useLevelIndex';

export function isUnlocked(entries: LevelIndexEntry[], completed: string[], id: string): boolean {
  const levels = entries.filter((e) => !e.tutorial);
  const position = levels.findIndex((e) => e.id === id);
  if (position === -1) return true; // tutorial or unknown: always playable
  if (position === 0) return true;
  return completed.includes(levels[position - 1].id);
}

export function nextLevelId(entries: LevelIndexEntry[], id: string): string | null {
  const levels = entries.filter((e) => !e.tutorial);
  const position = levels.findIndex((e) => e.id === id);
  return levels[position + 1]?.id ?? null;
}

export function Menu({ onPlay }: { onPlay: (id: string) => void }) {
  const { entries, error } = useLevelIndex();
  const completed = useGameStore((s) => s.completed);
  if (error) return <ErrorScreen message={error} />;
  if (!entries) return <div className="screen screen-centered"><p>Loading…</p></div>;
  let levelNumber = 0;
  return (
    <div className="screen screen-centered menu">
      <h1 className="menu-title">Genealogic</h1>
      <p className="menu-subtitle">Rebuild the family tree from the clues.</p>
      <ul className="level-list">
        {entries.map((entry) => {
          const label = entry.tutorial ? 'Tutorial' : `Level ${(levelNumber += 1)}`;
          const unlocked = isUnlocked(entries, completed, entry.id);
          const done = completed.includes(entry.id);
          return (
            <li key={entry.id}>
              <button
                type="button"
                className={`level-button${entry.tutorial ? ' level-button-tutorial' : ''}${done ? ' is-done' : ''}`}
                disabled={!unlocked}
                onClick={() => onPlay(entry.id)}
              >
                <span>{label}</span>
                <span aria-hidden="true">{done ? '✓' : unlocked ? '' : '🔒'}</span>
                {done && <span className="visually-hidden">(completed)</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="menu-theme"><ThemeSelect /></div>
    </div>
  );
}
