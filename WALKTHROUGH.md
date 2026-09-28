# DATAPULSE: a beginner's walkthrough

This guide explains how the code works, one step at a time.

**What you need to know already:** basic JavaScript — variables, functions, objects, arrays, and arrow
functions like `(x) => x + 1`. Everything else (React, TypeScript, SQL, the libraries) is explained when it
first comes up. Words in **bold** are also in the [glossary](#glossary) at the bottom, if you forget one.

**Tip:** keep the app running while you read, so you can try things as they're explained.

```sh
npm install
npm run dev
```

Then open the address it prints (usually `http://localhost:5173`).

---

## Contents

1. [What the app does](#1-what-the-app-does)
2. [Five ideas to know first](#2-five-ideas-to-know-first)
3. [The big picture](#3-the-big-picture)
4. [Which files matter](#4-which-files-matter)
5. [Example 1: follow a SELECT from click to screen](#5-example-1-follow-a-select-from-click-to-screen)
6. [Example 2: how a DELETE knows which rows to animate](#6-example-2-how-a-delete-knows-which-rows-to-animate)
7. [A closer look at the store](#7-a-closer-look-at-the-store)
8. [Modes, scopes and blocks](#8-modes-scopes-and-blocks)
9. [The rest of the screen](#9-the-rest-of-the-screen)
10. [Patterns you'll keep seeing](#10-patterns-youll-keep-seeing)
11. [Try it yourself](#11-try-it-yourself)
12. [Glossary](#glossary)
13. [What to read next](#what-to-read-next)

---

## 1. What the app does

From the user's side:

1. You pick a table, like `customers`.
2. You build a query by **clicking**, not typing: choose "READ", add a filter like `city = Mumbai`, and so on.
3. The app writes the SQL for you and shows it.
4. You press **EXECUTE**. The SQL runs against a real database that lives inside your browser tab.
5. The results appear with animations that show what changed. Deleted rows get crossed out, updated values
   scramble into their new values, and so on.
6. Reload the page and the data resets to how it started.

---

## 2. Five ideas to know first

### 2.1 Components: functions that describe the screen

This app is built with **React**. In React, the screen is made of **components**. A component is just a
function that returns what should appear on screen, written in **JSX** (HTML-like tags inside JavaScript).

Here's a simplified version of [QueryChain.tsx](src/components/workspace/builder/QueryChain.tsx), which
shows the little `SELECT → WHERE` chips:

```tsx
function QueryChain() {
  const chain = useDbStore((s) => s.activeChain) // e.g. ['SELECT', 'WHERE']

  if (chain.length === 0) {
    return <p>pick a table to start composing a query</p>
  }
  return <div>{chain.map((step) => <span>{step}</span>)}</div>
}
```

The key idea: **you never change the screen by hand.** You change the *data*, and React calls the component
function again (a **re-render**) and updates the screen to match.

### 2.2 State: data that can change

**State** is any data that can change while the app runs: which table is picked, what the current SQL
is, what the last result was.

The whole app runs on one loop:

```
you click something  →  state changes  →  React re-renders the components that use it  →  screen updates
```

### 2.3 The store: one shared place for state

Almost all of this app's state lives in one place called the **store**:
[src/state/store.ts](src/state/store.ts). It's made with a small library called **Zustand**.

Think of the store as a shared whiteboard. Any component can read from it. Components change it only by
calling the store's functions, which are called **actions**.

Reading from the store:

```tsx
const table = useDbStore((s) => s.builder.table)
// "Give me builder.table from the store — and re-render me whenever it changes."
```

Changing the store:

```tsx
const setTable = useDbStore((s) => s.setTable) // get the action
setTable('customers')                          // call it
```

### 2.4 A real database, inside the browser

**SQLite** is a small but real SQL database. **sql.js** is SQLite converted to **WebAssembly**, a format
that lets code written in other languages run inside a browser. So there's no server: the database lives
in your tab's memory and disappears when you close it.

**A tiny SQL refresher.** A table has columns (like `name`, `city`) and rows (one per customer). There are
four kinds of statements for working with rows:

| Statement | What it does | Example |
|---|---|---|
| `SELECT` | read rows | `SELECT * FROM customers WHERE city = 'Mumbai';` |
| `INSERT` | add a row | `INSERT INTO customers (name) VALUES ('Asha');` |
| `UPDATE` | change rows | `UPDATE orders SET status = 'paid' WHERE id = 3;` |
| `DELETE` | remove rows | `DELETE FROM orders WHERE status = 'cancelled';` |

`WHERE` picks which rows a statement affects. There are also statements that change the *tables
themselves* rather than the rows in them: `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`. These are called
**DDL**.

### 2.5 TypeScript: JavaScript plus labels

The files end in `.ts` / `.tsx` because they're **TypeScript**: JavaScript plus descriptions of what shape
the data has. For example:

```ts
interface Condition {
  column: string            // always a string
  operator: '=' | '!=' | '>' // one of these exact strings (list shortened)
  value: string
}
```

Types are checked while you write code and then stripped out, so they don't *do* anything when the app
runs. When you see `interface Something { … }`, just read it as "here's what this object looks like."

---

## 3. The big picture

The code has four layers. A restaurant is a handy comparison:

```
   components/              state/store.ts             lib/                       sql.js
 ┌──────────────┐  read   ┌───────────────┐  asks   ┌────────────────────┐  runs  ┌───────────────┐
 │ what you see │◀───────▶│  the store    │────────▶│  plain functions   │───────▶│   SQLite      │
 │ and click    │ actions │ (all state)   │         │  that do the work  │        │   database    │
 └──────────────┘         └───────────────┘         └────────────────────┘        └───────────────┘
   dining room              order board               kitchen                       pantry
```

- **components/**, the dining room: what you see and click. They show data and pass on your clicks, but
  don't do any real work.
- **state/store.ts**, the order board: the single place where the current order (the query being built)
  and the last result are written down.
- **lib/**, the kitchen: plain functions that do the real work, like writing the SQL and running it. They
  never touch the screen.
- **sql.js**, the pantry: where the data actually lives.

A click always travels the same way: **component → store action → lib function(s) → store saves the result
→ components re-render.**

The code sticks to three rules:

1. **All state lives in the store.** Components don't pass data to each other directly.
2. **Real logic lives in `lib/` as plain functions.** They take input and return output. No React, no
   screen. You can read and understand each one on its own.
3. **Nothing is faked.** The SQL you see is exactly what runs. The timings are measured, and the "query
   plan" comes from SQLite itself. Animations only change *when* things appear, never *what* appears.

---

## 4. Which files matter

You don't need to read everything. Roughly a third of the code is decoration: the intro screen, animations
and sounds.

**Core — read these to understand the app:**

| File | What it is |
|---|---|
| [src/state/store.ts](src/state/store.ts) | the store: all state and all actions |
| [src/lib/query/types.ts](src/lib/query/types.ts) | the shape of a query being built (`BuilderState`) |
| [src/lib/query/builder.ts](src/lib/query/builder.ts) | turns a `BuilderState` into SQL text |
| [src/lib/db/engine.ts](src/lib/db/engine.ts) | loads the database and runs SQL |
| [src/lib/db/rowChanges.ts](src/lib/db/rowChanges.ts) | works out which rows a statement changed |
| [src/components/workspace/builder/](src/components/workspace/builder/) | the clickable query-building blocks |
| [src/components/workspace/results/](src/components/workspace/results/) | the results table |

**Supporting — useful, read when curious:**

| File | What it is |
|---|---|
| [src/lib/db/seed.ts](src/lib/db/seed.ts) | the starting data (customers, products, orders) |
| [src/lib/db/schema.ts](src/lib/db/schema.ts) | reads the list of tables and columns from the database |
| [src/lib/db/explainPlan.ts](src/lib/db/explainPlan.ts) | asks SQLite how it will run a query |
| [src/lib/query/blocks.ts](src/lib/query/blocks.ts) | decides which blocks to show |
| [src/lib/query/columns.ts](src/lib/query/columns.ts) | decides which columns the dropdowns offer |
| [src/lib/query/join.ts](src/lib/query/join.ts) | guesses how two tables connect for a JOIN |
| [src/lib/query/highlight.ts](src/lib/query/highlight.ts) | colours SQL keywords |
| [src/components/workspace/](src/components/workspace/) (other folders) | trace, history, schema and query panels |

**Decoration — safe to skip at first:**

| File | What it is |
|---|---|
| [src/components/landing/](src/components/landing/) | the intro screen and its 3D grid |
| [src/components/transition/](src/components/transition/) | the tile animation between intro and workspace |
| [src/lib/animation/scramble.ts](src/lib/animation/scramble.ts) | the "letters scrambling into place" effect |
| [src/lib/sound/](src/lib/sound/) | sound effects |
| [src/lib/trace/timing.ts](src/lib/trace/timing.ts) | shared animation timing |
| [src/components/workspace/CoachMark.tsx](src/components/workspace/CoachMark.tsx) | the "pick a table" hint for first-time users |
| [src/index.css](src/index.css) | fonts, colours, a few global styles |

---

## 5. Example 1: follow a SELECT from click to screen

**Goal:** show the customers who live in Mumbai. Let's follow the data through the code.

### Step 1: you pick the `customers` table

The table dropdown is [TableSelector.tsx](src/components/workspace/builder/TableSelector.tsx). The
important part (simplified):

```tsx
<select onChange={(e) => setTable(e.target.value)}>
```

When you pick a table, it calls the store action `setTable('customers')`. In
[store.ts](src/state/store.ts):

```ts
setTable: (table) => resetBuilder({ mode: get().builder.mode, scope: get().builder.scope, table }),
```

In words: "start a fresh query, keeping the current mode and scope, on this new table."

### Step 2: the store writes the SQL

Every change to the query, without exception, ends up in this small function at the top of the store:

```ts
const setBuilder = (builder: BuilderState) => {
  const { sql, chain } = generateQuery(builder, get().schema)
  set({ builder, generatedSql: sql, activeChain: chain })
}
```

In words:

1. `builder` is the new description of the query being built.
2. `generateQuery` (from [lib/query/builder.ts](src/lib/query/builder.ts)) turns that description into SQL
   text, plus the list of clause names for the chips.
3. `set(...)` saves all three into the store.

Since this is the *only* way the query can change, the SQL on screen always matches the blocks.

**What does `builder` look like?** It's a plain object. The `BuilderState` type in
[types.ts](src/lib/query/types.ts) lists every field. Right now it's roughly:

```ts
{ mode: 'READ', scope: 'TABLE', table: 'customers', where: [], orderBy: [], limit: null, /* … */ }
```

and `generateQuery` turns it into:

```sql
SELECT *
FROM customers;
```

### Step 3: the SQL appears

[GeneratedSql.tsx](src/components/workspace/query/GeneratedSql.tsx) reads `generatedSql` from the store:

```tsx
const sql = useDbStore((s) => s.generatedSql)
```

Because it's subscribed, React re-rendered it the moment `setBuilder` saved new SQL, with no extra code.
The chips above the blocks (QueryChain) now show `SELECT`.

### Step 4: you add a filter

In the WHERE block you click **+ add condition**, then choose `city`, `=`, and type `Mumbai`. Each of those
calls a store action (`addWhereCondition`, then `updateWhereCondition`), and each one goes through
`setBuilder` again. Now `builder.where` holds:

```ts
[{ id: 'cond-1', column: 'city', operator: '=', value: 'Mumbai', connector: 'AND' }]
```

Inside `generateQuery`, the SELECT builder (`buildSelect`) adds a WHERE line only if there's something to
add:

```ts
const whereClause = buildConditionClause(state.where, schema, state.table)
if (whereClause) {
  sql += `\nWHERE ${whereClause}`
  chain.push('WHERE')
}
```

So the SQL becomes:

```sql
SELECT *
FROM customers
WHERE city = 'Mumbai';
```

Two small details:

- **Why the quotes around `'Mumbai'`?** The code looks up the column's type. `city` is a TEXT column, so
  the value gets quotes. For a number column like `id` it would write `id = 3`, with no quotes. (This
  happens in `formatLiteral` in [builder.ts](src/lib/query/builder.ts).)
- A condition only counts once it has *both* a column and a value. Half-filled rows are skipped, so the SQL
  is never broken while you're still typing.

### Step 5: you press EXECUTE

[ExecuteButton.tsx](src/components/workspace/query/ExecuteButton.tsx) calls the store's `execute()` (you
can also press Ctrl+Enter, or ⌘+Enter on a Mac). Simplified, `execute()` does three things:

1. **Asks SQLite how it plans to run the query.** This is called
   [EXPLAIN QUERY PLAN](src/lib/db/explainPlan.ts). The answer here is `SCAN customers`, meaning "read
   every row of customers."
2. **Runs the SQL for real**, timing how long it takes ([engine.ts](src/lib/db/engine.ts)). The result is
   3 rows.
3. **Saves everything into the store:** the result (`lastOutcome`), the plan (`lastTrace`), a new history
   entry, and a counter called `lastExecutionId`, which goes up by one.

### Step 6: the screen reacts

Several components read those values, so they all re-render on their own:

- The **trace panel** prints `$ SELECT *`, then `> SCAN customers`, then something like
  `-- 3 row(s) in 0.21ms`.
- The **results panel** fades in a table with the 3 Mumbai customers.
- The **history panel** gets a new entry at the top.

`lastExecutionId` works like a doorbell. Each panel notices the number changed, and plays its animation
once for that run.

That's the whole app in miniature. Everything else is more of the same pattern.

---

## 6. Example 2: how a DELETE knows which rows to animate

**Goal:** delete the cancelled orders. You pick mode **DELETE**, table `orders`, and add
`status = cancelled`. The SQL is:

```sql
DELETE FROM orders
WHERE status = 'cancelled';
```

**The puzzle:** after a DELETE, the deleted rows are *gone*. So how can the app show them being crossed
out?

**The answer:** it takes a snapshot before and after, like before-and-after photos. This happens in
[rowChanges.ts](src/lib/db/rowChanges.ts):

1. **Before:** it reads the rows that are about to be deleted, using the exact same WHERE clause:
   `SELECT rowid, * FROM orders WHERE status = 'cancelled'`. This finds order 12. (**rowid** is SQLite's
   hidden row number, a permanent ID for each row.)
2. **Run** the real DELETE. This is the only step that's timed.
3. **After:** it reads the whole `orders` table again. There are 17 rows left.
4. **Combine:** it puts order 12 back into the list at its old position, marked `affected: true`. The 17
   survivors are marked `affected: false`.

[RowAnimatedTable.tsx](src/components/workspace/results/RowAnimatedTable.tsx) then draws all 18 rows. The
17 untouched rows sit still, so you can see *where* the deleted row was. Order 12 flashes red, shakes, gets
crossed out and collapses away.

UPDATE and INSERT use the same trick:

| Statement | How the app finds the changed rows | What you see | Sound |
|---|---|---|---|
| SELECT | it's simply the result | rows fade in one by one | blip |
| INSERT | `last_insert_rowid()` gives the new row's ID | the new row springs open | spawn |
| UPDATE | compare before-values with after-values, by rowid | amber glow; only changed cells scramble | upgrade |
| DELETE | the before-snapshot has the rows that are now gone | red flash, shake, strike-through, collapse | kill |

Two notes:

- The before-snapshot uses *the same WHERE text* as the real statement (`buildConditionClause` is shared),
  so it can never grab different rows than the ones actually deleted.
- This only happens for row statements on a single table. A SELECT already returns its rows, and
  CREATE/ALTER/DROP TABLE don't change rows.

---

## 7. A closer look at the store

Open [store.ts](src/state/store.ts). From top to bottom:

1. **`interface DbStoreState`** is the list of everything in the store, data and actions. It's the best
   place to start: it's the table of contents for the whole app's state.
2. **Three helpers**, all about changing the query being built:
   - `setBuilder(builder)` saves a new query and regenerates its SQL. You met it in
     [Example 1](#step-2-the-store-writes-the-sql).
   - `updateBuilder(change)` changes a few fields and keeps the rest. Most actions use this. For example,
     `setLimit: (limit) => updateBuilder(() => ({ limit }))` means "change the limit, keep everything else."
   - `resetBuilder(keep)` starts a blank query, keeping only what you pass in. It's used when you switch
     mode, scope or table, because the old filters might mention columns the new table doesn't have.
3. **The starting values** (`db: null`, `history: []`, …).
4. **`init`** starts the database (see [section 9](#starting-up)).
5. **`execute`** runs the query (see [Example 1, step 5](#step-5-you-press-execute)).
6. **All the other actions**, mostly one line each.

---

## 8. Modes, scopes and blocks

The builder has two sets of buttons at the top:

- **Mode** is *what to do*: CREATE (add), READ (look), UPDATE (change) or DELETE (remove).
- **Scope** is *what to work on*: **TABLE** means rows in one table, and **DATABASE** means across tables,
  or the tables themselves.

Together they decide which **blocks** (the sections you fill in) appear. This table lives in
[blocks.ts](src/lib/query/blocks.ts):

| Mode | TABLE scope | DATABASE scope |
|---|---|---|
| CREATE | VALUES → makes an `INSERT` | CREATE TABLE (a brand new table) |
| READ | WHERE, GROUP BY, HAVING, ORDER BY, LIMIT → makes a `SELECT` | the same, plus JOIN (combine two tables) |
| UPDATE | SET, WHERE → makes an `UPDATE` | ALTER TABLE (add or rename a column) |
| DELETE | WHERE → makes a `DELETE` | DROP TABLE (delete a whole table) |

[BuilderPanel.tsx](src/components/workspace/builder/BuilderPanel.tsx) asks `availableBlocks(mode, scope)`
which blocks to show, and draws each one.

**Every block component follows the same simple pattern** (they're in
[builder/blocks/](src/components/workspace/builder/blocks/)):

1. Read `builder` from the store.
2. Show some inputs.
3. When an input changes, call a store action.

Blocks don't keep any data of their own. A few worth knowing:

- **WhereBlock** and **HavingBlock** both reuse
  [ConditionListBlock.tsx](src/components/workspace/builder/blocks/ConditionListBlock.tsx) for their rows of
  `column operator value`.
- **JoinBlock** guesses how two tables connect by their names. For example, `orders.customer_id` matches
  `customers.id` ([join.ts](src/lib/query/join.ts)).
- **DropTableDdlBlock** makes you tick a confirm box before EXECUTE unlocks, because dropping a table is
  drastic.

---

## 9. The rest of the screen

### Starting up

1. [main.tsx](src/main.tsx) starts React and shows [App.tsx](src/App.tsx).
2. App first shows the **intro screen** ([Landing.tsx](src/components/landing/Landing.tsx)): typed boot
   messages, a wordmark drawn from box characters, and a 3D grid behind it
   ([DataGridScene.tsx](src/components/landing/DataGridScene.tsx)).
3. Clicking `$ ./start` plays a tile animation
   ([TransitionOverlay.tsx](src/components/transition/TransitionOverlay.tsx)). When the tiles fully cover
   the screen, App swaps the intro for the workspace underneath.
4. The workspace ([WorkspaceLayout.tsx](src/components/workspace/WorkspaceLayout.tsx)) calls the store's
   `init()`, which:
   - loads SQLite ([engine.ts](src/lib/db/engine.ts)),
   - creates a database and fills it with the starting data ([seed.ts](src/lib/db/seed.ts)),
   - reads back the list of tables and columns ([schema.ts](src/lib/db/schema.ts)).

   While that happens, you see "mounting query engine ...".

### The workspace panels

| Where | Panel | What it shows |
|---|---|---|
| left, top | `exec_log` | the last run: query plan (TracePanel), then results (ResultsPanel) |
| left, bottom | `history` | everything you've run; click one to load it back into the builder |
| middle | `schema/` | the live list of tables and columns; click a table name to pick it |
| right, top | `query` | the builder blocks |
| right, bottom | `query.sql` | the generated SQL and the EXECUTE button |

A few extra details:

- **History** saves a copy of the builder with every run. Clicking an entry puts that copy back, and the
  blocks refill themselves ([HistoryList.tsx](src/components/workspace/history/HistoryList.tsx)).
- **The schema panel** draws a curved line between two tables when you JOIN them. It measures where the
  two names are on screen to know where to draw
  ([SchemaTree.tsx](src/components/workspace/schema/SchemaTree.tsx)).
- **The first-time hint** "pick a table to start" points at the table dropdown until you've picked a table
  once. It remembers that in **localStorage**, so it won't nag you on your next visit
  ([CoachMark.tsx](src/components/workspace/CoachMark.tsx),
  [coachState.ts](src/lib/onboarding/coachState.ts)).
- **The sound toggle** (♪ in the top-left panel) mutes the effects, and also remembers your choice in
  localStorage ([SoundToggle.tsx](src/components/workspace/SoundToggle.tsx)).

---

## 10. Patterns you'll keep seeing

These pop up in many files. Once you recognise them, the code reads much faster.

**Animations are set up in `useEffect` and cleaned up afterwards.** You'll often see this shape:

```tsx
useEffect(() => {
  const ctx = gsap.context(() => {
    // build the animation here
  })
  return () => ctx.revert() // cleanup: stop the animation and undo its styles
}, [])
```

`useEffect` means "run this after the component is on screen." The function it returns runs when the
component goes away. **GSAP** is the animation library, and `gsap.context` groups the animations so a
single `revert()` can clean them all up.

**Respecting "reduce motion".** Some people get dizzy from animation, so operating systems have a "reduce
motion" setting. Every animation checks for it:

```ts
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

If it's on, the animation jumps straight to the end.

**`key={executionId}` means a fresh start.** React uses the `key` prop to tell components apart. Change a
component's key and React throws the old one away and builds a new one. ResultsTable gives the results
table `key={executionId}`, so every run gets a brand-new table and its animation starts from the beginning.

**Heavy code loads late.** The 3D library (three.js) and the sound library (Tone.js) are big. They're only
downloaded when first needed (`React.lazy` and `import(...)`), so the app starts faster.

**Styling with Tailwind.** Classes like `text-xs border border-border bg-panel-2` are **Tailwind**: each
class is one small style ("extra-small text", "a border", "the panel-2 background colour"). The colour
names (`bg`, `text`, `muted`, `accent`, `accent2`, …) are defined in the `@theme` block of
[index.css](src/index.css).

**Long comments explain *why*.** Many functions have a comment above them explaining a decision or a bug
it avoids. When some code looks odd, read the comment above it first.

---

## 11. Try it yourself

Small experiments are the fastest way to learn a codebase. Each one takes a few minutes. The app reloads
automatically when you save a file.

1. **Watch the store change.** In [store.ts](src/state/store.ts), add `console.log(builder)` as the first
   line inside `setBuilder`. Open your browser's DevTools console (F12) and click around the builder. You'll
   see the query description change with every click. Remove the line when you're done.

2. **Add yourself as a customer.** In [seed.ts](src/lib/db/seed.ts), find the last customer:
   `(12, 'Arjun Bhatt', 'Chennai', '2024-02-14');`. Change its `;` to a `,` and add a new line after it:
   `(13, 'Your Name', 'Your City', '2024-06-01');`. Reload the page, then READ from `customers`: you're in
   the database.

3. **Change the main colour.** In [index.css](src/index.css), change `--color-accent: #ffb020;` (amber) to
   another colour, e.g. `#ff5fa2`. Most of the interface changes with it.

4. **Slow down deletes.** In [RowAnimatedTable.tsx](src/components/workspace/results/RowAnimatedTable.tsx),
   find the `T` object near the top and change `collapse: 0.5` (inside `delete`) to `collapse: 2`. Delete a
   row and watch it collapse in slow motion.

5. **Colour more SQL keywords.** In [highlight.ts](src/lib/query/highlight.ts), add `'CREATE TABLE'`,
   `'ALTER TABLE'` and `'DROP TABLE'` to the `KEYWORDS` list. Then pick DELETE + DATABASE and see
   `DROP TABLE` light up in the SQL panel.

---

## Glossary

| Word | Meaning |
|---|---|
| **Action** | A function in the store that changes its state, e.g. `setTable`. |
| **Builder / `BuilderState`** | The object that describes the query being built: mode, scope, table, filters, and so on. Defined in [types.ts](src/lib/query/types.ts). |
| **Chain** | The list of clause names (`SELECT`, `WHERE`, …) shown as chips above the blocks. |
| **Component** | A function that returns what to show on screen. |
| **DDL** | SQL that changes tables themselves: `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`. |
| **EXPLAIN QUERY PLAN** | Asking SQLite "how would you run this?". It answers with steps like `SCAN customers`. |
| **GSAP** | The animation library. A *timeline* is a list of animation steps played in order. |
| **Hook** | A React function whose name starts with `use` (`useState`, `useEffect`, `useRef`, `useDbStore`). They can only be called inside components. |
| **JSX** | The HTML-like tags inside `.tsx` files, e.g. `<p>hello</p>`. |
| **`key`** | A prop that tells React which item is which. A new key makes React build a fresh component. |
| **Lazy loading** | Downloading a piece of code only when it's first needed. |
| **localStorage** | A small storage area in the browser that survives page reloads. |
| **Mode** | What the query does: CREATE, READ, UPDATE or DELETE. |
| **Props** | The inputs you pass to a component, like arguments to a function: `<Panel title="history">`. |
| **Pure function** | A function whose output depends only on its input and that changes nothing else. `generateQuery` is one. |
| **Ref (`useRef`)** | A box that holds a value between renders without triggering a re-render. It often holds a real page element so an animation can move it. |
| **Re-render** | React calling a component function again to update the screen after its data changed. |
| **rowid** | SQLite's hidden, permanent ID number for each row. |
| **Schema** | The list of tables and their columns. |
| **Scope** | What the query works on: TABLE (rows in one table) or DATABASE (across tables / the tables themselves). |
| **Seed** | The starting data put into the database every time the page loads. |
| **Selector** | The little function passed to `useDbStore`, like `(s) => s.builder.table`, that picks which piece of the store you want. |
| **SQLite / sql.js** | A real SQL database / that same database made to run inside a browser. |
| **State** | Data that can change while the app runs. |
| **Store / Zustand** | The one shared place that holds the app's state / the library it's made with. |
| **Tailwind** | A styling system where each CSS class is one small style, like `text-xs`. |
| **TypeScript / `interface`** | JavaScript plus type labels / a description of an object's shape. |
| **`useEffect`** | "Run this code after the component appears (and clean up when it goes away)." |
| **WebAssembly (WASM)** | A format that lets code written in other languages (like SQLite's C code) run in the browser. |

---

## What to read next

Once this guide makes sense, read these five files in this order:

1. [src/lib/query/types.ts](src/lib/query/types.ts): the shape of a query being built
2. [src/state/store.ts](src/state/store.ts): every action, and `execute()`
3. [src/lib/query/builder.ts](src/lib/query/builder.ts): how that shape becomes SQL
4. [src/lib/db/rowChanges.ts](src/lib/db/rowChanges.ts): the before-and-after snapshots
5. [src/components/workspace/results/RowAnimatedTable.tsx](src/components/workspace/results/RowAnimatedTable.tsx):
   how the rows are animated

The [README](README.md) has screenshots and the reasons behind a few bigger decisions (self-hosted fonts,
hosting on a subpath).
