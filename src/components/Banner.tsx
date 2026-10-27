import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, CreditCard, Pause, Play, Scissors, Store, Truck } from 'lucide-react';
import { useStore } from '../store';
import type { BannerSlide } from '../data';

const STRIP = [
  { icon: Truck, b: 'Reserve online, collect in store', s: 'Held for 48 hours' },
  { icon: CreditCard, b: 'Secure payments with Razorpay', s: 'UPI · Cards · Net banking' },
  { icon: Scissors, b: 'Free basic alterations', s: 'On all suits and trousers' },
  { icon: Store, b: 'Two stores, one brand', s: 'Shop the rack nearest you' },
];

const DURATION = 3500; // per slide — short enough that visitors see every offer

/** Auto-advancing index. It keeps moving on its own and only stops when `paused` is set. */
function useCarousel(count: number, duration: number) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);

  const go = useCallback(
    (to: number, d: number) => {
      if (count === 0) return;
      setDir(d);
      setIndex(((to % count) + count) % count);
      setTick((t) => t + 1);
    },
    [count],
  );
  const next = useCallback(() => go(index + 1, 1), [go, index]);
  const prev = useCallback(() => go(index - 1, -1), [go, index]);

  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [index, count]);

  const running = !paused && count > 1;
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(next, duration);
    return () => clearTimeout(t);
  }, [running, next, duration, tick]);

  return { index: Math.min(index, Math.max(count - 1, 0)), dir, paused, setPaused, running, tick, go, next, prev };
}

/** One slide's artwork + text. Also used by the admin as a live preview. */
export function SlideContent({ s, animate = true }: { s: Pick<BannerSlide, 'image' | 'tag' | 'title' | 'highlight' | 'offer' | 'sub' | 'cta' | 'link' | 'tone'>; animate?: boolean }) {
  const fade = (delay: number) => (animate ? { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay } } : {});
  return (
    <>
      <div className="bnr__img">
        {s.image ? (
          <motion.img src={s.image} alt="" draggable={false} {...(animate ? { initial: { scale: 1.12 }, animate: { scale: 1 }, transition: { duration: 4.2, ease: 'linear' } } : {})} />
        ) : (
          <div className="bnr__noimg">Upload a photo</div>
        )}
      </div>
      <div className={`bnr__panel bnr__panel--${s.tone}`}>
        {s.tag && (
          <motion.span className="bnr__tag" {...fade(0.2)}>
            {s.tag}
          </motion.span>
        )}
        <motion.h2 className="bnr__title" {...fade(0.28)}>
          {s.title || 'Your heading'}
          {s.highlight && (
            <>
              <br />
              <em>{s.highlight}</em>
            </>
          )}
        </motion.h2>
        {s.offer && (
          <motion.div className="bnr__offer" {...fade(0.36)}>
            {s.offer}
          </motion.div>
        )}
        {s.sub && (
          <motion.p className="bnr__sub" {...fade(0.44)}>
            {s.sub}
          </motion.p>
        )}
        <motion.div className="bnr__cta" {...fade(0.5)}>
          <Link to={s.link || '/'} className={`btn btn--lg ${s.tone === 'ink' ? 'btn--gold' : 'btn--ink'}`} onClick={(e) => !animate && e.preventDefault()}>
            {s.cta || 'Shop now'} <ArrowRight size={18} />
          </Link>
        </motion.div>
      </div>
    </>
  );
}

export function Banner() {
  const { banners, loading } = useStore();
  const c = useCarousel(banners.length, DURATION);
  const s = banners[c.index];

  if (!s)
    return (
      <section className="bnr">
        <div className="bnr__frame">
          <div className="bnr__view bnr__view--empty">{loading ? '' : 'No banners yet — add one from Admin › Home banners.'}</div>
        </div>
        <OfferStrip />
      </section>
    );

  return (
    <section className="bnr">
      <div className="bnr__frame">
        <div className="bnr__view">
          <AnimatePresence initial={false} custom={c.dir}>
            <motion.div
              key={s.id}
              className="bnr__slide"
              custom={c.dir}
              variants={{
                enter: (d: number) => ({ x: `${d * 100}%` }),
                center: { x: 0 },
                exit: (d: number) => ({ x: `${d * -100}%` }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) c.next();
                else if (info.offset.x > 60) c.prev();
              }}
            >
              <SlideContent s={s} />
            </motion.div>
          </AnimatePresence>

          {banners.length > 1 && (
            <>
              <button className="bnr__btn bnr__btn--prev" onClick={c.prev} aria-label="Previous slide">
                <ChevronLeft size={20} />
              </button>
              <button className="bnr__btn bnr__btn--next" onClick={c.next} aria-label="Next slide">
                <ChevronRight size={20} />
              </button>
              <div className="bnr__ctrl">
                {banners.map((b, i) => (
                  <button key={b.id} className={`bnr__dot ${i === c.index ? 'is-on' : ''}`} onClick={() => c.go(i, i > c.index ? 1 : -1)} aria-label={`Go to slide ${i + 1}`}>
                    {i === c.index && (
                      <motion.span
                        key={`${c.tick}-${c.running}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: c.running ? 1 : 0.15 }}
                        transition={{ duration: c.running ? DURATION / 1000 : 0, ease: 'linear' }}
                      />
                    )}
                    {i < c.index && <span />}
                  </button>
                ))}
                <button className="bnr__pause" onClick={() => c.setPaused((p) => !p)} aria-label={c.paused ? 'Play slideshow' : 'Pause slideshow'} title={c.paused ? 'Play' : 'Pause'}>
                  {c.paused ? <Play size={13} /> : <Pause size={13} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <OfferStrip />
    </section>
  );
}

function OfferStrip() {
  const c = useCarousel(STRIP.length, 3500);
  const item = STRIP[c.index];
  return (
    <div className="strip">
      <AnimatePresence initial={false} custom={c.dir}>
        <motion.div
          key={c.index}
          className="strip__item"
          initial={{ y: c.dir * 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: c.dir * -40, opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="strip__ic">
            <item.icon size={20} />
          </span>
          <b>{item.b}</b>
          <i />
          <span>{item.s}</span>
        </motion.div>
      </AnimatePresence>
      <button className="bnr__btn bnr__btn--prev" onClick={c.prev} aria-label="Previous offer">
        <ChevronLeft size={16} />
      </button>
      <button className="bnr__btn bnr__btn--next" onClick={c.next} aria-label="Next offer">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
