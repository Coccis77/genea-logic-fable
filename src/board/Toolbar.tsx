import { useGameStore, type Tool } from '../game/store';
import { canRedo, canUndo } from '../game/history';

export const TOOL_BUTTONS: { id: Tool; label: string; key: string; icon: string }[] = [
  { id: 'select', label: 'Select', key: 'V', icon: '↖' },
  { id: 'married', label: 'Married', key: 'M', icon: '⚭' },
  { id: 'divorced', label: 'Divorced', key: 'D', icon: '⚮' },
  { id: 'partners', label: 'Partners', key: 'P', icon: '♥' },
  { id: 'child', label: 'Child', key: 'C', icon: '↓' },
  { id: 'erase', label: 'Erase', key: 'E', icon: '✕' },
];

export function Toolbar() {
  const tool = useGameStore((s) => s.tool);
  const history = useGameStore((s) => s.history);
  const { selectTool, undo, redo } = useGameStore.getState();
  return (
    <div className="toolbar" role="toolbar" aria-label="Tools">
      {TOOL_BUTTONS.map((b) => (
        <button
          key={b.id}
          type="button"
          className="tool-button"
          aria-pressed={tool === b.id}
          title={`${b.label} (${b.key})`}
          data-tutorial={`tool:${b.id}`}
          onClick={() => selectTool(b.id)}
        >
          <span aria-hidden="true">{b.icon}</span> {b.label}
        </button>
      ))}
      <span className="toolbar-separator" />
      <button type="button" className="tool-button" title="Undo (⌘/Ctrl+Z)" disabled={!canUndo(history)} onClick={undo}>↶ Undo</button>
      <button type="button" className="tool-button" title="Redo (⌘/Ctrl+Shift+Z)" disabled={!canRedo(history)} onClick={redo}>↷ Redo</button>
    </div>
  );
}
