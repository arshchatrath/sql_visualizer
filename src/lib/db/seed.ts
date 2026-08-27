import type { Database, SqlJsStatic } from 'sql.js'

// Small enough to reason about by eye, deep enough for a real multi-table
// JOIN and a GROUP BY aggregate to mean something. Re-run from scratch on
// every page load — see createSeededDatabase below.
const SEED_SQL = `
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  joined TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  ordered_at TEXT NOT NULL
);

INSERT INTO customers (id, name, city, joined) VALUES
  (1,  'Aarav Mehta',    'Mumbai',    '2023-01-14'),
  (2,  'Priya Nair',     'Bengaluru', '2023-03-02'),
  (3,  'Rohan Kapoor',   'Mumbai',    '2023-04-19'),
  (4,  'Sana Iyer',      'Delhi',     '2023-05-30'),
  (5,  'Vikram Rao',     'Chennai',   '2023-07-11'),
  (6,  'Ishaan Verma',   'Bengaluru', '2023-08-22'),
  (7,  'Meera Joshi',    'Delhi',     '2023-09-08'),
  (8,  'Kabir Singh',    'Pune',      '2023-10-17'),
  (9,  'Ananya Das',     'Kolkata',   '2023-11-05'),
  (10, 'Dev Malhotra',   'Mumbai',    '2023-12-12'),
  (11, 'Riya Kulkarni',  'Pune',      '2024-01-20'),
  (12, 'Arjun Bhatt',    'Chennai',   '2024-02-14');

INSERT INTO products (id, name, category, price) VALUES
  (1,  'Wireless Mouse',               'Electronics', 25.99),
  (2,  'Mechanical Keyboard',          'Electronics', 89.50),
  (3,  'Standing Desk',                'Furniture',   349.00),
  (4,  'Desk Lamp',                    'Furniture',   34.75),
  (5,  'Notebook Set',                 'Stationery',  12.25),
  (6,  'Fountain Pen',                 'Stationery',  45.00),
  (7,  'Noise Cancelling Headphones',  'Electronics', 199.99),
  (8,  'Ergonomic Chair',              'Furniture',   275.00),
  (9,  'Water Bottle',                 'Accessories', 18.50),
  (10, 'Backpack',                     'Accessories', 64.00);

INSERT INTO orders (id, customer_id, product_id, quantity, amount, status, ordered_at) VALUES
  (1,  1,  7,  1, 199.99, 'paid',      '2024-01-05'),
  (2,  2,  5,  3, 36.75,  'paid',      '2024-01-10'),
  (3,  3,  3,  1, 349.00, 'pending',   '2024-01-15'),
  (4,  1,  9,  2, 37.00,  'paid',      '2024-01-20'),
  (5,  4,  6,  1, 45.00,  'shipped',   '2024-02-01'),
  (6,  5,  2,  1, 89.50,  'paid',      '2024-02-05'),
  (7,  2,  8,  1, 275.00, 'paid',      '2024-02-10'),
  (8,  6,  1,  2, 51.98,  'pending',   '2024-02-14'),
  (9,  3,  4,  1, 34.75,  'paid',      '2024-02-20'),
  (10, 7,  10, 1, 64.00,  'shipped',   '2024-03-01'),
  (11, 5,  7,  1, 199.99, 'paid',      '2024-03-05'),
  (12, 8,  2,  1, 89.50,  'cancelled', '2024-03-10'),
  (13, 9,  5,  2, 24.50,  'paid',      '2024-03-15'),
  (14, 10, 3,  1, 349.00, 'paid',      '2024-03-20'),
  (15, 1,  6,  1, 45.00,  'pending',   '2024-04-01'),
  (16, 11, 9,  3, 55.50,  'paid',      '2024-04-05'),
  (17, 12, 1,  1, 25.99,  'shipped',   '2024-04-10'),
  (18, 6,  8,  1, 275.00, 'paid',      '2024-04-15');
`

/**
 * Creates a brand-new in-memory database and seeds it. Cheap (a handful of
 * CREATE/INSERT statements), so re-running it on every page load — the
 * only way this app ever gets its data — costs nothing.
 */
export function createSeededDatabase(SQL: SqlJsStatic): Database {
  const db = new SQL.Database()
  db.run(SEED_SQL)
  return db
}
