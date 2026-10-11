import { useGameStore } from '../game/store';
import { isThemeId, THEMES } from '../theme/themes';

export function ThemeSelect() {
  const theme = useGameStore((s) => s.theme);
  const setTheme = useGameStore((s) => s.setTheme);
  return (
    <select
      className="theme-select"
      aria-label="Theme"
      value={theme}
      onChange={(e) => { if (isThemeId(e.target.value)) setTheme(e.target.value); }}
    >
      {THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  );
}
