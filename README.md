# DATAPULSE

A terminal for talking to your data — a cinematic, real-execution SQL lab. Every query you build actually
runs against a genuine SQLite database (via [sql.js](https://sql.js.org/), compiled to WebAssembly) directly
in your browser tab. Nothing is mocked and nothing is saved: the database is re-seeded fresh every time you
load the page, so it's a safe place to try CREATE/READ/UPDATE/DELETE — including schema changes like
`CREATE TABLE` / `ALTER TABLE` / `DROP TABLE` — without any real consequences.

## Running it locally

You need [Node.js](https://nodejs.org/) 20+ installed. From this folder:

```sh
npm install
npm run dev
```

Then open the URL it prints (typically `http://localhost:5173`). That's it — everything else, including the
database engine, runs entirely client-side; there's no backend to start.

Other useful commands:

```sh
npm run build     # type-check + production build, output to dist/
npm run preview   # serve the production build locally
npm run lint       # oxlint
```

## What it does

- **Landing** — a boot sequence and an ASCII wordmark (both computed at render time, never hand-typed),
  then `$ ./start`.
- **Workspace** — three panels:
  - **left**: the real execution trace (SQLite's own `EXPLAIN QUERY PLAN`, run as an actual query and timed
    with `performance.now()`) and the results, rendered as a box-drawn ASCII table with real column widths,
    row count, and elapsed time; below that, a short history of everything you've run this session, click
    any entry to restore it into the builder.
  - **middle**: the live schema, introspected straight from the running database (`sqlite_master` +
    `PRAGMA table_info`) — it can't drift from what's actually there, and updates immediately after any DDL.
  - **right**: the query builder — a CRUD mode (CREATE/READ/UPDATE/DELETE) × scope (TABLE/DATABASE) toggle
    composes the available blocks (WHERE, JOIN, GROUP BY, ORDER BY, SET, VALUES, or — at DATABASE scope for
    CREATE/UPDATE/DELETE — CREATE TABLE / ALTER TABLE / DROP TABLE), and the generated SQL underneath, with
    `EXECUTE` to run it for real.
- **Database-scope READ** composes a real `JOIN` across two tables, with a measured connector line drawn
  between them in the schema panel.
- **Database-scope CREATE/UPDATE/DELETE** are schema DDL: build a new table from scratch, add or rename a
  column on an existing one, or drop a table entirely (behind an explicit confirmation checkbox).

## Project structure

```
src/
  lib/
    db/       sql.js loading, seed data, live schema introspection, EXPLAIN QUERY PLAN parsing
    query/    pure SQL generation from builder state + live schema (no SQL string ever hand-assembled elsewhere)
    ascii/    the box-drawing table/wordmark renderers
    trace/    shared timing constants so the trace animation and results fade-in stay in sync
  state/      the single Zustand store — database engine + query builder
  components/
    landing/, transition/, workspace/   the three screens/phases of the app
```

## Notes

- Nothing persists between page loads by design — refresh and you get a fresh seeded database. That's the
  point: it's a safe sandbox for practicing destructive operations like `DROP TABLE`.
  `public/sql-wasm.wasm` is the sql.js WebAssembly binary the app loads at runtime; it's committed to the
  repo so `npm install` alone is enough to run it (no separate download step).

## Deploying

```bash
npm run build     # emits dist/
```

`dist/` is a fully static bundle — there's no server, no database to provision, and no environment
variables. Upload it to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages), or point the
host at this repo with build command `npm run build` and publish directory `dist`.

Assets are emitted with a **relative** base (`base: './'` in `vite.config.ts`), so the app works both at a
domain root and under a subpath like `username.github.io/<repo-name>/`. Two things depend on that and are
easy to break:

- Leaving the default `base: '/'` makes every script and stylesheet 404 under a subpath — a blank page with
  nothing obvious in the console to explain it.
- `public/sql-wasm.wasm` is fetched at runtime relative to that same base. Since that binary *is* the
  database, a wrong path doesn't degrade gracefully — the app stops at "failed to start query engine".

Both are verified against a real subpath deployment, not assumed.
