import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialGameState, useGameStore } from '../game/store';
import type { Level } from '../levels/types';
import { CluePanel } from './CluePanel';

const level: Level = {
  id: 'lvl', title: 'T',
  people: [{ id: 'a', name: 'A' }],
  solution: { couples: [], links: [] },
  clues: [
    { id: 'k1', kind: 'letter', title: 'The letter', text: 'Dear **Paul**', background: 'paper.png' },
    { id: 'k2', kind: 'newspaper', title: 'The paper', text: 'News', background: 'https://x.test/bg.jpg' },
    { id: 'k3', kind: 'photo', title: 'The photo', src: 'p.jpg', description: 'Two people' },
    { id: 'k4', kind: 'audio', title: 'The tape', src: 'a.mp3', transcript: 'Hello there', description: 'Found in a drawer' },
    { id: 'k5', kind: 'video', title: 'The film', src: 'v.mp4', transcript: 'Smile!' },
  ],
};

beforeEach(() => {
  useGameStore.setState({ ...initialGameState });
  useGameStore.getState().openLevel(level);
});

describe('CluePanel', () => {
  it('lists clues with tutorial anchors', () => {
    render(<CluePanel />);
    expect(screen.getByRole('button', { name: /The letter/ })).toHaveAttribute('data-tutorial', 'clue:k1');
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('opens a letter with its background, then goes back', async () => {
    const user = userEvent.setup();
    render(<CluePanel />);
    await user.click(screen.getByRole('button', { name: /The letter/ }));
    expect(useGameStore.getState().openClueId).toBe('k1');
    const sheet = screen.getByTestId('clue-sheet');
    expect(sheet).toHaveStyle({ backgroundImage: 'url(/levels/lvl/paper.png)' });
    expect(sheet.querySelector('strong')?.textContent).toBe('Paul');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(useGameStore.getState().openClueId).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('keeps absolute background URLs', async () => {
    const user = userEvent.setup();
    render(<CluePanel />);
    await user.click(screen.getByRole('button', { name: /The paper/ }));
    expect(screen.getByTestId('clue-sheet')).toHaveStyle({ backgroundImage: 'url(https://x.test/bg.jpg)' });
  });

  it('renders photo, audio and video details', async () => {
    const user = userEvent.setup();
    const { container } = render(<CluePanel />);
    await user.click(screen.getByRole('button', { name: /The photo/ }));
    expect(screen.getByRole('img', { name: 'The photo' })).toHaveAttribute('src', '/levels/lvl/p.jpg');
    expect(screen.getByText('Two people')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));

    await user.click(screen.getByRole('button', { name: /The tape/ }));
    expect(container.querySelector('audio')).toHaveAttribute('src', '/levels/lvl/a.mp3');
    expect(screen.getByText('Found in a drawer')).toBeInTheDocument();
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));

    await user.click(screen.getByRole('button', { name: /The film/ }));
    expect(container.querySelector('video')).toHaveAttribute('src', '/levels/lvl/v.mp4');
    expect(screen.getByText('Smile!')).toBeInTheDocument();
  });
});
