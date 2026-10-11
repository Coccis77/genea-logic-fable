# Genealogic Game (phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser deduction game where the player rebuilds family trees from clues on a React Flow board, with exact-match validation, sequential levels, an optional guided tutorial, undo/redo, local save and five colour themes.

**Architecture:** Pure, tested modules (level schema, scoring, board model, history, save, tutorial engine) sit under a single Zustand store; React components (board, clue panel, status bar, menu, tutorial overlay) only render store state and call store actions. Levels are JSON folders under `public/levels/` validated with Zod at load time.

**Tech Stack:** React 19, TypeScript, Vite 8, `@xyflow/react` 12, Zustand 5, Zod 4, Vitest 5 + Testing Library + jsdom.

**Spec:** `docs/superpowers/specs/2026-10-11-genealogic-game-design.md`

## Global Constraints

- All UI copy is in English.
- Couple types are exactly `married | divorced | partners`; `solution.links` must be `[]` in phase 1.
- No right-click menus; every board action goes through the toolbar.
- Wrong links give no visible feedback; only the opt-in progress bar and mistake counter reveal state. "Check" shows no numbers.
- Nodes are draggable only with the Select tool.
- Level folders live in `public/levels/<id>/`; relative media resolve to `/levels/<id>/<src>`, `http(s)` URLs are used as-is.
- Save key is `genealogic-save`, `version: 1`; unknown version is discarded; unknown theme falls back to `detective-board`.
- Every commit message ends with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (passed as a second `-m`).
- Run tests with `npx vitest run <path>`; the full suite must stay green at every commit.

## Review Focus

1. A level fetch that fails (404, network, invalid JSON) must show an error screen with the reason, never a blank board — pinned in Task 3 (loader) and Task 15 (App).
2. Corrupted or foreign JSON in `localStorage` must fall back to the default save instead of crashing at startup — pinned in Task 7.
3. A saved board that references people or couples no longer in the level (level edited after a save) must be sanitised when the level opens: unknown couples and positions dropped, missing positions laid out — pinned in Task 10.
4. Retyping a couple to its current type must not push an undo entry, otherwise ⌘Z appears to "do nothing" — pinned in Task 10.
5. A `background` or `src` given as an `http(s)` URL must not be prefixed with the level folder — pinned in Task 3.

---

### Task 1: Project scaffold and test harness

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/test/setup.ts`, `src/app/App.test.tsx`

**Interfaces:**
- Produces: `App` component (placeholder, replaced in Task 15); `src/test/setup.ts` with React Flow jsdom mocks used by every component test.

- [ ] **Step 1: Write package.json and configs**

`package.json`:
```json
{
  "name": "genealogic",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@xyflow/react": "^12.12.0",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "zod": "^4.6.5",
    "zustand": "^5.0.15"
  },
  "devDependencies": {
    "@testing-library/dom": "^10.4.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.3.3",
    "@testing-library/user-event": "^14.6.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^5.0.0",
    "jsdom": "^26.0.0",
    "typescript": "^5.8.0",
    "vite": "^8.3.4",
    "vitest": "^5.0.3"
  }
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Genealogic</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/app/App.tsx` (placeholder):
```tsx
export function App() {
  return <h1>Genealogic</h1>;
}
```

- [ ] **Step 2: Write the test setup with React Flow jsdom mocks**

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';

// React Flow needs these browser APIs, which jsdom does not provide.
class ResizeObserverMock {
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
  unobserve() {}
  disconnect() {}
}

class DOMMatrixReadOnlyMock {
  m22: number;
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([1-9.]+)\)/)?.[1];
    this.m22 = scale !== undefined ? Number(scale) : 1;
  }
}

Object.defineProperty(globalThis, 'ResizeObserver', { writable: true, value: ResizeObserverMock });
Object.defineProperty(globalThis, 'DOMMatrixReadOnly', { writable: true, value: DOMMatrixReadOnlyMock });

Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: { get() { return parseFloat((this as HTMLElement).style.height) || 1; } },
  offsetWidth: { get() { return parseFloat((this as HTMLElement).style.width) || 1; } },
});

(SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
  ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;

beforeEach(() => {
  localStorage.clear();
});
```

- [ ] **Step 3: Write the smoke test**

`src/app/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { App } from './App';

it('renders the game title', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Genealogic' })).toBeInTheDocument();
});
```

- [ ] **Step 4: Install and run**

Run: `npm install && npx vitest run`
Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + Vitest project" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Level types, Zod schema and consistency validation

**Files:**
- Create: `src/levels/types.ts`, `src/levels/schema.ts`, `src/levels/validate.ts`
- Test: `src/levels/validate.test.ts`

**Interfaces:**
- Produces:
  - types `CoupleType`, `Person`, `Couple`, `Clue` (union of `LetterClue | NewspaperClue | PhotoClue | AudioClue | VideoClue`), `ClueKind`, `TutorialStep`, `Level`, `LevelIndexEntry`
  - `validateLevel(raw: unknown): Level` — throws `LevelValidationError` (message describes the first failing rule)
  - `TOOLS` constant is NOT here; tutorial `tool:` targets are validated against the list `['select','married','divorced','partners','child','erase']` duplicated in `validate.ts` as `TOOL_IDS` (Task 10 imports it from here).

- [ ] **Step 1: Write types**

`src/levels/types.ts`:
```ts
export type CoupleType = 'married' | 'divorced' | 'partners';
export const COUPLE_TYPES: CoupleType[] = ['married', 'divorced', 'partners'];

export interface Person {
  id: string;
  name: string;
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
```

- [ ] **Step 2: Write the failing tests**

`src/levels/validate.test.ts`:
```ts
import { validateLevel, LevelValidationError } from './validate';

const base = () => ({
  id: 'lvl',
  title: 'Test',
  people: [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
  ],
  solution: {
    couples: [{ id: 'c1', type: 'married', members: ['a', 'b'], children: ['c'] }],
    links: [],
  },
  clues: [
    { id: 'k1', kind: 'letter', title: 'L', text: 'hello' },
    { id: 'k2', kind: 'photo', title: 'P', src: 'p.jpg' },
    { id: 'k3', kind: 'audio', title: 'A', src: 'a.mp3', transcript: 't' },
  ],
});

const expectRejects = (raw: unknown, fragment: string) => {
  expect(() => validateLevel(raw)).toThrow(LevelValidationError);
  expect(() => validateLevel(raw)).toThrow(fragment);
};

describe('validateLevel', () => {
  it('accepts a valid level', () => {
    const level = validateLevel(base());
    expect(level.id).toBe('lvl');
    expect(level.solution.couples[0].members).toEqual(['a', 'b']);
  });

  it('rejects a schema violation', () => {
    const raw = base();
    raw.solution.couples[0].type = 'engaged';
    expectRejects(raw, 'type');
  });

  it('rejects duplicate person ids', () => {
    const raw = base();
    raw.people.push({ id: 'a', name: 'Dup' });
    expectRejects(raw, 'duplicate person id "a"');
  });

  it('rejects duplicate clue ids', () => {
    const raw = base();
    raw.clues.push({ id: 'k1', kind: 'letter', title: 'X', text: 'x' });
    expectRejects(raw, 'duplicate clue id "k1"');
  });

  it('rejects unknown couple member', () => {
    const raw = base();
    raw.solution.couples[0].members = ['a', 'zz'];
    expectRejects(raw, 'unknown person "zz"');
  });

  it('rejects a couple of a person with themselves', () => {
    const raw = base();
    raw.solution.couples[0].members = ['a', 'a'];
    expectRejects(raw, 'same person');
  });

  it('rejects two couples with the same pair', () => {
    const raw = base();
    raw.solution.couples.push({ id: 'c2', type: 'divorced', members: ['b', 'a'], children: [] });
    expectRejects(raw, 'same members');
  });

  it('rejects a child of two couples', () => {
    const raw = base();
    raw.people.push({ id: 'd', name: 'D' });
    raw.solution.couples.push({ id: 'c2', type: 'partners', members: ['a', 'd'], children: ['c'] });
    expectRejects(raw, 'child of more than one couple');
  });

  it('rejects a child of their own couple', () => {
    const raw = base();
    raw.solution.couples[0].children = ['a'];
    expectRejects(raw, 'child of a couple they belong to');
  });

  it('rejects non-empty links', () => {
    const raw = base();
    (raw.solution.links as unknown[]).push({ type: 'killed', from: 'a', to: 'b' });
    expectRejects(raw, 'links');
  });

  it('rejects tutorial targets that do not exist', () => {
    const raw = { ...base(), tutorial: [{ text: 'x', highlight: 'clue:nope', until: 'next' }] };
    expectRejects(raw, 'highlight "clue:nope"');
    const raw2 = { ...base(), tutorial: [{ text: 'x', until: 'toolSelected:hammer' }] };
    expectRejects(raw2, 'until "toolSelected:hammer"');
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/levels`
Expected: FAIL — cannot resolve `./validate`.

- [ ] **Step 4: Write schema and validation**

`src/levels/schema.ts`:
```ts
import { z } from 'zod';

const id = z.string().min(1);

const clueBase = { id, title: z.string().min(1) };

export const clueSchema = z.discriminatedUnion('kind', [
  z.object({ ...clueBase, kind: z.literal('letter'), text: z.string(), background: z.string().optional() }),
  z.object({ ...clueBase, kind: z.literal('newspaper'), text: z.string(), background: z.string().optional() }),
  z.object({ ...clueBase, kind: z.literal('photo'), src: z.string().min(1), description: z.string().optional() }),
  z.object({ ...clueBase, kind: z.literal('audio'), src: z.string().min(1), transcript: z.string(), description: z.string().optional() }),
  z.object({ ...clueBase, kind: z.literal('video'), src: z.string().min(1), transcript: z.string(), description: z.string().optional() }),
]);

export const coupleSchema = z.object({
  id,
  type: z.enum(['married', 'divorced', 'partners']),
  members: z.tuple([id, id]),
  children: z.array(id),
});

export const tutorialStepSchema = z.object({
  text: z.string().min(1),
  highlight: z.string().optional(),
  until: z.string().min(1),
});

export const levelSchema = z.object({
  id,
  title: z.string().min(1),
  people: z.array(z.object({ id, name: z.string().min(1) })).min(1),
  solution: z.object({
    couples: z.array(coupleSchema),
    links: z.array(z.never()).max(0, { message: 'links must be empty in phase 1' }),
  }),
  clues: z.array(clueSchema),
  tutorial: z.array(tutorialStepSchema).optional(),
});

export const levelIndexSchema = z.array(z.object({ id, tutorial: z.boolean() }));
```

`src/levels/validate.ts`:
```ts
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
    if (step.highlight) {
      const [kind, target] = step.highlight.split(':');
      const ok =
        step.highlight === 'check' ||
        (kind === 'clue' && clueIds.has(target)) ||
        (kind === 'tool' && tools.has(target)) ||
        (kind === 'person' && people.has(target));
      if (!ok) fail(`tutorial: unknown highlight "${step.highlight}"`);
    }
    const [event, ...args] = step.until.split(':');
    const ok =
      (event === 'next' || event === 'checked') && args.length === 0 ||
      (event === 'clueOpened' && clueIds.has(args[0])) ||
      (event === 'toolSelected' && tools.has(args[0])) ||
      (event === 'coupleCreated' && args.length === 2 && args.every((p) => people.has(p))) ||
      (event === 'childLinked' && people.has(args[0]));
    if (!ok) fail(`tutorial: unknown until "${step.until}"`);
  }

  return level;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/levels`
Expected: 11 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/levels
git commit -m "feat(levels): add level types, Zod schema and consistency validation" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Level loader and tutorial level content

**Files:**
- Create: `src/levels/loader.ts`, `public/levels/index.json`, `public/levels/tutorial/level.json`
- Test: `src/levels/loader.test.ts`

**Interfaces:**
- Consumes: `validateLevel`, `levelIndexSchema`, `LevelIndexEntry`, `Level`
- Produces:
  - `loadLevelIndex(): Promise<LevelIndexEntry[]>`
  - `loadLevel(id: string): Promise<Level>` — rejects with `LevelLoadError` whose `message` includes the level id and the cause (HTTP status, JSON parse error, or validation error)
  - `mediaUrl(levelId: string, src: string): string`

- [ ] **Step 1: Write the failing tests**

`src/levels/loader.test.ts`:
```ts
import { loadLevel, loadLevelIndex, mediaUrl, LevelLoadError } from './loader';

const okJson = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

const validLevel = {
  id: 'lvl', title: 'T',
  people: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
  solution: { couples: [{ id: 'c1', type: 'married', members: ['a', 'b'], children: [] }], links: [] },
  clues: [],
};

afterEach(() => vi.restoreAllMocks());

describe('mediaUrl', () => {
  it('prefixes relative paths with the level folder', () => {
    expect(mediaUrl('lvl', 'photo.jpg')).toBe('/levels/lvl/photo.jpg');
  });
  it('keeps http(s) URLs untouched', () => {
    expect(mediaUrl('lvl', 'https://x.test/a.png')).toBe('https://x.test/a.png');
    expect(mediaUrl('lvl', 'http://x.test/a.png')).toBe('http://x.test/a.png');
  });
});

describe('loadLevelIndex', () => {
  it('fetches and validates index.json', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => okJson([{ id: 'tutorial', tutorial: true }]));
    expect(await loadLevelIndex()).toEqual([{ id: 'tutorial', tutorial: true }]);
    expect(fetch).toHaveBeenCalledWith('/levels/index.json');
  });
});

describe('loadLevel', () => {
  it('fetches, parses and validates a level', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => okJson(validLevel));
    const level = await loadLevel('lvl');
    expect(level.title).toBe('T');
    expect(fetch).toHaveBeenCalledWith('/levels/lvl/level.json');
  });

  it('rejects with the HTTP status on 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));
    await expect(loadLevel('nope')).rejects.toThrow(LevelLoadError);
    await expect(loadLevel('nope')).rejects.toThrow('nope');
    await expect(loadLevel('nope')).rejects.toThrow('404');
  });

  it('rejects on invalid JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{not json', { status: 200 }));
    await expect(loadLevel('lvl')).rejects.toThrow(LevelLoadError);
  });

  it('rejects with the validation message on an inconsistent level', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      okJson({ ...validLevel, solution: { couples: [{ id: 'c1', type: 'married', members: ['a', 'zz'], children: [] }], links: [] } }));
    await expect(loadLevel('lvl')).rejects.toThrow('unknown person "zz"');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/levels/loader.test.ts`
Expected: FAIL — cannot resolve `./loader`.

- [ ] **Step 3: Write the loader**

`src/levels/loader.ts`:
```ts
import { levelIndexSchema } from './schema';
import type { Level, LevelIndexEntry } from './types';
import { validateLevel } from './validate';

export class LevelLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LevelLoadError';
  }
}

export function mediaUrl(levelId: string, src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  return `/levels/${levelId}/${src}`;
}

async function fetchJson(url: string, what: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new LevelLoadError(`${what}: network error (${String(error)})`);
  }
  if (!response.ok) throw new LevelLoadError(`${what}: HTTP ${response.status}`);
  try {
    return await response.json();
  } catch {
    throw new LevelLoadError(`${what}: invalid JSON`);
  }
}

export async function loadLevelIndex(): Promise<LevelIndexEntry[]> {
  const raw = await fetchJson('/levels/index.json', 'level index');
  const parsed = levelIndexSchema.safeParse(raw);
  if (!parsed.success) throw new LevelLoadError(`level index: ${parsed.error.issues[0].message}`);
  return parsed.data;
}

export async function loadLevel(id: string): Promise<Level> {
  const raw = await fetchJson(`/levels/${id}/level.json`, `level "${id}"`);
  try {
    return validateLevel(raw);
  } catch (error) {
    throw new LevelLoadError(`level "${id}": ${(error as Error).message}`);
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/levels/loader.test.ts`
Expected: 7 tests pass.

- [ ] **Step 5: Write the level index and the tutorial level**

`public/levels/index.json`:
```json
[
  { "id": "tutorial", "tutorial": true },
  { "id": "level-1", "tutorial": false }
]
```

`public/levels/tutorial/level.json`:
```json
{
  "id": "tutorial",
  "title": "The Dubois Family",
  "people": [
    { "id": "marie", "name": "Marie Dubois" },
    { "id": "paul", "name": "Paul Dubois" },
    { "id": "lea", "name": "Léa Dubois" }
  ],
  "solution": {
    "couples": [
      { "id": "c1", "type": "married", "members": ["marie", "paul"], "children": ["lea"] }
    ],
    "links": []
  },
  "clues": [
    {
      "id": "letter",
      "kind": "letter",
      "title": "Letter to Paul, 1961",
      "text": "My dear husband,\n\nTwelve years married and I still miss you every day you are away. **Léa** keeps asking when her father will be home.\n\nYours,\n*Marie*"
    },
    {
      "id": "notice",
      "kind": "newspaper",
      "title": "Birth notice, 1953",
      "text": "**Le Matin — Births.** Mr and Mrs Paul Dubois are pleased to announce the birth of their daughter, Léa, on 4 March."
    }
  ],
  "tutorial": [
    { "text": "Welcome, detective. The names on the board belong to one family. Your job: link them into a family tree using the clues on the left.", "until": "next" },
    { "text": "Start by opening the letter.", "highlight": "clue:letter", "until": "clueOpened:letter" },
    { "text": "Marie calls Paul her husband. Select the Married tool.", "highlight": "tool:married", "until": "toolSelected:married" },
    { "text": "Click Marie, then Paul. A dot appears between them: that is their couple.", "highlight": "person:marie", "until": "coupleCreated:marie:paul" },
    { "text": "The letter mentions Léa as their daughter. Select the Child tool, click the dot, then click Léa.", "highlight": "tool:child", "until": "childLinked:lea" },
    { "text": "When you think the tree is complete, press Check.", "highlight": "check", "until": "checked" }
  ]
}
```

- [ ] **Step 6: Verify the tutorial level passes validation**

Add to `src/levels/loader.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { validateLevel } from './validate';

it('ships a valid tutorial level', () => {
  const raw = JSON.parse(readFileSync('public/levels/tutorial/level.json', 'utf8'));
  expect(() => validateLevel(raw)).not.toThrow();
});
```

Run: `npx vitest run src/levels`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/levels public/levels
git commit -m "feat(levels): add loader, media URL resolution and tutorial level" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Scoring

**Files:**
- Create: `src/scoring/score.ts`
- Test: `src/scoring/score.test.ts`

**Interfaces:**
- Consumes: `Couple` from `src/levels/types`
- Produces:
  - `interface Score { correct: number; mistakes: number; missing: number; total: number; complete: boolean }`
  - `toAtoms(couples: Couple[]): Set<string>`
  - `scoreBoard(board: Couple[], solution: Couple[]): Score`

- [ ] **Step 1: Write the failing tests**

`src/scoring/score.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/scoring`
Expected: FAIL — cannot resolve `./score`.

- [ ] **Step 3: Implement**

`src/scoring/score.ts`:
```ts
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/scoring`
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/scoring
git commit -m "feat(scoring): add atom normalisation and board scoring" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Board model (pure)

**Files:**
- Create: `src/game/board.ts`
- Test: `src/game/board.test.ts`

**Interfaces:**
- Consumes: `Couple`, `CoupleType`, `Person`
- Produces:
  - `interface Position { x: number; y: number }`
  - `interface BoardState { positions: Record<string, Position>; couples: Couple[] }`
  - `PERSON_WIDTH = 160`, `PERSON_HEIGHT = 48`
  - `emptyBoard(): BoardState`
  - `initialLayout(people: Person[]): Record<string, Position>` — grid, `ceil(sqrt(n))` columns, 220px × 140px cells, 40px margin
  - `coupleId(a, b): string` — `c-${sortedA}-${sortedB}`
  - `findCouple(board, a, b): Couple | undefined`
  - `canCreateCouple(board, a, b): boolean`
  - `createCouple(board, a, b, type): BoardState` — dot placed at the midpoint between the two persons, 60px lower
  - `retypeCouple(board, coupleId, type): BoardState`
  - `removeCouple(board, coupleId): BoardState` — also removes the dot position
  - `canAddChild(board, coupleId, personId): boolean`
  - `addChild(board, coupleId, personId): BoardState`
  - `removeChild(board, coupleId, personId): BoardState`
  - `moveNode(board, nodeId, position): BoardState`
  - All functions return new objects; inputs are never mutated.

- [ ] **Step 1: Write the failing tests**

`src/game/board.test.ts`:
```ts
import {
  addChild, canAddChild, canCreateCouple, coupleId, createCouple, emptyBoard, findCouple,
  initialLayout, moveNode, removeChild, removeCouple, retypeCouple, type BoardState,
} from './board';

const people = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }, { id: 'd', name: 'D' }];
const fresh = (): BoardState => ({ positions: initialLayout(people), couples: [] });

describe('initialLayout', () => {
  it('lays people out on a grid', () => {
    const pos = initialLayout(people);
    expect(pos.a).toEqual({ x: 40, y: 40 });
    expect(pos.b).toEqual({ x: 260, y: 40 });
    expect(pos.c).toEqual({ x: 40, y: 180 });
    expect(pos.d).toEqual({ x: 260, y: 180 });
  });
});

describe('createCouple', () => {
  it('creates a couple with a deterministic id and a dot position', () => {
    const board = createCouple(fresh(), 'b', 'a', 'married');
    expect(board.couples).toEqual([{ id: 'c-a-b', type: 'married', members: ['b', 'a'], children: [] }]);
    expect(board.positions['c-a-b']).toEqual({ x: (40 + 260) / 2 + 80 - 6, y: 40 + 48 + 60 });
    expect(coupleId('b', 'a')).toBe('c-a-b');
  });

  it('does not mutate its input', () => {
    const before = fresh();
    createCouple(before, 'a', 'b', 'married');
    expect(before.couples).toEqual([]);
  });

  it('refuses self-couple and duplicate pairs', () => {
    const board = createCouple(fresh(), 'a', 'b', 'married');
    expect(canCreateCouple(board, 'a', 'a')).toBe(false);
    expect(canCreateCouple(board, 'b', 'a')).toBe(false);
    expect(canCreateCouple(board, 'a', 'c')).toBe(true);
  });

  it('allows a person in several couples (remarriage)', () => {
    let board = createCouple(fresh(), 'a', 'b', 'married');
    board = createCouple(board, 'a', 'c', 'divorced');
    expect(board.couples).toHaveLength(2);
    expect(findCouple(board, 'c', 'a')?.type).toBe('divorced');
  });
});

describe('retypeCouple', () => {
  it('changes the type and keeps the children', () => {
    let board = createCouple(fresh(), 'a', 'b', 'married');
    board = addChild(board, 'c-a-b', 'c');
    board = retypeCouple(board, 'c-a-b', 'divorced');
    expect(board.couples[0]).toMatchObject({ type: 'divorced', children: ['c'] });
  });
});

describe('removeCouple', () => {
  it('removes the couple, its children links and its dot position', () => {
    let board = createCouple(fresh(), 'a', 'b', 'married');
    board = addChild(board, 'c-a-b', 'c');
    board = removeCouple(board, 'c-a-b');
    expect(board.couples).toEqual([]);
    expect(board.positions['c-a-b']).toBeUndefined();
    expect(board.positions.a).toBeDefined();
  });
});

describe('children', () => {
  it('refuses a member as child, a double parenthood and an unknown couple', () => {
    let board = createCouple(fresh(), 'a', 'b', 'married');
    board = createCouple(board, 'c', 'd', 'partners');
    expect(canAddChild(board, 'c-a-b', 'a')).toBe(false);
    expect(canAddChild(board, 'c-a-b', 'c')).toBe(true);
    board = addChild(board, 'c-a-b', 'c');
    expect(canAddChild(board, 'c-c-d', 'c')).toBe(false); // c is a member there
    expect(canAddChild(board, 'c-a-b', 'c')).toBe(false); // already a child
    expect(canAddChild(board, 'c-a-b', 'd')).toBe(true);
    board = addChild(board, 'c-a-b', 'd');
    expect(canAddChild(board, 'c-c-d', 'd')).toBe(false);
    expect(canAddChild(board, 'c-zz', 'a')).toBe(false);
  });

  it('removeChild removes only that child', () => {
    let board = createCouple(fresh(), 'a', 'b', 'married');
    board = addChild(board, 'c-a-b', 'c');
    board = addChild(board, 'c-a-b', 'd');
    board = removeChild(board, 'c-a-b', 'c');
    expect(board.couples[0].children).toEqual(['d']);
  });
});

describe('moveNode', () => {
  it('updates one position', () => {
    const board = moveNode(fresh(), 'a', { x: 1, y: 2 });
    expect(board.positions.a).toEqual({ x: 1, y: 2 });
    expect(board.positions.b).toEqual({ x: 260, y: 40 });
  });
});

it('emptyBoard has no positions and no couples', () => {
  expect(emptyBoard()).toEqual({ positions: {}, couples: [] });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/board.test.ts`
Expected: FAIL — cannot resolve `./board`.

- [ ] **Step 3: Implement**

`src/game/board.ts`:
```ts
import type { Couple, CoupleType, Person } from '../levels/types';

export interface Position { x: number; y: number }
export interface BoardState {
  positions: Record<string, Position>;
  couples: Couple[];
}

export const PERSON_WIDTH = 160;
export const PERSON_HEIGHT = 48;
const DOT_SIZE = 12;
const CELL_W = 220;
const CELL_H = 140;
const MARGIN = 40;

export const emptyBoard = (): BoardState => ({ positions: {}, couples: [] });

export function initialLayout(people: Person[]): Record<string, Position> {
  const columns = Math.max(1, Math.ceil(Math.sqrt(people.length)));
  const positions: Record<string, Position> = {};
  people.forEach((person, i) => {
    positions[person.id] = { x: MARGIN + (i % columns) * CELL_W, y: MARGIN + Math.floor(i / columns) * CELL_H };
  });
  return positions;
}

export const coupleId = (a: string, b: string): string => `c-${[a, b].sort().join('-')}`;

export const findCouple = (board: BoardState, a: string, b: string): Couple | undefined =>
  board.couples.find((c) => c.id === coupleId(a, b));

export function canCreateCouple(board: BoardState, a: string, b: string): boolean {
  return a !== b && !findCouple(board, a, b);
}

export function createCouple(board: BoardState, a: string, b: string, type: CoupleType): BoardState {
  const id = coupleId(a, b);
  const pa = board.positions[a] ?? { x: 0, y: 0 };
  const pb = board.positions[b] ?? { x: 0, y: 0 };
  const dot: Position = {
    x: (pa.x + pb.x) / 2 + PERSON_WIDTH / 2 - DOT_SIZE / 2,
    y: Math.max(pa.y, pb.y) + PERSON_HEIGHT + 60,
  };
  return {
    positions: { ...board.positions, [id]: dot },
    couples: [...board.couples, { id, type, members: [a, b], children: [] }],
  };
}

export function retypeCouple(board: BoardState, id: string, type: CoupleType): BoardState {
  return { ...board, couples: board.couples.map((c) => (c.id === id ? { ...c, type } : c)) };
}

export function removeCouple(board: BoardState, id: string): BoardState {
  const { [id]: _removed, ...positions } = board.positions;
  return { positions, couples: board.couples.filter((c) => c.id !== id) };
}

export function canAddChild(board: BoardState, id: string, personId: string): boolean {
  const couple = board.couples.find((c) => c.id === id);
  if (!couple) return false;
  if (couple.members.includes(personId)) return false;
  return !board.couples.some((c) => c.children.includes(personId));
}

export function addChild(board: BoardState, id: string, personId: string): BoardState {
  return {
    ...board,
    couples: board.couples.map((c) => (c.id === id ? { ...c, children: [...c.children, personId] } : c)),
  };
}

export function removeChild(board: BoardState, id: string, personId: string): BoardState {
  return {
    ...board,
    couples: board.couples.map((c) =>
      c.id === id ? { ...c, children: c.children.filter((ch) => ch !== personId) } : c),
  };
}

export function moveNode(board: BoardState, nodeId: string, position: Position): BoardState {
  return { ...board, positions: { ...board.positions, [nodeId]: position } };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/game/board.test.ts`
Expected: 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/game
git commit -m "feat(game): add pure board model with couple and child rules" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Undo/redo history (pure)

**Files:**
- Create: `src/game/history.ts`
- Test: `src/game/history.test.ts`

**Interfaces:**
- Produces:
  - `interface History<T> { past: T[]; present: T; future: T[] }`
  - `createHistory<T>(present: T): History<T>`
  - `push<T>(h, next: T): History<T>` — clears future, caps past at `HISTORY_LIMIT = 100`
  - `undo<T>(h): History<T>` / `redo<T>(h): History<T>` — no-op at the ends
  - `canUndo(h): boolean` / `canRedo(h): boolean`

- [ ] **Step 1: Write the failing tests**

`src/game/history.test.ts`:
```ts
import { canRedo, canUndo, createHistory, HISTORY_LIMIT, push, redo, undo } from './history';

describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const h = createHistory(0);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });

  it('push, undo, redo', () => {
    let h = push(push(createHistory(0), 1), 2);
    expect(h.present).toBe(2);
    h = undo(h);
    expect(h.present).toBe(1);
    expect(canRedo(h)).toBe(true);
    h = undo(h);
    expect(h.present).toBe(0);
    expect(undo(h).present).toBe(0);
    h = redo(h);
    expect(h.present).toBe(1);
  });

  it('push after undo clears the future', () => {
    let h = push(push(createHistory(0), 1), 2);
    h = push(undo(h), 9);
    expect(canRedo(h)).toBe(false);
    expect(h.present).toBe(9);
    expect(undo(h).present).toBe(1);
  });

  it('caps the past', () => {
    let h = createHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 10; i += 1) h = push(h, i);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(h.past[0]).toBe(10);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/history.test.ts`
Expected: FAIL — cannot resolve `./history`.

- [ ] **Step 3: Implement**

`src/game/history.ts`:
```ts
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/game/history.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/history.ts src/game/history.test.ts
git commit -m "feat(game): add undo/redo history" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Themes

**Files:**
- Create: `src/theme/themes.ts`, `src/theme/themes.css`
- Test: `src/theme/themes.test.ts`

**Interfaces:**
- Produces:
  - `type ThemeId = 'detective-board' | 'old-archive' | 'night-office' | 'blueprint' | 'noir'`
  - `THEMES: { id: ThemeId; name: string }[]` (in spec order)
  - `DEFAULT_THEME: ThemeId = 'detective-board'`
  - `isThemeId(value: unknown): value is ThemeId`
  - `applyTheme(id: ThemeId): void` — sets `document.documentElement.dataset.theme`
  - CSS custom properties every component uses: `--bg`, `--bg-pattern`, `--surface`, `--surface-border`, `--text`, `--text-muted`, `--accent`, `--link`, `--link-child`, `--highlight`, `--panel`, `--shadow`, `--font`

- [ ] **Step 1: Write the failing tests**

`src/theme/themes.test.ts`:
```ts
import { applyTheme, DEFAULT_THEME, isThemeId, THEMES } from './themes';

describe('themes', () => {
  it('lists five themes with the default first', () => {
    expect(THEMES).toHaveLength(5);
    expect(THEMES[0].id).toBe(DEFAULT_THEME);
    expect(THEMES.map((t) => t.id)).toEqual(['detective-board', 'old-archive', 'night-office', 'blueprint', 'noir']);
  });

  it('isThemeId guards unknown values', () => {
    expect(isThemeId('noir')).toBe(true);
    expect(isThemeId('rainbow')).toBe(false);
    expect(isThemeId(42)).toBe(false);
  });

  it('applyTheme sets data-theme on <html>', () => {
    applyTheme('blueprint');
    expect(document.documentElement.dataset.theme).toBe('blueprint');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/theme`
Expected: FAIL — cannot resolve `./themes`.

- [ ] **Step 3: Implement**

`src/theme/themes.ts`:
```ts
export type ThemeId = 'detective-board' | 'old-archive' | 'night-office' | 'blueprint' | 'noir';

export const THEMES: { id: ThemeId; name: string }[] = [
  { id: 'detective-board', name: 'Detective Board' },
  { id: 'old-archive', name: 'Old Archive' },
  { id: 'night-office', name: 'Night Office' },
  { id: 'blueprint', name: 'Blueprint' },
  { id: 'noir', name: 'Noir' },
];

export const DEFAULT_THEME: ThemeId = 'detective-board';

export const isThemeId = (value: unknown): value is ThemeId =>
  typeof value === 'string' && THEMES.some((t) => t.id === value);

export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
}
```

`src/theme/themes.css`:
```css
:root, :root[data-theme='detective-board'] {
  --font: 'Georgia', 'Times New Roman', serif;
  --bg: #b8905e;
  --bg-pattern: radial-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px);
  --surface: #fdf6e3;
  --surface-border: #c9b48a;
  --text: #2b2118;
  --text-muted: #6b5a48;
  --accent: #c0392b;
  --link: #c0392b;
  --link-child: #8e2b21;
  --highlight: #f1c40f;
  --panel: #efe4c9;
  --shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}
:root[data-theme='old-archive'] {
  --font: 'Georgia', serif;
  --bg: #e8dcc0;
  --bg-pattern: none;
  --surface: #fbf5e6;
  --surface-border: #8b6b43;
  --text: #3b2a1a;
  --text-muted: #7a6650;
  --accent: #7b1e2b;
  --link: #5a3a1e;
  --link-child: #7b1e2b;
  --highlight: #d4a017;
  --panel: #f1e7cf;
  --shadow: 0 1px 3px rgba(60, 40, 20, 0.3);
}
:root[data-theme='night-office'] {
  --font: 'Helvetica Neue', Arial, sans-serif;
  --bg: #1f2733;
  --bg-pattern: none;
  --surface: #2e3948;
  --surface-border: #4a5868;
  --text: #e8edf2;
  --text-muted: #9aa8b8;
  --accent: #f0b429;
  --link: #f0b429;
  --link-child: #d79a16;
  --highlight: #f0b429;
  --panel: #27303d;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}
:root[data-theme='blueprint'] {
  --font: 'Courier New', monospace;
  --bg: #0b3d91;
  --bg-pattern: linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px);
  --surface: transparent;
  --surface-border: #ffffff;
  --text: #ffffff;
  --text-muted: #bcd3ff;
  --accent: #19d3f5;
  --link: #ffffff;
  --link-child: #19d3f5;
  --highlight: #19d3f5;
  --panel: #0a3277;
  --shadow: none;
}
:root[data-theme='noir'] {
  --font: 'Helvetica Neue', Arial, sans-serif;
  --bg: #121212;
  --bg-pattern: none;
  --surface: #f2f0ea;
  --surface-border: #f2f0ea;
  --text: #121212;
  --text-muted: #555;
  --accent: #b3001b;
  --link: #cfcfcf;
  --link-child: #b3001b;
  --highlight: #b3001b;
  --panel: #1c1c1c;
  --shadow: none;
}
:root[data-theme='night-office'], :root[data-theme='blueprint'], :root[data-theme='noir'] {
  --panel-text: #e8edf2;
}
:root, :root[data-theme='detective-board'], :root[data-theme='old-archive'] {
  --panel-text: var(--text);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/theme`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/theme
git commit -m "feat(theme): add five colour themes as CSS variables" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Save module

**Files:**
- Create: `src/save/save.ts`
- Test: `src/save/save.test.ts`

**Interfaces:**
- Consumes: `BoardState` (Task 5), `ThemeId`, `isThemeId`, `DEFAULT_THEME` (Task 7)
- Produces:
  - `SAVE_KEY = 'genealogic-save'`
  - `interface SaveData { version: 1; completed: string[]; boards: Record<string, BoardState>; hints: { showProgress: boolean; showMistakes: boolean }; theme: ThemeId }`
  - `defaultSave(): SaveData`
  - `loadSave(storage: Storage = localStorage): SaveData` — never throws; invalid JSON, wrong shape or unknown `version` → `defaultSave()`; unknown theme → `DEFAULT_THEME`
  - `writeSave(data: SaveData, storage: Storage = localStorage): void`

- [ ] **Step 1: Write the failing tests**

`src/save/save.test.ts`:
```ts
import { defaultSave, loadSave, SAVE_KEY, writeSave } from './save';

describe('save', () => {
  it('returns the default save when nothing is stored', () => {
    expect(loadSave()).toEqual(defaultSave());
    expect(defaultSave()).toEqual({
      version: 1, completed: [], boards: {}, hints: { showProgress: false, showMistakes: false }, theme: 'detective-board',
    });
  });

  it('round-trips', () => {
    const data = defaultSave();
    data.completed.push('tutorial');
    data.boards['level-1'] = { positions: { a: { x: 1, y: 2 } }, couples: [{ id: 'c-a-b', type: 'married', members: ['a', 'b'], children: [] }] };
    data.hints.showProgress = true;
    data.theme = 'noir';
    writeSave(data);
    expect(loadSave()).toEqual(data);
  });

  it('falls back to default on corrupted JSON', () => {
    localStorage.setItem(SAVE_KEY, '{oops');
    expect(loadSave()).toEqual(defaultSave());
  });

  it('falls back to default on a foreign shape', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ hello: 'world' }));
    expect(loadSave()).toEqual(defaultSave());
  });

  it('discards an unknown version', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...defaultSave(), version: 2, completed: ['x'] }));
    expect(loadSave().completed).toEqual([]);
  });

  it('falls back to the default theme when the theme is unknown', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...defaultSave(), theme: 'rainbow' }));
    expect(loadSave().theme).toBe('detective-board');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/save`
Expected: FAIL — cannot resolve `./save`.

- [ ] **Step 3: Implement**

`src/save/save.ts`:
```ts
import { z } from 'zod';
import type { BoardState } from '../game/board';
import { coupleSchema } from '../levels/schema';
import { DEFAULT_THEME, isThemeId, type ThemeId } from '../theme/themes';

export const SAVE_KEY = 'genealogic-save';

export interface SaveData {
  version: 1;
  completed: string[];
  boards: Record<string, BoardState>;
  hints: { showProgress: boolean; showMistakes: boolean };
  theme: ThemeId;
}

const boardSchema = z.object({
  positions: z.record(z.string(), z.object({ x: z.number(), y: z.number() })),
  couples: z.array(coupleSchema),
});

const saveSchema = z.object({
  version: z.literal(1),
  completed: z.array(z.string()),
  boards: z.record(z.string(), boardSchema),
  hints: z.object({ showProgress: z.boolean(), showMistakes: z.boolean() }),
  theme: z.string(),
});

export const defaultSave = (): SaveData => ({
  version: 1,
  completed: [],
  boards: {},
  hints: { showProgress: false, showMistakes: false },
  theme: DEFAULT_THEME,
});

export function loadSave(storage: Storage = localStorage): SaveData {
  let raw: unknown;
  try {
    const text = storage.getItem(SAVE_KEY);
    if (!text) return defaultSave();
    raw = JSON.parse(text);
  } catch {
    return defaultSave();
  }
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) return defaultSave();
  const { theme, ...rest } = parsed.data;
  return { ...rest, theme: isThemeId(theme) ? theme : DEFAULT_THEME } as SaveData;
}

export function writeSave(data: SaveData, storage: Storage = localStorage): void {
  storage.setItem(SAVE_KEY, JSON.stringify(data));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/save`
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/save
git commit -m "feat(save): add versioned localStorage save with safe fallbacks" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Tutorial engine (pure)

**Files:**
- Create: `src/tutorial/engine.ts`
- Test: `src/tutorial/engine.test.ts`

**Interfaces:**
- Consumes: `TutorialStep`
- Produces:
  - `normalizeEvent(event: string): string` — for `coupleCreated:a:b` sorts the two ids; other events unchanged
  - `advance(steps: TutorialStep[], index: number, event: string): number` — returns `index + 1` when `normalizeEvent(steps[index].until) === normalizeEvent(event)`, else `index`; an index `>= steps.length` means finished and is returned unchanged
  - `isFinished(steps: TutorialStep[] | undefined, index: number): boolean`

- [ ] **Step 1: Write the failing tests**

`src/tutorial/engine.test.ts`:
```ts
import { advance, isFinished, normalizeEvent } from './engine';

const steps = [
  { text: 'a', until: 'next' },
  { text: 'b', until: 'coupleCreated:paul:marie' },
  { text: 'c', until: 'checked' },
];

describe('tutorial engine', () => {
  it('normalizes coupleCreated member order', () => {
    expect(normalizeEvent('coupleCreated:paul:marie')).toBe('coupleCreated:marie:paul');
    expect(normalizeEvent('childLinked:lea')).toBe('childLinked:lea');
  });

  it('advances only on the matching event', () => {
    expect(advance(steps, 0, 'checked')).toBe(0);
    expect(advance(steps, 0, 'next')).toBe(1);
    expect(advance(steps, 1, 'coupleCreated:marie:paul')).toBe(2);
    expect(advance(steps, 2, 'checked')).toBe(3);
  });

  it('stays finished', () => {
    expect(advance(steps, 3, 'next')).toBe(3);
    expect(isFinished(steps, 3)).toBe(true);
    expect(isFinished(steps, 2)).toBe(false);
    expect(isFinished(undefined, 0)).toBe(true);
    expect(isFinished([], 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/tutorial`
Expected: FAIL — cannot resolve `./engine`.

- [ ] **Step 3: Implement**

`src/tutorial/engine.ts`:
```ts
import type { TutorialStep } from '../levels/types';

export function normalizeEvent(event: string): string {
  const [name, ...args] = event.split(':');
  if (name === 'coupleCreated' && args.length === 2) return `${name}:${[...args].sort().join(':')}`;
  return event;
}

export const isFinished = (steps: TutorialStep[] | undefined, index: number): boolean =>
  !steps || index >= steps.length;

export function advance(steps: TutorialStep[], index: number, event: string): number {
  if (isFinished(steps, index)) return index;
  return normalizeEvent(steps[index].until) === normalizeEvent(event) ? index + 1 : index;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/tutorial`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/tutorial
git commit -m "feat(tutorial): add step engine" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Game store (Zustand)

**Files:**
- Create: `src/game/store.ts`
- Test: `src/game/store.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 5, 6, 7, 8, 9 and `scoreBoard` (Task 4)
- Produces `useGameStore` (Zustand hook, also usable as `useGameStore.getState()`), with:

```ts
export type Tool = (typeof TOOL_IDS)[number]; // 'select' | 'married' | 'divorced' | 'partners' | 'child' | 'erase'
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
}
export interface GameActions {
  openLevel(level: Level): void;
  leaveLevel(): void;
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
  openClue(id: string): void;
  closeClue(): void;
  setHint(key: 'showProgress' | 'showMistakes', value: boolean): void;
  setTheme(theme: ThemeId): void;
}
export const initialGameState: GameState; // built from loadSave() at module load
export const selectBoard = (s: GameState) => s.history.present;
export const selectScore = (s: GameState): Score | null; // scoreBoard(board.couples, level.solution.couples) or null without a level
export const selectCurrentTutorialStep = (s: GameState): TutorialStep | null;
```

Behaviour rules (all verified by tests below):
- `openLevel`: loads `boards[level.id]` from the save, drops couples whose members/children are not in the level and positions whose id is neither a person nor a surviving couple, fills missing person positions from `initialLayout`, resets history, tool `select`, pending null, clue closed, tutorialStep 0, victory false, lastCheck none, screen `game`.
- `leaveLevel`: screen `menu`, level null, history reset to empty board.
- Board mutations go through `commit(nextBoard)`: push to history, set `lastCheck: 'none'`, persist `boards[level.id]`. A mutation that produces an identical board (e.g. retype to the same type) does not push.
- `clickPerson` per tool: `select`/`erase` → nothing. Couple tools → first click sets pending person; second click on the same person clears pending; second click on another person creates the couple if `canCreateCouple` (then pending null, emit `coupleCreated:a:b`), otherwise nothing changes. `child` → if pending couple and `canAddChild`, add child, emit `childLinked:id`, keep pending; otherwise nothing.
- `clickCouple`: couple tools → `retypeCouple` to the tool's type, pending null. `child` → pending couple. `erase` → `removeCouple`, pending null. `select` → nothing.
- `clickChildEdge`: `erase` → `removeChild`; other tools → nothing.
- `clickBackground` and `cancelPending` → pending null.
- `selectTool` → sets tool, pending null, emit `toolSelected:<tool>`.
- `moveNode` → `commit(moveNode(...))`.
- `undo`/`redo` → history ops, pending null, persist.
- `resetBoard` → history reset to `{ positions: initialLayout(people), couples: [] }`, persist.
- `check` → emit `checked`; if score complete: `victory: true`, add level id to `completed` (no duplicates), persist; else `lastCheck: 'incomplete'`.
- `openClue(id)` → `openClueId`, emit `clueOpened:<id>`. `closeClue` → null.
- `setHint`, `setTheme` → update and persist; `setTheme` also calls `applyTheme`.
- `emit(event)` is internal: `tutorialStep = advance(level.tutorial ?? [], tutorialStep, event)`.
- `persist()` writes `{ version: 1, completed, boards: { ...savedBoards, [level.id]: board }, hints, theme }`; the saved boards of other levels are preserved (read them from `loadSave()` at persist time).

- [ ] **Step 1: Write the failing tests**

`src/game/store.test.ts`:
```ts
import type { Level } from '../levels/types';
import { loadSave, writeSave, defaultSave } from '../save/save';
import { initialGameState, selectBoard, selectScore, useGameStore } from './store';

const level: Level = {
  id: 'lvl', title: 'T',
  people: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }],
  solution: { couples: [{ id: 'c1', type: 'married', members: ['a', 'b'], children: ['c'] }], links: [] },
  clues: [{ id: 'k1', kind: 'letter', title: 'L', text: 't' }],
  tutorial: [
    { text: '1', until: 'toolSelected:married' },
    { text: '2', until: 'coupleCreated:b:a' },
    { text: '3', until: 'childLinked:c' },
    { text: '4', until: 'checked' },
  ],
};

const s = () => useGameStore.getState();
const board = () => selectBoard(s());

beforeEach(() => {
  useGameStore.setState({ ...initialGameState });
  s().openLevel(level);
});

const buildFamily = () => {
  s().selectTool('married');
  s().clickPerson('a');
  s().clickPerson('b');
  s().selectTool('child');
  s().clickCouple('c-a-b');
  s().clickPerson('c');
};

describe('openLevel', () => {
  it('lays out people and starts clean', () => {
    expect(s().screen).toBe('game');
    expect(board().positions.a).toEqual({ x: 40, y: 40 });
    expect(board().couples).toEqual([]);
    expect(s().tool).toBe('select');
  });

  it('restores a saved board and sanitises stale references', () => {
    const save = defaultSave();
    save.boards.lvl = {
      positions: { a: { x: 5, y: 5 }, ghost: { x: 1, y: 1 }, 'c-a-b': { x: 9, y: 9 }, 'c-a-zz': { x: 2, y: 2 } },
      couples: [
        { id: 'c-a-b', type: 'divorced', members: ['a', 'b'], children: ['c'] },
        { id: 'c-a-zz', type: 'married', members: ['a', 'zz'], children: [] },
        { id: 'c-b-c', type: 'partners', members: ['b', 'c'], children: ['ghost'] },
      ],
    };
    writeSave(save);
    s().openLevel(level);
    expect(board().couples.map((c) => c.id)).toEqual(['c-a-b']);
    expect(board().positions).toEqual({ a: { x: 5, y: 5 }, b: { x: 260, y: 40 }, c: { x: 40, y: 180 }, 'c-a-b': { x: 9, y: 9 } });
  });
});

describe('couple tools', () => {
  it('creates a couple on the second click and clears pending', () => {
    s().selectTool('married');
    s().clickPerson('a');
    expect(s().pending).toEqual({ kind: 'person', id: 'a' });
    s().clickPerson('b');
    expect(board().couples[0]).toMatchObject({ id: 'c-a-b', type: 'married' });
    expect(s().pending).toBeNull();
  });

  it('clicking the pending person again cancels; Escape cancels', () => {
    s().selectTool('partners');
    s().clickPerson('a');
    s().clickPerson('a');
    expect(s().pending).toBeNull();
    s().clickPerson('a');
    s().cancelPending();
    expect(s().pending).toBeNull();
  });

  it('an invalid second click changes nothing and keeps pending', () => {
    buildFamily();
    s().selectTool('divorced');
    s().clickPerson('a');
    s().clickPerson('b'); // pair already exists
    expect(board().couples).toHaveLength(1);
    expect(s().pending).toEqual({ kind: 'person', id: 'a' });
  });

  it('clicking a dot with a couple tool retypes it and keeps children', () => {
    buildFamily();
    s().selectTool('divorced');
    s().clickCouple('c-a-b');
    expect(board().couples[0]).toMatchObject({ type: 'divorced', children: ['c'] });
  });

  it('retyping to the same type does not push history', () => {
    buildFamily();
    const past = s().history.past.length;
    s().selectTool('married');
    s().clickCouple('c-a-b');
    expect(s().history.past.length).toBe(past);
  });

  it('select and erase tools ignore person clicks', () => {
    s().selectTool('select');
    s().clickPerson('a');
    s().selectTool('erase');
    s().clickPerson('a');
    expect(s().pending).toBeNull();
  });
});

describe('child tool', () => {
  it('links children while the dot stays pending', () => {
    buildFamily();
    expect(board().couples[0].children).toEqual(['c']);
    expect(s().pending).toEqual({ kind: 'couple', id: 'c-a-b' });
    s().clickPerson('c'); // already a child: nothing
    expect(board().couples[0].children).toEqual(['c']);
    s().clickBackground();
    expect(s().pending).toBeNull();
  });
});

describe('erase tool', () => {
  it('removes a child edge and a couple', () => {
    buildFamily();
    s().selectTool('erase');
    s().clickChildEdge('c-a-b', 'c');
    expect(board().couples[0].children).toEqual([]);
    s().clickCouple('c-a-b');
    expect(board().couples).toEqual([]);
  });

  it('other tools ignore child edge clicks', () => {
    buildFamily();
    s().selectTool('select');
    s().clickChildEdge('c-a-b', 'c');
    expect(board().couples[0].children).toEqual(['c']);
  });
});

describe('history', () => {
  it('undo and redo walk the board states', () => {
    buildFamily();
    s().undo();
    expect(board().couples[0].children).toEqual([]);
    s().undo();
    expect(board().couples).toEqual([]);
    s().redo();
    expect(board().couples).toHaveLength(1);
  });

  it('moveNode is undoable', () => {
    s().moveNode('a', { x: 1, y: 1 });
    expect(board().positions.a).toEqual({ x: 1, y: 1 });
    s().undo();
    expect(board().positions.a).toEqual({ x: 40, y: 40 });
  });

  it('resetBoard clears the board and the history', () => {
    buildFamily();
    s().resetBoard();
    expect(board().couples).toEqual([]);
    expect(s().history.past).toEqual([]);
    expect(board().positions.a).toEqual({ x: 40, y: 40 });
  });
});

describe('check and scoring', () => {
  it('scores live', () => {
    expect(selectScore(s())).toEqual({ correct: 0, mistakes: 0, missing: 2, total: 2, complete: false });
    buildFamily();
    expect(selectScore(s())?.complete).toBe(true);
  });

  it('incomplete check sets lastCheck, next board change clears it', () => {
    s().check();
    expect(s().victory).toBe(false);
    expect(s().lastCheck).toBe('incomplete');
    s().moveNode('a', { x: 2, y: 2 });
    expect(s().lastCheck).toBe('none');
  });

  it('complete check sets victory and persists completion', () => {
    buildFamily();
    s().check();
    s().check();
    expect(s().victory).toBe(true);
    expect(s().completed).toEqual(['lvl']);
    expect(loadSave().completed).toEqual(['lvl']);
  });
});

describe('persistence', () => {
  it('saves the board on every change and keeps other levels', () => {
    const save = defaultSave();
    save.boards.other = { positions: {}, couples: [] };
    writeSave(save);
    s().openLevel(level);
    s().selectTool('married');
    s().clickPerson('a');
    s().clickPerson('b');
    const stored = loadSave();
    expect(stored.boards.lvl.couples).toHaveLength(1);
    expect(stored.boards.other).toBeDefined();
  });

  it('hints and theme persist and theme applies', () => {
    s().setHint('showProgress', true);
    s().setTheme('noir');
    expect(loadSave().hints.showProgress).toBe(true);
    expect(loadSave().theme).toBe('noir');
    expect(document.documentElement.dataset.theme).toBe('noir');
  });
});

describe('tutorial and clues', () => {
  it('advances steps on the matching events only', () => {
    expect(s().tutorialStep).toBe(0);
    s().selectTool('child');
    expect(s().tutorialStep).toBe(0);
    s().selectTool('married');
    expect(s().tutorialStep).toBe(1);
    s().clickPerson('a');
    s().clickPerson('b');
    expect(s().tutorialStep).toBe(2);
    s().selectTool('child');
    s().clickCouple('c-a-b');
    s().clickPerson('c');
    expect(s().tutorialStep).toBe(3);
    s().check();
    expect(s().tutorialStep).toBe(4);
  });

  it('openClue tracks the open clue and emits', () => {
    const withClueStep: Level = { ...level, tutorial: [{ text: 'x', until: 'clueOpened:k1' }] };
    s().openLevel(withClueStep);
    s().openClue('k1');
    expect(s().openClueId).toBe('k1');
    expect(s().tutorialStep).toBe(1);
    s().closeClue();
    expect(s().openClueId).toBeNull();
  });

  it('leaveLevel returns to the menu', () => {
    s().leaveLevel();
    expect(s().screen).toBe('menu');
    expect(s().level).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/store.test.ts`
Expected: FAIL — cannot resolve `./store`.

- [ ] **Step 3: Implement**

`src/game/store.ts`:
```ts
import { create } from 'zustand';
import type { CoupleType, Level, TutorialStep } from '../levels/types';
import { TOOL_IDS } from '../levels/validate';
import { loadSave, writeSave } from '../save/save';
import { scoreBoard, type Score } from '../scoring/score';
import { applyTheme, type ThemeId } from '../theme/themes';
import { advance } from '../tutorial/engine';
import {
  addChild, canAddChild, canCreateCouple, createCouple, emptyBoard, initialLayout,
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
}

export interface GameActions {
  openLevel(level: Level): void;
  leaveLevel(): void;
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
    const current = loadSave();
    const boards = s.level ? { ...current.boards, [s.level.id]: s.history.present } : current.boards;
    writeSave({ version: 1, completed: s.completed, boards, hints: s.hints, theme: s.theme });
  };

  const emit = (event: string) => {
    const s = get();
    if (!s.level?.tutorial) return;
    set({ tutorialStep: advance(s.level.tutorial, s.tutorialStep, event) });
  };

  const commit = (next: BoardState) => {
    const s = get();
    if (next === s.history.present) return;
    set({ history: push(s.history, next), lastCheck: 'none' });
    persist();
  };

  return {
    ...initialGameState,

    openLevel(level) {
      const board = sanitiseBoard(level, loadSave().boards[level.id]);
      set({
        screen: 'game', level, history: createHistory(board), tool: 'select', pending: null,
        openClueId: null, tutorialStep: 0, victory: false, lastCheck: 'none',
      });
    },

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
        if (!canCreateCouple(board, s.pending.id, id)) return;
        const a = s.pending.id;
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
        set({ pending: { kind: 'couple', id } });
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
      set({ history: undoHistory(s.history), pending: null, lastCheck: 'none' });
      persist();
    },

    redo() {
      const s = get();
      if (!canRedo(s.history)) return;
      set({ history: redoHistory(s.history), pending: null, lastCheck: 'none' });
      persist();
    },

    resetBoard() {
      const s = get();
      if (!s.level) return;
      set({ history: createHistory({ positions: initialLayout(s.level.people), couples: [] }), pending: null, lastCheck: 'none' });
      persist();
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/game/store.test.ts`
Expected: all 22 tests pass. If "retyping to the same type does not push history" fails, make sure `clickCouple` compares `couple.type !== s.tool` before committing (the `next === present` guard in `commit` does not catch it because `retypeCouple` always returns a new object).

- [ ] **Step 5: Run the full suite and commit**

Run: `npx vitest run`
Expected: all green.

```bash
git add src/game/store.ts src/game/store.test.ts
git commit -m "feat(game): add Zustand store wiring board, history, save, scoring and tutorial" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Board UI (React Flow nodes, edges, toolbar, shortcuts)

**Files:**
- Create: `src/board/flow.ts`, `src/board/PersonNode.tsx`, `src/board/CoupleNode.tsx`, `src/board/Toolbar.tsx`, `src/board/Board.tsx`, `src/board/board.css`
- Test: `src/board/flow.test.ts`, `src/board/Board.test.tsx`

**Interfaces:**
- Consumes: `useGameStore`, `selectBoard`, `Tool`, `Pending` (Task 10); `PERSON_WIDTH/HEIGHT` (Task 5); `TOOL_IDS`
- Produces:
  - `toFlowNodes(level: Level, board: BoardState, pending: Pending): Node[]` — person nodes `{ id, type: 'person', position, data: { name, selected } }`, couple nodes `{ id, type: 'couple', position, data: { coupleType, selected } }`
  - `toFlowEdges(board: BoardState): Edge[]` — couple edges `{ id: 'couple:<cid>:<member>', source: member, sourceHandle: 'couple', target: cid, targetHandle: 'in', type: 'straight', className: 'edge-couple' }`, child edges `{ id: 'child:<cid>:<child>', source: cid, sourceHandle: 'out', target: child, targetHandle: 'in', type: 'smoothstep', className: 'edge-child', markerEnd: { type: MarkerType.ArrowClosed }, data: { coupleId, childId } }`
  - `<Toolbar />` — buttons with `data-tutorial="tool:<id>"`, `aria-pressed`, titles including shortcut; plus Undo/Redo buttons
  - `<Board />` — full board with `ReactFlowProvider`, keyboard shortcuts (`v m d p c e`, `Escape`, `⌘/Ctrl+Z`, `⌘/Ctrl+Shift+Z`), `Background`, `Controls`
  - PersonNode root carries `data-tutorial="person:<id>"`

- [ ] **Step 1: Write the failing flow tests**

`src/board/flow.test.ts`:
```ts
import { MarkerType } from '@xyflow/react';
import { addChild, createCouple, initialLayout } from '../game/board';
import type { Level } from '../levels/types';
import { toFlowEdges, toFlowNodes } from './flow';

const level: Level = {
  id: 'l', title: 't',
  people: [{ id: 'a', name: 'Ann' }, { id: 'b', name: 'Bob' }, { id: 'c', name: 'Cy' }],
  solution: { couples: [], links: [] }, clues: [],
};
let board = createCouple({ positions: initialLayout(level.people), couples: [] }, 'a', 'b', 'married');
board = addChild(board, 'c-a-b', 'c');

describe('toFlowNodes', () => {
  it('maps people and couples with selection flags', () => {
    const nodes = toFlowNodes(level, board, { kind: 'couple', id: 'c-a-b' });
    expect(nodes.map((n) => n.id)).toEqual(['a', 'b', 'c', 'c-a-b']);
    expect(nodes[0]).toMatchObject({ type: 'person', position: { x: 40, y: 40 }, data: { name: 'Ann', selected: false } });
    expect(nodes[3]).toMatchObject({ type: 'couple', data: { coupleType: 'married', selected: true } });
  });
});

describe('toFlowEdges', () => {
  it('maps two couple edges and one child edge', () => {
    const edges = toFlowEdges(board);
    expect(edges.map((e) => e.id)).toEqual(['couple:c-a-b:a', 'couple:c-a-b:b', 'child:c-a-b:c']);
    expect(edges[0]).toMatchObject({ source: 'a', sourceHandle: 'couple', target: 'c-a-b', targetHandle: 'in', type: 'straight' });
    expect(edges[2]).toMatchObject({
      source: 'c-a-b', sourceHandle: 'out', target: 'c', targetHandle: 'in', type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed }, data: { coupleId: 'c-a-b', childId: 'c' },
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/board/flow.test.ts`
Expected: FAIL — cannot resolve `./flow`.

- [ ] **Step 3: Implement flow.ts**

`src/board/flow.ts`:
```ts
import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { BoardState } from '../game/board';
import type { Pending } from '../game/store';
import type { CoupleType, Level } from '../levels/types';

export type PersonNodeType = Node<{ name: string; selected: boolean }, 'person'>;
export type CoupleNodeType = Node<{ coupleType: CoupleType; selected: boolean }, 'couple'>;
export type ChildEdgeData = { coupleId: string; childId: string };

export function toFlowNodes(level: Level, board: BoardState, pending: Pending): Node[] {
  const people: PersonNodeType[] = level.people.map((p) => ({
    id: p.id,
    type: 'person',
    position: board.positions[p.id] ?? { x: 0, y: 0 },
    data: { name: p.name, selected: pending?.kind === 'person' && pending.id === p.id },
  }));
  const couples: CoupleNodeType[] = board.couples.map((c) => ({
    id: c.id,
    type: 'couple',
    position: board.positions[c.id] ?? { x: 0, y: 0 },
    data: { coupleType: c.type, selected: pending?.kind === 'couple' && pending.id === c.id },
  }));
  return [...people, ...couples];
}

export function toFlowEdges(board: BoardState): Edge[] {
  const edges: Edge[] = [];
  for (const c of board.couples) {
    for (const member of c.members) {
      edges.push({
        id: `couple:${c.id}:${member}`, source: member, sourceHandle: 'couple', target: c.id, targetHandle: 'in',
        type: 'straight', className: 'edge-couple',
      });
    }
    for (const child of c.children) {
      edges.push({
        id: `child:${c.id}:${child}`, source: c.id, sourceHandle: 'out', target: child, targetHandle: 'in',
        type: 'smoothstep', className: 'edge-child', markerEnd: { type: MarkerType.ArrowClosed },
        data: { coupleId: c.id, childId: child } satisfies ChildEdgeData,
      });
    }
  }
  return edges;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/board/flow.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Write the failing Board component test**

`src/board/Board.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialGameState, selectBoard, useGameStore } from '../game/store';
import type { Level } from '../levels/types';
import { Board } from './Board';

const level: Level = {
  id: 'l', title: 't',
  people: [{ id: 'a', name: 'Ann' }, { id: 'b', name: 'Bob' }, { id: 'c', name: 'Cy' }],
  solution: { couples: [], links: [] }, clues: [],
};

beforeEach(() => {
  useGameStore.setState({ ...initialGameState });
  useGameStore.getState().openLevel(level);
});

describe('Board', () => {
  it('renders every person and the toolbar', () => {
    render(<Board />);
    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.getByText('Cy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Married/ })).toHaveAttribute('data-tutorial', 'tool:married');
  });

  it('builds a couple and a child through toolbar + clicks', async () => {
    const user = userEvent.setup();
    render(<Board />);
    await user.click(screen.getByRole('button', { name: /Married/ }));
    expect(screen.getByRole('button', { name: /Married/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByText('Ann'));
    await user.click(screen.getByText('Bob'));
    expect(selectBoard(useGameStore.getState()).couples).toHaveLength(1);
    expect(await screen.findByTestId('couple-c-a-b')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Child/ }));
    await user.click(screen.getByTestId('couple-c-a-b'));
    await user.click(screen.getByText('Cy'));
    expect(selectBoard(useGameStore.getState()).couples[0].children).toEqual(['c']);
  });

  it('keyboard shortcuts select tools, cancel and undo/redo', async () => {
    const user = userEvent.setup();
    render(<Board />);
    fireEvent.keyDown(window, { key: 'm' });
    expect(useGameStore.getState().tool).toBe('married');
    await user.click(screen.getByText('Ann'));
    expect(useGameStore.getState().pending).toEqual({ kind: 'person', id: 'a' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useGameStore.getState().pending).toBeNull();
    await user.click(screen.getByText('Ann'));
    await user.click(screen.getByText('Bob'));
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(selectBoard(useGameStore.getState()).couples).toHaveLength(0);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(selectBoard(useGameStore.getState()).couples).toHaveLength(1);
  });

  it('ignores shortcuts typed into inputs', () => {
    render(<><input aria-label="field" /><Board /></>);
    fireEvent.keyDown(screen.getByLabelText('field'), { key: 'm' });
    expect(useGameStore.getState().tool).toBe('select');
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `npx vitest run src/board/Board.test.tsx`
Expected: FAIL — cannot resolve `./Board`.

- [ ] **Step 7: Implement nodes, toolbar and board**

`src/board/PersonNode.tsx`:
```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { PERSON_HEIGHT, PERSON_WIDTH } from '../game/board';
import type { PersonNodeType } from './flow';

export function PersonNode({ id, data }: NodeProps<PersonNodeType>) {
  return (
    <div
      className={`person-node${data.selected ? ' is-selected' : ''}`}
      style={{ width: PERSON_WIDTH, height: PERSON_HEIGHT }}
      data-tutorial={`person:${id}`}
    >
      <Handle type="target" position={Position.Top} id="in" className="hidden-handle" />
      <span className="person-name">{data.name}</span>
      <Handle type="source" position={Position.Bottom} id="couple" className="hidden-handle" />
    </div>
  );
}
```

`src/board/CoupleNode.tsx`:
```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CoupleNodeType } from './flow';

const LABELS = { married: 'Married', divorced: 'Divorced', partners: 'Partners' } as const;

export function CoupleNode({ id, data }: NodeProps<CoupleNodeType>) {
  return (
    <div className={`couple-node couple-${data.coupleType}${data.selected ? ' is-selected' : ''}`} data-testid={`couple-${id}`}>
      <Handle type="target" position={Position.Top} id="in" className="hidden-handle" />
      <span className="couple-dot" />
      <span className="couple-label">{LABELS[data.coupleType]}</span>
      <Handle type="source" position={Position.Bottom} id="out" className="hidden-handle" />
    </div>
  );
}
```

`src/board/Toolbar.tsx`:
```tsx
import { useGameStore, type Tool } from '../game/store';
import { canRedo, canUndo } from '../game/history';

export const TOOL_BUTTONS: { id: Tool; label: string; key: string; icon: string }[] = [
  { id: 'select', label: 'Select', key: 'V', icon: '↖' },
  { id: 'married', label: 'Married', key: 'M', icon: '⚭' },
  { id: 'divorced', label: 'Divorced', key: 'D', icon: '⚮' },
  { id: 'partners', label: 'Partners', key: 'P', icon: '♥' },
  { id: 'child', label: 'Child', key: 'C', icon: '↓' },
  { id: 'erase', label: 'Erase', key: 'E', icon: '✕' },
];

export function Toolbar() {
  const tool = useGameStore((s) => s.tool);
  const history = useGameStore((s) => s.history);
  const { selectTool, undo, redo } = useGameStore.getState();
  return (
    <div className="toolbar" role="toolbar" aria-label="Tools">
      {TOOL_BUTTONS.map((b) => (
        <button
          key={b.id}
          type="button"
          className="tool-button"
          aria-pressed={tool === b.id}
          title={`${b.label} (${b.key})`}
          data-tutorial={`tool:${b.id}`}
          onClick={() => selectTool(b.id)}
        >
          <span aria-hidden="true">{b.icon}</span> {b.label}
        </button>
      ))}
      <span className="toolbar-separator" />
      <button type="button" className="tool-button" title="Undo (⌘/Ctrl+Z)" disabled={!canUndo(history)} onClick={undo}>↶ Undo</button>
      <button type="button" className="tool-button" title="Redo (⌘/Ctrl+Shift+Z)" disabled={!canRedo(history)} onClick={redo}>↷ Redo</button>
    </div>
  );
}
```

`src/board/Board.tsx`:
```tsx
import {
  Background, Controls, ReactFlow, ReactFlowProvider, applyNodeChanges,
  type Edge, type Node, type NodeChange, type NodeMouseHandler, type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { selectBoard, useGameStore, type Tool } from '../game/store';
import { CoupleNode } from './CoupleNode';
import { PersonNode } from './PersonNode';
import { Toolbar } from './Toolbar';
import { toFlowEdges, toFlowNodes, type ChildEdgeData } from './flow';
import './board.css';

const nodeTypes = { person: PersonNode, couple: CoupleNode };
const SHORTCUTS: Record<string, Tool> = { v: 'select', m: 'married', d: 'divorced', p: 'partners', c: 'child', e: 'erase' };

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const { selectTool, cancelPending, undo, redo } = useGameStore.getState();
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape') { cancelPending(); return; }
      const tool = SHORTCUTS[key];
      if (tool) selectTool(tool);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

function BoardCanvas() {
  const level = useGameStore((s) => s.level);
  const board = useGameStore(selectBoard);
  const pending = useGameStore((s) => s.pending);
  const tool = useGameStore((s) => s.tool);
  const { clickPerson, clickCouple, clickChildEdge, clickBackground, moveNode } = useGameStore.getState();

  const [nodes, setNodes] = useState<Node[]>([]);
  useEffect(() => {
    if (level) setNodes(toFlowNodes(level, board, pending));
  }, [level, board, pending]);
  const edges = useMemo<Edge[]>(() => toFlowEdges(board), [board]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    if (node.type === 'person') clickPerson(node.id);
    else clickCouple(node.id);
  }, [clickPerson, clickCouple]);

  const onEdgeClick: EdgeMouseHandler = useCallback((_, edge) => {
    const data = edge.data as ChildEdgeData | undefined;
    if (data) clickChildEdge(data.coupleId, data.childId);
  }, [clickChildEdge]);

  if (!level) return null;
  return (
    <div className={`board tool-${tool}`}>
      <Toolbar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={clickBackground}
        onNodeDragStop={(_, node) => moveNode(node.id, node.position)}
        nodesDraggable={tool === 'select'}
        nodesConnectable={false}
        elementsSelectable={false}
        edgesFocusable={false}
        deleteKeyCode={null}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export function Board() {
  useShortcuts();
  return (
    <ReactFlowProvider>
      <BoardCanvas />
    </ReactFlowProvider>
  );
}
```

`src/board/board.css`:
```css
.board { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; background: var(--bg); background-image: var(--bg-pattern); background-size: 24px 24px; }
.board .react-flow { flex: 1; }
.toolbar { display: flex; gap: 6px; padding: 8px; background: var(--panel); color: var(--panel-text); border-bottom: 1px solid var(--surface-border); z-index: 5; flex-wrap: wrap; }
.toolbar-separator { width: 1px; background: var(--surface-border); margin: 0 6px; }
.tool-button { font: inherit; font-family: var(--font); background: var(--surface); color: var(--text); border: 1px solid var(--surface-border); border-radius: 4px; padding: 4px 10px; cursor: pointer; }
.tool-button[aria-pressed='true'] { outline: 2px solid var(--accent); outline-offset: -2px; }
.tool-button:disabled { opacity: 0.4; cursor: default; }
.person-node { display: flex; align-items: center; justify-content: center; background: var(--surface); color: var(--text); border: 2px solid var(--surface-border); border-radius: 4px; box-shadow: var(--shadow); font-family: var(--font); font-size: 15px; cursor: pointer; }
.board:not(.tool-select) .person-node { cursor: crosshair; }
.person-node.is-selected, .couple-node.is-selected .couple-dot { outline: 3px solid var(--highlight); outline-offset: 2px; }
.couple-node { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
.couple-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--link); border: 2px solid var(--surface-border); }
.couple-label { font-family: var(--font); font-size: 11px; color: var(--surface); background: var(--text); padding: 1px 5px; border-radius: 3px; margin-top: 2px; white-space: nowrap; }
.hidden-handle { opacity: 0; width: 1px; height: 1px; min-width: 0; min-height: 0; border: 0; pointer-events: none; }
.react-flow__edge.edge-couple .react-flow__edge-path { stroke: var(--link); stroke-width: 2.5; }
.react-flow__edge.edge-child .react-flow__edge-path { stroke: var(--link-child); stroke-width: 2; }
.react-flow__edge.edge-child .react-flow__edge-interaction { cursor: pointer; }
.board.tool-erase .react-flow__edge.edge-child:hover .react-flow__edge-path { stroke-dasharray: 4; }
```

- [ ] **Step 8: Run to verify pass**

Run: `npx vitest run src/board`
Expected: 6 tests pass. If `findByTestId('couple-c-a-b')` times out, verify the `useEffect` that rebuilds `nodes` depends on `board` (a new object after every commit).

- [ ] **Step 9: Commit**

```bash
git add src/board
git commit -m "feat(board): add React Flow board with toolbar, nodes, edges and shortcuts" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Clue panel

**Files:**
- Create: `src/clues/MiniMarkdown.tsx`, `src/clues/ClueList.tsx`, `src/clues/ClueDetail.tsx`, `src/clues/CluePanel.tsx`, `src/clues/clues.css`
- Test: `src/clues/MiniMarkdown.test.tsx`, `src/clues/CluePanel.test.tsx`

**Interfaces:**
- Consumes: `useGameStore` (`level`, `openClueId`, `openClue`, `closeClue`), `mediaUrl` (Task 3), `Clue`
- Produces:
  - `<MiniMarkdown text={string} />` — paragraphs split on blank lines, `\n` → `<br/>`, `**bold**` → `<strong>`, `*italic*` → `<em>`
  - `<CluePanel />` — list view with `data-tutorial="clue:<id>"` buttons; detail view with "Back" button
  - `CLUE_ICONS: Record<ClueKind, string>`

- [ ] **Step 1: Write the failing MiniMarkdown tests**

`src/clues/MiniMarkdown.test.tsx`:
```tsx
import { render } from '@testing-library/react';
import { MiniMarkdown } from './MiniMarkdown';

describe('MiniMarkdown', () => {
  it('renders paragraphs, line breaks, bold and italic', () => {
    const { container } = render(<MiniMarkdown text={'Dear **Paul**,\nI *miss* you.\n\nYours'} />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].querySelector('strong')?.textContent).toBe('Paul');
    expect(paragraphs[0].querySelector('em')?.textContent).toBe('miss');
    expect(paragraphs[0].querySelectorAll('br')).toHaveLength(1);
    expect(paragraphs[1].textContent).toBe('Yours');
  });

  it('leaves unmatched asterisks as text', () => {
    const { container } = render(<MiniMarkdown text={'5 * 3'} />);
    expect(container.textContent).toBe('5 * 3');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/clues/MiniMarkdown.test.tsx`
Expected: FAIL — cannot resolve `./MiniMarkdown`.

- [ ] **Step 3: Implement MiniMarkdown**

`src/clues/MiniMarkdown.tsx`:
```tsx
import { Fragment, type ReactNode } from 'react';

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;

function renderInline(line: string, keyPrefix: string): ReactNode[] {
  return line.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    return <Fragment key={key}>{part}</Fragment>;
  });
}

export function MiniMarkdown({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/);
  return (
    <>
      {paragraphs.map((paragraph, p) => (
        <p key={p}>
          {paragraph.split('\n').map((line, l) => (
            <Fragment key={l}>
              {l > 0 && <br />}
              {renderInline(line, `${p}-${l}`)}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/clues/MiniMarkdown.test.tsx`
Expected: 2 tests pass.

- [ ] **Step 5: Write the failing CluePanel test**

`src/clues/CluePanel.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialGameState, useGameStore } from '../game/store';
import type { Level } from '../levels/types';
import { CluePanel } from './CluePanel';

const level: Level = {
  id: 'lvl', title: 'T',
  people: [{ id: 'a', name: 'A' }],
  solution: { couples: [], links: [] },
  clues: [
    { id: 'k1', kind: 'letter', title: 'The letter', text: 'Dear **Paul**', background: 'paper.png' },
    { id: 'k2', kind: 'newspaper', title: 'The paper', text: 'News', background: 'https://x.test/bg.jpg' },
    { id: 'k3', kind: 'photo', title: 'The photo', src: 'p.jpg', description: 'Two people' },
    { id: 'k4', kind: 'audio', title: 'The tape', src: 'a.mp3', transcript: 'Hello there', description: 'Found in a drawer' },
    { id: 'k5', kind: 'video', title: 'The film', src: 'v.mp4', transcript: 'Smile!' },
  ],
};

beforeEach(() => {
  useGameStore.setState({ ...initialGameState });
  useGameStore.getState().openLevel(level);
});

describe('CluePanel', () => {
  it('lists clues with tutorial anchors', () => {
    render(<CluePanel />);
    expect(screen.getByRole('button', { name: /The letter/ })).toHaveAttribute('data-tutorial', 'clue:k1');
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('opens a letter with its background, then goes back', async () => {
    const user = userEvent.setup();
    render(<CluePanel />);
    await user.click(screen.getByRole('button', { name: /The letter/ }));
    expect(useGameStore.getState().openClueId).toBe('k1');
    const sheet = screen.getByTestId('clue-sheet');
    expect(sheet).toHaveStyle({ backgroundImage: 'url(/levels/lvl/paper.png)' });
    expect(sheet.querySelector('strong')?.textContent).toBe('Paul');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(useGameStore.getState().openClueId).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('keeps absolute background URLs', async () => {
    const user = userEvent.setup();
    render(<CluePanel />);
    await user.click(screen.getByRole('button', { name: /The paper/ }));
    expect(screen.getByTestId('clue-sheet')).toHaveStyle({ backgroundImage: 'url(https://x.test/bg.jpg)' });
  });

  it('renders photo, audio and video details', async () => {
    const user = userEvent.setup();
    const { container } = render(<CluePanel />);
    await user.click(screen.getByRole('button', { name: /The photo/ }));
    expect(screen.getByRole('img', { name: 'The photo' })).toHaveAttribute('src', '/levels/lvl/p.jpg');
    expect(screen.getByText('Two people')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));

    await user.click(screen.getByRole('button', { name: /The tape/ }));
    expect(container.querySelector('audio')).toHaveAttribute('src', '/levels/lvl/a.mp3');
    expect(screen.getByText('Found in a drawer')).toBeInTheDocument();
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));

    await user.click(screen.getByRole('button', { name: /The film/ }));
    expect(container.querySelector('video')).toHaveAttribute('src', '/levels/lvl/v.mp4');
    expect(screen.getByText('Smile!')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `npx vitest run src/clues/CluePanel.test.tsx`
Expected: FAIL — cannot resolve `./CluePanel`.

- [ ] **Step 7: Implement the panel**

`src/clues/ClueList.tsx`:
```tsx
import type { Clue, ClueKind } from '../levels/types';

export const CLUE_ICONS: Record<ClueKind, string> = { letter: '✉', newspaper: '📰', photo: '🖼', audio: '🎧', video: '🎬' };

export function ClueList({ clues, onOpen }: { clues: Clue[]; onOpen: (id: string) => void }) {
  return (
    <ul className="clue-list">
      {clues.map((clue) => (
        <li key={clue.id}>
          <button type="button" className="clue-item" data-tutorial={`clue:${clue.id}`} onClick={() => onOpen(clue.id)}>
            <span className="clue-icon" aria-hidden="true">{CLUE_ICONS[clue.kind]}</span>
            <span>{clue.title}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

`src/clues/ClueDetail.tsx`:
```tsx
import { useState } from 'react';
import { mediaUrl } from '../levels/loader';
import type { Clue } from '../levels/types';
import { MiniMarkdown } from './MiniMarkdown';

export function ClueDetail({ levelId, clue, onBack }: { levelId: string; clue: Clue; onBack: () => void }) {
  const [fullscreen, setFullscreen] = useState(false);
  return (
    <div className="clue-detail">
      <button type="button" className="clue-back" onClick={onBack}>Back</button>
      <h3 className="clue-title">{clue.title}</h3>
      {(clue.kind === 'letter' || clue.kind === 'newspaper') && (
        <div
          className={`clue-sheet clue-sheet-${clue.kind}`}
          data-testid="clue-sheet"
          style={clue.background ? { backgroundImage: `url(${mediaUrl(levelId, clue.background)})` } : undefined}
        >
          <MiniMarkdown text={clue.text} />
        </div>
      )}
      {clue.kind === 'photo' && (
        <>
          <img className="clue-photo" src={mediaUrl(levelId, clue.src)} alt={clue.title} onClick={() => setFullscreen(true)} />
          {clue.description && <p className="clue-description">{clue.description}</p>}
          {fullscreen && (
            <div className="clue-fullscreen" role="dialog" aria-label={clue.title} onClick={() => setFullscreen(false)}>
              <img src={mediaUrl(levelId, clue.src)} alt={clue.title} />
            </div>
          )}
        </>
      )}
      {clue.kind === 'audio' && <audio className="clue-media" controls src={mediaUrl(levelId, clue.src)} />}
      {clue.kind === 'video' && <video className="clue-media" controls src={mediaUrl(levelId, clue.src)} />}
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
```

`src/clues/CluePanel.tsx`:
```tsx
import { useGameStore } from '../game/store';
import { ClueDetail } from './ClueDetail';
import { ClueList } from './ClueList';
import './clues.css';

export function CluePanel() {
  const level = useGameStore((s) => s.level);
  const openClueId = useGameStore((s) => s.openClueId);
  const { openClue, closeClue } = useGameStore.getState();
  if (!level) return null;
  const clue = level.clues.find((c) => c.id === openClueId);
  return (
    <aside className="clue-panel" aria-label="Clues">
      <h2 className="clue-panel-title">Clues</h2>
      {clue ? <ClueDetail levelId={level.id} clue={clue} onBack={closeClue} /> : <ClueList clues={level.clues} onOpen={openClue} />}
    </aside>
  );
}
```

`src/clues/clues.css`:
```css
.clue-panel { width: 320px; min-width: 220px; max-width: 50vw; resize: horizontal; overflow: auto; background: var(--panel); color: var(--panel-text); border-right: 1px solid var(--surface-border); padding: 12px; font-family: var(--font); display: flex; flex-direction: column; }
.clue-panel-title { margin: 0 0 12px; font-size: 18px; }
.clue-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.clue-item { width: 100%; text-align: left; display: flex; gap: 8px; align-items: center; font: inherit; background: var(--surface); color: var(--text); border: 1px solid var(--surface-border); border-radius: 4px; padding: 8px 10px; cursor: pointer; box-shadow: var(--shadow); }
.clue-icon { font-size: 18px; }
.clue-back { font: inherit; background: none; border: none; color: var(--accent); cursor: pointer; padding: 0; margin-bottom: 8px; }
.clue-title { margin: 0 0 10px; font-size: 16px; }
.clue-sheet { background: var(--surface); color: var(--text); background-size: cover; background-position: center; padding: 28px 24px; border: 1px solid var(--surface-border); box-shadow: var(--shadow); line-height: 1.5; }
.clue-sheet p { margin: 0 0 1em; }
.clue-sheet-letter { font-style: normal; }
.clue-sheet-newspaper { column-count: 1; font-family: 'Georgia', serif; border-top: 3px double var(--text); border-bottom: 3px double var(--text); }
.clue-photo { width: 100%; cursor: zoom-in; border: 4px solid var(--surface); box-shadow: var(--shadow); }
.clue-fullscreen { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.9); display: flex; align-items: center; justify-content: center; z-index: 50; cursor: zoom-out; }
.clue-fullscreen img { max-width: 95vw; max-height: 95vh; }
.clue-description { font-style: italic; color: var(--text-muted); }
.clue-media { width: 100%; margin-bottom: 8px; }
.clue-transcript { background: var(--surface); color: var(--text); padding: 8px 12px; border: 1px solid var(--surface-border); }
.clue-transcript summary { cursor: pointer; font-weight: bold; }
```

- [ ] **Step 8: Run to verify pass**

Run: `npx vitest run src/clues`
Expected: 6 tests pass. Note `getAllByRole('listitem')` only counts `<li>` elements, so the list view must use `<ul>/<li>`. If the `toHaveStyle({ backgroundImage })` assertions fail because jsdom quotes the URL (`url("/levels/lvl/paper.png")`), replace them with `expect(sheet.style.backgroundImage).toContain('/levels/lvl/paper.png')` (and `toContain('https://x.test/bg.jpg')`) — the behaviour under test is the resolved path, not the quoting.

- [ ] **Step 9: Commit**

```bash
git add src/clues
git commit -m "feat(clues): add clue panel with list and per-kind detail views" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Status bar, confirm dialog, hints and victory overlay

**Files:**
- Create: `src/app/ConfirmDialog.tsx`, `src/app/ThemeSelect.tsx`, `src/app/StatusBar.tsx`, `src/app/VictoryOverlay.tsx`, `src/app/status.css`
- Test: `src/app/StatusBar.test.tsx`

**Interfaces:**
- Consumes: `useGameStore`, `selectScore`, `THEMES`
- Produces:
  - `<ConfirmDialog message onConfirm onCancel />` — `role="dialog"`, buttons "Confirm" and "Cancel"
  - `<ThemeSelect />` — `<select aria-label="Theme">` bound to `theme`/`setTheme`
  - `<StatusBar />` — level title, Check (`data-tutorial="check"`), Reset board (with confirm), Hints menu (checkboxes "Show progress", "Show mistakes"), progress bar (`role="progressbar"`), mistakes counter, theme select, "Menu" button
  - `<VictoryOverlay onNext hasNext />` — shown when `victory`, "Next level" (disabled without next) and "Menu"

- [ ] **Step 1: Write the failing tests**

`src/app/StatusBar.test.tsx`:
```tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialGameState, selectBoard, useGameStore } from '../game/store';
import type { Level } from '../levels/types';
import { StatusBar } from './StatusBar';
import { VictoryOverlay } from './VictoryOverlay';

const level: Level = {
  id: 'lvl', title: 'The Test Family',
  people: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
  solution: { couples: [{ id: 'c1', type: 'married', members: ['a', 'b'], children: [] }], links: [] },
  clues: [],
};

const s = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState({ ...initialGameState });
  s().openLevel(level);
});

describe('StatusBar', () => {
  it('shows the title and hides hints by default', () => {
    render(<StatusBar />);
    expect(screen.getByText('The Test Family')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText(/Mistakes/)).toBeNull();
  });

  it('check shows a neutral message with no numbers when incomplete', async () => {
    const user = userEvent.setup();
    render(<StatusBar />);
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText('Not quite yet.')).toBeInTheDocument();
    expect(screen.queryByText(/\d/)).toBeNull();
  });

  it('hint toggles reveal progress and mistakes', async () => {
    const user = userEvent.setup();
    s().selectTool('divorced');
    s().clickPerson('a');
    s().clickPerson('b');
    render(<StatusBar />);
    await user.click(screen.getByRole('button', { name: 'Hints' }));
    await user.click(screen.getByRole('checkbox', { name: 'Show progress' }));
    await user.click(screen.getByRole('checkbox', { name: 'Show mistakes' }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '1');
    expect(screen.getByText('Mistakes: 1')).toBeInTheDocument();
  });

  it('reset asks for confirmation', async () => {
    const user = userEvent.setup();
    s().selectTool('married');
    s().clickPerson('a');
    s().clickPerson('b');
    render(<StatusBar />);
    await user.click(screen.getByRole('button', { name: 'Reset board' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(selectBoard(s()).couples).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Reset board' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(selectBoard(s()).couples).toHaveLength(0);
  });

  it('theme select changes the theme', async () => {
    const user = userEvent.setup();
    render(<StatusBar />);
    await user.selectOptions(screen.getByLabelText('Theme'), 'noir');
    expect(s().theme).toBe('noir');
  });

  it('menu button leaves the level', async () => {
    const user = userEvent.setup();
    render(<StatusBar />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(s().screen).toBe('menu');
  });
});

describe('VictoryOverlay', () => {
  it('renders only on victory and wires its buttons', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<VictoryOverlay onNext={onNext} hasNext />);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      s().selectTool('married');
      s().clickPerson('a');
      s().clickPerson('b');
      s().check();
    });
    expect(screen.getByRole('dialog', { name: 'Level complete' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next level' }));
    expect(onNext).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(s().screen).toBe('menu');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/app/StatusBar.test.tsx`
Expected: FAIL — cannot resolve `./StatusBar`.

- [ ] **Step 3: Implement**

`src/app/ConfirmDialog.tsx`:
```tsx
export function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="overlay">
      <div className="dialog" role="dialog" aria-label={message}>
        <p>{message}</p>
        <div className="dialog-actions">
          <button type="button" className="tool-button" onClick={onCancel}>Cancel</button>
          <button type="button" className="tool-button tool-button-accent" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
```

`src/app/ThemeSelect.tsx`:
```tsx
import { useGameStore } from '../game/store';
import { isThemeId, THEMES } from '../theme/themes';

export function ThemeSelect() {
  const theme = useGameStore((s) => s.theme);
  const setTheme = useGameStore((s) => s.setTheme);
  return (
    <select
      className="theme-select"
      aria-label="Theme"
      value={theme}
      onChange={(e) => { if (isThemeId(e.target.value)) setTheme(e.target.value); }}
    >
      {THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  );
}
```

`src/app/StatusBar.tsx`:
```tsx
import { useState } from 'react';
import { selectScore, useGameStore } from '../game/store';
import { ConfirmDialog } from './ConfirmDialog';
import { ThemeSelect } from './ThemeSelect';
import './status.css';

export function StatusBar() {
  const level = useGameStore((s) => s.level);
  const score = useGameStore(selectScore);
  const hints = useGameStore((s) => s.hints);
  const lastCheck = useGameStore((s) => s.lastCheck);
  const { check, resetBoard, setHint, leaveLevel } = useGameStore.getState();
  const [hintsOpen, setHintsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!level || !score) return null;
  return (
    <header className="status-bar">
      <button type="button" className="tool-button" onClick={leaveLevel}>Menu</button>
      <h1 className="status-title">{level.title}</h1>
      {hints.showProgress && (
        <div className="progress" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={score.total} aria-valuenow={score.correct}>
          <div className="progress-fill" style={{ width: `${score.total ? (score.correct / score.total) * 100 : 0}%` }} />
        </div>
      )}
      {hints.showMistakes && <span className="mistakes">Mistakes: {score.mistakes}</span>}
      {lastCheck === 'incomplete' && <span className="check-message">Not quite yet.</span>}
      <div className="status-actions">
        <div className="hints">
          <button type="button" className="tool-button" aria-expanded={hintsOpen} onClick={() => setHintsOpen((o) => !o)}>Hints</button>
          {hintsOpen && (
            <div className="hints-menu">
              <label><input type="checkbox" checked={hints.showProgress} onChange={(e) => setHint('showProgress', e.target.checked)} /> Show progress</label>
              <label><input type="checkbox" checked={hints.showMistakes} onChange={(e) => setHint('showMistakes', e.target.checked)} /> Show mistakes</label>
            </div>
          )}
        </div>
        <button type="button" className="tool-button" onClick={() => setConfirmReset(true)}>Reset board</button>
        <ThemeSelect />
        <button type="button" className="tool-button tool-button-accent" data-tutorial="check" onClick={check}>Check</button>
      </div>
      {confirmReset && (
        <ConfirmDialog
          message="Reset the board? All links on this level will be removed."
          onConfirm={() => { resetBoard(); setConfirmReset(false); }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </header>
  );
}
```

`src/app/VictoryOverlay.tsx`:
```tsx
import { useGameStore } from '../game/store';

export function VictoryOverlay({ onNext, hasNext }: { onNext: () => void; hasNext: boolean }) {
  const victory = useGameStore((s) => s.victory);
  const level = useGameStore((s) => s.level);
  const leaveLevel = useGameStore((s) => s.leaveLevel);
  if (!victory || !level) return null;
  return (
    <div className="overlay">
      <div className="dialog" role="dialog" aria-label="Level complete">
        <h2>Level complete</h2>
        <p>You solved <strong>{level.title}</strong>.</p>
        <div className="dialog-actions">
          <button type="button" className="tool-button" onClick={leaveLevel}>Menu</button>
          <button type="button" className="tool-button tool-button-accent" disabled={!hasNext} onClick={onNext}>Next level</button>
        </div>
      </div>
    </div>
  );
}
```

`src/app/status.css`:
```css
.status-bar { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: var(--panel); color: var(--panel-text); border-bottom: 1px solid var(--surface-border); font-family: var(--font); }
.status-title { font-size: 18px; margin: 0; flex: 1; }
.status-actions { display: flex; align-items: center; gap: 8px; }
.progress { width: 160px; height: 10px; background: var(--surface); border: 1px solid var(--surface-border); border-radius: 5px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent); transition: width 0.2s; }
.mistakes, .check-message { font-size: 14px; }
.hints { position: relative; }
.hints-menu { position: absolute; top: 100%; right: 0; margin-top: 4px; background: var(--surface); color: var(--text); border: 1px solid var(--surface-border); border-radius: 4px; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; z-index: 20; white-space: nowrap; box-shadow: var(--shadow); }
.theme-select { font: inherit; font-family: var(--font); background: var(--surface); color: var(--text); border: 1px solid var(--surface-border); border-radius: 4px; padding: 4px 6px; }
.tool-button-accent { background: var(--accent); color: #fff; border-color: var(--accent); }
.overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: flex; align-items: center; justify-content: center; z-index: 40; }
.dialog { background: var(--surface); color: var(--text); border: 1px solid var(--surface-border); border-radius: 6px; padding: 20px 24px; min-width: 300px; box-shadow: var(--shadow); font-family: var(--font); }
.dialog h2 { margin-top: 0; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/app/StatusBar.test.tsx`
Expected: 7 tests pass. `.tool-button` styles come from `src/board/board.css`; the status bar reuses the class, so both stylesheets are loaded in Task 15's layout.

- [ ] **Step 5: Commit**

```bash
git add src/app
git commit -m "feat(app): add status bar, hints, reset confirmation and victory overlay" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Tutorial overlay

**Files:**
- Create: `src/tutorial/TutorialOverlay.tsx`, `src/tutorial/tutorial.css`
- Test: `src/tutorial/TutorialOverlay.test.tsx`

**Interfaces:**
- Consumes: `useGameStore`, `selectCurrentTutorialStep`, `isFinished`
- Produces: `<TutorialOverlay />` — renders nothing when there is no current step; otherwise a bubble (`role="note"`, `aria-label="Tutorial"`) with the step text. With `highlight`, it finds `[data-tutorial="<highlight>"]`, adds the class `tutorial-highlight` to it (removed on cleanup/step change) and positions the bubble under that element's bounding rect. Without `highlight`, the bubble is centred and shows a "Next" button that emits `next` through a store action `tutorialNext()` — add that action to the store in this task.

- [ ] **Step 1: Add `tutorialNext` to the store**

In `src/game/store.ts`, add to `GameActions`:
```ts
  tutorialNext(): void;
```
and to the returned object:
```ts
    tutorialNext() { emit('next'); },
```
Add to `src/game/store.test.ts` inside `describe('tutorial and clues')`:
```ts
  it('tutorialNext advances a "next" step', () => {
    s().openLevel({ ...level, tutorial: [{ text: 'hi', until: 'next' }] });
    s().tutorialNext();
    expect(s().tutorialStep).toBe(1);
  });
```
Run: `npx vitest run src/game/store.test.ts` — expected: pass.

- [ ] **Step 2: Write the failing overlay test**

`src/tutorial/TutorialOverlay.test.tsx`:
```tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialGameState, useGameStore } from '../game/store';
import type { Level } from '../levels/types';
import { TutorialOverlay } from './TutorialOverlay';

const level: Level = {
  id: 'tut', title: 'T',
  people: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
  solution: { couples: [], links: [] },
  clues: [{ id: 'k1', kind: 'letter', title: 'L', text: 't' }],
  tutorial: [
    { text: 'Welcome', until: 'next' },
    { text: 'Open the letter', highlight: 'clue:k1', until: 'clueOpened:k1' },
  ],
};

beforeEach(() => {
  useGameStore.setState({ ...initialGameState });
  useGameStore.getState().openLevel(level);
});

describe('TutorialOverlay', () => {
  it('shows the step text and advances with Next', async () => {
    const user = userEvent.setup();
    render(<TutorialOverlay />);
    expect(screen.getByRole('note', { name: 'Tutorial' })).toHaveTextContent('Welcome');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('note')).toHaveTextContent('Open the letter');
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  it('highlights the target element and cleans up', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button" data-tutorial="clue:k1">Letter</button>
        <TutorialOverlay />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: 'Letter' })).toHaveClass('tutorial-highlight');
    act(() => useGameStore.getState().openClue('k1'));
    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.getByRole('button', { name: 'Letter' })).not.toHaveClass('tutorial-highlight');
  });

  it('renders nothing for a level without tutorial', () => {
    useGameStore.getState().openLevel({ ...level, tutorial: undefined });
    render(<TutorialOverlay />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/tutorial/TutorialOverlay.test.tsx`
Expected: FAIL — cannot resolve `./TutorialOverlay`.

- [ ] **Step 4: Implement**

`src/tutorial/TutorialOverlay.tsx`:
```tsx
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
```

`src/tutorial/tutorial.css`:
```css
.tutorial-bubble { background: var(--surface); color: var(--text); border: 2px solid var(--highlight); border-radius: 8px; padding: 12px 16px; box-shadow: var(--shadow); font-family: var(--font); z-index: 30; }
.tutorial-bubble p { margin: 0 0 8px; }
.tutorial-bubble.is-centred { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); max-width: 420px; }
.tutorial-highlight { outline: 3px solid var(--highlight); outline-offset: 3px; box-shadow: 0 0 0 6px color-mix(in srgb, var(--highlight) 35%, transparent); position: relative; z-index: 6; }
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/tutorial`
Expected: 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/tutorial src/game/store.ts src/game/store.test.ts
git commit -m "feat(tutorial): add guided step overlay with highlights" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: Menu, game screen, app assembly and layout

**Files:**
- Create: `src/app/Menu.tsx`, `src/app/GameScreen.tsx`, `src/app/ErrorScreen.tsx`, `src/app/useLevelIndex.ts`, `src/app/app.css`
- Modify: `src/app/App.tsx`, `src/app/App.test.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: everything above; `loadLevelIndex`, `loadLevel`, `LevelLoadError`
- Produces:
  - `useLevelIndex(): { entries: LevelIndexEntry[] | null; error: string | null }` — fetches once on mount
  - `isUnlocked(entries, completed, id): boolean` — tutorial always unlocked; first non-tutorial level unlocked; others unlocked when the previous non-tutorial level is completed (exported from `Menu.tsx` and unit-tested)
  - `nextLevelId(entries, id): string | null` — next non-tutorial entry after `id`, or null
  - `<Menu onPlay(id) />`, `<GameScreen onNext(id) hasNext />`, `<ErrorScreen message onBack />`, `<App />`

- [ ] **Step 1: Write the failing tests**

Replace `src/app/App.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialGameState, useGameStore } from '../game/store';
import { App } from './App';
import { isUnlocked, nextLevelId } from './Menu';

const index = [{ id: 'tutorial', tutorial: true }, { id: 'level-1', tutorial: false }, { id: 'level-2', tutorial: false }];
const levelJson = (id: string) => ({
  id, title: `Title ${id}`,
  people: [{ id: 'a', name: 'Ann' }, { id: 'b', name: 'Bob' }],
  solution: { couples: [{ id: 'c1', type: 'married', members: ['a', 'b'], children: [] }], links: [] },
  clues: [{ id: 'k1', kind: 'letter', title: 'Letter', text: 'x' }],
  ...(id === 'tutorial' ? { tutorial: [{ text: 'Welcome', until: 'next' }] } : {}),
});

const mockFetch = (handler: (url: string) => Response | Promise<Response>) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => Promise.resolve(handler(String(input))));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  useGameStore.setState({ ...initialGameState, screen: 'menu', level: null, completed: [] });
});
afterEach(() => vi.restoreAllMocks());

describe('unlock rules', () => {
  it('tutorial and first level are always unlocked, later ones follow completion', () => {
    expect(isUnlocked(index, [], 'tutorial')).toBe(true);
    expect(isUnlocked(index, [], 'level-1')).toBe(true);
    expect(isUnlocked(index, [], 'level-2')).toBe(false);
    expect(isUnlocked(index, ['level-1'], 'level-2')).toBe(true);
    expect(isUnlocked(index, ['tutorial'], 'level-2')).toBe(false);
  });
  it('nextLevelId skips the tutorial and ends with null', () => {
    expect(nextLevelId(index, 'tutorial')).toBe('level-1');
    expect(nextLevelId(index, 'level-1')).toBe('level-2');
    expect(nextLevelId(index, 'level-2')).toBeNull();
  });
});

describe('App', () => {
  it('shows the menu with the tutorial first and locked levels disabled', async () => {
    mockFetch((url) => (url.endsWith('index.json') ? json(index) : json(levelJson('x'))));
    render(<App />);
    const buttons = await screen.findAllByRole('button', { name: /Tutorial|Level/ });
    expect(buttons[0]).toHaveTextContent('Tutorial');
    expect(buttons[0]).toHaveClass('level-button-tutorial');
    expect(screen.getByRole('button', { name: /Level 2/ })).toBeDisabled();
  });

  it('opens a level and plays it through to victory and next level', async () => {
    const user = userEvent.setup();
    mockFetch((url) => (url.endsWith('index.json') ? json(index) : json(levelJson(url.split('/')[2]))));
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Level 1/ }));
    expect(await screen.findByText('Title level-1')).toBeInTheDocument();
    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Letter/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Married/ }));
    await user.click(screen.getByText('Ann'));
    await user.click(screen.getByText('Bob'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByRole('dialog', { name: 'Level complete' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next level' }));
    expect(await screen.findByText('Title level-2')).toBeInTheDocument();
  });

  it('shows the tutorial overlay on the tutorial level', async () => {
    const user = userEvent.setup();
    mockFetch((url) => (url.endsWith('index.json') ? json(index) : json(levelJson('tutorial'))));
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Tutorial/ }));
    expect(await screen.findByRole('note', { name: 'Tutorial' })).toHaveTextContent('Welcome');
  });

  it('shows an error screen when a level fails to load', async () => {
    const user = userEvent.setup();
    mockFetch((url) => (url.endsWith('index.json') ? json(index) : json({}, 404)));
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Level 1/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 404');
    await user.click(screen.getByRole('button', { name: 'Back to menu' }));
    expect(await screen.findByRole('button', { name: /Level 1/ })).toBeInTheDocument();
  });

  it('shows an error when the index fails to load', async () => {
    mockFetch(() => json('nope', 500));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/app/App.test.tsx`
Expected: FAIL — `./Menu` not found.

- [ ] **Step 3: Implement**

`src/app/useLevelIndex.ts`:
```ts
import { useEffect, useState } from 'react';
import { loadLevelIndex } from '../levels/loader';
import type { LevelIndexEntry } from '../levels/types';

export function useLevelIndex(): { entries: LevelIndexEntry[] | null; error: string | null } {
  const [entries, setEntries] = useState<LevelIndexEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadLevelIndex()
      .then((list) => { if (!cancelled) setEntries(list); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);
  return { entries, error };
}
```

`src/app/ErrorScreen.tsx`:
```tsx
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
```

`src/app/Menu.tsx`:
```tsx
import { useGameStore } from '../game/store';
import type { LevelIndexEntry } from '../levels/types';
import { ErrorScreen } from './ErrorScreen';
import { ThemeSelect } from './ThemeSelect';
import { useLevelIndex } from './useLevelIndex';

export function isUnlocked(entries: LevelIndexEntry[], completed: string[], id: string): boolean {
  const levels = entries.filter((e) => !e.tutorial);
  const position = levels.findIndex((e) => e.id === id);
  if (position === -1) return true; // tutorial or unknown: always playable
  if (position === 0) return true;
  return completed.includes(levels[position - 1].id);
}

export function nextLevelId(entries: LevelIndexEntry[], id: string): string | null {
  const levels = entries.filter((e) => !e.tutorial);
  const position = levels.findIndex((e) => e.id === id);
  return levels[position + 1]?.id ?? null;
}

export function Menu({ onPlay }: { onPlay: (id: string) => void }) {
  const { entries, error } = useLevelIndex();
  const completed = useGameStore((s) => s.completed);
  if (error) return <ErrorScreen message={error} />;
  if (!entries) return <div className="screen screen-centered"><p>Loading…</p></div>;
  let levelNumber = 0;
  return (
    <div className="screen screen-centered menu">
      <h1 className="menu-title">Genealogic</h1>
      <p className="menu-subtitle">Rebuild the family tree from the clues.</p>
      <ul className="level-list">
        {entries.map((entry) => {
          const label = entry.tutorial ? 'Tutorial' : `Level ${(levelNumber += 1)}`;
          const unlocked = isUnlocked(entries, completed, entry.id);
          const done = completed.includes(entry.id);
          return (
            <li key={entry.id}>
              <button
                type="button"
                className={`level-button${entry.tutorial ? ' level-button-tutorial' : ''}${done ? ' is-done' : ''}`}
                disabled={!unlocked}
                onClick={() => onPlay(entry.id)}
              >
                <span>{label}</span>
                <span aria-hidden="true">{done ? '✓' : unlocked ? '' : '🔒'}</span>
                {done && <span className="visually-hidden">(completed)</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="menu-theme"><ThemeSelect /></div>
    </div>
  );
}
```

`src/app/GameScreen.tsx`:
```tsx
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
```

`src/app/App.tsx`:
```tsx
import { useCallback, useState } from 'react';
import { useGameStore } from '../game/store';
import { loadLevel, loadLevelIndex } from '../levels/loader';
import '../board/board.css';
import '../theme/themes.css';
import { ErrorScreen } from './ErrorScreen';
import { GameScreen } from './GameScreen';
import { Menu, nextLevelId } from './Menu';
import './app.css';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const levelId = useGameStore((s) => s.level?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextId, setNextId] = useState<string | null>(null);

  const play = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [level, entries] = await Promise.all([loadLevel(id), loadLevelIndex()]);
      setNextId(nextLevelId(entries, id));
      useGameStore.getState().openLevel(level);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  if (error) return <ErrorScreen message={error} onBack={() => setError(null)} />;
  if (loading) return <div className="screen screen-centered"><p>Loading…</p></div>;
  if (screen === 'game' && levelId) {
    return <GameScreen hasNext={nextId !== null} onNext={() => { if (nextId) void play(nextId); }} />;
  }
  return <Menu onPlay={(id) => void play(id)} />;
}
```

`src/app/app.css`:
```css
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { font-family: var(--font); background: var(--bg); color: var(--text); }
.screen { height: 100%; display: flex; flex-direction: column; }
.screen-centered { align-items: center; justify-content: center; gap: 12px; padding: 24px; background: var(--bg); background-image: var(--bg-pattern); background-size: 24px 24px; color: var(--panel-text); }
.game-screen { overflow: hidden; }
.game-body { flex: 1; display: flex; min-height: 0; }
.menu-title { font-size: 42px; margin: 0; color: var(--panel-text); text-shadow: var(--shadow); }
.menu-subtitle { margin: 0 0 16px; color: var(--panel-text); opacity: 0.85; }
.level-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; width: min(420px, 90vw); }
.level-button { width: 100%; display: flex; justify-content: space-between; font: inherit; font-size: 18px; background: var(--surface); color: var(--text); border: 2px solid var(--surface-border); border-radius: 6px; padding: 12px 16px; cursor: pointer; box-shadow: var(--shadow); }
.level-button:disabled { opacity: 0.45; cursor: default; }
.level-button-tutorial { background: var(--accent); color: #fff; border-color: var(--accent); }
.level-button.is-done { border-color: var(--highlight); }
.menu-theme { margin-top: 16px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
```

`src/main.tsx` is unchanged (it already renders `<App />`); keep the CSS imports in `App.tsx` so tests and the app share them.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/app`
Expected: all pass. In the "plays it through" test the `Letter` clue button and the `Married` tool button both match `/Letter|Married/` patterns loosely; the queries above use distinct names so they resolve uniquely. If `findByText('Title level-2')` fails, confirm `play(nextId)` is called from `VictoryOverlay`'s `onNext` and that `openLevel` resets `victory`.

- [ ] **Step 5: Run the dev server and check by eye**

Run: `npm run dev` and open the printed URL. Verify: menu shows Tutorial (accent colour) and Level 1; the tutorial plays end to end (bubble, highlight on the letter, married tool, dot, child, Check → victory); theme select switches colours; Reset asks for confirmation; ⌘Z undoes. Stop the server.

- [ ] **Step 6: Build and commit**

Run: `npm run build`
Expected: no TypeScript errors, `dist/` produced.

```bash
git add -A
git commit -m "feat(app): assemble menu, game screen, error screen and layout" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 16: Level 1 content

**Files:**
- Create: `public/levels/level-1/level.json` (plus any media the author provides under the same folder)
- Modify: `src/levels/loader.test.ts`

The puzzle is written with the author (spec §13). This task ships a complete, solvable level so the game is playable end to end; the author replaces or extends clues and media afterwards without code changes.

- [ ] **Step 1: Write the level**

`public/levels/level-1/level.json`:
```json
{
  "id": "level-1",
  "title": "The Marchetti Estate",
  "people": [
    { "id": "enzo", "name": "Enzo Marchetti" },
    { "id": "clara", "name": "Clara Marchetti" },
    { "id": "rosa", "name": "Rosa Bellini" },
    { "id": "luca", "name": "Luca Marchetti" },
    { "id": "sofia", "name": "Sofia Marchetti" },
    { "id": "marco", "name": "Marco Vitale" },
    { "id": "elena", "name": "Elena Vitale" },
    { "id": "giulia", "name": "Giulia Marchetti" },
    { "id": "tommaso", "name": "Tommaso Ricci" },
    { "id": "nina", "name": "Nina Ricci" }
  ],
  "solution": {
    "couples": [
      { "id": "c1", "type": "divorced", "members": ["enzo", "clara"], "children": ["luca", "sofia"] },
      { "id": "c2", "type": "married", "members": ["enzo", "rosa"], "children": ["giulia"] },
      { "id": "c3", "type": "married", "members": ["sofia", "marco"], "children": ["elena"] },
      { "id": "c4", "type": "partners", "members": ["luca", "nina"], "children": [] },
      { "id": "c5", "type": "divorced", "members": ["nina", "tommaso"], "children": [] }
    ],
    "links": []
  },
  "clues": [
    {
      "id": "will",
      "kind": "letter",
      "title": "Extract from Enzo's will",
      "text": "I, Enzo Marchetti, leave the estate to my three children in equal parts: **Luca**, **Sofia** and my youngest, **Giulia**, born of my marriage to my beloved wife **Rosa**.\n\nTo **Clara**, who was my wife for nineteen years before our divorce, I leave the painting she always admired."
    },
    {
      "id": "notice",
      "kind": "newspaper",
      "title": "Wedding announcement, 1998",
      "text": "**Marchetti — Vitale.** Sofia Marchetti, daughter of Enzo and Clara Marchetti, married Marco Vitale on Saturday at San Lorenzo. The couple will live in Turin."
    },
    {
      "id": "photo-elena",
      "kind": "photo",
      "title": "Birthday photo",
      "src": "elena.jpg",
      "description": "Little Elena blowing out six candles. Written on the back: *Our daughter, 2006 — Sofia & Marco.*"
    },
    {
      "id": "voicemail",
      "kind": "audio",
      "title": "Voicemail from Luca",
      "src": "luca.mp3",
      "description": "A message left on Enzo's phone.",
      "transcript": "Dad, it's Luca. Nina and I are coming for dinner on Sunday. No, we're not getting married, stop asking — we're happy as we are. And yes, her divorce from Tommaso is final now, so you can stop worrying about that too."
    },
    {
      "id": "interview",
      "kind": "video",
      "title": "Interview with Clara",
      "src": "clara.mp4",
      "transcript": "Interviewer: You were married to Enzo for nearly twenty years. Clara: Nineteen. We had Luca first, then Sofia. After the divorce he married Rosa Bellini within the year. I hear they have a little girl now."
    }
  ]
}
```

Media files (`elena.jpg`, `luca.mp3`, `clara.mp4`) are provided by the author; until then the players (and the browser) see a broken image / empty player, which is acceptable for phase 1 because every clue carries its text in `description` or `transcript`.

- [ ] **Step 2: Add the validation test**

In `src/levels/loader.test.ts`, extend the shipped-levels test:
```ts
it.each(['tutorial', 'level-1'])('ships a valid %s level', (id) => {
  const raw = JSON.parse(readFileSync(`public/levels/${id}/level.json`, 'utf8'));
  expect(() => validateLevel(raw)).not.toThrow();
});
```
(remove the earlier single-level version of this test).

- [ ] **Step 3: Verify solvability with the scoring function**

Add to `src/levels/loader.test.ts`:
```ts
import { scoreBoard } from '../scoring/score';

it('level-1 solution scores as complete against itself', () => {
  const raw = JSON.parse(readFileSync('public/levels/level-1/level.json', 'utf8'));
  const level = validateLevel(raw);
  expect(scoreBoard(level.solution.couples, level.solution.couples).complete).toBe(true);
  expect(scoreBoard([], level.solution.couples).total).toBe(8);
});
```

Run: `npx vitest run`
Expected: whole suite green.

- [ ] **Step 4: Commit**

```bash
git add public/levels/level-1 src/levels/loader.test.ts
git commit -m "feat(levels): add level 1, The Marchetti Estate" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review notes

- Spec coverage: §3 format → Tasks 2–3; §4 board → Tasks 5, 10, 11; §5 clues and status bar → Tasks 12–13; §6 state/undo/save → Tasks 6–8, 10; §7 scoring → Task 4; §8 tutorial → Tasks 9, 14; §9 themes → Task 7, 13 (selector); §10 screens → Task 15; §12 tests → each task; §13 content → Tasks 3, 16.
- Spec §5 asks for the clue panel to be resizable: handled with CSS `resize: horizontal` in Task 12.
- Spec §4 says the dot is "placed at the midpoint of its two members": Task 5 places it at the horizontal midpoint, 60px below the lower member so the lines are visible; the player can drag it.
- The `TOOL_IDS` list lives in `src/levels/validate.ts` because level validation needs it before the store exists; the store derives its `Tool` type from it.
