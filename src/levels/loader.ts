import { levelIndexSchema } from './schema';
import type { Level, LevelIndexEntry } from './types';
import { validateLevel } from './validate';

export class LevelLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LevelLoadError';
  }
}

export function mediaUrl(levelId: string, src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  return `/levels/${levelId}/${src}`;
}

async function fetchJson(url: string, what: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new LevelLoadError(`${what}: network error (${String(error)})`);
  }
  if (!response.ok) throw new LevelLoadError(`${what}: HTTP ${response.status}`);
  try {
    return await response.json();
  } catch {
    throw new LevelLoadError(`${what}: invalid JSON`);
  }
}

export async function loadLevelIndex(): Promise<LevelIndexEntry[]> {
  const raw = await fetchJson('/levels/index.json', 'level index');
  const parsed = levelIndexSchema.safeParse(raw);
  if (!parsed.success) throw new LevelLoadError(`level index: ${parsed.error.issues[0].message}`);
  return parsed.data;
}

export async function loadLevel(id: string): Promise<Level> {
  const raw = await fetchJson(`/levels/${id}/level.json`, `level "${id}"`);
  try {
    return validateLevel(raw);
  } catch (error) {
    throw new LevelLoadError(`level "${id}": ${(error as Error).message}`);
  }
}
