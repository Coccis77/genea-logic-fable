import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialGameState, selectBoard, useGameStore } from '../game/store';
import type { Level } from '../levels/types';
import { Board } from './Board';

const level: Level = {
  id: 'l', title: 't',
  people: [{ id: 'a', name: 'Ann' }, { id: 'b', name: 'Bob' }, { id: 'c', name: 'Cy' }],
  solution: { couples: [], links: [] }, clues: [],
};

beforeEach(() => {
  useGameStore.setState({ ...initialGameState });
  useGameStore.getState().openLevel(level);
});

describe('Board', () => {
  it('renders every person and the toolbar', () => {
    render(<Board />);
    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.getByText('Cy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Married/ })).toHaveAttribute('data-tutorial', 'tool:married');
  });

  it('leaves the background pattern to the theme', () => {
    const { container } = render(<Board />);
    expect(container.querySelector('.react-flow__background')).toBeNull();
    expect(container.querySelector('.react-flow__controls')).not.toBeNull();
  });

  it('builds a couple and a child through toolbar + clicks', async () => {
    const user = userEvent.setup();
    render(<Board />);
    await user.click(screen.getByRole('button', { name: /Married/ }));
    expect(screen.getByRole('button', { name: /Married/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByText('Ann'));
    await user.click(screen.getByText('Bob'));
    expect(selectBoard(useGameStore.getState()).couples).toHaveLength(1);
    expect(await screen.findByTestId('couple-c-a-b')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Child/ }));
    await user.click(screen.getByTestId('couple-c-a-b'));
    await user.click(screen.getByText('Cy'));
    expect(selectBoard(useGameStore.getState()).couples[0].children).toEqual(['c']);
  });

  it('keyboard shortcuts select tools, cancel and undo/redo', async () => {
    const user = userEvent.setup();
    render(<Board />);
    fireEvent.keyDown(window, { key: 'm' });
    expect(useGameStore.getState().tool).toBe('married');
    await user.click(screen.getByText('Ann'));
    expect(useGameStore.getState().pending).toEqual({ kind: 'person', id: 'a' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useGameStore.getState().pending).toBeNull();
    await user.click(screen.getByText('Ann'));
    await user.click(screen.getByText('Bob'));
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(selectBoard(useGameStore.getState()).couples).toHaveLength(0);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(selectBoard(useGameStore.getState()).couples).toHaveLength(1);
  });

  it('erases a child link by clicking its edge with the Erase tool', async () => {
    const store = useGameStore.getState();
    store.selectTool('married');
    store.clickPerson('a');
    store.clickPerson('b');
    store.selectTool('child');
    store.clickCouple('c-a-b');
    store.clickPerson('c');
    expect(selectBoard(useGameStore.getState()).couples[0].children).toEqual(['c']);
    const user = userEvent.setup();
    const { container } = render(<Board />);
    await user.click(screen.getByRole('button', { name: /Erase/ }));
    const edge = await waitFor(() => {
      const el = container.querySelector('.react-flow__edge[data-id="child:c-a-b:c"]');
      expect(el).not.toBeNull();
      return el as Element;
    });
    fireEvent.click(edge);
    expect(selectBoard(useGameStore.getState()).couples[0].children).toEqual([]);
  });

  it('ignores shortcuts typed into inputs', () => {
    render(<><input aria-label="field" /><Board /></>);
    fireEvent.keyDown(screen.getByLabelText('field'), { key: 'm' });
    expect(useGameStore.getState().tool).toBe('select');
  });
});
