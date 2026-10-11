export type CoupleType = 'married' | 'divorced' | 'partners';
export const COUPLE_TYPES: CoupleType[] = ['married', 'divorced', 'partners'];

export interface Person {
  id: string;
  name: string;
  born?: number;
  died?: number;
}

export interface Couple {
  id: string;
  type: CoupleType;
  members: [string, string];
  children: string[];
}

export type ClueKind = 'letter' | 'newspaper' | 'photo' | 'audio' | 'video';

interface ClueBase {
  id: string;
  title: string;
}
export interface LetterClue extends ClueBase { kind: 'letter'; text: string; background?: string }
export interface NewspaperClue extends ClueBase { kind: 'newspaper'; text: string; background?: string }
export interface PhotoClue extends ClueBase { kind: 'photo'; src: string; description?: string }
export interface AudioClue extends ClueBase { kind: 'audio'; src: string; transcript: string; description?: string }
export interface VideoClue extends ClueBase { kind: 'video'; src: string; transcript: string; description?: string }
export type Clue = LetterClue | NewspaperClue | PhotoClue | AudioClue | VideoClue;

export interface TutorialStep {
  text: string;
  highlight?: string;
  until: string;
}

export interface Level {
  id: string;
  title: string;
  people: Person[];
  solution: { couples: Couple[]; links: never[] };
  clues: Clue[];
  tutorial?: TutorialStep[];
}

export interface LevelIndexEntry {
  id: string;
  tutorial: boolean;
}
