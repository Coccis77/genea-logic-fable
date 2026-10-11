import { levelSchema } from './schema';
import type { Level } from './types';

export const TOOL_IDS = ['select', 'married', 'divorced', 'partners', 'child', 'erase'] as const;

export class LevelValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LevelValidationError';
  }
}

const fail = (message: string): never => {
  throw new LevelValidationError(message);
};

const checkUnique = (items: { id: string }[], label: string) => {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) fail(`duplicate ${label} id "${item.id}"`);
    seen.add(item.id);
  }
};

export function validateLevel(raw: unknown): Level {
  const parsed = levelSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    fail(`schema: ${issue.path.join('.')}: ${issue.message}`);
  }
  const level = parsed.data as Level;

  checkUnique(level.people, 'person');
  checkUnique(level.solution.couples, 'couple');
  checkUnique(level.clues, 'clue');

  for (const person of level.people) {
    if (person.born !== undefined && person.died !== undefined && person.died < person.born) {
      fail(`person "${person.id}": died before born`);
    }
  }

  const people = new Set(level.people.map((p) => p.id));
  const pairs = new Set<string>();
  const childOf = new Map<string, string>();

  for (const couple of level.solution.couples) {
    const [a, b] = couple.members;
    for (const m of [a, b, ...couple.children]) {
      if (!people.has(m)) fail(`couple "${couple.id}": unknown person "${m}"`);
    }
    if (a === b) fail(`couple "${couple.id}": both members are the same person`);
    const key = [a, b].sort().join('|');
    if (pairs.has(key)) fail(`couple "${couple.id}": another couple has the same members`);
    pairs.add(key);
    for (const child of couple.children) {
      if (child === a || child === b) fail(`person "${child}" is a child of a couple they belong to`);
      if (childOf.has(child)) fail(`person "${child}" is a child of more than one couple`);
      childOf.set(child, couple.id);
    }
  }

  const clueIds = new Set(level.clues.map((c) => c.id));
  const tools = new Set<string>(TOOL_IDS);
  for (const step of level.tutorial ?? []) {
    if (step.highlight !== undefined) {
      const [kind, target, ...rest] = step.highlight.split(':');
      const ok =
        step.highlight === 'check' ||
        (rest.length === 0 && kind === 'clue' && clueIds.has(target)) ||
        (rest.length === 0 && kind === 'tool' && tools.has(target)) ||
        (rest.length === 0 && kind === 'person' && people.has(target));
      if (!ok) fail(`tutorial: unknown highlight "${step.highlight}"`);
    }
    const [event, ...args] = step.until.split(':');
    const ok =
      (event === 'next' || event === 'checked') && args.length === 0 ||
      (event === 'clueOpened' && args.length === 1 && clueIds.has(args[0])) ||
      (event === 'toolSelected' && args.length === 1 && tools.has(args[0])) ||
      (event === 'coupleCreated' && args.length === 2 && args.every((p) => people.has(p))) ||
      (event === 'childLinked' && args.length === 1 && people.has(args[0]));
    if (!ok) fail(`tutorial: unknown until "${step.until}"`);
  }

  return level;
}
