export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export const HISTORY_LIMIT = 100;

export const createHistory = <T,>(present: T): History<T> => ({ past: [], present, future: [] });

export function push<T>(h: History<T>, next: T): History<T> {
  const past = [...h.past, h.present].slice(-HISTORY_LIMIT);
  return { past, present: next, future: [] };
}

export const canUndo = <T,>(h: History<T>): boolean => h.past.length > 0;
export const canRedo = <T,>(h: History<T>): boolean => h.future.length > 0;

export function undo<T>(h: History<T>): History<T> {
  if (!canUndo(h)) return h;
  const past = h.past.slice(0, -1);
  return { past, present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}

export function redo<T>(h: History<T>): History<T> {
  if (!canRedo(h)) return h;
  const [next, ...future] = h.future;
  return { past: [...h.past, h.present], present: next, future };
}
