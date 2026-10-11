import { useEffect, useState } from 'react';
import { loadLevelIndex } from '../levels/loader';
import type { LevelIndexEntry } from '../levels/types';

export function useLevelIndex(): { entries: LevelIndexEntry[] | null; error: string | null } {
  const [entries, setEntries] = useState<LevelIndexEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadLevelIndex()
      .then((list) => { if (!cancelled) setEntries(list); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);
  return { entries, error };
}
