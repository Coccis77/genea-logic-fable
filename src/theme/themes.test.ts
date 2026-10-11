import { applyTheme, DEFAULT_THEME, isThemeId, THEMES } from './themes';

describe('themes', () => {
  it('lists five themes with the default first', () => {
    expect(THEMES).toHaveLength(5);
    expect(THEMES[0].id).toBe(DEFAULT_THEME);
    expect(THEMES.map((t) => t.id)).toEqual(['detective-board', 'old-archive', 'night-office', 'blueprint', 'noir']);
  });

  it('isThemeId guards unknown values', () => {
    expect(isThemeId('noir')).toBe(true);
    expect(isThemeId('rainbow')).toBe(false);
    expect(isThemeId(42)).toBe(false);
  });

  it('applyTheme sets data-theme on <html>', () => {
    applyTheme('blueprint');
    expect(document.documentElement.dataset.theme).toBe('blueprint');
  });
});
