import { readFileSync } from 'node:fs';
import { applyTheme, DEFAULT_THEME, isThemeId, THEMES } from './themes';

describe('themes', () => {
  it('lists five themes with the default first', () => {
    expect(THEMES).toHaveLength(5);
    expect(THEMES[0].id).toBe(DEFAULT_THEME);
    expect(THEMES.map((t) => t.id)).toEqual(['detective-board', 'manila-files', 'neon-city', 'blueprint', 'chalkboard']);
  });

  it('isThemeId guards unknown values', () => {
    expect(isThemeId('chalkboard')).toBe(true);
    expect(isThemeId('rainbow')).toBe(false);
    expect(isThemeId(42)).toBe(false);
  });

  it('applyTheme sets data-theme on <html>', () => {
    applyTheme('blueprint');
    expect(document.documentElement.dataset.theme).toBe('blueprint');
  });

  it('every theme defines opaque popover and couple-label colours', () => {
    const css = readFileSync('src/theme/themes.css', 'utf8');
    const blocks = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, selector, body]) => ({ selector, body }));
    const declared = (id: string) =>
      blocks.filter((b) => b.selector.includes(`[data-theme='${id}']`)).map((b) => b.body).join('\n');
    for (const { id } of THEMES) {
      for (const name of ['--popover', '--label-bg', '--label-text']) {
        expect(declared(id), `${id} ${name}`).toMatch(new RegExp(`${name}\\s*:`));
      }
    }
    const defaultBlock = blocks.find((b) => b.selector.trim().startsWith(':root,'));
    expect(defaultBlock?.selector).toContain("[data-theme='detective-board']");
    expect(defaultBlock?.body).toMatch(/--accent-text\s*:/);
    expect(declared('blueprint')).not.toMatch(/--popover\s*:\s*(transparent|var\(--surface\))/);
  });
});
