import { create } from 'zustand';
import type { CoupleType, Level, TutorialStep } from '../levels/types';
import { TOOL_IDS } from '../levels/validate';
import { loadSave, writeSave } from '../save/save';
import { scoreBoard, type Score } from '../scoring/score';
import { applyTheme, type ThemeId } from '../theme/themes';
import { advance, settle } from '../tutorial/engine';
import {
  addChild, canAddChild, canCreateCouple, createCouple, emptyBoard, findCouple, initialLayout,
  moveNode as moveNodeOnBoard, removeChild, removeCouple, retypeCouple, type BoardState, type Position,
} from './board';
import { canRedo, canUndo, createHistory, push, redo as redoHistory, undo as undoHistory, type History } from './history';

export type Tool = (typeof TOOL_IDS)[number];
export type Pending = { kind: 'person'; id: string } | { kind: 'couple'; id: string } | null;
export type Screen = 'menu' | 'game';

export interface GameState {
  screen: Screen;
  level: Level | null;
  history: History<BoardState>;
  tool: Tool;
  pending: Pending;
  openClueId: string | null;
  tutorialStep: number;
  victory: boolean;
  lastCheck: 'none' | 'incomplete';
  completed: string[];
  hints: { showProgress: boolean; showMistakes: boolean };
  theme: ThemeId;
  /** Bumped on every board pan/zoom so anchored overlays can re-position. */
  viewportVersion: number;
}

export interface GameActions {
  openLevel(level: Level): void;
  leaveLevel(): void;
  tutorialNext(): void;
  bumpViewport(): void;
  selectTool(tool: Tool): void;
  clickPerson(id: string): void;
  clickCouple(id: string): void;
  clickChildEdge(coupleId: string, childId: string): void;
  clickBackground(): void;
  cancelPending(): void;
  moveNode(nodeId: string, position: Position): void;
  undo(): void;
  redo(): void;
  resetBoard(): void;
  check(): void;
  dismissVictory(): void;
  openClue(id: string): void;
  closeClue(): void;
  setHint(key: 'showProgress' | 'showMistakes', value: boolean): void;
  setTheme(theme: ThemeId): void;
}

const COUPLE_TOOLS: Tool[] = ['married', 'divorced', 'partners'];
const isCoupleTool = (tool: Tool): tool is CoupleType => COUPLE_TOOLS.includes(tool);

const saved = loadSave();
export const initialGameState: GameState = {
  screen: 'menu',
  level: null,
  history: createHistory(emptyBoard()),
  tool: 'select',
  pending: null,
  openClueId: null,
  tutorialStep: 0,
  victory: false,
  lastCheck: 'none',
  completed: saved.completed,
  hints: saved.hints,
  theme: saved.theme,
  viewportVersion: 0,
};

export const selectBoard = (s: GameState): BoardState => s.history.present;
export const selectScore = (s: GameState): Score | null =>
  s.level ? scoreBoard(s.history.present.couples, s.level.solution.couples) : null;
export const selectCurrentTutorialStep = (s: GameState): TutorialStep | null =>
  s.level?.tutorial?.[s.tutorialStep] ?? null;

function sanitiseBoard(level: Level, board: BoardState | undefined): BoardState {
  const people = new Set(level.people.map((p) => p.id));
  const couples = (board?.couples ?? []).filter(
    (c) => c.members.every((m) => people.has(m)) && c.children.every((ch) => people.has(ch)),
  );
  const keep = new Set([...people, ...couples.map((c) => c.id)]);
  const positions: Record<string, Position> = { ...initialLayout(level.people) };
  for (const [id, pos] of Object.entries(board?.positions ?? {})) {
    if (keep.has(id)) positions[id] = pos;
  }
  return { positions, couples };
}

export const useGameStore = create<GameState & GameActions>()((set, get) => {
  const persist = () => {
    const s = get();
    try {
      const current = loadSave();
      const boards = s.level ? { ...current.boards, [s.level.id]: s.history.present } : current.boards;
      writeSave({ version: 1, completed: s.completed, boards, hints: s.hints, theme: s.theme });
    } catch {
      /* storage unavailable: keep playing without persistence */
    }
  };

  // Skips tutorial steps the board already satisfies (e.g. a restored board). Forward only.
  const settleTutorial = () => {
    const s = get();
    if (!s.level?.tutorial) return;
    const step = settle(s.level.tutorial, s.tutorialStep, s.history.present);
    if (step !== s.tutorialStep) set({ tutorialStep: step });
  };

  const emit = (event: string) => {
    const s = get();
    if (!s.level?.tutorial) return;
    set({ tutorialStep: advance(s.level.tutorial, s.tutorialStep, event) });
    settleTutorial();
  };

  const commit = (next: BoardState) => {
    const s = get();
    if (next === s.history.present) return;
    set({ history: push(s.history, next), lastCheck: 'none' });
    persist();
    settleTutorial();
  };

  return {
    ...initialGameState,

    openLevel(level) {
      const board = sanitiseBoard(level, loadSave().boards[level.id]);
      set({
        screen: 'game', level, history: createHistory(board), tool: 'select', pending: null,
        openClueId: null, tutorialStep: 0, victory: false, lastCheck: 'none',
      });
      settleTutorial();
    },

    bumpViewport() { set({ viewportVersion: get().viewportVersion + 1 }); },

    tutorialNext() { emit('next'); },
    leaveLevel() {
      set({ screen: 'menu', level: null, history: createHistory(emptyBoard()), pending: null, openClueId: null, victory: false });
    },

    selectTool(tool) {
      set({ tool, pending: null });
      emit(`toolSelected:${tool}`);
    },

    clickPerson(id) {
      const s = get();
      const board = s.history.present;
      if (isCoupleTool(s.tool)) {
        if (!s.pending || s.pending.kind !== 'person') {
          set({ pending: { kind: 'person', id } });
          return;
        }
        if (s.pending.id === id) {
          set({ pending: null });
          return;
        }
        const a = s.pending.id;
        const existing = findCouple(board, a, id);
        if (existing) {
          // Re-linking an existing pair with a couple tool changes its type (children kept).
          commit(retypeCouple(board, existing.id, s.tool));
          set({ pending: null });
          return;
        }
        if (!canCreateCouple(board, a, id)) return;
        commit(createCouple(board, a, id, s.tool));
        set({ pending: null });
        emit(`coupleCreated:${a}:${id}`);
        return;
      }
      if (s.tool === 'child' && s.pending?.kind === 'couple') {
        if (!canAddChild(board, s.pending.id, id)) return;
        commit(addChild(board, s.pending.id, id));
        emit(`childLinked:${id}`);
      }
    },

    clickCouple(id) {
      const s = get();
      const board = s.history.present;
      if (isCoupleTool(s.tool)) {
        const couple = board.couples.find((c) => c.id === id);
        if (couple && couple.type !== s.tool) commit(retypeCouple(board, id, s.tool));
        set({ pending: null });
      } else if (s.tool === 'child') {
        if (board.couples.some((c) => c.id === id)) set({ pending: { kind: 'couple', id } });
      } else if (s.tool === 'erase') {
        commit(removeCouple(board, id));
        set({ pending: null });
      }
    },

    clickChildEdge(coupleId, childId) {
      const s = get();
      if (s.tool !== 'erase') return;
      commit(removeChild(s.history.present, coupleId, childId));
    },

    clickBackground() { set({ pending: null }); },
    cancelPending() { set({ pending: null }); },

    moveNode(nodeId, position) {
      commit(moveNodeOnBoard(get().history.present, nodeId, position));
    },

    undo() {
      const s = get();
      if (!canUndo(s.history)) return;
      set({ history: undoHistory(s.history), pending: null, lastCheck: 'none', victory: false });
      persist();
      settleTutorial();
    },

    redo() {
      const s = get();
      if (!canRedo(s.history)) return;
      set({ history: redoHistory(s.history), pending: null, lastCheck: 'none', victory: false });
      persist();
      settleTutorial();
    },

    resetBoard() {
      const s = get();
      if (!s.level) return;
      set({ history: createHistory({ positions: initialLayout(s.level.people), couples: [] }), pending: null, lastCheck: 'none', victory: false });
      persist();
      settleTutorial();
    },

    check() {
      const s = get();
      const score = selectScore(s);
      emit('checked');
      if (!s.level || !score) return;
      if (score.complete) {
        const completed = s.completed.includes(s.level.id) ? s.completed : [...s.completed, s.level.id];
        set({ victory: true, completed, lastCheck: 'none' });
        persist();
      } else {
        set({ lastCheck: 'incomplete' });
      }
    },

    dismissVictory() { set({ victory: false }); },

    openClue(id) {
      set({ openClueId: id });
      emit(`clueOpened:${id}`);
    },

    closeClue() { set({ openClueId: null }); },

    setHint(key, value) {
      set({ hints: { ...get().hints, [key]: value } });
      persist();
    },

    setTheme(theme) {
      set({ theme });
      applyTheme(theme);
      persist();
    },
  };
});

applyTheme(initialGameState.theme);
