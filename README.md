# Lingo Toolbox

An open-source set of language-learning tools — not a course. Pick a language
workspace and move between tools that practise and consolidate what you've
already met elsewhere.

**Live:** https://vgomx.github.io/lingotoolbox/
**Design system:** [vgomx/lingo-ds](https://github.com/vgomx/lingo-ds) ·
[component showcase](https://vgomx.github.io/lingo-ds/)

Everything runs in the browser. There is no server, no account, and no paid
tier; your cards live in IndexedDB on your own machine.

## What works today

| Tool | State |
| --- | --- |
| **Flashcards** | Built — decks, card CRUD, and a review session on a local SM-2 scheduler |
| Etymology Explorer | Designed, empty state only |
| Conjugation Drill | Designed, empty state only |
| Phrasebook | Designed, empty state only |
| Grammar Notes | Designed, empty state only |

The marketing landing page at `/` and the dark product shell at `/app` are both
complete, as is the light/dark theme parity across the whole shell.

## Running it

`lingo-ds` is consumed as a `file:` dependency rather than from a registry, so
**check it out as a sibling directory and build it first**:

```bash
git clone https://github.com/vgomx/lingo-ds
git clone https://github.com/vgomx/lingotoolbox
cd lingo-ds && npm install && npm run build
cd ../lingotoolbox && npm install && npm run dev
```

If `npm install` fails to resolve `lingo-ds`, it's because `lingo-ds/dist` is
missing — build the design system again.

| Script | Does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, build to `dist/`, copy `index.html` to `404.html` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc -b --noEmit` |

## Layout

```
src/
├─ data/       IndexedDB access, the scheduler, starter decks
├─ state/      the one store the app reads from
├─ shell/      rail, deck sidebar, top bar, language picker
├─ tools/      Flashcards, plus empty states for the other four
├─ marketing/  the light-theme landing page
└─ styles/     app-level CSS (everything visual comes from lingo-ds tokens)
```

There is no `src/assets/`. Brand artwork is imported straight from the package —
`import mark from 'lingo-ds/assets/logo/mark-violet.svg'` — so the app cannot
drift from the design system by holding a stale copy. The one exception is the
favicon, which has to be a real file at a fixed URL: `npm run sync:assets`
copies it into `public/` and runs automatically before `dev` and `build`, so it
is generated rather than committed.

## The scheduler

`src/data/scheduler.ts` is SM-2 adapted to the four grades the design's
`ReviewRating` emits. New cards step `1m · 6m · 1d · 4d`; once a card graduates,
intervals come from its ease factor and the labels under the grade buttons show
the real numbers rather than fixed copy. Grading writes the card's new state and
a review-log entry in a single IndexedDB transaction, so a card can never
advance unrecorded.

## Installing it

The app is a PWA: `vite-plugin-pwa` generates a manifest and a Workbox service
worker that precaches the build, so it can be added to a home screen or dock and
opened in its own window with no connection.

Icons are generated from the design system's app-icon lockup by
`npm run build:icons`, committed as a script rather than as binaries dropped in
by hand. `registerType` is `autoUpdate`: a new deploy simply becomes the app on
the next visit, since a static build has no versioning story worth prompting
about.

The one gap is type. The fonts still come from Google Fonts via `@import` in
`lingo-ds/tokens/fonts.css`, so they are cached at runtime rather than
precached — offline works from the **second** visit. Self-hosting the `.woff2`
files, which the design brief already recommends, would make it work from the
first, and is the remaining piece.

## Notes for future work

- **Self-hosted fonts.** See above — the last thing standing between this and a
  genuinely offline first load. Also fixes the licence question, since OFL text
  must ship alongside redistributed font files.
- **Import/export.** There is a reset in Settings but no deck import or export
  yet, so data is trapped in one browser.
- **Routing on Pages.** `dist/404.html` is a copy of `index.html` so deep links
  boot the SPA. Pages still returns a 404 status for them; the page renders.
- **Vite + the linked package.** `vite.config.ts` sets `resolve.dedupe` for
  react/react-dom and excludes `lingo-ds` from dependency optimisation. Both are
  required — without dedupe the production build ships two copies of React and
  renders a blank page.

## Licences

MIT licensed. The full notices for everything the app ships are in
`src/legalNotices.ts` and surfaced in the app under Settings → Legal. Only
things that actually reach the browser are listed — build tooling never ships,
so it carries no obligation to end users.

Icons are [Lucide](https://lucide.dev) (ISC; 22 of the 76 are Feather-derived
and additionally MIT, © Cole Bemis). Typefaces are Baloo 2, Nunito Sans and
JetBrains Mono, requested from Google Fonts at runtime rather than
redistributed — self-hosting them makes the OFL text a shipping requirement.
[OpenMoji](https://openmoji.org) (CC BY-SA 4.0) is *not* currently bundled; if
illustrations get used, its attribution becomes an obligation and belongs in
`legalNotices.ts`.
