import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialGameState, selectBoard, useGameStore } from '../game/store';
import type { Level } from '../levels/types';
import { StatusBar } from './StatusBar';
import { VictoryOverlay } from './VictoryOverlay';

const level: Level = {
  id: 'lvl', title: 'The Test Family',
  people: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
  solution: { couples: [{ id: 'c1', type: 'married', members: ['a', 'b'], children: [] }], links: [] },
  clues: [],
};

const s = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState({ ...initialGameState });
  s().openLevel(level);
});

describe('StatusBar', () => {
  it('shows the title and hides hints by default', () => {
    render(<StatusBar onNext={vi.fn()} hasNext />);
    expect(screen.getByText('The Test Family')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText(/Mistakes/)).toBeNull();
  });

  it('check shows a neutral message with no numbers when incomplete', async () => {
    const user = userEvent.setup();
    render(<StatusBar onNext={vi.fn()} hasNext />);
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText('Not quite yet.')).toBeInTheDocument();
    expect(screen.queryByText(/\d/)).toBeNull();
  });

  it('hint toggles reveal progress and mistakes', async () => {
    const user = userEvent.setup();
    s().selectTool('divorced');
    s().clickPerson('a');
    s().clickPerson('b');
    render(<StatusBar onNext={vi.fn()} hasNext />);
    await user.click(screen.getByRole('button', { name: 'Hints' }));
    await user.click(screen.getByRole('checkbox', { name: 'Show progress' }));
    await user.click(screen.getByRole('checkbox', { name: 'Show mistakes' }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '1');
    expect(screen.getByText('Mistakes: 1')).toBeInTheDocument();
  });

  it('reset asks for confirmation', async () => {
    const user = userEvent.setup();
    s().selectTool('married');
    s().clickPerson('a');
    s().clickPerson('b');
    render(<StatusBar onNext={vi.fn()} hasNext />);
    await user.click(screen.getByRole('button', { name: 'Reset board' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(selectBoard(s()).couples).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Reset board' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(selectBoard(s()).couples).toHaveLength(0);
  });

  it('theme select changes the theme', async () => {
    const user = userEvent.setup();
    render(<StatusBar onNext={vi.fn()} hasNext />);
    await user.selectOptions(screen.getByLabelText('Theme'), 'noir');
    expect(s().theme).toBe('noir');
  });

  it('menu button leaves the level', async () => {
    const user = userEvent.setup();
    render(<StatusBar onNext={vi.fn()} hasNext />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(s().screen).toBe('menu');
  });
});

describe('VictoryOverlay', () => {
  it('renders only on victory and wires its buttons', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<VictoryOverlay onNext={onNext} hasNext />);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      s().selectTool('married');
      s().clickPerson('a');
      s().clickPerson('b');
      s().check();
    });
    expect(screen.getByRole('dialog', { name: 'Level complete' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next level' }));
    expect(onNext).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(s().screen).toBe('menu');
  });

  it('View tree closes the overlay and leaves the board usable', async () => {
    const user = userEvent.setup();
    render(<VictoryOverlay onNext={vi.fn()} hasNext />);
    act(() => {
      s().selectTool('married');
      s().clickPerson('a');
      s().clickPerson('b');
      s().check();
    });
    await user.click(screen.getByRole('button', { name: 'View tree' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(s().screen).toBe('game');
    expect(s().completed).toEqual(['lvl']);
  });
});

describe('StatusBar after victory', () => {
  it('shows a Level complete badge with a Next level button once the level is completed', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<StatusBar onNext={onNext} hasNext />);
    expect(screen.queryByText('Level complete')).toBeNull();
    act(() => {
      s().selectTool('married');
      s().clickPerson('a');
      s().clickPerson('b');
      s().check();
      s().dismissVictory();
    });
    expect(screen.getByText('Level complete')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next level' }));
    expect(onNext).toHaveBeenCalled();
  });

  it('disables Next level on the last level', () => {
    act(() => {
      s().selectTool('married');
      s().clickPerson('a');
      s().clickPerson('b');
      s().check();
      s().dismissVictory();
    });
    render(<StatusBar onNext={vi.fn()} hasNext={false} />);
    expect(screen.getByRole('button', { name: 'Next level' })).toBeDisabled();
  });
});
