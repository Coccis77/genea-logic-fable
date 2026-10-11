export type ThemeId = 'detective-board' | 'old-archive' | 'night-office' | 'blueprint' | 'noir';

export const THEMES: { id: ThemeId; name: string }[] = [
  { id: 'detective-board', name: 'Detective Board' },
  { id: 'old-archive', name: 'Old Archive' },
  { id: 'night-office', name: 'Night Office' },
  { id: 'blueprint', name: 'Blueprint' },
  { id: 'noir', name: 'Noir' },
];

export const DEFAULT_THEME: ThemeId = 'detective-board';

export const isThemeId = (value: unknown): value is ThemeId =>
  typeof value === 'string' && THEMES.some((t) => t.id === value);

export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
}
