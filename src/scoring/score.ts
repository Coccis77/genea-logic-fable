import type { Couple } from '../levels/types';

export interface Score {
  correct: number;
  mistakes: number;
  missing: number;
  total: number;
  complete: boolean;
}

export function toAtoms(couples: Couple[]): Set<string> {
  const atoms = new Set<string>();
  for (const couple of couples) {
    const [a, b] = [...couple.members].sort();
    atoms.add(`couple:${a}:${b}:${couple.type}`);
    for (const child of couple.children) atoms.add(`child:${a}:${b}:${child}`);
  }
  return atoms;
}

export function scoreBoard(board: Couple[], solution: Couple[]): Score {
  const boardAtoms = toAtoms(board);
  const solutionAtoms = toAtoms(solution);
  let correct = 0;
  let mistakes = 0;
  for (const atom of boardAtoms) {
    if (solutionAtoms.has(atom)) correct += 1;
    else mistakes += 1;
  }
  const missing = solutionAtoms.size - correct;
  return { correct, mistakes, missing, total: solutionAtoms.size, complete: mistakes === 0 && missing === 0 };
}
