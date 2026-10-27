import { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { CATS, inr, off, type Category } from '../data';
import { StoreHero } from '../components/StoreHero';

const PAGE = 12;

export default function Shop() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { products, loading, error } = useStore();
  const [sort, setSort] = useState('featured');
  const [visible, setVisible] = useState(PAGE);
  const cat = (CATS as string[]).includes(params.get('cat') || '') ? (params.get('cat') as Category) : 'All';

  const list = useMemo(() => {
    if (id !== 'one' && id !== 'two') return [];
    const l = products.filter((p) => p.stores.includes(id) && (cat === 'All' || p.category === cat));
    if (sort === 'low') return [...l].sort((a, b) => a.price - b.price);
    if (sort === 'high') return [...l].sort((a, b) => b.price - a.price);
    if (sort === 'off') return [...l].sort((a, b) => off(b) - off(a));
    return l;
  }, [products, id, cat, sort]);

  if (id !== 'one' && id !== 'two') return <Navigate to="/" replace />;
  const setCat = (c: Category | 'All') => {
    setParams(c === 'All' ? {} : { cat: c }, { replace: true });
    setVisible(PAGE);
  };

  return (
    <div className={`shop shop--${id} theme-${id}`}>
      <StoreHero storeId={id} onPickCat={setCat} />

      <section className="wrap shop-body" id="rack">
        <div className="shop-bar">
          <div className="chips">
            {(['All', ...CATS] as const).map((c) => (
              <button key={c} className={`chip ${cat === c ? 'is-on' : ''}`} onClick={() => setCat(c)}>
                {cat === c && <motion.span layoutId="chip-bg" className="chip__bg" />}
                <span>{c}</span>
              </button>
            ))}
          </div>
          <div className="shop-bar__right">
            <span className="count">{list.length} pieces in store</span>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="off">Biggest savings</option>
            </select>
          </div>
        </div>

        {error && <p className="empty">{error}</p>}
        {loading && <p className="empty">Loading the rack…</p>}

        <motion.div layout className="pgrid">
          <AnimatePresence mode="popLayout">
            {list.slice(0, visible).map((p, i) => (
              <motion.article key={p.id} layout className="pcard" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.45, delay: (i % 4) * 0.05 }}>
                <Link to={`/product/${p.id}?store=${id}`} className="pcard__link">
                  <div className="pcard__media">
                    <img src={p.image} alt={p.name} loading="lazy" />
                    {off(p) > 0 && <span className="pcard__off">{off(p)}% off</span>}
                    {p.stock === 0 ? <span className="pcard__low">Sold out</span> : p.stock <= 5 && <span className="pcard__low">Only {p.stock} left</span>}
                  </div>
                  <div className="pcard__body">
                    <small>{p.category}</small>
                    <h3>{p.name}</h3>
                    <div className="pcard__foot">
                      <div className="pcard__price">
                        <b>{inr(p.price)}</b>
                        {p.mrp > p.price && <s>{inr(p.mrp)}</s>}
                      </div>
                      <span className="pcard__book">
                        View <ArrowRight size={15} />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
        {!loading && !error && list.length === 0 && <p className="empty">Nothing in this category at this store yet.</p>}
        {visible < list.length && (
          <div className="more">
            <button className="btn btn--line" onClick={() => setVisible((v) => v + 8)}>
              Show more pieces ({list.length - visible})
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
