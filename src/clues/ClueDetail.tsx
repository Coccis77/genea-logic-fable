import { useCallback, useState } from 'react';
import { useDismiss } from '../app/useDismiss';
import { mediaUrl } from '../levels/loader';
import type { Clue } from '../levels/types';
import { MiniMarkdown } from './MiniMarkdown';

/** CSS url() with the path quoted and encoded, so spaces, parentheses and quotes in filenames work. */
const cssUrl = (path: string) => `url("${encodeURI(path).replace(/"/g, '%22')}")`;

export function ClueDetail({ levelId, clue, onBack }: { levelId: string; clue: Clue; onBack: () => void }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [missing, setMissing] = useState<string | null>(null);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);
  useDismiss(closeFullscreen, { active: fullscreen });
  const reportMissing = (path: string) => () => setMissing(path);
  return (
    <div className="clue-detail">
      <button type="button" className="clue-back" onClick={onBack}>Back</button>
      <h3 className="clue-title">{clue.title}</h3>
      {missing && <p className="clue-missing" role="alert">Media not found: {missing}</p>}
      {(clue.kind === 'letter' || clue.kind === 'newspaper') && (
        <div
          className={`clue-sheet clue-sheet-${clue.kind}`}
          data-testid="clue-sheet"
          style={clue.background ? { backgroundImage: cssUrl(mediaUrl(levelId, clue.background)) } : undefined}
        >
          <MiniMarkdown text={clue.text} />
        </div>
      )}
      {clue.kind === 'photo' && (
        <>
          <img className="clue-photo" src={mediaUrl(levelId, clue.src)} alt={clue.title} onClick={() => setFullscreen(true)} onError={reportMissing(mediaUrl(levelId, clue.src))} />
          {clue.description && <p className="clue-description">{clue.description}</p>}
          {fullscreen && (
            <div className="clue-fullscreen" role="dialog" aria-label={clue.title} onClick={() => setFullscreen(false)}>
              <img src={mediaUrl(levelId, clue.src)} alt={clue.title} />
            </div>
          )}
        </>
      )}
      {clue.kind === 'audio' && <audio className="clue-media" controls src={mediaUrl(levelId, clue.src)} onError={reportMissing(mediaUrl(levelId, clue.src))} />}
      {clue.kind === 'video' && <video className="clue-media" controls src={mediaUrl(levelId, clue.src)} onError={reportMissing(mediaUrl(levelId, clue.src))} />}
      {(clue.kind === 'audio' || clue.kind === 'video') && (
        <>
          {clue.description && <p className="clue-description">{clue.description}</p>}
          <details className="clue-transcript" open>
            <summary>Transcript</summary>
            <MiniMarkdown text={clue.transcript} />
          </details>
        </>
      )}
    </div>
  );
}
