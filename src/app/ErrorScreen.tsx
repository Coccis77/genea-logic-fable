export function ErrorScreen({ message, onBack }: { message: string; onBack?: () => void }) {
  return (
    <div className="screen screen-centered">
      <div className="dialog" role="alert">
        <h2>Something went wrong</h2>
        <p>{message}</p>
        {onBack && <div className="dialog-actions"><button type="button" className="tool-button" onClick={onBack}>Back to menu</button></div>}
      </div>
    </div>
  );
}
