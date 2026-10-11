export type ThemeId = 'detective-board' | 'manila-files' | 'neon-city' | 'blueprint' | 'chalkboard';

export const THEMES: { id: ThemeId; name: string }[] = [
  { id: 'detective-board', name: 'Detective Board' },
  { id: 'manila-files', name: 'Manila Files' },
  { id: 'neon-city', name: 'Neon City' },
  { id: 'blueprint', name: 'Blueprint' },
  { id: 'chalkboard', name: 'Chalkboard' },
];

export const DEFAULT_THEME: ThemeId = 'detective-board';

export const isThemeId = (value: unknown): value is ThemeId =>
  typeof value === 'string' && THEMES.some((t) => t.id === value);

export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
}
