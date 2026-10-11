import { z } from 'zod';
import type { BoardState } from '../game/board';
import { coupleSchema } from '../levels/schema';
import { DEFAULT_THEME, isThemeId, type ThemeId } from '../theme/themes';

export const SAVE_KEY = 'genealogic-save';

export interface SaveData {
  version: 1;
  completed: string[];
  boards: Record<string, BoardState>;
  hints: { showProgress: boolean; showMistakes: boolean };
  theme: ThemeId;
}

const boardSchema = z.object({
  positions: z.record(z.string(), z.object({ x: z.number(), y: z.number() })),
  couples: z.array(coupleSchema),
});

const saveSchema = z.object({
  version: z.literal(1),
  completed: z.array(z.string()),
  boards: z.record(z.string(), boardSchema),
  hints: z.object({ showProgress: z.boolean(), showMistakes: z.boolean() }),
  theme: z.string(),
});

export const defaultSave = (): SaveData => ({
  version: 1,
  completed: [],
  boards: {},
  hints: { showProgress: false, showMistakes: false },
  theme: DEFAULT_THEME,
});

// `storage` is resolved inside the try: reading window.localStorage throws when site data is blocked.
export function loadSave(storage?: Storage): SaveData {
  let raw: unknown;
  try {
    const text = (storage ?? localStorage).getItem(SAVE_KEY);
    if (!text) return defaultSave();
    raw = JSON.parse(text);
  } catch {
    return defaultSave();
  }
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) return defaultSave();
  const { theme, ...rest } = parsed.data;
  return { ...rest, theme: isThemeId(theme) ? theme : DEFAULT_THEME } as SaveData;
}

/** Best-effort: storage that is blocked, full or missing is ignored. */
export function writeSave(data: SaveData, storage?: Storage): void {
  try {
    (storage ?? localStorage).setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
}
