import { useDismiss } from './useDismiss';

export function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  useDismiss(onCancel, { active: true });
  return (
    <div className="overlay">
      <div className="dialog" role="dialog" aria-label={message}>
        <p>{message}</p>
        <div className="dialog-actions">
          <button type="button" className="tool-button" onClick={onCancel}>Cancel</button>
          <button type="button" className="tool-button tool-button-accent" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
