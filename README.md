# Genealogic

A browser deduction game: rebuild a family tree from letters, newspaper clippings, photos, audio and video clues.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest
npm run build    # type-check + production build into dist/
```

## Add a level

Each level is a folder under `public/levels/`, with its media next to the JSON:

```
public/levels/
  index.json            # ordered list: [{ "id": "tutorial", "tutorial": true }, { "id": "level-1", "tutorial": false }]
  level-1/
    level.json          # people, solution, clues (see docs/superpowers/specs/ for the format)
    elena.jpg           # "src": "elena.jpg"        (photo)
    luca.mp3            # "src": "luca.mp3"         (audio, with "transcript")
    clara.mp4           # "src": "clara.mp4"        (video, with "transcript")
    paper.png           # "background": "paper.png" (letters / newspapers)
```

Relative `src`/`background` values resolve inside the level folder; absolute `https://…` URLs are used as-is, which is handy for large media. The level is validated when it loads — an inconsistent file shows an error screen naming the rule it broke.

Levels unlock in `index.json` order; the tutorial is always playable.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: tests, build, and publish to GitHub Pages. Enable it once in the repository settings: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflow sets the Vite base path to `/<repository name>/` automatically (or `/` for a `*.github.io` repository).
