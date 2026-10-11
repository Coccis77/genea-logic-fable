import { useLayoutEffect, useState, type CSSProperties } from 'react';
import { selectCurrentTutorialStep, useGameStore } from '../game/store';
import './tutorial.css';

const BUBBLE_WIDTH = 300;

export function TutorialOverlay() {
  const step = useGameStore(selectCurrentTutorialStep);
  const tutorialNext = useGameStore((s) => s.tutorialNext);
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!step?.highlight) {
      setStyle(null);
      return;
    }
    const selector = `[data-tutorial="${step.highlight}"]`;
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) {
      setStyle(null);
      return;
    }
    target.classList.add('tutorial-highlight');
    const place = () => {
      const rect = target.getBoundingClientRect();
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - BUBBLE_WIDTH - 8);
      setStyle({ position: 'fixed', top: rect.bottom + 10, left, width: BUBBLE_WIDTH });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      target.classList.remove('tutorial-highlight');
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [step]);

  if (!step) return null;
  const centred = !step.highlight || !style;
  return (
    <div className={`tutorial-bubble${centred ? ' is-centred' : ''}`} role="note" aria-label="Tutorial" style={style ?? undefined}>
      <p>{step.text}</p>
      {!step.highlight && (
        <button type="button" className="tool-button tool-button-accent" onClick={tutorialNext}>Next</button>
      )}
    </div>
  );
}
