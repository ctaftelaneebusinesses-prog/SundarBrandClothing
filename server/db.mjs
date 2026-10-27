import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
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

export const SIZES = {
  Suits: ['36', '38', '40', '42', '44'],
  Shirts: ['S', 'M', 'L', 'XL', 'XXL'],
  Trousers: ['30', '32', '34', '36', '38'],
  Footwear: ['6', '7', '8', '9', '10', '11'],
  Belts: ['30', '32', '34', '36', '38', '40'],
  Accessories: ['Standard'],
};

const img = (slug) => `/uploads/seed/${slug}.jpg`;

const SEED = [
  ['Navy two-piece suit', 'Suits', 'navy-suit', 12999, 18999, 8, ['one', 'two'], 'A sharp single-breasted navy suit in a breathable wool blend. Slim through the body with a clean, modern lapel — ready for weddings, interviews and the office.'],
  ['Midnight navy suit', 'Suits', 'midnight-suit', 13499, 19499, 6, ['one'], 'Deep midnight navy with a subtle sheen. Half-canvas construction, notch lapel and matching flat-front trousers.'],
  ['Forest green suit', 'Suits', 'green-suit', 13999, 19999, 4, ['one'], 'A confident forest green two-piece for those who want to stand apart. Soft shoulder and tapered trousers.'],
  ['Royal blue suit', 'Suits', 'royal-blue-suit', 12499, 17999, 5, ['two'], 'Bright royal blue in a light, all-season fabric. Pair it with a white shirt and brown shoes.'],
  ['Blue check three-piece', 'Suits', 'check-three-piece', 15999, 22999, 3, ['two'], 'Jacket, waistcoat and trousers in a classic blue windowpane check. Made for occasions.'],
  ['Navy check blazer', 'Suits', 'navy-check-blazer', 7999, 11999, 7, ['one', 'two'], 'A versatile navy check blazer that works over a shirt or a crew-neck tee.'],
  ['Black evening suit', 'Suits', 'black-evening-suit', 16999, 23999, 4, ['one'], 'Satin-trimmed black evening suit for receptions and black-tie events.'],
  ['Grey check blazer', 'Suits', 'grey-check-blazer', 6999, 10999, 6, ['two'], 'Light grey check blazer with patch pockets — smart-casual at its best.'],
  ['White formal shirt', 'Shirts', 'white-shirt', 1499, 2499, 30, ['one', 'two'], '100% cotton poplin formal shirt with a spread collar. Easy-iron finish.'],
  ['Sky blue formal shirt', 'Shirts', 'sky-blue-shirt', 1399, 2299, 24, ['one', 'two'], 'Classic sky blue in crisp cotton. The shirt that goes with every suit.'],
  ['Checked casual shirt', 'Shirts', 'check-shirt', 1299, 2199, 18, ['one'], 'Soft brushed-cotton check shirt for weekends. Wear it open over a tee or buttoned up.'],
  ['Printed cotton shirt', 'Shirts', 'printed-shirt', 1199, 1999, 20, ['two'], 'Lightweight cotton shirt with a fine all-over print.'],
  ['Black crew-neck tee', 'Shirts', 'black-tee', 699, 999, 40, ['one', 'two'], 'Heavyweight 220gsm cotton tee in jet black. Holds its shape wash after wash.'],
  ['White crew-neck tee', 'Shirts', 'white-tee', 699, 999, 40, ['two'], 'Our everyday white tee in combed cotton.'],
  ['Khaki chinos', 'Trousers', 'khaki-chinos', 1799, 2999, 22, ['one'], 'Stretch cotton chinos with a tapered leg. Smart enough for work, easy for weekends.'],
  ['Black tapered trousers', 'Trousers', 'black-trousers', 1999, 3199, 16, ['one', 'two'], 'Tailored black trousers with a clean ankle-length taper.'],
  ['Dark indigo jeans', 'Trousers', 'indigo-jeans', 2199, 3499, 14, ['two'], 'Slim-fit dark indigo denim with a touch of stretch.'],
  ['Classic blue jeans', 'Trousers', 'blue-jeans', 1999, 3199, 18, ['one', 'two'], 'Mid-wash straight-fit jeans in sturdy cotton denim.'],
  ['Brown leather oxfords', 'Footwear', 'brown-oxfords', 3499, 5499, 10, ['one', 'two'], 'Polished full-grain leather oxfords with a leather sole.'],
  ['Brown brogues', 'Footwear', 'brown-brogues', 3799, 5799, 7, ['one'], 'Wingtip brogues in rich brown leather — a classic with every suit.'],
  ['Double monk straps', 'Footwear', 'monk-straps', 3999, 5999, 6, ['two'], 'Double monk-strap shoes in burnished brown leather.'],
  ['Tan Chelsea boots', 'Footwear', 'chelsea-boots', 4299, 6499, 6, ['two'], 'Tan leather Chelsea boots with elastic gussets and a stacked heel.'],
  ['Dark leather boots', 'Footwear', 'leather-boots', 4499, 6999, 5, ['one'], 'Lace-up leather boots built for everyday wear.'],
  ['Tan leather belt', 'Belts', 'tan-belt', 849, 1499, 25, ['one', 'two'], 'Full-grain tan leather belt with a brushed steel buckle.'],
  ['Classic leather belt', 'Belts', 'belt-set', 799, 1499, 35, ['one', 'two'], 'A sturdy everyday leather belt, available in black and brown.'],
  ['Silk paisley tie', 'Accessories', 'silk-tie', 649, 1099, 30, ['one', 'two'], 'Woven silk tie with a soft paisley pattern.'],
];

const SEED_BANNERS = [
  ['navy-suit', 'Menswear · Two stores', 'Choose your store.', 'Book your fit.', 'Suits up to 35% off', 'See exactly what is on each rack, reserve online and collect in store.', 'Shop Store 01', '/store/one?cat=Suits', 'gold'],
  ['formal-shirts', 'New in · Formal shirts', 'Crisp shirts,', 'every day.', 'Shirts from ₹ 699', 'Cotton formals, casual checks and everyday tees in every size.', 'Shop Store 02', '/store/two?cat=Shirts', 'sage'],
  ['brown-brogues', 'Footwear edit', 'Leather that', 'walks with you.', 'Flat 30% off shoes', 'Oxfords, brogues, monk straps and Chelsea boots in full-grain leather.', 'Shop footwear', '/store/one?cat=Footwear', 'cream'],
  ['check-three-piece', 'Wedding season', 'The three-piece', 'is back.', 'Up to 30% off occasionwear', 'Windowpane checks, rich navies and evening black — tailored for the big day.', 'Explore Store 02', '/store/two?cat=Suits', 'ink'],
  ['suit-atelier', 'Reserve online', 'Your size,', 'held for you.', 'Ready to collect in 48 hrs', 'Pay securely online and your piece waits at the counter — no queues, no guesswork.', 'Start booking', '/store/one', 'blue'],
];

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
    SEED_BANNERS.forEach(([slug, ...rest], i) => ins.run(img(slug), ...rest, i));
  }
  const hasStores = db.prepare('SELECT COUNT(*) AS n FROM stores').get().n;
  if (!hasStores) {
    const ins = db.prepare('INSERT INTO stores (id, no, name, address, hours, phone) VALUES (?, ?, ?, ?, ?, ?)');
    ins.run('one', '01', '[LOCATION 1 NAME]', '[Street address, town]', 'Open [DAYS] · [HOURS]', '[Phone number]');
    ins.run('two', '02', '[LOCATION 2 NAME]', '[Street address, town]', 'Open [DAYS] · [HOURS]', '[Phone number]');
  }
  const hasProducts = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  if (!hasProducts) {
    const ins = db.prepare('INSERT INTO products (name, category, image, price, mrp, stock, stores, sizes, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const [name, cat, slug, price, mrp, stock, stores, desc] of SEED) {
      ins.run(name, cat, img(slug), price, mrp, stock, JSON.stringify(stores), JSON.stringify(SIZES[cat]), desc);
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
