import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowLeftRight, ArrowUpRight, Clock, MapPin, Phone, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { CATS, inr, off, type Category, type StoreId } from '../data';

const isPlaceholder = (s: string) => !s || s.trim().startsWith('[');

/** Immersive storefront header for a single location: identity, live stats, rotating showcase, category tiles. */
export function StoreHero({ storeId, onPickCat }: { storeId: StoreId; onPickCat: (c: Category) => void }) {
  const { stores, products } = useStore();
  const store = stores[storeId];
  const other: StoreId = storeId === 'one' ? 'two' : 'one';
  const rack = useMemo(() => products.filter((p) => p.stores.includes(storeId)), [products, storeId]);

  // A hero piece from the suits, shirts and shoes on this rack, shown as a rotating stack.
  const showcase = useMemo(() => {
    const picks = (['Suits', 'Shirts', 'Footwear'] as Category[]).flatMap((c) => {
      const best = rack.filter((p) => p.category === c && p.stock > 0).sort((a, b) => off(b) - off(a))[0];
      return best ? [best] : [];
    });
    return picks.length >= 2 ? picks : rack.slice(0, 3);
  }, [rack]);
  const [front, setFront] = useState(0);
  useEffect(() => {
    setFront(0);
  }, [storeId]);
  useEffect(() => {
    if (showcase.length < 2) return;
    const t = setInterval(() => setFront((f) => (f + 1) % showcase.length), 3600);
    return () => clearInterval(t);
  }, [showcase.length]);

  const cats = useMemo(
    () =>
      CATS.flatMap((c) => {
        const items = rack.filter((p) => p.category === c);
        return items.length ? [{ c, count: items.length, image: items[0].image }] : [];
      }),
    [rack],
  );
  const best = rack.reduce((m, p) => Math.max(m, off(p)), 0);
  const lead = showcase[front];

  const pick = (c: Category) => {
    onPickCat(c);
    document.getElementById('rack')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className={`sf sf--${storeId}`}>
      <div className="sf__bg" aria-hidden>
        <span className="sf__glow sf__glow--a" />
        <span className="sf__glow sf__glow--b" />
        <span className="sf__numeral">{store.no}</span>
      </div>

      {/* Phones: full-bleed rotating photo of the featured piece (hidden on larger screens) */}
      <div className="sf__photo" aria-hidden={!lead}>
        <AnimatePresence initial={false}>
          {lead && (
            <motion.img
              key={lead.id}
              src={lead.image}
              alt=""
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 0.7 }, scale: { duration: 3.6, ease: 'linear' } }}
            />
          )}
        </AnimatePresence>
        {lead && (
          <Link to={`/product/${lead.id}?store=${storeId}`} className="sf__mtag">
            <small>
              <Sparkles size={11} /> Featured
            </small>
            <b>{lead.name}</b>
            <span>
              {inr(lead.price)}
              {off(lead) > 0 && <em>{off(lead)}% off</em>}
            </span>
          </Link>
        )}
      </div>

      <div className="wrap sf__grid">
        <motion.div key={storeId} className="sf__copy" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <span className="sf__kicker">
            <i /> Sundar Brand · Location {store.no}
          </span>
          <h1 className="sf__title">
            Store <span className="sf__no">{store.no}</span>
          </h1>
          <p className="sf__name">{isPlaceholder(store.name) ? 'Your neighbourhood Sundar Brand store' : store.name}</p>

          <div className="sf__chips">
            {store.address && (
              <span>
                <MapPin size={15} /> {store.address}
              </span>
            )}
            {store.hours && (
              <span>
                <Clock size={15} /> {store.hours}
              </span>
            )}
            {store.phone && (
              <span>
                <Phone size={15} /> {store.phone}
              </span>
            )}
          </div>

          <div className="sf__stats">
            <div>
              <b>{rack.length}</b>
              <small>pieces on the rack</small>
            </div>
            <div>
              <b>{cats.length}</b>
              <small>categories</small>
            </div>
            <div>
              <b>{best}%</b>
              <small>best saving today</small>
            </div>
          </div>

          <div className="sf__cta">
            <button className="btn btn--lg sf__browse" onClick={() => document.getElementById('rack')?.scrollIntoView({ behavior: 'smooth' })}>
              Browse the rack <ArrowDown size={18} />
            </button>
            <Link to={`/store/${other}`} className={`sf__switch sf__switch--${other}`}>
              <i />
              <span>
                <small>Switch to</small>
                Store {stores[other].no}
              </span>
              <ArrowLeftRight size={16} />
            </Link>
          </div>
        </motion.div>

        <div className="sf__stage">
          <div className="sf__ring" />
          {showcase.map((p, i) => {
            const pos = (i - front + showcase.length) % showcase.length; // 0 = front
            return (
              <motion.div
                key={p.id}
                className="sf__card"
                animate={{
                  x: pos === 0 ? 0 : pos === 1 ? 120 : -120,
                  y: pos === 0 ? 0 : 26,
                  rotate: pos === 0 ? 0 : pos === 1 ? 8 : -8,
                  scale: pos === 0 ? 1 : 0.84,
                  zIndex: pos === 0 ? 3 : 1,
                  opacity: pos === 0 ? 1 : 0.75,
                }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                onClick={() => setFront(i)}
              >
                <img src={p.image} alt={p.name} />
              </motion.div>
            );
          })}
          <AnimatePresence mode="wait">
            {lead && (
              <motion.div key={lead.id} className="sf__tag" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
                <span className="sf__tag-kicker">
                  <Sparkles size={13} /> Featured at Store {store.no}
                </span>
                <b>{lead.name}</b>
                <div className="sf__tag-row">
                  <span className="sf__price">
                    {inr(lead.price)} {lead.mrp > lead.price && <s>{inr(lead.mrp)}</s>}
                  </span>
                  {off(lead) > 0 && <em>{off(lead)}% off</em>}
                </div>
                <Link to={`/product/${lead.id}?store=${storeId}`} className="sf__tag-go" aria-label={`View ${lead.name}`}>
                  <ArrowUpRight size={18} />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="sf__dots">
            {showcase.map((p, i) => (
              <button key={p.id} className={i === front ? 'is-on' : ''} onClick={() => setFront(i)} aria-label={`Show ${p.name}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="wrap sf__cats">
        <span className="sf__cats-label">Shop by category</span>
        <div className="sf__cats-row">
          {cats.map((k, i) => (
            <motion.button key={k.c} className="sf__cat" onClick={() => pick(k.c)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.06 }}>
              <span className="sf__cat-img">
                <img src={k.image} alt="" />
              </span>
              <span className="sf__cat-txt">
                <b>{k.c}</b>
                <small>
                  {k.count} {k.count === 1 ? 'piece' : 'pieces'}
                </small>
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
