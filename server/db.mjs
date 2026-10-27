import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dbFile = process.env.DB_FILE || join(here, 'data', 'sundar.db');
mkdirSync(dirname(dbFile), { recursive: true });

export const db = new DatabaseSync(dbFile);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  no TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  hours TEXT NOT NULL,
  phone TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL,
  mrp INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  sizes TEXT NOT NULL,
  stores TEXT NOT NULL,
  image TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  pickup_date TEXT NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL,
  payment_id TEXT,
  payment_method TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER,
  store_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  size TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  highlight TEXT NOT NULL DEFAULT '',
  offer TEXT NOT NULL DEFAULT '',
  sub TEXT NOT NULL DEFAULT '',
  cta TEXT NOT NULL DEFAULT 'Shop now',
  link TEXT NOT NULL DEFAULT '/store/one',
  tone TEXT NOT NULL DEFAULT 'gold',
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

/** Starting stores, products and banners — shared with the website's demo mode. */
const SEED = JSON.parse(readFileSync(join(here, '..', 'shared', 'seed.json'), 'utf8'));
export const SIZES = SEED.sizes;

export const bannerRow = (r) =>
  r && {
    id: r.id,
    image: r.image,
    tag: r.tag,
    title: r.title,
    highlight: r.highlight,
    offer: r.offer,
    sub: r.sub,
    cta: r.cta,
    link: r.link,
    tone: r.tone,
    sort: r.sort,
    active: Boolean(r.active),
  };

export function seed() {
  if (!db.prepare('SELECT COUNT(*) AS n FROM banners').get().n) {
    const ins = db.prepare('INSERT INTO banners (image, tag, title, highlight, offer, sub, cta, link, tone, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const b of SEED.banners) ins.run(b.image, b.tag, b.title, b.highlight, b.offer, b.sub, b.cta, b.link, b.tone, b.sort);
  }
  if (!db.prepare('SELECT COUNT(*) AS n FROM stores').get().n) {
    const ins = db.prepare('INSERT INTO stores (id, no, name, address, hours, phone) VALUES (?, ?, ?, ?, ?, ?)');
    for (const st of SEED.stores) ins.run(st.id, st.no, st.name, st.address, st.hours, st.phone);
  }
  if (!db.prepare('SELECT COUNT(*) AS n FROM products').get().n) {
    const ins = db.prepare('INSERT INTO products (name, category, image, price, mrp, stock, stores, sizes, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const p of SEED.products) {
      ins.run(p.name, p.category, p.image, p.price, p.mrp, p.stock, JSON.stringify(p.stores), JSON.stringify(p.sizes), p.description);
    }
  }
}

export const productRow = (r) =>
  r && {
    id: r.id,
    name: r.name,
    category: r.category,
    description: r.description,
    price: r.price,
    mrp: r.mrp,
    stock: r.stock,
    sizes: JSON.parse(r.sizes),
    stores: JSON.parse(r.stores),
    image: r.image,
    createdAt: r.created_at,
  };

export function orderWithItems(r) {
  if (!r) return r;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(r.id);
  return {
    id: r.id,
    customer: { name: r.customer_name, phone: r.phone, email: r.email, address: r.address },
    pickupDate: r.pickup_date,
    total: r.total,
    status: r.status,
    paymentId: r.payment_id,
    paymentMethod: r.payment_method,
    createdAt: r.created_at,
    items: items.map((i) => ({ productId: i.product_id, storeId: i.store_id, name: i.name, image: i.image, size: i.size, qty: i.qty, price: i.price })),
  };
}
