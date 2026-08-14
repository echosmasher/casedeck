# Deployment

CaseDeck is a static export (`next build` with `output: "export"`) — no server-side code, no API
routes, no environment variables required to run it. Every deployment tier below is a variation on
"serve these static files," because the app itself never assumes anything else.

There are three tiers, in increasing order of commitment. Pick the one that matches what you
actually need — most people evaluating or personally using CaseDeck want tier 1.

## Tier 1 — Live demo / one-click Vercel fork

The fastest way to see or use CaseDeck. Fork the repo, connect it to Vercel (framework preset:
Next.js — Vercel detects the static export automatically), deploy. No configuration, no secrets,
no database.

```bash
pnpm install
pnpm build     # static export to out/
```

The deployed app boots with the Example Group demo pre-loaded (see `demo/README.md`) and a
Planner/Viewer role switcher. If you want it as your own tool rather than a demo, use `/setup`
(see `HANDBOOK.md`) to replace the demo data with your own project — this happens entirely in your
browser's IndexedDB, so forking the repo doesn't publish your real budget numbers anywhere; only the
demo data is checked into the repo itself.

**What this tier is good for:** trying the tool, sharing a link with someone else, or running it as
a single person's personal tool. What it is *not*: a way for two people to see the same live data —
see the local-first note below.

## Tier 2 — Company-internal static hosting

Build the static export and serve it from any internal web server (nginx, an S3 bucket + CDN, an
internal Vercel/Netlify project, a folder on a shared drive opened via `file://` — the app has no
server-side requirement at all).

```bash
pnpm build
# serve the out/ directory with any static file server
```

**What "local-first" actually means for multi-user expectations here — read this before deploying
company-internal.** CaseDeck's storage adapter persists to IndexedDB, which is scoped to one
browser profile on one device. Deploying the built app to a shared internal URL does **not** give
your team a shared database:

- Two people opening the same internal URL each get their own independent, empty (or
  independently-populated) local data store. Person A creating a project does not make it visible
  to Person B.
- There is no server-side persistence, so "the org's data" only exists as whatever's currently in
  each individual browser's IndexedDB, plus whatever `.json` snapshot files people manually export
  and hand to each other.
- The realistic internal workflow is: one person (typically the PM who owns the budget) is the
  actual editor, and periodically exports a snapshot JSON to hand to stakeholders — either as a file
  or, in v1, more concretely as the self-contained HTML business-case export (`src/export/`), which
  *is* meant to be handed around freely since it's a single static file with the data already baked
  in and read-only.
- If your team's actual need is "multiple people editing the same project's live data," this tier
  does not solve that — see tier 3.

This is the same tradeoff as any purely client-side local-first tool; it's not a limitation specific
to CaseDeck's implementation, but it's easy to assume "deployed to a shared URL" implies "shared
data," so it's worth being explicit about it before you rely on it that way.

## Tier 3 — Upgrade path: a real backend adapter (not shipped)

If tier 2's limitation is a real blocker — genuine concurrent multi-user editing, not just
handoff — the fix is a second `StorageAdapter` implementation backed by a real database
(Supabase/Postgres is the natural choice; sibling repo TaskDeck already has a working
Supabase + RLS setup that's a reasonable pattern to start from). This is designed as an interface
boundary specifically so this is possible:

```ts
// src/storage/storageAdapter.ts — the interface every implementation satisfies
interface StorageAdapter {
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  saveProject(project: Project): Promise<void>;
  deleteProject(id: string): Promise<void>;
  importSnapshot(snapshot: Snapshot): Promise<void>;
  exportSnapshot(): Promise<Snapshot>;
}
```

Swapping in a Supabase-backed implementation would need: a schema mirroring `src/engine/model.ts`'s
types, row-level security scoped to whatever auth model replaces the demo role switcher (see
`ROADMAP.md` item 2), and a real login flow — none of which exists today. `src/engine/` and
`src/import/` are untouched by this change either way, since neither imports from `src/storage/` in
the first place (engine purity — see `CLAUDE.md`).

This is a roadmap item, not a shipped feature. Nothing about it is designed in more detail than
what's written here; see `ROADMAP.md` item 8.
