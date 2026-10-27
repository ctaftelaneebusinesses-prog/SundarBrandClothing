import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Check, Clock, CreditCard, MapPin, ShieldCheck, Shirt, Store } from 'lucide-react';
import { Eyebrow, Logo, reveal } from '../components/Layout';
import { Banner } from '../components/Banner';
import { useStore } from '../store';
import { STORE_BANNERS, inr, off, photo, type StoreId } from '../data';

export default function Home() {
  return (
    <>
      <Banner />
      <Ticker />
      <Doors />
      <Wardrobe />
      <Lookbook />
      <Trending />
      <Steps />
      <FinalCta />
    </>
  );
}

/* ---------- 2. Ticker ---------- */
function Ticker() {
  const words = ['Two stores, one brand', 'Reserve online, collect in store', 'Pay securely with Razorpay', 'Suits · Shirts · Shoes · Belts · Ties'];
  const row = [...words, ...words, ...words];
  return (
    <div className="ticker">
      <div className="ticker__track">
        {[...row, ...row].map((w, i) => (
          <span key={i}>
            {w}
            <svg viewBox="0 0 10 10">
              <rect x="2" y="2" width="6" height="6" transform="rotate(45 5 5)" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- 3. Two doors ---------- */
function Doors() {
  const { stores, products } = useStore();
  return (
    <section className="sec doors">
      <div className="wrap">
        <div className="split-head">
          <motion.h2 {...reveal}>
            Two doors.
            <br />
            <em>One brand.</em>
          </motion.h2>
          <motion.p {...reveal} transition={{ ...reveal.transition, delay: 0.1 }}>
            Each store stocks its own pieces. Step into the one nearest you — the rack you see online is the rack waiting for you.
          </motion.p>
        </div>
        <div className="doors__grid">
          {(['one', 'two'] as StoreId[]).map((id, i) => {
            const s = stores[id];
            const count = products.filter((p) => p.stores.includes(id)).length;
            return (
              <motion.div key={id} {...reveal} transition={{ ...reveal.transition, delay: i * 0.15 }}>
                <Link to={`/store/${id}`} className={`door door--${id}`}>
                  <div className="door__arch">
                    <div className="door__rack">
                      {STORE_BANNERS[id].map((k, j) => (
                        <img key={k} src={photo(k)} alt="" style={{ ['--i' as string]: j }} />
                      ))}
                    </div>
                    <div className="door__panel door__panel--l" />
                    <div className="door__panel door__panel--r" />
                    <span className="door__knob" />
                  </div>
                  <div className="door__info">
                    <span className="door__num">{s.no}</span>
                    <div>
                      <small>Store {s.no} · {count} pieces</small>
                      <h3>{s.name}</h3>
                      <p>
                        <MapPin size={14} /> {s.address}
                      </p>
                      <p>
                        <Clock size={14} /> {s.hours}
                      </p>
                      <div className="door__cats">
                        {['Suits', 'Shirts', 'Trousers', 'Footwear', 'Belts', 'Ties'].map((c) => (
                          <span key={c}>{c}</span>
                        ))}
                      </div>
                      <span className="door__enter">
                        Enter this store <ArrowRight size={16} />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- 4. Wardrobe bento ---------- */
function Wardrobe() {
  const tiles = [
    { n: '01', t: 'Suits', img: 'midnight-suit', note: 'Two-piece, tailored', cls: 'w-a' },
    { n: '02', t: 'Shirts', img: 'formal-shirts', note: 'Formal & casual', cls: 'w-b' },
    { n: '03', t: 'Footwear', img: 'brown-brogues', note: 'Oxfords, brogues & boots', cls: 'w-c' },
    { n: '04', t: 'Trousers', img: 'khaki-chinos', note: 'Chinos, trousers & denim', cls: 'w-d' },
    { n: '05', t: 'Belts', img: 'belt-set', note: 'Full-grain leather', cls: 'w-e' },
    { n: '06', t: 'Ties & accessories', img: 'silk-tie', note: 'Finishing touches', cls: 'w-f' },
  ];
  return (
    <section className="sec wardrobe">
      <div className="wrap">
        <div className="center-head">
          <Eyebrow>The wardrobe</Eyebrow>
          <motion.h2 {...reveal}>
            Everything a man <em>wears well.</em>
          </motion.h2>
          <p>Stock and prices are set per store by the shop team.</p>
        </div>
        <div className="bento">
          {tiles.map((t, i) => (
            <motion.div key={t.t} className={`bento__tile ${t.cls}`} {...reveal} transition={{ ...reveal.transition, delay: i * 0.07 }}>
              <Link to={`/store/one?cat=${t.t.startsWith('Ties') ? 'Accessories' : t.t}`}>
                <img src={photo(t.img)} alt={t.t} />
                <div className="bento__veil" />
                <span className="bento__n">{t.n}</span>
                <div className="bento__lab">
                  <small>{t.note}</small>
                  <h3>{t.t}</h3>
                </div>
                <span className="bento__go">
                  <ArrowUpRight size={18} />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 5. Lookbook: interactive outfit builder ---------- */
const LOOK_PIECES = [
  { k: 'navy-suit', size: '40', x: 50, y: 48 },
  { k: 'sky-blue-shirt', size: 'M', x: 18, y: 26 },
  { k: 'silk-tie', size: 'Standard', x: 82, y: 26 },
  { k: 'tan-belt', size: '34', x: 18, y: 70 },
  { k: 'brown-oxfords', size: '9', x: 82, y: 70 },
];

function Lookbook() {
  const { products, addToCart, notify } = useStore();
  const navigate = useNavigate();
  // Each look piece is a real product from the catalogue, matched by its photo.
  const LOOK = useMemo(
    () =>
      LOOK_PIECES.flatMap((l) => {
        const p = products.find((x) => x.image === photo(l.k));
        return p ? [{ ...l, p, name: p.name, price: p.price }] : [];
      }),
    [products],
  );
  const [unpicked, setUnpicked] = useState<string[]>([]);
  const picked = LOOK.map((l) => l.k).filter((k) => !unpicked.includes(k));
  const [hover, setHover] = useState<string | null>(null);
  const total = LOOK.filter((l) => picked.includes(l.k)).reduce((s, l) => s + l.price, 0);
  const toggle = (k: string) => setUnpicked((u) => (u.includes(k) ? u.filter((x) => x !== k) : [...u, k]));
  const bookLook = () => {
    const chosen = LOOK.filter((l) => picked.includes(l.k));
    if (!chosen.length) return notify('Pick at least one piece');
    for (const l of chosen) {
      const size = l.p.sizes.includes(l.size) ? l.size : l.p.sizes[0];
      addToCart({ productId: l.p.id, storeId: l.p.stores[0], size, qty: 1 });
    }
    notify(`${chosen.length} pieces added to your cart`);
    navigate('/cart');
  };

  return (
    <section className="sec look">
      <div className="wrap look__grid">
        <motion.div className="look__board" {...reveal}>
          {LOOK.map((l, i) => (
            <motion.div
              key={l.k}
              className={`look__piece ${picked.includes(l.k) ? '' : 'is-off'} ${hover === l.k ? 'is-hover' : ''}`}
              style={{ left: `${l.x}%`, top: `${l.y}%` }}
              onMouseEnter={() => setHover(l.k)}
              onMouseLeave={() => setHover(null)}
              onClick={() => toggle(l.k)}
              animate={{ scale: picked.includes(l.k) ? 1 : 0.86 }}
            >
              <img src={photo(l.k)} alt={l.name} />
              <span className="look__pin">{i + 1}</span>
            </motion.div>
          ))}
          <span className="look__stamp">The lookbook · No. 01</span>
        </motion.div>
        <div className="look__copy">
          <Eyebrow>The lookbook</Eyebrow>
          <motion.h2 {...reveal}>
            Complete
            <br />
            <em>the look.</em>
          </motion.h2>
          <p>Pick the suit, then reserve everything that goes with it in a single booking. Tap a piece to add or remove it.</p>
          <ul className="look__list">
            {LOOK.map((l, i) => (
              <li key={l.k} className={`${picked.includes(l.k) ? 'is-on' : ''} ${hover === l.k ? 'is-hover' : ''}`} onMouseEnter={() => setHover(l.k)} onMouseLeave={() => setHover(null)} onClick={() => toggle(l.k)}>
                <span className="look__check">{picked.includes(l.k) ? <Check size={14} /> : i + 1}</span>
                <span className="look__name">{l.name}</span>
                <span className="look__dots" />
                <b>{inr(l.price)}</b>
              </li>
            ))}
          </ul>
          <div className="look__total">
            <div>
              <small>{picked.length} pieces · full look</small>
              <motion.b key={total} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                {inr(total)}
              </motion.b>
            </div>
            <button className="btn btn--ink" onClick={bookLook}>
              Book the full look <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 6. Trending: flip-card rail ---------- */
function Trending() {
  const { products } = useStore();
  const items = products.slice(0, 26).filter((_, i) => i % 2 === 0).slice(0, 10);
  const rail = useRef<HTMLDivElement>(null);
  return (
    <section className="sec trending">
      <div className="wrap trending__head">
        <div>
          <Eyebrow>Trending</Eyebrow>
          <motion.h2 {...reveal}>
            Trending <em>now.</em>
          </motion.h2>
        </div>
        <p>Hover or tap a card to flip it.</p>
      </div>
      <div className="rail" ref={rail}>
        <div className="rail__track">
          {[...items, ...items].map((p, i) => (
            <div key={p.id + i} className="flip" tabIndex={0}>
              <div className="flip__in">
                <div className="flip__face">
                  <img src={p.image} alt={p.name} />
                  <span className="flip__off">{off(p)}% off</span>
                  <div className="flip__cap">
                    <b>{p.name}</b>
                    <span>
                      {inr(p.price)} <s>{inr(p.mrp)}</s>
                    </span>
                  </div>
                </div>
                <div className={`flip__face flip__back ${i % 2 ? 'flip__back--rose' : ''}`}>
                  <small>{p.category}</small>
                  <h4>{p.name}</h4>
                  <p>Reserve online and collect from the store.</p>
                  <div className="flip__price">
                    <b>{inr(p.price)}</b>
                    <s>{inr(p.mrp)}</s>
                  </div>
                  <Link to={`/product/${p.id}`} className="btn btn--light btn--sm">
                    Book now <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 7. Steps ---------- */
function Steps() {
  const steps = [
    { icon: Store, t: 'Pick your store', d: 'See only what that store has on the rack.' },
    { icon: Shirt, t: 'Choose and reserve', d: 'Select a size, then add your name, mobile number and address.' },
    { icon: CreditCard, t: 'Pay securely', d: 'Pay through Razorpay. The store team is emailed the moment you pay.' },
  ];
  return (
    <section className="sec steps">
      <div className="wrap">
        <div className="center-head">
          <Eyebrow>How it works</Eyebrow>
          <motion.h2 {...reveal}>
            Book in <em>three steps.</em>
          </motion.h2>
        </div>
        <div className="steps__row">
          <motion.div className="steps__line" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
          {steps.map((s, i) => (
            <motion.div key={s.t} className="step" {...reveal} transition={{ ...reveal.transition, delay: 0.2 + i * 0.2 }}>
              <span className="step__badge">
                <s.icon size={24} />
                <i>0{i + 1}</i>
              </span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </motion.div>
          ))}
        </div>
        <motion.div className="steps__trust" {...reveal}>
          <ShieldCheck size={18} /> 256-bit secure payments · UPI · Cards · Net banking — powered by Razorpay
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- 8. Final CTA ---------- */
function FinalCta() {
  const { stores } = useStore();
  return (
    <section className="wrap">
      <motion.div className="final" {...reveal}>
        <div className="final__mark">
          <Logo variant="mark" height={360} />
        </div>
        <Eyebrow>Your fit is waiting</Eyebrow>
        <h2>
          Your fit is <em>waiting.</em>
        </h2>
        <p>Choose a store, reserve your size and walk in to collect — no queues, no guesswork.</p>
        <div className="final__btns">
          {(['one', 'two'] as StoreId[]).map((id) => (
            <Link key={id} to={`/store/${id}`} className={`btn btn--s${id === 'one' ? 1 : 2} btn--lg`}>
              Enter Store {stores[id].no} <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
