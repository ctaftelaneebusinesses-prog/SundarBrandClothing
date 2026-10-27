import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Loader2, Lock, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../api';
import { inr, type Order } from '../data';

const today = () => new Date().toISOString().slice(0, 10);

export default function Cart() {
  const { cart, productById, stores, setQty, clearCart, refresh, loading, error } = useStore();
  const [f, setF] = useState({ name: '', phone: '', email: '', address: '', date: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Order | null>(null);
  const [method, setMethod] = useState('UPI');
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState<Order | null>(null);

  const lines = cart.flatMap((i) => {
    const p = productById(i.productId);
    return p ? [{ ...i, p }] : [];
  });
  const total = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const savings = lines.reduce((s, l) => s + Math.max(0, l.p.mrp - l.p.price) * l.qty, 0);
  const set = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Enter your name';
    if (f.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit mobile number';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email';
    if (!f.address.trim()) e.address = 'Enter your address';
    if (f.date && f.date < today()) e.date = 'Pick today or a later date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const checkout = async () => {
    setServerError('');
    if (!validate()) return;
    setBusy(true);
    try {
      const order = await api.createOrder({
        customer: { name: f.name, phone: f.phone, email: f.email, address: f.address },
        pickupDate: f.date || today(),
        items: cart,
      });
      setPending(order);
    } catch (e) {
      setServerError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    if (!pending) return;
    setBusy(true);
    setServerError('');
    try {
      const paid = await api.payOrder(pending.id, method);
      try {
        localStorage.setItem('sb.phone', f.phone);
      } catch {
        /* storage unavailable */
      }
      setPending(null);
      setDone(paid);
      clearCart();
      void refresh();
    } catch (e) {
      setServerError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="wrap cart-page">
        <motion.div className="confirm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="done__tick">
            <Check size={36} />
          </span>
          <h1>Booking confirmed!</h1>
          <p>
            Thank you, {done.customer.name}. Your payment was received and the store team has been notified. Show booking <b>{done.id}</b> at the store to collect.
          </p>
          <div className="ticket">
            <div>
              <small>Booking</small>
              <b>{done.id}</b>
            </div>
            <div>
              <small>Pick-up</small>
              <b>{done.pickupDate}</b>
            </div>
            <div>
              <small>Paid</small>
              <b>{inr(done.total)}</b>
            </div>
          </div>
          <ul className="confirm__items">
            {done.items.map((i, k) => (
              <li key={k}>
                <img src={i.image} alt="" />
                <span>
                  <b>{i.name}</b>
                  <small>
                    Size {i.size} × {i.qty} · <span className={`stag stag--${i.storeId}`}>Store {stores[i.storeId].no}</span>
                  </small>
                </span>
                <b>{inr(i.price * i.qty)}</b>
              </li>
            ))}
          </ul>
          <div className="pane__row">
            <Link to="/bookings" className="btn btn--line">
              My bookings
            </Link>
            <Link to="/" className="btn btn--gold btn--grow">
              Continue shopping
            </Link>
          </div>
        </motion.div>
      </div>
    );

  return (
    <div className="wrap cart-page">
      <h1 className="page-title">
        Your <em>cart.</em>
      </h1>

      {loading || error ? (
        <div className="bookings__empty">
          {loading ? (
            <p>
              <Loader2 size={18} className="spin" /> Loading your cart…
            </p>
          ) : (
            <>
              <p>{error}</p>
              <button className="btn btn--gold" onClick={() => void refresh()}>
                Try again
              </button>
            </>
          )}
        </div>
      ) : lines.length === 0 ? (
        <div className="bookings__empty">
          <ShoppingBag size={48} strokeWidth={1.3} />
          <p>Your cart is empty.</p>
          <div className="pane__row">
            <Link to="/store/one" className="btn btn--gold">
              Shop Store {stores.one.no}
            </Link>
            <Link to="/store/two" className="btn btn--line">
              Shop Store {stores.two.no}
            </Link>
          </div>
        </div>
      ) : (
        <div className="cart-grid">
          <div className="cart-lines">
            <AnimatePresence initial={false}>
              {lines.map((l) => (
                <motion.div key={`${l.productId}-${l.size}-${l.storeId}`} className="cline" layout exit={{ opacity: 0, x: -30 }}>
                  <Link to={`/product/${l.p.id}`}>
                    <img src={l.p.image} alt={l.p.name} />
                  </Link>
                  <div className="cline__info">
                    <Link to={`/product/${l.p.id}`}>
                      <b>{l.p.name}</b>
                    </Link>
                    <small>
                      Size {l.size} · <span className={`stag stag--${l.storeId}`}>Collect at Store {stores[l.storeId].no}</span>
                    </small>
                    <div className="cline__row">
                      <div className="stepper stepper--sm">
                        <button onClick={() => setQty(l, l.qty - 1)} aria-label="Decrease">
                          <Minus size={13} />
                        </button>
                        <span>{l.qty}</span>
                        <button onClick={() => setQty(l, Math.min(l.p.stock, l.qty + 1))} disabled={l.qty >= l.p.stock} aria-label="Increase">
                          <Plus size={13} />
                        </button>
                      </div>
                      <b>{inr(l.p.price * l.qty)}</b>
                    </div>
                    {l.qty > l.p.stock && <p className="hint">Only {l.p.stock} left — please reduce the quantity.</p>}
                  </div>
                  <button className="ibtn" onClick={() => setQty(l, 0)} aria-label="Remove">
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <aside className="checkout card">
            <h3>Your details</h3>
            <div className="fields">
              <label>
                Full name
                <input className="fld" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" />
                {errors.name && <span className="hint">{errors.name}</span>}
              </label>
              <label>
                Mobile number
                <input className="fld" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 90000 00000" />
                {errors.phone && <span className="hint">{errors.phone}</span>}
              </label>
              <label>
                Email (optional)
                <input className="fld" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" />
                {errors.email && <span className="hint">{errors.email}</span>}
              </label>
              <label>
                Address
                <textarea className="fld" rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="House no, street, town" />
                {errors.address && <span className="hint">{errors.address}</span>}
              </label>
              <label>
                Pick-up date
                <input className="fld" type="date" min={today()} value={f.date} onChange={(e) => set('date', e.target.value)} />
                {errors.date && <span className="hint">{errors.date}</span>}
              </label>
            </div>
            <div className="summary">
              <div>
                <span>Items ({lines.reduce((s, l) => s + l.qty, 0)})</span>
                <b>{inr(total + savings)}</b>
              </div>
              {savings > 0 && (
                <div>
                  <span>Discount</span>
                  <b className="save">− {inr(savings)}</b>
                </div>
              )}
              <div className="summary__total">
                <span>Total to pay</span>
                <b>{inr(total)}</b>
              </div>
            </div>
            {serverError && !pending && <p className="hint">{serverError}</p>}
            <button className="btn btn--ink btn--block btn--lg" onClick={checkout} disabled={busy}>
              {busy ? <Loader2 size={17} className="spin" /> : <Lock size={16} />} Proceed to pay {inr(total)}
            </button>
          </aside>
        </div>
      )}

      <AnimatePresence>
        {pending && (
          <motion.div className="overlay overlay--center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="paybox" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <div className="paybox__head">
                <span className="razor__logo">Razorpay</span>
                <span className="paybox__test">Test mode</span>
                <button className="ibtn" onClick={() => setPending(null)} disabled={busy} aria-label="Cancel payment">
                  <X size={18} />
                </button>
              </div>
              <div className="paybox__amt">
                <small>Sundar Brand · {pending.id}</small>
                <b>{inr(pending.total)}</b>
              </div>
              <div className="razor__methods">
                {['UPI', 'Card', 'Net banking'].map((m) => (
                  <button key={m} className={method === m ? 'is-on' : ''} onClick={() => setMethod(m)}>
                    {m}
                  </button>
                ))}
              </div>
              {serverError && <p className="hint hint--light">{serverError}</p>}
              <button className="btn btn--gold btn--block btn--lg" onClick={pay} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 size={17} className="spin" /> Processing…
                  </>
                ) : (
                  <>
                    <Lock size={16} /> Pay {inr(pending.total)} via {method}
                  </>
                )}
              </button>
              <small className="paybox__note">
                <Lock size={12} /> Secured by Razorpay
              </small>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {lines.length > 0 && (
        <div className="cart-cta">
          <Link to="/store/one">
            Keep shopping <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </div>
  );
}
