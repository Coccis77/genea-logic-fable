import { levelIndexSchema } from './schema';
import type { Level, LevelIndexEntry } from './types';
import { validateLevel } from './validate';

export class LevelLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LevelLoadError';
  }
}

/** Public path of the levels folder, honouring Vite's `base` (e.g. `/repo/` on GitHub Pages). */
export function levelsRoot(): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}levels`;
}

export function mediaUrl(levelId: string, src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  return `${levelsRoot()}/${levelId}/${src}`;
}

async function fetchJson(url: string, what: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new LevelLoadError(`${what}: network error (${String(error)})`);
  }
  if (!response.ok) throw new LevelLoadError(`${what}: HTTP ${response.status}`);
  // Accept JSON and text/plain (some static hosts); anything else (e.g. vite's text/html SPA fallback) means a missing file.
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json') && !contentType.includes('text/plain')) {
    throw new LevelLoadError(
      `${what}: not found (server returned ${contentType || 'no content type'} — is the level folder present under public/levels?)`,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new LevelLoadError(`${what}: invalid JSON`);
  }
}

export async function loadLevelIndex(): Promise<LevelIndexEntry[]> {
  const raw = await fetchJson(`${levelsRoot()}/index.json`, 'level index');
  const parsed = levelIndexSchema.safeParse(raw);
  if (!parsed.success) throw new LevelLoadError(`level index: ${parsed.error.issues[0].message}`);
  return parsed.data;
}

export async function loadLevel(id: string): Promise<Level> {
  const raw = await fetchJson(`${levelsRoot()}/${id}/level.json`, `level "${id}"`);
  try {
    return validateLevel(raw);
  } catch (error) {
    throw new LevelLoadError(`level "${id}": ${(error as Error).message}`);
  }
}
