import { useCallback, useState } from 'react';
import { useGameStore } from '../game/store';
import { loadLevel, loadLevelIndex } from '../levels/loader';
import '../board/board.css';
import '../theme/themes.css';
import { ErrorScreen } from './ErrorScreen';
import { GameScreen } from './GameScreen';
import { Menu, nextLevelId } from './Menu';
import './app.css';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const levelId = useGameStore((s) => s.level?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextId, setNextId] = useState<string | null>(null);

  const play = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [level, entries] = await Promise.all([loadLevel(id), loadLevelIndex()]);
      setNextId(nextLevelId(entries, id));
      useGameStore.getState().openLevel(level);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  if (error) return <ErrorScreen message={error} onBack={() => setError(null)} />;
  if (loading) return <div className="screen screen-centered"><p>Loading…</p></div>;
  if (screen === 'game' && levelId) {
    return <GameScreen hasNext={nextId !== null} onNext={() => { if (nextId) void play(nextId); }} />;
  }
  return <Menu onPlay={(id) => void play(id)} />;
}
