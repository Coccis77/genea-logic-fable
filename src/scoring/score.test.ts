import type { Couple } from '../levels/types';
import { scoreBoard, toAtoms } from './score';

const c = (id: string, type: Couple['type'], a: string, b: string, children: string[] = []): Couple =>
  ({ id, type, members: [a, b], children });

const solution = [c('s1', 'married', 'marie', 'paul', ['lea'])]; // 2 atoms

describe('toAtoms', () => {
  it('sorts members and ignores the type for child atoms', () => {
    expect(toAtoms([c('x', 'married', 'paul', 'marie', ['lea'])]))
      .toEqual(new Set(['couple:marie:paul:married', 'child:marie:paul:lea']));
  });
});

describe('scoreBoard', () => {
  it('empty board: nothing correct, everything missing', () => {
    expect(scoreBoard([], solution)).toEqual({ correct: 0, mistakes: 0, missing: 2, total: 2, complete: false });
  });

  it('complete board', () => {
    expect(scoreBoard([c('b1', 'married', 'paul', 'marie', ['lea'])], solution))
      .toEqual({ correct: 2, mistakes: 0, missing: 0, total: 2, complete: true });
  });

  it('right pair, wrong type: couple is a mistake, child stays correct', () => {
    expect(scoreBoard([c('b1', 'divorced', 'marie', 'paul', ['lea'])], solution))
      .toEqual({ correct: 1, mistakes: 1, missing: 1, total: 2, complete: false });
  });

  it('wrong pair with a child: both are mistakes', () => {
    expect(scoreBoard([c('b1', 'married', 'marie', 'jacques', ['lea'])], solution))
      .toEqual({ correct: 0, mistakes: 2, missing: 2, total: 2, complete: false });
  });

  it('extra couple on top of a complete board blocks completion', () => {
    const board = [c('b1', 'married', 'marie', 'paul', ['lea']), c('b2', 'partners', 'lea', 'tom')];
    expect(scoreBoard(board, solution)).toEqual({ correct: 2, mistakes: 1, missing: 0, total: 2, complete: false });
  });

  it('missing child', () => {
    expect(scoreBoard([c('b1', 'married', 'marie', 'paul')], solution))
      .toEqual({ correct: 1, mistakes: 0, missing: 1, total: 2, complete: false });
  });
});
