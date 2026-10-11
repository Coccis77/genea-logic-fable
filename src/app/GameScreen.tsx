import { Board } from '../board/Board';
import { CluePanel } from '../clues/CluePanel';
import { TutorialOverlay } from '../tutorial/TutorialOverlay';
import { StatusBar } from './StatusBar';
import { VictoryOverlay } from './VictoryOverlay';

export function GameScreen({ onNext, hasNext }: { onNext: () => void; hasNext: boolean }) {
  return (
    <div className="screen game-screen">
      <StatusBar />
      <div className="game-body">
        <CluePanel />
        <Board />
      </div>
      <TutorialOverlay />
      <VictoryOverlay onNext={onNext} hasNext={hasNext} />
    </div>
  );
}
