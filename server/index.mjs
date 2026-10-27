import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, seed, productRow, orderWithItems, bannerRow, SIZES } from './db.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sundar@123';
const SECRET = process.env.TOKEN_SECRET || 'sundar-brand-dev-secret';
const CATEGORIES = Object.keys(SIZES);
const STORE_IDS = ['one', 'two'];
const ORDER_STATUSES = ['Pending payment', 'Paid', 'Ready for pick-up', 'Collected', 'Cancelled'];

seed();

const uploadDir = join(here, 'uploads', 'products');
mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${extname(file.originalname).toLowerCase() || '.jpg'}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
});

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(join(here, 'uploads'), { maxAge: '7d' }));

/* ---------------- helpers ---------------- */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const wrap = (fn) => (req, res, next) => {
  try {
    const out = fn(req, res, next);
    if (out && typeof out.catch === 'function') out.catch(next);
  } catch (e) {
    next(e);
  }
};
const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
const makeToken = () => {
  const payload = `${ADMIN_USER}.${Date.now() + 12 * 3600 * 1000}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
};
function requireAdmin(req, _res, next) {
  const raw = (req.headers.authorization || '').replace(/^Bearer /, '');
  const [b64, sig] = raw.split('.');
  if (!b64 || !sig) return next(new HttpError(401, 'Please log in'));
  const payload = Buffer.from(b64, 'base64url').toString();
  const expected = sign(payload);
  const ok = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok || Number(payload.split('.').pop()) < Date.now()) return next(new HttpError(401, 'Session expired, please log in again'));
  next();
}
const int = (v, field, min = 0) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min) throw new HttpError(400, `${field} must be a whole number${min ? ` of at least ${min}` : ''}`);
  return n;
};
const parseList = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string' || !v.trim()) return [];
  try {
    const j = JSON.parse(v);
    return Array.isArray(j) ? j : [];
  } catch {
    return v.split(',').map((s) => s.trim()).filter(Boolean);
  }
};
const removeUpload = (image) => {
  if (!image?.startsWith('/uploads/products/')) return;
  const file = join(here, image);
  if (existsSync(file)) unlinkSync(file);
};
const nextOrderId = () => {
  const row = db.prepare("SELECT id FROM orders ORDER BY CAST(substr(id, 4) AS INTEGER) DESC LIMIT 1").get();
  return `SB-${row ? Number(row.id.slice(3)) + 1 : 1043}`;
};

/* ---------------- public API ---------------- */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/stores', (_req, res) => {
  res.json(db.prepare('SELECT * FROM stores ORDER BY no').all());
});

app.get('/api/banners', (_req, res) => {
  res.json(db.prepare('SELECT * FROM banners WHERE active = 1 ORDER BY sort, id').all().map(bannerRow));
});

app.get('/api/products', (req, res) => {
  let rows = db.prepare('SELECT * FROM products ORDER BY id').all().map(productRow);
  if (req.query.store) rows = rows.filter((p) => p.stores.includes(req.query.store));
  if (req.query.category) rows = rows.filter((p) => p.category === req.query.category);
  res.json(rows);
});

app.get('/api/products/:id', (req, res) => {
  const p = productRow(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
  if (!p) throw new HttpError(404, 'Product not found');
  res.json(p);
});

/** Create an order from cart items. Prices and stock are always checked on the server. */
app.post('/api/orders', wrap((req, res) => {
  const { customer = {}, pickupDate, items } = req.body || {};
  const name = String(customer.name || '').trim();
  const phone = String(customer.phone || '').trim();
  const address = String(customer.address || '').trim();
  if (!name) throw new HttpError(400, 'Please enter your name');
  if (phone.replace(/\D/g, '').length < 10) throw new HttpError(400, 'Please enter a 10-digit mobile number');
  if (!address) throw new HttpError(400, 'Please enter your address');
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'Your cart is empty');

  const lines = items.map((it) => {
    const p = productRow(db.prepare('SELECT * FROM products WHERE id = ?').get(it.productId));
    if (!p) throw new HttpError(400, 'A product in your cart is no longer available');
    const qty = int(it.qty, 'Quantity', 1);
    if (!p.sizes.includes(it.size)) throw new HttpError(400, `Size ${it.size} is not available for ${p.name}`);
    if (!p.stores.includes(it.storeId)) throw new HttpError(400, `${p.name} is not stocked at that store`);
    if (qty > p.stock) throw new HttpError(400, `Only ${p.stock} left of ${p.name}`);
    return { p, qty, size: it.size, storeId: it.storeId };
  });

  const id = nextOrderId();
  const total = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO orders (id, customer_name, phone, email, address, pickup_date, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, name, phone, String(customer.email || '').trim(), address, String(pickupDate || new Date().toISOString().slice(0, 10)), total, 'Pending payment',
    );
    const ins = db.prepare('INSERT INTO order_items (order_id, product_id, store_id, name, image, size, qty, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const l of lines) ins.run(id, l.p.id, l.storeId, l.p.name, l.p.image, l.size, l.qty, l.p.price);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  res.status(201).json(orderWithItems(db.prepare('SELECT * FROM orders WHERE id = ?').get(id)));
}));

/**
 * Confirm payment. Test mode: marks the order paid with a generated payment id.
 * To go live, verify the Razorpay signature here (razorpay_order_id|razorpay_payment_id) before marking it paid.
 */
app.post('/api/orders/:id/pay', wrap((req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) throw new HttpError(404, 'Order not found');
  if (order.status !== 'Pending payment') throw new HttpError(400, 'This order is already paid');
  const full = orderWithItems(order);

  db.exec('BEGIN');
  try {
    for (const it of full.items) {
      const r = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?').run(it.qty, it.productId, it.qty);
      if (r.changes === 0) throw new HttpError(409, `${it.name} just sold out — please update your cart`);
    }
    const paymentId = `pay_${crypto.randomBytes(7).toString('hex')}`;
    db.prepare("UPDATE orders SET status = 'Paid', payment_id = ?, payment_method = ? WHERE id = ?").run(paymentId, String(req.body?.method || 'UPI'), order.id);
    const stores = Object.fromEntries(db.prepare('SELECT id, no FROM stores').all().map((s) => [s.id, s.no]));
    const storeList = [...new Set(full.items.map((i) => `Store ${stores[i.storeId]}`))].join(' & ');
    const body = [
      `Customer: ${order.customer_name}`,
      `Mobile: ${order.phone}`,
      `Address: ${order.address}`,
      ...full.items.map((i) => `Item: ${i.name} · ${i.size} × ${i.qty} (Store ${stores[i.storeId]})`),
      `Amount: ₹ ${order.total.toLocaleString('en-IN')}`,
      `Pick-up: ${order.pickup_date}`,
    ].join('\n');
    db.prepare('INSERT INTO notifications (order_id, subject, body) VALUES (?, ?, ?)').run(order.id, `New paid booking ${order.id} · ${storeList}`, body);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  res.json(orderWithItems(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id)));
}));

/** Customers look up their bookings by mobile number. */
app.get('/api/orders', wrap((req, res) => {
  const digits = String(req.query.phone || '').replace(/\D/g, '').slice(-10);
  if (digits.length < 10) throw new HttpError(400, 'Enter your 10-digit mobile number');
  const rows = db.prepare("SELECT * FROM orders WHERE status != 'Pending payment' ORDER BY created_at DESC").all()
    .filter((o) => o.phone.replace(/\D/g, '').endsWith(digits));
  res.json(rows.map(orderWithItems));
}));

/* ---------------- admin API ---------------- */
app.post('/api/admin/login', wrap((req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) throw new HttpError(401, 'Wrong username or password');
  res.json({ token: makeToken() });
}));

app.use('/api/admin', requireAdmin);

app.get('/api/admin/orders', (_req, res) => {
  res.json(db.prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC').all().map(orderWithItems));
});

app.patch('/api/admin/orders/:id', wrap((req, res) => {
  const { status } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) throw new HttpError(400, 'Unknown status');
  const r = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  if (!r.changes) throw new HttpError(404, 'Order not found');
  res.json(orderWithItems(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)));
}));

function readProductBody(body, existing) {
  const name = String(body.name ?? existing?.name ?? '').trim();
  const category = String(body.category ?? existing?.category ?? '');
  if (!name) throw new HttpError(400, 'Product name is required');
  if (!CATEGORIES.includes(category)) throw new HttpError(400, 'Pick a valid category');
  const price = int(body.price ?? existing?.price, 'Price', 1);
  const mrp = body.mrp === '' || body.mrp == null ? existing?.mrp ?? price : int(body.mrp, 'MRP', 1);
  const stock = int(body.stock ?? existing?.stock ?? 0, 'Stock');
  const stores = body.stores != null ? parseList(body.stores).filter((s) => STORE_IDS.includes(s)) : existing?.stores;
  if (!stores?.length) throw new HttpError(400, 'Choose at least one store');
  let sizes = body.sizes != null ? parseList(body.sizes) : existing?.sizes;
  if (!sizes?.length) sizes = SIZES[category];
  return { name, category, price, mrp: Math.max(mrp, price), stock, stores, sizes, description: String(body.description ?? existing?.description ?? '').trim() };
}

app.post('/api/admin/products', upload.single('image'), wrap((req, res) => {
  if (!req.file) throw new HttpError(400, 'Please upload a product photo');
  let p;
  try {
    p = readProductBody(req.body);
  } catch (e) {
    removeUpload(`/uploads/products/${req.file.filename}`);
    throw e;
  }
  const r = db.prepare('INSERT INTO products (name, category, description, price, mrp, stock, sizes, stores, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    p.name, p.category, p.description, p.price, p.mrp, p.stock, JSON.stringify(p.sizes), JSON.stringify(p.stores), `/uploads/products/${req.file.filename}`,
  );
  res.status(201).json(productRow(db.prepare('SELECT * FROM products WHERE id = ?').get(r.lastInsertRowid)));
}));

app.put('/api/admin/products/:id', upload.single('image'), wrap((req, res) => {
  const existing = productRow(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
  if (!existing) throw new HttpError(404, 'Product not found');
  const p = readProductBody(req.body, existing);
  const image = req.file ? `/uploads/products/${req.file.filename}` : existing.image;
  db.prepare('UPDATE products SET name = ?, category = ?, description = ?, price = ?, mrp = ?, stock = ?, sizes = ?, stores = ?, image = ? WHERE id = ?').run(
    p.name, p.category, p.description, p.price, p.mrp, p.stock, JSON.stringify(p.sizes), JSON.stringify(p.stores), image, existing.id,
  );
  if (req.file) removeUpload(existing.image);
  res.json(productRow(db.prepare('SELECT * FROM products WHERE id = ?').get(existing.id)));
}));

app.delete('/api/admin/products/:id', wrap((req, res) => {
  const existing = db.prepare('SELECT image FROM products WHERE id = ?').get(req.params.id);
  if (!existing) throw new HttpError(404, 'Product not found');
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  removeUpload(existing.image);
  res.json({ ok: true });
}));

/* ---- Home banners ---- */
const TONES = ['gold', 'blue', 'sage', 'cream', 'ink'];
function readBannerBody(body, existing) {
  const pick = (k, fallback = '') => String(body[k] ?? existing?.[k] ?? fallback).trim();
  const b = {
    tag: pick('tag'),
    title: pick('title'),
    highlight: pick('highlight'),
    offer: pick('offer'),
    sub: pick('sub'),
    cta: pick('cta', 'Shop now') || 'Shop now',
    link: pick('link', '/store/one') || '/store/one',
    tone: pick('tone', 'gold'),
    active: body.active != null ? (body.active === true || body.active === 'true' || body.active === '1' ? 1 : 0) : existing ? (existing.active ? 1 : 0) : 1,
  };
  if (!b.title) throw new HttpError(400, 'Heading is required');
  if (!TONES.includes(b.tone)) throw new HttpError(400, 'Pick a valid colour');
  if (!b.link.startsWith('/')) throw new HttpError(400, 'Button link must be a page on this website (start with /)');
  return b;
}

app.get('/api/admin/banners', (_req, res) => {
  res.json(db.prepare('SELECT * FROM banners ORDER BY sort, id').all().map(bannerRow));
});

app.post('/api/admin/banners', upload.single('image'), wrap((req, res) => {
  if (!req.file) throw new HttpError(400, 'Please upload a banner photo');
  let b;
  try {
    b = readBannerBody(req.body);
  } catch (e) {
    removeUpload(`/uploads/products/${req.file.filename}`);
    throw e;
  }
  const sort = (db.prepare('SELECT MAX(sort) AS m FROM banners').get().m ?? -1) + 1;
  const r = db.prepare('INSERT INTO banners (image, tag, title, highlight, offer, sub, cta, link, tone, active, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    `/uploads/products/${req.file.filename}`, b.tag, b.title, b.highlight, b.offer, b.sub, b.cta, b.link, b.tone, b.active, req.body.first === 'true' ? -1 : sort,
  );
  if (req.body.first === 'true') normaliseBannerOrder();
  res.status(201).json(bannerRow(db.prepare('SELECT * FROM banners WHERE id = ?').get(r.lastInsertRowid)));
}));

app.put('/api/admin/banners/:id', upload.single('image'), wrap((req, res) => {
  const existing = bannerRow(db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id));
  if (!existing) throw new HttpError(404, 'Banner not found');
  const b = readBannerBody(req.body, existing);
  const image = req.file ? `/uploads/products/${req.file.filename}` : existing.image;
  db.prepare('UPDATE banners SET image = ?, tag = ?, title = ?, highlight = ?, offer = ?, sub = ?, cta = ?, link = ?, tone = ?, active = ? WHERE id = ?').run(
    image, b.tag, b.title, b.highlight, b.offer, b.sub, b.cta, b.link, b.tone, b.active, existing.id,
  );
  if (req.file) removeUpload(existing.image);
  res.json(bannerRow(db.prepare('SELECT * FROM banners WHERE id = ?').get(existing.id)));
}));

function normaliseBannerOrder() {
  const rows = db.prepare('SELECT id FROM banners ORDER BY sort, id').all();
  const upd = db.prepare('UPDATE banners SET sort = ? WHERE id = ?');
  rows.forEach((r, i) => upd.run(i, r.id));
}

/** Move a banner one place up or down in the slideshow. */
app.post('/api/admin/banners/:id/move', wrap((req, res) => {
  normaliseBannerOrder();
  const rows = db.prepare('SELECT id, sort FROM banners ORDER BY sort, id').all();
  const i = rows.findIndex((r) => String(r.id) === req.params.id);
  if (i < 0) throw new HttpError(404, 'Banner not found');
  const j = req.body?.direction === 'up' ? i - 1 : i + 1;
  if (j >= 0 && j < rows.length) {
    const upd = db.prepare('UPDATE banners SET sort = ? WHERE id = ?');
    upd.run(j, rows[i].id);
    upd.run(i, rows[j].id);
  }
  res.json(db.prepare('SELECT * FROM banners ORDER BY sort, id').all().map(bannerRow));
}));

app.delete('/api/admin/banners/:id', wrap((req, res) => {
  const existing = db.prepare('SELECT image FROM banners WHERE id = ?').get(req.params.id);
  if (!existing) throw new HttpError(404, 'Banner not found');
  db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
  removeUpload(existing.image);
  res.json({ ok: true });
}));

app.put('/api/admin/stores/:id', wrap((req, res) => {
  if (!STORE_IDS.includes(req.params.id)) throw new HttpError(404, 'Store not found');
  const f = {};
  for (const k of ['name', 'address', 'hours', 'phone']) {
    f[k] = String(req.body?.[k] ?? '').trim();
    if (!f[k]) throw new HttpError(400, `Store ${k} is required`);
  }
  db.prepare('UPDATE stores SET name = ?, address = ?, hours = ?, phone = ? WHERE id = ?').run(f.name, f.address, f.hours, f.phone, req.params.id);
  res.json(db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id));
}));

app.get('/api/admin/notifications', (_req, res) => {
  res.json(db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 50').all());
});

/* ---------------- production: serve the built site ---------------- */
const dist = join(here, '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|uploads).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || (err instanceof multer.MulterError ? 400 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Something went wrong on the server' : err.message });
});

app.listen(PORT, () => console.log(`Sundar Brand API running on http://localhost:${PORT}`));
