# How DATAPULSE works: explained for someone who knows SQL

This guide is for you if you know SQL but not JavaScript. It has four parts:

- **[Part 1](#part-1-how-it-works-no-code)** explains how the app works using only SQL and plain English.
  No JavaScript. If you understand Part 1, you understand the logic of the app.
- **[Part 2](#part-2-reading-the-real-code)** teaches you just enough JavaScript to read the important files,
  by comparing everything to SQL you already know.
- **[Part 3](#part-3-what-you-can-skip)** lists the files you can skip: animations, sounds and visual
  effects. They don't change what the app does.
- **[Part 4](#part-4-explaining-it-to-others)** helps you explain the app to other people, with a short
  script and answers to likely questions.

To try things while you read, run the app:

```sh
npm install
npm run dev
```

Then open the address it prints (usually `http://localhost:5173`).

---

## Part 1: How it works (no code)

### 1.1 The one-sentence version

> DATAPULSE is a **form that writes SQL for you**. It runs that SQL on a **real SQLite database inside
> your browser**, then shows the result, and for INSERT, UPDATE and DELETE it shows **exactly which rows
> changed**.

Everything below just explains that sentence in more detail.

### 1.2 The three pieces

```
  ┌──────────────────┐        ┌──────────────┐                 ┌───────────────────────┐
  │  the form        │        │  SQL writer  │   SQL text      │  SQLite database      │
  │  (you click      │ ─────▶ │              │ ──────────────▶ │  (inside the browser) │ ───▶ results
  │   blocks)        │        │              │  when you press │                       │
  └──────────────────┘        └──────────────┘     EXECUTE     └───────────────────────┘
```

1. **The form.** You never type SQL. You click: pick a table, add a filter, choose a sort, and so on.
2. **The SQL writer** turns the form into SQL text. It re-writes the SQL every time you change the form,
   so the SQL you see always matches the form.
3. **The database** runs the SQL when you press EXECUTE and hands back the results.

### 1.3 The database: real SQLite, inside your browser tab

The app uses **SQLite**, the same small database engine used inside phones and web browsers. A version of
it called **sql.js** runs directly inside the web page, so **there is no server**. The whole database lives
in your browser tab's memory.

Every time the app starts, it creates a brand-new, empty database and runs a setup script called the
**seed** (file: `src/lib/db/seed.ts`). It's plain SQL:

```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  joined TEXT NOT NULL
);

CREATE TABLE products ( id, name, category, price ... );
CREATE TABLE orders   ( id, customer_id, product_id, quantity, amount, status, ordered_at ... );

INSERT INTO customers (id, name, city, joined) VALUES
  (1, 'Aarav Mehta', 'Mumbai', '2023-01-14'),
  ...                                          -- 12 customers, 10 products, 18 orders
```

When you close or reload the tab, the database is thrown away, and the next visit starts fresh from the
seed. That's deliberate: you can experiment freely, even `DROP TABLE customers`, and a reload undoes it.

### 1.4 The form: what the app remembers about your query

While you click, the app keeps one record describing the query you're building. In the code it's called
the **builder**. Think of it as a single row with these fields:

| Field | Example value | What it means |
|---|---|---|
| `mode` | `READ` | what to do: CREATE, READ, UPDATE or DELETE |
| `scope` | `TABLE` | TABLE (rows in one table) or DATABASE (across tables, or tables themselves) |
| `table` | `customers` | the table you picked |
| `where` | `city = 'Mumbai'` | your WHERE conditions (a list) |
| `groupBy` | `status` | your GROUP BY columns |
| `groupByAggregate` | `COUNT(*)` | the aggregate added to the SELECT, if any |
| `having` | `status != 'cancelled'` | your HAVING conditions (a list) |
| `orderBy` | `city ASC` | your sorts (a list) |
| `limit` | `10` | your LIMIT |
| `join` | `customers ON orders.customer_id = customers.id` | your JOIN |
| `insertValues` | `name = 'Asha', city = 'Goa'` | the values to INSERT |
| `setValues` | `status = 'paid'` | the values to SET in an UPDATE |
| `newTableName`, `newTableColumns` | `suppliers`, `(id INTEGER, name TEXT)` | for CREATE TABLE |
| `alterAction`, … | `ADD COLUMN email TEXT` | for ALTER TABLE |
| `dropConfirmed` | yes / no | the "yes, drop it" checkbox for DROP TABLE |

Each **condition** (in `where` and `having`) has four parts: a `column`, an `operator` (`=`, `!=`, `>`,
`>=`, `<`, `<=`, `LIKE`), a `value`, and a `connector` (`AND` or `OR`) that joins it to the condition
before it.

### 1.5 Which parts of the form appear

The two sets of buttons at the top, **mode** and **scope**, decide which sections of the form you see:

| Mode | TABLE scope | DATABASE scope |
|---|---|---|
| CREATE | VALUES → an `INSERT` | CREATE TABLE |
| READ | WHERE, GROUP BY, HAVING, ORDER BY, LIMIT → a `SELECT` | the same, plus JOIN |
| UPDATE | SET, WHERE → an `UPDATE` | ALTER TABLE (add or rename a column) |
| DELETE | WHERE → a `DELETE` | DROP TABLE |

So TABLE scope means working on rows. DATABASE scope means a JOIN when reading, or changing the tables
themselves (CREATE / ALTER / DROP TABLE) otherwise.

### 1.6 How the form becomes SQL (the rules)

**Four general rules apply everywhere:**

1. **A clause is only added if you've filled it in.** A condition with no column or no value, or a sort
   with no column, is ignored. So the SQL is never broken while you're still filling things in.
2. **Values are quoted based on the column's type.** Number columns (INTEGER, REAL, …) get the value as-is:
   `id = 3`. Everything else goes in single quotes: `city = 'Mumbai'`. A `'` inside a value is doubled
   (`O'Brien` → `'O''Brien'`), which is the standard SQL way to escape it. LIKE patterns are always quoted.
3. **Conditions are joined by their AND/OR.** The first condition has none; each later one starts with its
   own `AND` or `OR`.
4. **Every statement ends with `;`.**

**Each kind of statement, with an example:**

| Statement | How it's built | Example output |
|---|---|---|
| SELECT | `SELECT` columns `FROM` table, then JOIN, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT, each only if filled in | `SELECT * FROM customers WHERE city = 'Mumbai';` |
| SELECT with GROUP BY | the grouped columns (plus the aggregate, if any) replace `*` | `SELECT status, COUNT(*) AS count_all FROM orders GROUP BY status;` |
| INSERT | only the columns you typed a value for | `INSERT INTO customers (name, city, joined) VALUES ('Asha', 'Goa', '2024-06-01');` |
| UPDATE | `SET` the columns you typed a value for, then WHERE | `UPDATE orders SET status = 'paid' WHERE status = 'pending';` |
| DELETE | `DELETE FROM` table, then WHERE | `DELETE FROM orders WHERE status = 'cancelled';` |
| JOIN | added after `FROM`, once both ON columns are chosen | `SELECT * FROM orders JOIN customers ON orders.customer_id = customers.id;` |
| CREATE TABLE | table name + each named column with its type, plus `PRIMARY KEY` or `NOT NULL` if ticked | `CREATE TABLE suppliers (id INTEGER PRIMARY KEY, name TEXT NOT NULL);` |
| ALTER TABLE | add a column, or rename one | `ALTER TABLE customers ADD COLUMN email TEXT;` |
| DROP TABLE | just the table name | `DROP TABLE customers;` |

(The real SQL is split across lines, one clause per line. It's shown on one line here to save space.)

A few more details:

- The **aggregate name** is made from the function and the column: `COUNT(*)` becomes `count_all`, and
  `SUM(amount)` becomes `sum_amount`.
- **The JOIN guess.** When you pick a table to join, the app guesses the ON columns from their names. If one
  table has a column called `<other table without the s>_id`, it's matched to the other table's `id`. So
  `orders.customer_id` goes with `customers.id`.
- **Column names during a JOIN** are written as `table.column` (e.g. `customers.city`), so they're never
  ambiguous.
- **The EXECUTE button stays disabled** while the SQL is empty (the form isn't complete yet), and for DROP
  TABLE until you tick the confirm box.
- **The "chips"** above the form (`SELECT → WHERE → ORDER BY`) are just the names of the clauses that
  were added.

### 1.7 Pressing EXECUTE: every SQL statement the app runs

This is the most important section. Here is **every SQL statement the app runs**. Nothing else touches
the database.

**While you're filling in the form, nothing runs.** The app only writes SQL text. The database is used only
when the page opens and when you press EXECUTE.

**When the app starts** (right after you click past the intro screen):

```sql
-- 1. Build a fresh database                                         (seed.ts)
CREATE TABLE customers (...);  CREATE TABLE products (...);  CREATE TABLE orders (...);
INSERT INTO customers ...;     INSERT INTO products ...;     INSERT INTO orders ...;

-- 2. Find out which tables and columns exist, for the schema panel   (schema.ts)
SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;
PRAGMA table_info("customers");     -- one of these per table: lists its columns,
PRAGMA table_info("orders");        -- their types, and which one is the primary key
PRAGMA table_info("products");
```

**When you press EXECUTE**, say on `DELETE FROM orders WHERE status = 'cancelled';`:

```sql
-- 1. Ask SQLite HOW it will run your query → shown in the trace panel    (explainPlan.ts)
EXPLAIN QUERY PLAN DELETE FROM orders WHERE status = 'cancelled';

-- 2. "Before" photo: the rows about to change                            (rowChanges.ts)
--    (UPDATE and DELETE only)
SELECT rowid AS __rowid__, * FROM "orders" WHERE status = 'cancelled';

-- 3. YOUR query — the only one that is timed                             (engine.ts)
DELETE FROM orders
WHERE status = 'cancelled';

-- 4. "After" photo: the whole table as it is now                         (rowChanges.ts)
--    (INSERT, UPDATE and DELETE only)
SELECT rowid AS __rowid__, * FROM "orders";

-- 5. Re-read the tables and columns, in case your query changed them     (schema.ts)
SELECT name FROM sqlite_master WHERE ...;
PRAGMA table_info(...);   -- one per table
```

How this changes for other kinds of query:

| Your query | Steps that run |
|---|---|
| SELECT | 1, 3, 5 |
| INSERT | 1, 3, 4, plus `SELECT last_insert_rowid();` to find the new row, then 5 |
| UPDATE / DELETE | 1, 2, 3, 4, 5 |
| CREATE / ALTER / DROP TABLE | 1, 3, 5 |

The before/after photos (steps 2 and 4) only happen for INSERT, UPDATE and DELETE on one table. A SELECT
already returns its rows, and CREATE/ALTER/DROP TABLE don't change any rows.

### 1.8 How it knows which rows changed

After a DELETE the deleted rows are *gone*, so how can the app show them being crossed out? That's what
the before and after photos from 1.7 are for.

It relies on **rowid**. Every SQLite table has a hidden number column called `rowid` that identifies each
row. (In our tables `id INTEGER PRIMARY KEY` *is* the rowid; they're the same number.) Because the rowid
doesn't change, the app can match a row in the "before" photo with the same row in the "after" photo.

**Worked example: `DELETE FROM orders WHERE status = 'cancelled';`**

**Step 2, the before photo**, finds the one cancelled order:

| __rowid__ | id | customer_id | product_id | quantity | amount | status | ordered_at |
|---|---|---|---|---|---|---|---|
| 12 | 12 | 8 | 2 | 1 | 89.5 | cancelled | 2024-03-10 |

**Step 3** runs the DELETE: 1 row affected.

**Step 4, the after photo**, returns the 17 orders that are left (rowids 1–11 and 13–18).

**The app then combines them** into one list. Every row from the after photo is marked "not affected".
Every row from the before photo that's missing from the after photo is put back in its old place, marked
"affected: deleted":

| rowid | before | after | affected? |
|---|---|---|---|
| 11 | order 11 | order 11 | no |
| **12** | **order 12** | **(gone)** | **yes, deleted** |
| 13 | order 13 | order 13 | no |
| … | … | … | no |

The results panel draws that list. Row 12 gets crossed out, and the rest stay put, so you can see
*where* in the table the change happened.

**The other two work the same way:**

- **UPDATE** (`UPDATE orders SET status = 'paid' WHERE status = 'pending';`). The before photo finds rowids
  3, 8 and 15 with `pending`. The after photo shows them as `paid`. Matching by rowid gives each changed
  row its before value and its after value, and those rows are marked "affected".
- **INSERT.** There's no before photo, because the row doesn't exist yet. After inserting,
  `SELECT last_insert_rowid();` gives the new row's rowid (e.g. 13), and that row in the after photo is
  marked "affected".

One safety detail: the before photo uses **exactly the same WHERE text** as your query (the same piece of
code builds both). So it can't pick up different rows from the ones your query actually changes.

### 1.9 The numbers you see after running

- **For a SELECT:** `-- 3 row(s) in 0.21ms`. That's the number of rows returned.
- **For INSERT, UPDATE or DELETE:** `-- 1 row(s) affected in 0.08ms`. That's SQLite's own count of changed
  rows (the same number `SELECT changes();` would give).
- **For CREATE, ALTER or DROP TABLE, or a change that matched no rows:** `-- done in 0.15ms`. (SQLite's
  "changed rows" counter isn't reset by table changes, so the app doesn't show it for them. It would still
  be the count from the previous query.)
- **The time** is measured around step 3 only, your query, using the browser's built-in stopwatch. It's
  tiny because the database is in memory.
- **If SQLite rejects the query** (for example, CREATE TABLE with a name that already exists), SQLite's
  error message is shown instead.
- **The trace** shows the EXPLAIN QUERY PLAN output from step 1:
  - `SCAN customers` means "read every row".
  - `SEARCH customers USING INTEGER PRIMARY KEY (rowid=?)` means "jump straight to one row".
  - INSERT … VALUES and table changes have no plan, so the trace says so.

### 1.10 History, and what happens after a table change

- **History.** Every EXECUTE adds an entry to the history panel (the latest 25 are kept). Each entry saves a
  **copy of the form**, not just the SQL. Clicking an entry puts that form back, so you can edit and re-run
  it. Nothing is re-run automatically.
- **After a successful CREATE, ALTER or DROP TABLE**, the form resets to a blank READ query, because the old
  form might mention a table or column that no longer exists. After a CREATE TABLE, the new table is already
  picked for you.

**That's the whole logic of the app.** Everything else is how it's drawn on screen.

---

## Part 2: Reading the real code

You don't need this part to *explain* the app. Use it when you want to open the files and check that
Part 1 is really what the code does.

### 2.1 JavaScript for SQL people

The code is TypeScript, which is JavaScript with type labels added. Most of what you'll see has an SQL
cousin:

| In the code | What it means | Closest SQL idea |
|---|---|---|
| `// some text` | a comment | `-- some text` |
| `const total = 5` | give a value a name | a column alias |
| `{ name: 'Asha', city: 'Goa' }` | an **object**: named fields | one row |
| `row.city` | a field of an object | `row.city` |
| `[a, b, c]` | an **array**: a list of things | a result set |
| `list.length` | how many items are in the list | `COUNT(*)` |
| `(c) => c.city === 'Goa'` | a tiny function: "given `c`, return this" | the expression inside a `WHERE` or `SELECT` |
| `list.filter((c) => c.city === 'Goa')` | keep only matching items | `WHERE city = 'Goa'` |
| `list.map((c) => c.name)` | transform every item | `SELECT name` |
| `list.find((t) => t.name === 'orders')` | the first matching item | `WHERE name = 'orders' LIMIT 1` |
| `list.some(...)` / `list.includes(x)` | is there any match? / is `x` in the list? | `EXISTS (...)` / `x IN (...)` |
| `list.join(', ')` | glue the items into one text | `GROUP_CONCAT(x, ', ')` |
| `===` / `!==` | equals / not equals | `=` / `<>` |
| `a && b` / `a \|\| b` / `!a` | and / or / not | `AND` / `OR` / `NOT` |
| `cond ? x : y` | if `cond` then `x` else `y` | `CASE WHEN cond THEN x ELSE y END` |
| `if (cond) { … }` | do this only when `cond` is true | `CASE WHEN` / `WHERE` |
| `x ?? 'default'` | `x`, or `'default'` if `x` is missing | `COALESCE(x, 'default')` |
| `` `DELETE FROM ${table}` `` | text with a value slotted in | `'DELETE FROM ' \|\| table` |
| `sql += 'more'` | add to the end of the text | `sql = sql \|\| 'more'` |
| `{ ...form, limit: 10 }` | a copy of `form` with `limit` changed | an UPDATE applied to a copy |
| `function name(a, b) { return … }` | a function that takes `a` and `b` | a user-defined function |
| `return x` | the function's answer is `x` | the function's result |

**Type labels.** Things like `: string` or `: number | null` are labels saying what kind of value
something holds. You can read past them. An `interface` is like a `CREATE TABLE`: it just describes the
fields:

```ts
interface Condition {           // CREATE TABLE condition (
  column: string                //   column    TEXT,
  operator: ComparisonOperator  //   operator  TEXT,  -- one of = != > >= < <= LIKE
  value: string                 //   value     TEXT,
  connector: 'AND' | 'OR'       //   connector TEXT   -- 'AND' or 'OR'
}                               // );
```

### 2.2 Worked example: how a DELETE is written

This is the real function from [src/lib/query/builder.ts](src/lib/query/builder.ts), with explanations
added as comments:

```ts
function buildDelete(state: BuilderState, schema: TableSchema[]): GeneratedQuery {
  if (!state.table) return EMPTY_QUERY        // no table picked yet? → no SQL

  let sql = `DELETE FROM ${state.table}`      // start the text: DELETE FROM orders
  const chain = ['DELETE FROM']               // start the list of chips

  const whereClause = buildConditionClause(state.where, schema, state.table)
  if (whereClause) {                          // only if there are finished conditions...
    sql += `\nWHERE ${whereClause}`           // ...add a new line: WHERE status = 'cancelled'
    chain.push('WHERE')                       // ...and a WHERE chip
  }

  return { sql: sql + ';', chain }            // finish with ; and hand back both
}
```

And the function that writes the conditions, used for WHERE, HAVING and the before photo. In this snippet
and the next one, the type labels are left out to make them easier to read.

```ts
export function buildConditionClause(conditions, schema, primaryTable): string {
  // Rule 1: keep only conditions that have a column AND a value
  const filled = conditions.filter((c) => c.column && c.value.trim() !== '')
  if (filled.length === 0) return ''                     // nothing finished → no clause

  return filled
    .map((c, i) => {                                     // for each condition, number i (0 = first):
      const type = resolveColumnType(schema, primaryTable, c.column)   // look up the column's type
      const expr = `${c.column} ${c.operator} ${formatLiteral(c.value, type, c.operator)}`
      //            city         =              'Mumbai'   ← Rule 2 (quoting) happens in formatLiteral
      return i === 0 ? expr : `${c.connector} ${expr}`   // Rule 3: add AND/OR except on the first
    })
    .join(' ')                                           // glue them together with spaces
}
```

The quoting rule (Rule 2) from the same file:

```ts
function formatLiteral(value, columnType, operator) {
  const trimmed = value.trim()                          // drop spaces at the start and end
  const quoted = `'${trimmed.replace(/'/g, "''")}'`     // wrap in '…', doubling any ' inside
  if (operator === 'LIKE') return quoted                // LIKE patterns are always quoted
  const numeric = columnType
    ? /INT|REAL|FLOA|DOUB|NUM/i.test(columnType)        // does the type name contain INT, REAL, … ?
    : trimmed !== '' && !Number.isNaN(Number(trimmed))  // (unknown type: does the value look like a number?)
  return numeric ? trimmed : quoted                     // numbers as-is, everything else quoted
}
```

That `/INT|REAL|FLOA|DOUB|NUM/i.test(columnType)` is a pattern match. In SQL it would be
`columnType LIKE '%INT%' OR columnType LIKE '%REAL%' OR …`, ignoring upper/lower case.

### 2.3 Worked example: reading the tables and columns

[src/lib/db/schema.ts](src/lib/db/schema.ts) is mostly SQL you already know:

```ts
export function introspectSchema(db: Database): TableSchema[] {
  // Run a query: list every table (skipping SQLite's internal ones)
  const tablesResult = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  if (tablesResult.length === 0) return []                // no tables at all → empty list

  // Take the first result column of every row: ['customers', 'orders', 'products']
  const tableNames = tablesResult[0].values.map((row) => String(row[0]))

  // For each table name, run PRAGMA table_info and keep name, type and primary-key flag
  return tableNames.map((name) => {
    const colsResult = db.exec(`PRAGMA table_info(${quoteIdent(name)})`)
    ...                                                   // row[1] = name, row[2] = type, row[5] = pk
    return { name, columns }
  })
}
```

`db.exec("…")` means "run this SQL and give me the results". Each result has `columns` (the column names)
and `values` (the rows, each one a list of values).

### 2.4 The store: the app's memory, in SQL terms

All the app's data lives in one place, called the **store**: [src/state/store.ts](src/state/store.ts).
Picture it as **a table with exactly one row**:

- Some columns hold **the form**: `builder`.
- Some hold **the last result**: `lastOutcome`, `lastTrace`, `lastRowChanges`, `lastSql`.
- There's a **list of past runs**: `history`.
- And the database connection itself: `db`.

Every button on screen calls a small function in the store (called an **action**) that does an UPDATE on
that one row. For example, choosing a table calls `setTable('customers')`.

The SQL text is like a **generated column**: whenever the form changes, the SQL is re-computed from it
straight away. That happens in this one function, which every form change goes through:

```ts
const setBuilder = (builder: BuilderState) => {
  const { sql, chain } = generateQuery(builder, get().schema)   // form → SQL text + chip names
  set({ builder, generatedSql: sql, activeChain: chain })       // save all three together
}
```

`execute()`, further down the same file, is section 1.7 written in code. Read it side by side with 1.7:
each numbered step there is a few lines here.

**Where do React and the screen fit in?** The files in `src/components/` are the screen. Each one shows
something from the store, and calls a store action when you click it. They contain no logic of their own,
so you don't need to read them to understand how the app works.

### 2.5 Where each rule lives

| Rule (from Part 1) | File | Function |
|---|---|---|
| The seed data | [src/lib/db/seed.ts](src/lib/db/seed.ts) | `SEED_SQL` |
| Reading tables and columns | [src/lib/db/schema.ts](src/lib/db/schema.ts) | `introspectSchema` |
| The form's fields | [src/lib/query/types.ts](src/lib/query/types.ts) | `BuilderState` |
| Which sections appear (1.5) | [src/lib/query/blocks.ts](src/lib/query/blocks.ts) | `availableBlocks` |
| Form → SQL (1.6) | [src/lib/query/builder.ts](src/lib/query/builder.ts) | `generateQuery` and the `build…` functions |
| Quoting values | [src/lib/query/builder.ts](src/lib/query/builder.ts) | `formatLiteral` |
| Columns offered in dropdowns | [src/lib/query/columns.ts](src/lib/query/columns.ts) | `availableColumns` |
| The JOIN guess | [src/lib/query/join.ts](src/lib/query/join.ts) | `suggestJoinColumns` |
| What EXECUTE does (1.7) | [src/state/store.ts](src/state/store.ts) | `execute` |
| The query plan | [src/lib/db/explainPlan.ts](src/lib/db/explainPlan.ts) | `explainQueryPlan` |
| Running + timing your query, the numbers (1.9) | [src/lib/db/engine.ts](src/lib/db/engine.ts) | `runStatement`, `summarizeOutcome` |
| Before/after photos (1.8) | [src/lib/db/rowChanges.ts](src/lib/db/rowChanges.ts) | `runStatementWithRowCapture` |
| History and the reset after DDL (1.10) | [src/state/store.ts](src/state/store.ts) | `execute`, `restoreHistoryEntry` |

### 2.6 Suggested reading order

Start with the files that are mostly SQL, then move to the ones that are mostly logic:

1. [seed.ts](src/lib/db/seed.ts): pure SQL.
2. [schema.ts](src/lib/db/schema.ts): two SQL queries.
3. [explainPlan.ts](src/lib/db/explainPlan.ts): one SQL query.
4. [types.ts](src/lib/query/types.ts): the form's fields, like `CREATE TABLE` definitions.
5. [builder.ts](src/lib/query/builder.ts): form → SQL.
6. [rowChanges.ts](src/lib/db/rowChanges.ts): the before/after photos.
7. [store.ts](src/state/store.ts), just the `execute` part: ties it all together.

### 2.7 Try it: watch every query the app runs

In [src/lib/db/engine.ts](src/lib/db/engine.ts), inside the `runStatement` function, add this as the very
first line:

```ts
console.log('running:', sql)
```

Save, then open your browser's developer console (press F12, then choose the "Console" tab). Now every time
you press EXECUTE, you'll see the exact SQL that ran. Compare it with the SQL panel: they're identical.
Remove the line when you're done.

---

## Part 3: What you can skip

These files make the app look and sound nice. **None of them change which SQL runs or what the results
are.** You can treat them as visual effects when you explain the app.

| File or folder | What it does |
|---|---|
| `src/components/landing/` | the intro screen: typing effect, logo, 3D grid background |
| `src/components/transition/` | the tile animation between the intro and the workspace |
| `src/components/workspace/results/RowAnimatedTable.tsx` | *draws* the row changes from 1.8 with animations (red strike-through, glow, …) |
| `src/components/workspace/trace/` | shows the query plan one line at a time, with a spinner |
| `src/lib/animation/`, `src/lib/trace/timing.ts` | animation helpers and timing |
| `src/lib/sound/`, `SoundToggle.tsx` | sound effects and the mute button |
| `src/components/workspace/CoachMark.tsx`, `src/lib/onboarding/` | the "pick a table" hint for first-time visitors |
| `src/index.css` | fonts, colours, styling |
| the rest of `src/components/` | the screen itself: each piece displays something or calls a store action |

---

## Part 4: Explaining it to others

### The 30-second version

> "It's a SQL playground. Instead of typing SQL, you build a query by clicking. The app writes the SQL
> for you and runs it on a real SQLite database that lives inside the browser, so there's no server. After
> an INSERT, UPDATE or DELETE it shows you exactly which rows changed. It does that by taking a snapshot of
> the rows before and after, and matching them by rowid."

### The 3-minute walkthrough

Open the app and talk through these steps:

1. **"The database is real SQLite, running in the browser."** Every page load creates a fresh one from a
   seed script: customers, products, orders. Reload and any changes are gone.
2. **"The schema panel isn't hard-coded."** The app asks the database itself, using `sqlite_master` and
   `PRAGMA table_info`.
3. **"You build a query with a form."** Pick READ and `customers`, then add `city = Mumbai`. Point at the
   SQL panel: "It rewrites the SQL on every click. Notice it put quotes around Mumbai because `city` is a
   text column."
4. **"EXECUTE runs it."** Point at the trace: "This is SQLite's own `EXPLAIN QUERY PLAN`: `SCAN` means it
   read every row." Point at the timing: "That's measured, not made up."
5. **"Now the clever part: which rows changed."** Run
   `DELETE FROM orders WHERE status = 'cancelled'`. "Before deleting, it selects the rows that match the
   same WHERE. After, it reads the table again. It matches them by rowid, so it knows row 12 disappeared,
   and can show you where it was."
6. **"History keeps every run."** Click an old entry: "It restores the form, not just the SQL."

### Questions you might get

**Is it real SQL, or simulated?**
Real. It's the actual SQLite engine, and the SQL you see is exactly the SQL that runs.

**Where's the server / backend?**
There isn't one. SQLite runs inside the web page itself, using a version called sql.js.

**Why does my data disappear when I reload?**
The database only lives in the tab's memory, and it's rebuilt from the seed every time. That's on
purpose: you can break things (even `DROP TABLE`) and a reload fixes them.

**How does it know which rows were deleted if they're gone?**
A "before" photo with the same WHERE clause, taken just before running, and an "after" photo of the whole
table. The rows are matched by rowid, SQLite's permanent row number. (Section 1.8.)

**Where does the trace come from?**
`EXPLAIN QUERY PLAN`, run on your query just before it executes.

**How is the time measured?**
With the browser's stopwatch, around your query only. It's tiny because everything is in memory.

**Can you type your own SQL?**
No. You build it with the form, and the app writes it.

**Is it safe from SQL injection?**
Values are quoted, with any `'` inside doubled, the standard escape. Table and column names come from
dropdowns filled from the real schema. The only exception is the *new* names you type for CREATE TABLE and
ALTER TABLE, which are used as typed. But it's your own throwaway database in your own browser tab: there's
nothing to steal, and a reload resets everything.

**What's it built with?**
- **React** draws the screen.
- **TypeScript** is the programming language (JavaScript plus type labels).
- **Zustand** holds the app's data in one place (the "store").
- **sql.js** is SQLite in the browser.
- **Tailwind** is for styling.
- The animations, 3D background and sounds use **GSAP**, **three.js** and **Tone.js**. They're only for
  looks.

---

## Glossary

| Word | Meaning |
|---|---|
| **Action** | A small function in the store that changes something, e.g. `setTable`. Every button calls one. |
| **Builder** | The app's name for the form: the record describing the query you're building (section 1.4). |
| **Chain / chips** | The row of clause names above the form, e.g. `SELECT → WHERE`. |
| **DDL** | SQL that changes tables rather than rows: `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`. |
| **EXPLAIN QUERY PLAN** | SQL that asks SQLite *how* it would run a query, without running it. |
| **`last_insert_rowid()`** | SQLite function giving the rowid of the most recently inserted row. |
| **Mode** | What the query does: CREATE, READ, UPDATE or DELETE. |
| **`PRAGMA table_info`** | SQLite command listing a table's columns, their types and the primary key. |
| **React** | The library that draws the screen. |
| **rowid** | SQLite's hidden, permanent number for each row. In these tables it equals `id`. |
| **Schema** | The list of tables and their columns. |
| **Scope** | What the query works on: TABLE (rows in one table) or DATABASE (across tables / the tables themselves). |
| **Seed** | The SQL script that creates and fills the tables every time the page loads. |
| **`sqlite_master`** | SQLite's built-in table that lists every table in the database. |
| **sql.js** | SQLite, converted to run inside a web browser (using WebAssembly). |
| **Store** | The one place the app keeps all its data, like a table with a single row. |
| **TypeScript** | JavaScript with type labels. The language this app is written in. |
