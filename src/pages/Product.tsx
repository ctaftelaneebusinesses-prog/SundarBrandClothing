import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, MapPin, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Store, Zap } from 'lucide-react';
import { useStore } from '../store';
import { inr, off, type StoreId } from '../data';

export default function Product() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { productById, products, stores, loading, error, refresh, addToCart, notify } = useStore();
  const p = productById(Number(id));

  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [storeId, setStoreId] = useState<StoreId | ''>('');
  const [sizeError, setSizeError] = useState(false);

  useEffect(() => {
    if (!p) return;
    const wanted = params.get('store') as StoreId | null;
    setStoreId(wanted && p.stores.includes(wanted) ? wanted : p.stores[0]);
    setSize(p.sizes.length === 1 ? p.sizes[0] : '');
    setQty(1);
    setSizeError(false);
  }, [p, params]);

  if (loading) return <div className="wrap pdp-empty">Loading…</div>;
  if (error)
    return (
      <div className="wrap pdp-empty">
        <p>{error}</p>
        <button className="btn btn--gold" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  if (!p)
    return (
      <div className="wrap pdp-empty">
        <h2>Product not found</h2>
        <Link to="/" className="btn btn--gold">
          Back to home
        </Link>
      </div>
    );

  const soldOut = p.stock === 0;
  const add = (thenCheckout: boolean) => {
    if (!size) {
      setSizeError(true);
      return;
    }
    addToCart({ productId: p.id, storeId: storeId || p.stores[0], size, qty });
    if (thenCheckout) navigate('/cart');
    else notify(`${p.name} (${size}) added to your cart`);
  };
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);

  return (
    <div className={`pdp theme-${storeId || p.stores[0]}`}>
      <div className="wrap">
        <button className="back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="pdp__grid">
          <div className="pdp__media">
            <img src={p.image} alt={p.name} />
            {off(p) > 0 && <span className="pdp__off">{off(p)}% off</span>}
          </div>

          <div className="pdp__info">
            <span className="pdp__cat">{p.category}</span>
            <h1>{p.name}</h1>
            <div className="pdp__price">
              <b>{inr(p.price)}</b>
              {p.mrp > p.price && (
                <>
                  <s>MRP {inr(p.mrp)}</s>
                  <em>You save {inr(p.mrp - p.price)}</em>
                </>
              )}
            </div>
            <small className="pdp__tax">Inclusive of all taxes</small>

            <div className="pdp__block">
              <div className="pdp__label">
                <span>Select size</span>
                {size && <b>Selected: {size}</b>}
              </div>
              <div className="sizes">
                {p.sizes.map((s) => (
                  <button
                    key={s}
                    className={`size ${size === s ? 'is-on' : ''}`}
                    onClick={() => {
                      setSize(s);
                      setSizeError(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {sizeError && <p className="hint">Please select a size.</p>}
            </div>

            <div className="pdp__block">
              <div className="pdp__label">
                <span>Collect from</span>
              </div>
              <div className="pdp__stores">
                {(['one', 'two'] as StoreId[]).map((s) => {
                  const has = p.stores.includes(s);
                  return (
                    <button key={s} disabled={!has} className={`pstore pstore--${s} ${storeId === s ? "is-on" : ""}`} onClick={() => setStoreId(s)}>
                      <Store size={16} />
                      <span>
                        <b>Store {stores[s].no}</b>
                        <small>{has ? stores[s].name : 'Not stocked here'}</small>
                      </span>
                      {storeId === s && <Check size={16} className="pstore__tick" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pdp__block">
              <div className="pdp__label">
                <span>Quantity</span>
                <small className={p.stock <= 5 ? 'low' : ''}>{soldOut ? 'Sold out' : `${p.stock} in stock`}</small>
              </div>
              <div className="stepper">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
                  <Minus size={15} />
                </button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => Math.min(p.stock, q + 1))} aria-label="Increase" disabled={qty >= p.stock}>
                  <Plus size={15} />
                </button>
              </div>
            </div>

            <div className="pdp__actions">
              <button className="btn btn--line btn--lg" disabled={soldOut} onClick={() => add(false)}>
                <ShoppingBag size={18} /> Add to cart
              </button>
              <button className="btn btn--gold btn--lg" disabled={soldOut} onClick={() => add(true)}>
                <Zap size={18} /> Book now
              </button>
            </div>

            {p.description && (
              <div className="pdp__desc">
                <h4>Product details</h4>
                <p>{p.description}</p>
              </div>
            )}

            <ul className="pdp__perks">
              <li>
                <MapPin size={16} /> Reserve online, collect from the store
              </li>
              <li>
                <ShieldCheck size={16} /> Secure payment with Razorpay
              </li>
              <li>
                <RotateCcw size={16} /> Try it on in store before you take it home
              </li>
            </ul>
          </div>
        </div>

        {related.length > 0 && (
          <section className="related">
            <h2>
              More <em>{p.category.toLowerCase()}</em>
            </h2>
            <div className="pgrid">
              {related.map((r) => (
                <article key={r.id} className="pcard">
                  <Link to={`/product/${r.id}`} className="pcard__link">
                    <div className="pcard__media">
                      <img src={r.image} alt={r.name} loading="lazy" />
                      {off(r) > 0 && <span className="pcard__off">{off(r)}% off</span>}
                    </div>
                    <div className="pcard__body">
                      <small>{r.category}</small>
                      <h3>{r.name}</h3>
                      <div className="pcard__price">
                        <b>{inr(r.price)}</b>
                        {r.mrp > r.price && <s>{inr(r.mrp)}</s>}
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
