# Genealogic — design spec (phase 1)

Date: 2026-10-11
Status: approved in conversation, awaiting written review

## 1. Goal

A browser-based deduction puzzle game, in English. Each level gives the player a set of people and a set of clues (letters, newspaper extracts, photos, audio and video with transcripts). The player rebuilds the family tree by linking people on a board. A level is complete only when the board matches the solution exactly: no missing link, no extra link.

Target user: the author (level designer) and the players they share the game with. Success: the tutorial and one real level are playable end to end, and new levels can be added by editing JSON files only.

### Out of scope (phase 2, format kept ready)

- Admin level editor.
- New link type "A killed B" (reserved as `solution.links`).
- Accounts, server, multiplayer.

## 2. Decisions

| Topic | Decision |
|---|---|
| Platform | Web app, React + TypeScript + Vite |
| Board | React Flow (`@xyflow/react`) |
| State | Zustand |
| Level validation | Zod schema + consistency checks at load time |
| Tests | Vitest + Testing Library, no E2E |
| Level storage | One folder per level under `public/levels/<id>/` with `level.json` and media files |
| Wrong link feedback | None visible; only the optional progress bar and mistake counter reveal state |
| Couple type in validation | Counts: `married` ≠ `divorced` ≠ `partners` |
| Level order | Sequential unlock; tutorial is separate and optional |
| Persistence | `localStorage`, no account |
| Themes | Five colour themes, CSS variables, cosmetic only |

## 3. Level format

`public/levels/index.json`:

```json
[
  { "id": "tutorial", "tutorial": true },
  { "id": "level-1",  "tutorial": false }
]
```

`public/levels/<id>/level.json`:

```jsonc
{
  "id": "tutorial",
  "title": "The Dubois Family",
  "people": [
    { "id": "marie", "name": "Marie Dubois" },
    { "id": "paul",  "name": "Paul Dubois" },
    { "id": "lea",   "name": "Léa Dubois" }
  ],
  "solution": {
    "couples": [
      { "id": "c1", "type": "married", "members": ["marie", "paul"], "children": ["lea"] }
    ],
    "links": []
  },
  "clues": [
    { "id": "k1", "kind": "letter",    "title": "Letter to Paul",  "text": "My dear husband…", "background": "paper.png" },
    { "id": "k2", "kind": "newspaper", "title": "Le Matin, 1952",  "text": "…", "background": "https://example.com/paper.jpg" },
    { "id": "k3", "kind": "photo",     "title": "Wedding, 1952",   "src": "wedding.jpg", "description": "Marie and Paul." },
    { "id": "k4", "kind": "audio",     "title": "Voicemail",       "src": "voicemail.mp3", "transcript": "…", "description": "Found on an old phone." },
    { "id": "k5", "kind": "video",     "title": "Home movie",      "src": "movie.mp4", "transcript": "…" }
  ],
  "tutorial": [ /* steps, see §7; omitted on normal levels */ ]
}
```

Rules:

- `people[]`: `id`, `name`, optional `born` and `died` (integer years, `died >= born`). Years, when present, are always shown on the person's card as `1920 – 1988`, `b. 1920` or `d. 1988`. No gender or role; everything else needed to deduce is in the clues.
- `solution.couples[]`: `id`, `type` ∈ `married | divorced | partners`, `members` (exactly two ids, order irrelevant), `children` (list of ids, may be empty).
- `solution.links`: must be an empty array in phase 1. The schema accepts the key so phase 2 can add `{ "type": "killed", "from", "to" }` without a format migration.
- `clues[]`: all have `id`, `kind`, `title`. Per kind:

  | kind | fields |
  |---|---|
  | `letter`, `newspaper` | `text` (minimal Markdown: bold, italic, line breaks), optional `background` (path relative to the level folder, or `http(s)` URL) |
  | `photo` | `src`, optional `description` |
  | `audio`, `video` | `src`, `transcript`, optional `description` |

- Media `src` and relative `background` are resolved against `/levels/<id>/`.

Load-time validation (Zod schema, then consistency checks). A level that fails is reported in the console with the failing rule and the game shows an error screen instead of the board:

- All `people`, `couples`, `clues` ids unique within their list.
- Couple members and children reference existing people.
- A couple's two members are different people.
- No two couples share the same pair of members.
- A person is a child of at most one couple.
- A person is not a child of a couple they are a member of.
- `links` is empty.
- Tutorial step `highlight` and `until` targets reference existing ids/tools.

## 4. Board

Built on React Flow.

### Nodes

- `PersonNode`: rectangle showing the name. Initial layout is a grid; positions are persisted. One connection handle per side.
- `CoupleNode`: a small dot with a discreet type label. Created only by the game, placed at the midpoint of its two members, draggable in Select mode.

### Edges

- `couple`: person ↔ dot, two per couple, solid line.
- `child`: dot → person, line with arrowhead, entering the child rectangle from the top.

### Toolbar

Single active tool. Icons at the top of the board, keyboard shortcuts in parentheses.

| Tool | Behaviour |
|---|---|
| Select (V) | Default. Drag nodes, pan, zoom. The only mode in which nodes are draggable (`nodesDraggable` is false otherwise). |
| Married (M), Divorced (D), Partners (P) | Click person A (highlighted), then person B → creates the couple dot and its two edges. Clicking A again or `Esc` cancels. Clicking an existing couple dot — or clicking its two members again — changes its type to the tool's type, keeping its children. |
| Child (C) | Click a couple dot (highlighted), then a person → creates a `child` edge. The dot stays selected so several children can be added in a row. `Esc` or clicking empty space exits. |
| Erase (E) | Click a couple dot → removes the couple and its child edges. Click a child edge → removes it. |
| Undo (⌘/Ctrl+Z), Redo (⌘/Ctrl+Shift+Z) | See §6. |

No right-click menus anywhere; every action goes through the toolbar.

### Connection rules

Enforced at creation time, independent of the solution. An invalid click does nothing, silently.

- No couple of a person with themselves.
- No two couples with the same two members.
- A person can be the child of at most one couple dot.
- A person cannot be the child of a couple they are a member of.
- A person may be a member of several couples (remarriage is part of the game).

## 5. Clue panel

Fixed left panel, resizable. Two views: a list (icon per `kind` + `title`) and a detail view that replaces the list with a back button. No "read" marker: rereading clues is expected.

Rendering:

- `letter` / `newspaper`: text over the `background` image (image covers the block, text inside a padded area). Without `background`, a default paper style for letters and a column style for newspapers.
- `photo`: the image, click for fullscreen, description below.
- `audio` / `video`: native `<audio>` / `<video>` player, description below, then the transcript in a collapsible block, open by default.

No search, no filter, no name highlighting in phase 1.

### Status bar

Top right of the board: level title, **Check** button, **Reset board** button (with a confirmation dialog), **Hints** menu with two checkboxes, *Show progress* and *Show mistakes*, both unchecked by default and persisted. When checked, the progress bar and the mistake counter appear in the status bar.

## 6. Game state, undo/redo, persistence

Zustand store holding: the loaded level, the board (positions, couples with type/members/children), the active tool, the pending selection (first clicked person or dot), the undo/redo history, the hint toggles.

Undo/redo covers link actions (create / delete / retype a couple, add / remove a child) and node moves. History lives in memory only and is cleared when leaving the level. Reset board clears the board and the history after the confirmation.

`localStorage` key `genealogic-save`:

```jsonc
{
  "version": 1,
  "completed": ["tutorial", "level-1"],
  "boards": {
    "level-2": {
      "positions": { "marie": { "x": 0, "y": 0 }, "c1": { "x": 120, "y": 40 } },
      "couples": [ { "id": "c1", "type": "married", "members": ["marie", "paul"], "children": ["lea"] } ]
    }
  },
  "hints": { "showProgress": false, "showMistakes": false },
  "theme": "detective-board"
}
```

Saved on every board change. A `version` field allows migrations later; an unknown version is discarded.

## 7. Scoring and completion

Pure function `scoreBoard(board, solution)` in `src/scoring/`.

Both the board and the solution are normalised to a set of atoms:

- couple atom: `couple:{a}:{b}:{type}` with `a`, `b` sorted
- child atom: `child:{a}:{b}:{child}` with `a`, `b` sorted, **no type**

Result:

- `correct` = board atoms present in the solution
- `mistakes` = board atoms absent from the solution
- `missing` = solution atoms absent from the board
- `total` = number of solution atoms
- `complete` = `mistakes === 0 && missing === 0`

Consequences:

- Right pair, wrong type (e.g. Divorced instead of Married): one mistake for the couple atom; children of that dot still count as correct because child atoms ignore the type.
- Wrong pair: the couple atom and every child atom under it are mistakes.

Display: progress bar = `correct / total`; counter = `mistakes`. **Check** shows the victory overlay if `complete`, otherwise the neutral message "Not quite yet." with no numbers.

Recomputed on every board change.

## 8. Tutorial

The tutorial is a separate, optional level (`tutorial: true` in `index.json`), shown first in the menu with a distinct colour, always accessible. It is a real level (three people: a married couple and their child, two clues) with a `tutorial` array in its JSON. The mechanism is generic: any level may carry a `tutorial` array.

Step shape:

```jsonc
{ "text": "Open the letter on the left.",                    "highlight": "clue:k1",      "until": "clueOpened:k1" },
{ "text": "Select the Married tool.",                        "highlight": "tool:married", "until": "toolSelected:married" },
{ "text": "Click Marie, then Paul.",                         "highlight": "person:marie", "until": "coupleCreated:marie:paul" },
{ "text": "Select the Child tool, click the dot, then Léa.", "highlight": "tool:child",   "until": "childLinked:lea" },
{ "text": "Press Check when you think the tree is complete.", "highlight": "check",       "until": "checked" }
```

- `text` shows in a bubble anchored to the `highlight` element, which gets a halo. Without `highlight`, the bubble is centred with a **Next** button and `until` is `next`.
- `highlight` targets: `clue:<id>`, `tool:<tool>`, `person:<id>`, `check`.
- `until` events, closed list for phase 1: `next`, `clueOpened:<id>`, `toolSelected:<tool>`, `coupleCreated:<a>:<b>` (order irrelevant), `childLinked:<id>`, `checked`.
- The board stays fully usable while the tutorial runs; it guides, it does not block. A **Back to menu** button is always available.

## 9. Themes

Five colour themes, selected from the menu and from the status bar, persisted in the save. Implemented as CSS custom properties on `:root[data-theme="…"]`; no gameplay impact. Couple types are distinguished by the dot label, never by colour alone, so every theme stays readable.

| id | Name | Mood | Background | Person cards | Links / accent |
|---|---|---|---|---|---|
| `detective-board` (default) | Detective Board | cork board, red string | light brown cork | cream index cards, paper shadow | red string, pins |
| `old-archive` | Old Archive | civil registers, sepia | yellowed paper | ivory cards, brown border | brown ink, burgundy accent |
| `night-office` | Night Office | dark, desk lamp | deep blue-grey | slate, light text | amber |
| `blueprint` | Blueprint | architect's plan | Prussian blue, fine grid | white outline, transparent fill | white lines, cyan accent |
| `noir` | Noir | film noir, pure contrast | charcoal | off-white, sharp border | light grey, single blood-red accent |

## 10. Screens and navigation

1. **Menu**: game title, then the level list. Tutorial first, distinct colour, always playable. Then the levels: level 1 unlocked from the start, each next level unlocked when the previous one is completed. Completed levels are ticked and replayable; locked levels are greyed out.
2. **Game**: clue panel + board + status bar, **Menu** button.
3. **Victory**: overlay on the game with **Next level** and **Menu**.

## 11. Project structure

```
src/
  app/        screens (Menu, Game, Victory overlay), routing
  levels/     Zod schema, loader, consistency checks
  board/      React Flow nodes, edges, toolbar, connection rules
  clues/      clue panel and per-kind renderers
  game/       Zustand store: board, tool, selection, undo/redo, hints
  scoring/    scoreBoard() and atom normalisation
  tutorial/   step engine, bubbles, events
  save/       localStorage read/write, versioned migration
public/levels/
  index.json
  tutorial/   level.json + media
  level-1/    level.json + media
```

## 12. Testing

Vitest, TDD.

- `scoring`: right pair / wrong type, wrong pair with children, extra couple, missing child, empty board, complete board.
- `levels`: a valid level passes; each consistency rule rejects its counterexample.
- `game`: connection rules (self-couple, duplicate pair, double parenthood, remarriage allowed), retyping keeps children, undo/redo of each action, reset clears history.
- `save`: round-trip, unknown version discarded, unknown theme falls back to the default.
- `tutorial`: steps advance on their `until` event and ignore others.
- `app`: smoke test with Testing Library, the tutorial level loads and shows its names and clue titles.

No E2E in phase 1.

## 13. Deliverable content

- The tutorial level (three people, two clues).
- Level 1: about ten people, at least one clue of each kind, in English. The puzzle itself is written together with the author after the engine works.
