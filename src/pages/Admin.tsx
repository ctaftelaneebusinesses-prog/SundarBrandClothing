import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, CalendarCheck, Clock3, CreditCard, ImagePlus, IndianRupee, Loader2, LogOut, Mail, Package, Pencil, Plus, RefreshCw, Search,
  Store as StoreIcon, Trash2, TrendingUp, X, Images, Check, MapPin,
} from 'lucide-react';
import { useStore } from '../store';
import { adminToken, api, ApiError } from '../api';
import { CATS, ORDER_STATUSES, SIZES, inr, type Category, type Notification, type Order, type OrderStatus, type Product, type StoreId, type StoreInfo } from '../data';
import { Logo } from '../components/Layout';
import { BannersTab } from './AdminBanners';

type Tab = 'bookings' | 'products' | 'banners' | 'email' | 'payments' | 'stores';

const NAV: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: 'bookings', label: 'Bookings', icon: CalendarCheck },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'banners', label: 'Home banners', icon: Images },
  { id: 'email', label: 'Email alerts', icon: Mail },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'stores', label: 'Stores', icon: StoreIcon },
];

const TITLES: Record<Tab, [string, string]> = {
  bookings: ['Bookings', 'Every reservation across both stores. Update the status as orders are packed and collected.'],
  products: ['Products', 'Add photos, set prices and stock, and choose which store carries each piece.'],
  banners: ['Home banners', 'The moving banner at the top of the home page. Change photos and offers for festivals and sales.'],
  email: ['Email alerts', 'An alert is created the moment a customer pays.'],
  payments: ['Payments', 'Payments received through checkout.'],
  stores: ['Stores', 'Names, addresses and hours shown across the website.'],
};

export default function Admin() {
  const [authed, setAuthed] = useState(() => Boolean(adminToken.get()));
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => setAuthed(false)} />;
}

function Login({ onDone }: { onDone: () => void }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.login(u.trim(), p);
      adminToken.set(token);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login">
      <motion.form className="login__card" onSubmit={submit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Logo height={110} />
        <h1>Admin login</h1>
        <p>Sign in to manage products, stores and bookings.</p>
        <label>
          Username
          <input className="fld" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <label>
          Password
          <input className="fld" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" />
        </label>
        {error && <p className="hint">{error}</p>}
        <button className="btn btn--gold btn--block btn--lg" disabled={busy || !u || !p}>
          {busy && <Loader2 size={16} className="spin" />} Sign in
        </button>
        <Link to="/" className="login__back">
          <ArrowLeft size={15} /> Back to website
        </Link>
      </motion.form>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('bookings');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useStore();

  const logout = useCallback(() => {
    adminToken.set(null);
    onLogout();
  }, [onLogout]);

  const handle = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        notify('Session expired — please log in again');
        logout();
      } else notify((e as Error).message);
    },
    [logout, notify],
  );

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await api.adminOrders());
    } catch (e) {
      handle(e);
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <div className="admin">
      <aside className="admin__side">
        <div className="admin__brand">
          <Logo height={64} />
          <span>Admin</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <button key={n.id} className={tab === n.id ? 'is-on' : ''} onClick={() => setTab(n.id)}>
              {tab === n.id && <motion.span layoutId="admin-nav" className="admin__navbg" />}
              <n.icon size={18} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="admin__foot">
          <Link to="/" className="admin__back">
            <ArrowLeft size={17} /> <span>View website</span>
          </Link>
          <button className="admin__back" onClick={logout}>
            <LogOut size={17} /> <span>Log out</span>
          </button>
        </div>
      </aside>
      <main className="admin__main">
        <header className="admin__head">
          <div>
            <h1>{TITLES[tab][0]}</h1>
            <p>{TITLES[tab][1]}</p>
          </div>
          {(tab === 'bookings' || tab === 'payments') && (
            <button className="btn btn--line btn--sm" onClick={() => void loadOrders()}>
              <RefreshCw size={15} /> Refresh
            </button>
          )}
        </header>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {tab === 'bookings' && <BookingsTab orders={orders} loading={loading} onChange={setOrders} onError={handle} />}
            {tab === 'products' && <ProductsTab onError={handle} />}
            {tab === 'banners' && <BannersTab onError={handle} />}
            {tab === 'email' && <EmailTab onError={handle} />}
            {tab === 'payments' && <PaymentsTab orders={orders} />}
            {tab === 'stores' && <StoresTab onError={handle} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon, hero }: { label: string; value: string; sub: string; icon: typeof Package; hero?: boolean }) {
  return (
    <div className={`kpi ${hero ? 'kpi--hero' : ''}`}>
      <span className="kpi__ic">
        <Icon size={18} />
      </span>
      <small>{label}</small>
      <b>{value}</b>
      <em>{sub}</em>
    </div>
  );
}

const isPaid = (o: Order) => o.status !== 'Pending payment' && o.status !== 'Cancelled';
const orderStores = (o: Order) => [...new Set(o.items.map((i) => i.storeId))];

/* ---------------- Bookings ---------------- */
function BookingsTab({ orders, loading, onChange, onError }: { orders: Order[]; loading: boolean; onChange: (o: Order[]) => void; onError: (e: unknown) => void }) {
  const { stores, notify } = useStore();
  const [store, setStore] = useState<'all' | StoreId>('all');
  const [q, setQ] = useState('');
  const paid = orders.filter(isPaid);
  const list = orders.filter(
    (o) =>
      (store === 'all' || orderStores(o).includes(store)) &&
      (!q || `${o.id} ${o.customer.name} ${o.customer.phone}`.toLowerCase().includes(q.toLowerCase())),
  );

  const changeStatus = async (o: Order, status: OrderStatus) => {
    try {
      const updated = await api.setOrderStatus(o.id, status);
      onChange(orders.map((x) => (x.id === o.id ? updated : x)));
      notify(`${o.id} marked as ${status}`);
    } catch (e) {
      onError(e);
    }
  };

  return (
    <>
      <div className="kpis">
        <Stat hero label="Revenue (paid)" value={inr(paid.reduce((s, o) => s + o.total, 0))} sub={`${paid.length} paid bookings`} icon={IndianRupee} />
        <Stat label="Awaiting pick-up" value={String(orders.filter((o) => o.status === 'Paid' || o.status === 'Ready for pick-up').length)} sub="Paid, not yet collected" icon={Clock3} />
        <Stat label={`Store ${stores.one.no}`} value={String(paid.filter((o) => orderStores(o).includes('one')).length)} sub="paid bookings" icon={StoreIcon} />
        <Stat label={`Store ${stores.two.no}`} value={String(paid.filter((o) => orderStores(o).includes('two')).length)} sub="paid bookings" icon={StoreIcon} />
      </div>
      <div className="card">
        <div className="card__head">
          <div className="search">
            <Search size={16} />
            <input placeholder="Search booking, name or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="seg">
            {(['all', 'one', 'two'] as const).map((s) => (
              <button key={s} className={store === s ? 'is-on' : ''} onClick={() => setStore(s)}>
                {s === 'all' ? 'All' : `Store ${stores[s].no}`}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <p className="muted">Loading bookings…</p>
        ) : list.length === 0 ? (
          <p className="muted">No bookings yet. They will appear here as soon as customers check out.</p>
        ) : (
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Items</th>
                  <th>Store</th>
                  <th>Pick-up</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <b>{o.id}</b>
                      <small>{o.createdAt.slice(0, 16)}</small>
                    </td>
                    <td>
                      {o.customer.name}
                      <small>{o.customer.phone}</small>
                      {o.customer.email && <small>{o.customer.email}</small>}
                    </td>
                    <td className="td-wrap">{o.customer.address}</td>
                    <td>
                      {o.items.map((i, k) => (
                        <span key={k} className="titem">
                          <img src={i.image} alt="" />
                          {i.name} · {i.size} × {i.qty}
                        </span>
                      ))}
                    </td>
                    <td>
                      {orderStores(o).map((s) => (
                        <span key={s} className={`sbadge sbadge--${s}`}>
                          {stores[s].no}
                        </span>
                      ))}
                    </td>
                    <td>{o.pickupDate}</td>
                    <td>
                      <b>{inr(o.total)}</b>
                    </td>
                    <td>
                      <select className={`status-sel status--${o.status.split(' ')[0].toLowerCase()}`} value={o.status} onChange={(e) => void changeStatus(o, e.target.value as OrderStatus)}>
                        {ORDER_STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- Products ---------------- */
function ProductsTab({ onError }: { onError: (e: unknown) => void }) {
  const { products, stores, refresh, notify } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'All' | Category>('All');
  const [loc, setLoc] = useState<'all' | StoreId>('all');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const list = useMemo(
    () =>
      products.filter(
        (p) => (cat === 'All' || p.category === cat) && (loc === 'all' || p.stores.includes(loc)) && p.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [products, q, cat, loc],
  );

  const remove = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This removes it from the website.`)) return;
    try {
      await api.deleteProduct(p.id);
      await refresh();
      notify(`${p.name} deleted`);
    } catch (e) {
      onError(e);
    }
  };

  return (
    <div className="card">
      <div className="card__head">
        <div className="search">
          <Search size={16} />
          <input placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" value={cat} onChange={(e) => setCat(e.target.value as Category | 'All')}>
          <option>All</option>
          {CATS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <div className="seg">
          {(['all', 'one', 'two'] as const).map((s) => (
            <button key={s} className={loc === s ? 'is-on' : ''} onClick={() => setLoc(s)}>
              {s === 'all' ? 'All locations' : `Location ${stores[s].no}`}
            </button>
          ))}
        </div>
        <button className="btn btn--gold" onClick={() => setEditing('new')}>
          <Plus size={17} /> Add product
        </button>
      </div>
      <div className="plist">
        <div className="prow prow--head">
          <span />
          <span>Product</span>
          <span>Stores</span>
          <span>Stock</span>
          <span>Price</span>
          <span />
        </div>
        {list.map((p) => (
          <div key={p.id} className="prow">
            <img src={p.image} alt="" />
            <div className="prow__n">
              <b>{p.name}</b>
              <small>
                {p.category} · {p.sizes.join(', ')}
              </small>
            </div>
            <div className="prow__locs">
              {p.stores.map((l) => (
                <span key={l} className={`sbadge sbadge--${l}`}>
                  {stores[l].no}
                </span>
              ))}
            </div>
            <span className={`stock ${p.stock <= 5 ? 'stock--low' : ''}`}>{p.stock === 0 ? 'Sold out' : `${p.stock} left`}</span>
            <div className="prow__p">
              <b>{inr(p.price)}</b>
              {p.mrp > p.price && <s>{inr(p.mrp)}</s>}
            </div>
            <div className="prow__act">
              <button className="ibtn ibtn--edit" aria-label="Edit" onClick={() => setEditing(p)}>
                <Pencil size={16} />
              </button>
              <button className="ibtn" aria-label="Delete" onClick={() => void remove(p)}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="muted">No products match.</p>}
      </div>
      <AnimatePresence>{editing && <ProductForm key={editing === 'new' ? 'new' : editing.id} product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onError={onError} />}</AnimatePresence>
    </div>
  );
}

function ProductForm({ product, onClose, onError }: { product: Product | null; onClose: () => void; onError: (e: unknown) => void }) {
  const { stores, refresh, notify } = useStore();
  const [f, setF] = useState({
    name: product?.name ?? '',
    category: (product?.category ?? 'Suits') as Category,
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    mrp: product ? String(product.mrp) : '',
    stock: product ? String(product.stock) : '',
    stores: product?.stores ?? (['one', 'two'] as StoreId[]),
    sizes: product?.sizes ?? SIZES.Suits,
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(product?.image ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const setCategory = (c: Category) => setF((x) => ({ ...x, category: c, sizes: SIZES[c] }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!product && !file) return setError('Please upload a product photo');
    if (!f.name.trim()) return setError('Please enter the product name');
    if (!Number(f.price)) return setError('Please enter the price');
    if (f.stores.length === 0) return setError('Choose at least one store');
    if (f.sizes.length === 0) return setError('Choose at least one size');
    const form = new FormData();
    form.append('name', f.name.trim());
    form.append('category', f.category);
    form.append('description', f.description);
    form.append('price', String(Math.round(Number(f.price))));
    form.append('mrp', f.mrp ? String(Math.round(Number(f.mrp))) : '');
    form.append('stock', String(Math.round(Number(f.stock) || 0)));
    form.append('stores', JSON.stringify(f.stores));
    form.append('sizes', JSON.stringify(f.sizes));
    if (file) form.append('image', file);
    setBusy(true);
    try {
      await api.saveProduct(form, product?.id);
      await refresh();
      notify(product ? `${f.name} updated` : `${f.name} is now live on the website`);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onError(err);
      else setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div className="overlay overlay--center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form className="pform" onSubmit={submit} onClick={(e) => e.stopPropagation()} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
        <div className="pform__head">
          <h3>{product ? 'Edit product' : 'Add a product'}</h3>
          <button type="button" className="ibtn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="pform__grid">
          <div>
            <div
              className={`drop ${preview ? 'has' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files[0];
                if (dropped?.type.startsWith('image/')) setFile(dropped);
              }}
            >
              {preview ? (
                <img src={preview} alt="Preview" />
              ) : (
                <div>
                  <ImagePlus size={30} />
                  <b>Upload product photo</b>
                  <small>JPG, PNG or WebP · up to 8 MB</small>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            {preview && (
              <button type="button" className="btn btn--line btn--sm btn--block" onClick={() => fileRef.current?.click()}>
                <ImagePlus size={15} /> Change photo
              </button>
            )}
          </div>
          <div className="addform">
            <label>
              Product name
              <input className="fld" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Ivory linen suit" />
            </label>
            <div className="locpick">
              <div className="locpick__head">
                <span>Which location has this product?</span>
                <button
                  type="button"
                  className={`locpick__both ${f.stores.length === 2 ? 'is-on' : ''}`}
                  onClick={() => setF((x) => ({ ...x, stores: ['one', 'two'] }))}
                >
                  <Check size={14} /> Both locations
                </button>
              </div>
              <div className="locpick__grid">
                {(['one', 'two'] as StoreId[]).map((s) => {
                  const on = f.stores.includes(s);
                  return (
                    <button
                      type="button"
                      key={s}
                      role="checkbox"
                      aria-checked={on}
                      className={`loccard loccard--${s} ${on ? 'is-on' : ''}`}
                      onClick={() => setF((x) => ({ ...x, stores: toggle(x.stores, s) }))}
                    >
                      <span className="loccard__box">{on && <Check size={15} />}</span>
                      <span className="loccard__txt">
                        <b>Location {stores[s].no}</b>
                        <small>{stores[s].name}</small>
                      </span>
                      <MapPin size={18} className="loccard__pin" />
                    </button>
                  );
                })}
              </div>
              <small className={`locpick__note ${f.stores.length === 0 ? 'is-warn' : ''}`}>
                {f.stores.length === 0
                  ? 'Select at least one location.'
                  : f.stores.length === 2
                    ? 'Customers can book this from both locations.'
                    : `Only shown in Location ${stores[f.stores[0]].no}.`}
              </small>
            </div>
            <label>
              Category
              <select className="fld" value={f.category} onChange={(e) => setCategory(e.target.value as Category)}>
                {CATS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <div className="fields__3">
              <label>
                Price (₹)
                <input className="fld" type="number" min={1} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
              </label>
              <label>
                MRP (₹)
                <input className="fld" type="number" min={1} value={f.mrp} onChange={(e) => setF({ ...f, mrp: e.target.value })} />
              </label>
              <label>
                In stock
                <input className="fld" type="number" min={0} value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} />
              </label>
            </div>
            <div className="avail">
              <span>Sizes</span>
              {SIZES[f.category].map((s) => (
                <label key={s} className={`tog ${f.sizes.includes(s) ? 'is-on' : ''}`}>
                  <input type="checkbox" checked={f.sizes.includes(s)} onChange={() => setF((x) => ({ ...x, sizes: toggle(x.sizes, s) }))} />
                  {s}
                </label>
              ))}
            </div>
            <label>
              Description
              <textarea className="fld" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Fabric, fit, occasion…" />
            </label>
          </div>
        </div>
        {error && <p className="hint pform__err">{error}</p>}
        <div className="pform__foot">
          <button type="button" className="btn btn--line" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--gold" disabled={busy}>
            {busy && <Loader2 size={16} className="spin" />} {product ? 'Save changes' : 'Publish to store'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

/* ---------------- Email alerts ---------------- */
function EmailTab({ onError }: { onError: (e: unknown) => void }) {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [open, setOpen] = useState<Notification | null>(null);
  useEffect(() => {
    api
      .notifications()
      .then((n) => {
        setItems(n);
        setOpen(n[0] ?? null);
      })
      .catch(onError);
  }, [onError]);

  if (!items) return <p className="muted">Loading…</p>;
  if (items.length === 0) return <div className="card"><p className="muted">No alerts yet. Each paid booking creates an alert here.</p></div>;
  return (
    <div className="email-layout">
      <div className="card inbox">
        {items.map((n) => (
          <button key={n.id} className={`inbox__row ${open?.id === n.id ? 'is-on' : ''}`} onClick={() => setOpen(n)}>
            <b>{n.subject}</b>
            <small>{n.created_at}</small>
          </button>
        ))}
      </div>
      {open && (
        <div className="mail">
          <div className="mail__bar">
            <span />
            <span />
            <span />
          </div>
          <div className="mail__meta">
            <small>Subject:</small> <b>{open.subject}</b>
            <br />
            <small>From: Sundar Brand bookings · {open.created_at}</small>
          </div>
          <div className="mail__body">
            <Logo height={70} />
            <h2>Payment received</h2>
            {open.body.split('\n').map((line, i) => {
              const [k, ...v] = line.split(': ');
              return (
                <div key={i} className="mail__row">
                  <span>{k}</span>
                  <b>{v.join(': ')}</b>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Payments ---------------- */
function PaymentsTab({ orders }: { orders: Order[] }) {
  const paid = orders.filter((o) => o.paymentId);
  const total = paid.filter(isPaid).reduce((s, o) => s + o.total, 0);
  const fee = Math.round(total * 0.02);
  return (
    <>
      <div className="kpis">
        <Stat hero label="Collected" value={inr(total)} sub="via Razorpay (test mode)" icon={IndianRupee} />
        <Stat label="Gateway fee (≈2%)" value={inr(fee)} sub="estimated" icon={CreditCard} />
        <Stat label="Net settlement" value={inr(total - fee)} sub="to your bank account" icon={TrendingUp} />
        <Stat label="Transactions" value={String(paid.length)} sub="successful payments" icon={CalendarCheck} />
      </div>
      <div className="card">
        <h3>Transactions</h3>
        {paid.length === 0 ? (
          <p className="muted">No payments yet.</p>
        ) : (
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <code>{o.paymentId}</code>
                    </td>
                    <td>{o.id}</td>
                    <td>{o.customer.name}</td>
                    <td>{o.paymentMethod}</td>
                    <td>{o.createdAt.slice(0, 10)}</td>
                    <td>
                      <b>{inr(o.total)}</b>
                    </td>
                    <td>
                      <i className={`status ${o.status === 'Cancelled' ? 'status--cancelled' : 'status--collected'}`}>{o.status === 'Cancelled' ? 'Refund due' : 'Captured'}</i>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- Stores ---------------- */
function StoresTab({ onError }: { onError: (e: unknown) => void }) {
  const { stores, products, refresh, notify } = useStore();
  return (
    <div className="stores-edit">
      {(['one', 'two'] as StoreId[]).map((id) => (
        <StoreForm
          key={id + stores[id].name}
          store={stores[id]}
          count={products.filter((p) => p.stores.includes(id)).length}
          onSave={async (s) => {
            try {
              await api.saveStore(id, { name: s.name, address: s.address, hours: s.hours, phone: s.phone });
              await refresh();
              notify(`Store ${s.no} updated on the website`);
            } catch (e) {
              onError(e);
            }
          }}
        />
      ))}
    </div>
  );
}

function StoreForm({ store, count, onSave }: { store: StoreInfo; count: number; onSave: (s: StoreInfo) => Promise<void> }) {
  const [s, setS] = useState(store);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={`card storecard storecard--${store.id}`}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSave(s);
        setBusy(false);
      }}
    >
      <div className="storecard__top">
        <span className="storecard__no">{store.no}</span>
        <div>
          <h3>Store {store.no}</h3>
          <small>{count} products on the rack</small>
        </div>
      </div>
      {(
        [
          ['name', 'Location name'],
          ['address', 'Address'],
          ['hours', 'Opening hours'],
          ['phone', 'Phone number'],
        ] as const
      ).map(([k, l]) => (
        <label key={k}>
          {l}
          <input className="fld" value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} required />
        </label>
      ))}
      <button className="btn btn--ink btn--block" disabled={busy}>
        {busy && <Loader2 size={16} className="spin" />} Save Store {store.no}
      </button>
    </form>
  );
}
