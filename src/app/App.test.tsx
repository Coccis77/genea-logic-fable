import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialGameState, useGameStore } from '../game/store';
import { App } from './App';
import { isUnlocked, nextLevelId } from './Menu';

const index = [{ id: 'tutorial', tutorial: true }, { id: 'level-1', tutorial: false }, { id: 'level-2', tutorial: false }];
const levelJson = (id: string) => ({
  id, title: `Title ${id}`,
  people: [{ id: 'a', name: 'Ann' }, { id: 'b', name: 'Bob' }],
  solution: { couples: [{ id: 'c1', type: 'married', members: ['a', 'b'], children: [] }], links: [] },
  clues: [{ id: 'k1', kind: 'letter', title: 'Letter', text: 'x' }],
  ...(id === 'tutorial' ? { tutorial: [{ text: 'Welcome', until: 'next' }] } : {}),
});

const mockFetch = (handler: (url: string) => Response | Promise<Response>) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => Promise.resolve(handler(String(input))));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const silenceConsoleError = () => vi.spyOn(console, 'error').mockImplementation(() => {});

beforeEach(() => {
  useGameStore.setState({ ...initialGameState, screen: 'menu', level: null, completed: [] });
});
afterEach(() => vi.restoreAllMocks());

describe('unlock rules', () => {
  it('tutorial and first level are always unlocked, later ones follow completion', () => {
    expect(isUnlocked(index, [], 'tutorial')).toBe(true);
    expect(isUnlocked(index, [], 'level-1')).toBe(true);
    expect(isUnlocked(index, [], 'level-2')).toBe(false);
    expect(isUnlocked(index, ['level-1'], 'level-2')).toBe(true);
    expect(isUnlocked(index, ['tutorial'], 'level-2')).toBe(false);
  });
  it('nextLevelId skips the tutorial and ends with null', () => {
    expect(nextLevelId(index, 'tutorial')).toBe('level-1');
    expect(nextLevelId(index, 'level-1')).toBe('level-2');
    expect(nextLevelId(index, 'level-2')).toBeNull();
  });
});

describe('App', () => {
  it('shows the menu with the tutorial first and locked levels disabled', async () => {
    mockFetch((url) => (url.endsWith('index.json') ? json(index) : json(levelJson('x'))));
    render(<App />);
    const buttons = await screen.findAllByRole('button', { name: /Tutorial|Level/ });
    expect(buttons[0]).toHaveTextContent('Tutorial');
    expect(buttons[0]).toHaveClass('level-button-tutorial');
    expect(screen.getByRole('button', { name: /Level 2/ })).toBeDisabled();
  });

  it('opens a level and plays it through to victory and next level', async () => {
    const user = userEvent.setup();
    mockFetch((url) => (url.endsWith('index.json') ? json(index) : json(levelJson(url.split('/')[2]))));
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Level 1/ }));
    expect(await screen.findByText('Title level-1')).toBeInTheDocument();
    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Letter/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Married/ }));
    await user.click(screen.getByText('Ann'));
    await user.click(screen.getByText('Bob'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByRole('dialog', { name: 'Level complete' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next level' }));
    expect(await screen.findByText('Title level-2')).toBeInTheDocument();
  });

  it('returns to the menu when the next level fails to load', async () => {
    const consoleError = silenceConsoleError();
    const user = userEvent.setup();
    mockFetch((url) => {
      if (url.endsWith('index.json')) return json(index);
      if (url.includes('level-2')) return json({}, 404);
      return json(levelJson('level-1'));
    });
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Level 1/ }));
    await screen.findByText('Title level-1');
    await user.click(screen.getByRole('button', { name: /Married/ }));
    await user.click(screen.getByText('Ann'));
    await user.click(screen.getByText('Bob'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(await screen.findByRole('button', { name: 'Next level' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 404');
    expect(consoleError).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Back to menu' }));
    expect(await screen.findByRole('button', { name: /Level 1/ })).toBeInTheDocument();
    expect(useGameStore.getState().screen).toBe('menu');
  });

  it('shows the tutorial overlay on the tutorial level', async () => {
    const user = userEvent.setup();
    mockFetch((url) => (url.endsWith('index.json') ? json(index) : json(levelJson('tutorial'))));
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Tutorial/ }));
    expect(await screen.findByRole('note', { name: 'Tutorial' })).toHaveTextContent('Welcome');
  });

  it('shows an error screen when a level fails to load', async () => {
    const consoleError = silenceConsoleError();
    const user = userEvent.setup();
    mockFetch((url) => (url.endsWith('index.json') ? json(index) : json({}, 404)));
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Level 1/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 404');
    expect(consoleError).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Back to menu' }));
    expect(await screen.findByRole('button', { name: /Level 1/ })).toBeInTheDocument();
  });

  it('shows an error when the index fails to load', async () => {
    const consoleError = silenceConsoleError();
    mockFetch(() => json('nope', 500));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500');
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
