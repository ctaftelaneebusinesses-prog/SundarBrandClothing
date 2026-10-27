/**
 * Demo backend that runs entirely in the browser.
 *
 * Used automatically when the site is hosted without its API (e.g. a static Netlify deploy),
 * so the storefront, checkout and admin all keep working. Data is kept in localStorage,
 * so it is per-browser — the real server (server/index.mjs) is the source of truth in production.
 * The rules mirror the server: prices and stock are checked here, not trusted from the cart.
 */
import seed from '../shared/seed.json';
import { ApiError } from './apiError';
import type { BannerSlide, CartItem, Category, Notification, Order, OrderStatus, Product, StoreId, StoreInfo } from './data';

const KEY = 'sb.demo.db.v1';
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'sundar@123';
const STORE_IDS: StoreId[] = ['one', 'two'];
const TONES = ['gold', 'blue', 'sage', 'cream', 'ink'];
const STATUSES: OrderStatus[] = ['Pending payment', 'Paid', 'Ready for pick-up', 'Collected', 'Cancelled'];
const SIZES = seed.sizes as Record<Category, string[]>;

interface Db {
  stores: StoreInfo[];
  products: Product[];
  banners: BannerSlide[];
  orders: Order[];
  notifications: Notification[];
  nextProductId: number;
  nextBannerId: number;
  nextOrderNo: number;
  nextNotificationId: number;
}

const fresh = (): Db => ({
  stores: seed.stores as StoreInfo[],
  products: seed.products as Product[],
  banners: seed.banners as BannerSlide[],
  orders: [],
  notifications: [],
  nextProductId: seed.products.length + 1,
  nextBannerId: seed.banners.length + 1,
  nextOrderNo: 1043,
  nextNotificationId: 1,
});

let memory: Db | null = null;
function load(): Db {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    memory = raw ? (JSON.parse(raw) as Db) : fresh();
  } catch {
    memory = fresh();
  }
  return memory;
}
function save(db: Db) {
  memory = db;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    throw new ApiError(507, 'Browser storage is full — try a smaller photo');
  }
}
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function requireAdmin() {
  let token: string | null = null;
  try {
    token = localStorage.getItem('sb.adminToken');
  } catch {
    /* ignore */
  }
  if (token !== 'demo-admin') throw new ApiError(401, 'Please log in');
}

/** Shrink uploaded photos so they fit comfortably in browser storage. */
function compressImage(file: File, max = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new ApiError(400, 'Please upload a JPG, PNG or WebP photo'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ApiError(400, 'That photo could not be read'));
    };
    img.src = url;
  });
}

const field = (form: FormData, k: string) => {
  const v = form.get(k);
  return typeof v === 'string' ? v : null;
};
const list = (v: string | null): string[] => {
  if (!v) return [];
  try {
    const j = JSON.parse(v);
    return Array.isArray(j) ? j.map(String) : [];
  } catch {
    return v.split(',').map((s) => s.trim()).filter(Boolean);
  }
};
const whole = (v: unknown, name: string, min = 0) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min) throw new ApiError(400, `${name} must be a whole number${min ? ` of at least ${min}` : ''}`);
  return n;
};
const imageFile = (form: FormData) => {
  const f = form.get('image');
  return f instanceof File && f.size > 0 ? f : null;
};

export const demoApi = {
  async stores() {
    return clone(load().stores);
  },
  async banners() {
    return clone(load().banners.filter((b) => b.active).sort((a, b) => a.sort - b.sort || a.id - b.id));
  },
  async products() {
    return clone(load().products);
  },
  async product(id: number | string) {
    const p = load().products.find((x) => x.id === Number(id));
    if (!p) throw new ApiError(404, 'Product not found');
    return clone(p);
  },

  async createOrder(body: { customer: Order['customer']; pickupDate: string; items: CartItem[] }) {
    await wait();
    const db = load();
    const c = body.customer;
    if (!c.name?.trim()) throw new ApiError(400, 'Please enter your name');
    if ((c.phone || '').replace(/\D/g, '').length < 10) throw new ApiError(400, 'Please enter a 10-digit mobile number');
    if (!c.address?.trim()) throw new ApiError(400, 'Please enter your address');
    if (!body.items?.length) throw new ApiError(400, 'Your cart is empty');
    const lines = body.items.map((it) => {
      const p = db.products.find((x) => x.id === it.productId);
      if (!p) throw new ApiError(400, 'A product in your cart is no longer available');
      const qty = whole(it.qty, 'Quantity', 1);
      if (!p.sizes.includes(it.size)) throw new ApiError(400, `Size ${it.size} is not available for ${p.name}`);
      if (!p.stores.includes(it.storeId)) throw new ApiError(400, `${p.name} is not stocked at that store`);
      if (qty > p.stock) throw new ApiError(400, `Only ${p.stock} left of ${p.name}`);
      return { productId: p.id, storeId: it.storeId, name: p.name, image: p.image, size: it.size, qty, price: p.price };
    });
    const order: Order = {
      id: `SB-${db.nextOrderNo++}`,
      customer: { name: c.name.trim(), phone: c.phone.trim(), email: (c.email || '').trim(), address: c.address.trim() },
      pickupDate: body.pickupDate || new Date().toISOString().slice(0, 10),
      total: lines.reduce((s, l) => s + l.price * l.qty, 0),
      status: 'Pending payment',
      paymentId: null,
      paymentMethod: null,
      createdAt: now(),
      items: lines,
    };
    db.orders.unshift(order);
    save(db);
    return clone(order);
  },

  async payOrder(id: string, method: string) {
    await wait(900);
    const db = load();
    const order = db.orders.find((o) => o.id === id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status !== 'Pending payment') throw new ApiError(400, 'This order is already paid');
    for (const it of order.items) {
      const p = db.products.find((x) => x.id === it.productId);
      if (!p || p.stock < it.qty) throw new ApiError(409, `${it.name} just sold out — please update your cart`);
    }
    for (const it of order.items) db.products.find((x) => x.id === it.productId)!.stock -= it.qty;
    order.status = 'Paid';
    order.paymentId = `pay_demo${Math.random().toString(16).slice(2, 12)}`;
    order.paymentMethod = method || 'UPI';
    const no = (s: StoreId) => db.stores.find((x) => x.id === s)?.no ?? s;
    const storeList = [...new Set(order.items.map((i) => `Store ${no(i.storeId)}`))].join(' & ');
    db.notifications.unshift({
      id: db.nextNotificationId++,
      order_id: order.id,
      subject: `New paid booking ${order.id} · ${storeList}`,
      body: [
        `Customer: ${order.customer.name}`,
        `Mobile: ${order.customer.phone}`,
        `Address: ${order.customer.address}`,
        ...order.items.map((i) => `Item: ${i.name} · ${i.size} × ${i.qty} (Store ${no(i.storeId)})`),
        `Amount: ₹ ${order.total.toLocaleString('en-IN')}`,
        `Pick-up: ${order.pickupDate}`,
      ].join('\n'),
      created_at: now(),
    });
    save(db);
    return clone(order);
  },

  async myOrders(phone: string) {
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length < 10) throw new ApiError(400, 'Enter your 10-digit mobile number');
    return clone(load().orders.filter((o) => o.status !== 'Pending payment' && o.customer.phone.replace(/\D/g, '').endsWith(digits)));
  },

  async login(username: string, password: string) {
    await wait();
    if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) throw new ApiError(401, 'Wrong username or password');
    return { token: 'demo-admin' };
  },

  async adminOrders() {
    requireAdmin();
    return clone(load().orders);
  },
  async setOrderStatus(id: string, status: OrderStatus) {
    requireAdmin();
    if (!STATUSES.includes(status)) throw new ApiError(400, 'Unknown status');
    const db = load();
    const o = db.orders.find((x) => x.id === id);
    if (!o) throw new ApiError(404, 'Order not found');
    o.status = status;
    save(db);
    return clone(o);
  },

  async saveProduct(form: FormData, id?: number) {
    requireAdmin();
    const db = load();
    const existing = id ? db.products.find((p) => p.id === id) : undefined;
    if (id && !existing) throw new ApiError(404, 'Product not found');
    const file = imageFile(form);
    if (!existing && !file) throw new ApiError(400, 'Please upload a product photo');
    const name = (field(form, 'name') ?? existing?.name ?? '').trim();
    const category = (field(form, 'category') ?? existing?.category ?? '') as Category;
    if (!name) throw new ApiError(400, 'Product name is required');
    if (!SIZES[category]) throw new ApiError(400, 'Pick a valid category');
    const price = whole(field(form, 'price') ?? existing?.price, 'Price', 1);
    const mrpRaw = field(form, 'mrp');
    const mrp = mrpRaw ? whole(mrpRaw, 'MRP', 1) : existing?.mrp ?? price;
    const stock = whole(field(form, 'stock') ?? existing?.stock ?? 0, 'Stock');
    const storesRaw = field(form, 'stores');
    const stores = (storesRaw != null ? list(storesRaw) : existing?.stores ?? []).filter((s): s is StoreId => STORE_IDS.includes(s as StoreId));
    if (!stores.length) throw new ApiError(400, 'Choose at least one store');
    const sizesRaw = field(form, 'sizes');
    let sizes = sizesRaw != null ? list(sizesRaw) : existing?.sizes ?? [];
    if (!sizes.length) sizes = SIZES[category];
    const image = file ? await compressImage(file) : existing!.image;
    const product: Product = {
      id: existing?.id ?? db.nextProductId++,
      name,
      category,
      description: (field(form, 'description') ?? existing?.description ?? '').trim(),
      price,
      mrp: Math.max(mrp, price),
      stock,
      sizes,
      stores,
      image,
    };
    if (existing) Object.assign(existing, product);
    else db.products.unshift(product);
    save(db);
    return clone(product);
  },
  async deleteProduct(id: number) {
    requireAdmin();
    const db = load();
    db.products = db.products.filter((p) => p.id !== id);
    save(db);
    return { ok: true as const };
  },

  async saveStore(id: StoreId, body: Omit<StoreInfo, 'id' | 'no'>) {
    requireAdmin();
    const db = load();
    const s = db.stores.find((x) => x.id === id);
    if (!s) throw new ApiError(404, 'Store not found');
    for (const k of ['name', 'address', 'hours', 'phone'] as const) {
      if (!body[k]?.trim()) throw new ApiError(400, `Store ${k} is required`);
      s[k] = body[k].trim();
    }
    save(db);
    return clone(s);
  },

  async notifications() {
    requireAdmin();
    return clone(load().notifications);
  },

  async adminBanners() {
    requireAdmin();
    return clone(load().banners.sort((a, b) => a.sort - b.sort || a.id - b.id));
  },
  async saveBanner(form: FormData, id?: number) {
    requireAdmin();
    const db = load();
    const existing = id ? db.banners.find((b) => b.id === id) : undefined;
    if (id && !existing) throw new ApiError(404, 'Banner not found');
    const file = imageFile(form);
    if (!existing && !file) throw new ApiError(400, 'Please upload a banner photo');
    const pick = (k: keyof BannerSlide, fallback = '') => (field(form, k) ?? (existing?.[k] as string | undefined) ?? fallback).trim();
    const activeRaw = field(form, 'active');
    const b: BannerSlide = {
      id: existing?.id ?? db.nextBannerId++,
      image: file ? await compressImage(file, 1400) : existing!.image,
      tag: pick('tag'),
      title: pick('title'),
      highlight: pick('highlight'),
      offer: pick('offer'),
      sub: pick('sub'),
      cta: pick('cta', 'Shop now') || 'Shop now',
      link: pick('link', '/store/one') || '/store/one',
      tone: pick('tone', 'gold') as BannerSlide['tone'],
      sort: existing?.sort ?? Math.max(-1, ...db.banners.map((x) => x.sort)) + 1,
      active: activeRaw != null ? activeRaw === 'true' || activeRaw === '1' : existing?.active ?? true,
    };
    if (!b.title) throw new ApiError(400, 'Heading is required');
    if (!TONES.includes(b.tone)) throw new ApiError(400, 'Pick a valid colour');
    if (!b.link.startsWith('/')) throw new ApiError(400, 'Button link must be a page on this website (start with /)');
    if (existing) Object.assign(existing, b);
    else db.banners.push(b);
    save(db);
    return clone(b);
  },
  async moveBanner(id: number, direction: 'up' | 'down') {
    requireAdmin();
    const db = load();
    const rows = db.banners.sort((a, b) => a.sort - b.sort || a.id - b.id);
    rows.forEach((r, i) => (r.sort = i));
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) throw new ApiError(404, 'Banner not found');
    const j = direction === 'up' ? i - 1 : i + 1;
    if (j >= 0 && j < rows.length) [rows[i].sort, rows[j].sort] = [rows[j].sort, rows[i].sort];
    save(db);
    return clone(db.banners.sort((a, b) => a.sort - b.sort));
  },
  async deleteBanner(id: number) {
    requireAdmin();
    const db = load();
    db.banners = db.banners.filter((b) => b.id !== id);
    save(db);
    return { ok: true as const };
  },
};
