import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialGameState, useGameStore } from '../game/store';
import type { Level } from '../levels/types';
import { TutorialOverlay } from './TutorialOverlay';

const level: Level = {
  id: 'tut', title: 'T',
  people: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
  solution: { couples: [], links: [] },
  clues: [{ id: 'k1', kind: 'letter', title: 'L', text: 't' }],
  tutorial: [
    { text: 'Welcome', until: 'next' },
    { text: 'Open the letter', highlight: 'clue:k1', until: 'clueOpened:k1' },
  ],
};

beforeEach(() => {
  useGameStore.setState({ ...initialGameState });
  useGameStore.getState().openLevel(level);
});

describe('TutorialOverlay', () => {
  it('shows the step text and advances with Next', async () => {
    const user = userEvent.setup();
    render(<TutorialOverlay />);
    expect(screen.getByRole('note', { name: 'Tutorial' })).toHaveTextContent('Welcome');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('note')).toHaveTextContent('Open the letter');
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  it('highlights the target element and cleans up', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button" data-tutorial="clue:k1">Letter</button>
        <TutorialOverlay />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: 'Letter' })).toHaveClass('tutorial-highlight');
    act(() => useGameStore.getState().openClue('k1'));
    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.getByRole('button', { name: 'Letter' })).not.toHaveClass('tutorial-highlight');
  });

  it('renders nothing for a level without tutorial', () => {
    useGameStore.getState().openLevel({ ...level, tutorial: undefined });
    render(<TutorialOverlay />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});
