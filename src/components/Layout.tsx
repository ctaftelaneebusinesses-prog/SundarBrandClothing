import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, MapPin, Menu, Phone, X, Instagram, Facebook, CalendarCheck, ShoppingBag } from 'lucide-react';
import { useStore } from '../store';

/** The client's original logo — used exactly as supplied. */
export function Logo({ variant = 'full', height = 44 }: { variant?: 'full' | 'mark'; height?: number }) {
  return <img className="brand-logo" src={variant === 'full' ? '/logo-full.png' : '/logo-mark.png'} alt="Sundar Brand" style={{ height }} />;
}

export function BrandLockup() {
  return (
    <span className="lockup">
      <Logo variant="mark" height={42} />
      <span className="lockup__word">
        <b>Sundar Brand</b>
        <small>Menswear · Two stores</small>
      </span>
    </span>
  );
}

export const reveal = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
} as const;

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

export function Header() {
  const { cartCount } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = [
    { to: '/', label: 'Home', end: true },
    { to: '/store/one', label: 'Store 01', store: 'one' },
    { to: '/store/two', label: 'Store 02', store: 'two' },
  ];

  return (
    <>
      <header className={`nav ${scrolled ? 'nav--solid' : ''}`}>
        <div className="wrap nav__in">
          <Link to="/" className="nav__brand" aria-label="Sundar Brand home">
            <BrandLockup />
          </Link>
          <nav className="nav__links">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav__link ${"store" in l ? `nav__link--${l.store}` : ""} ${isActive ? "is-active" : ""}`}>
                {({ isActive }) => (
                  <>
                    {"store" in l && <i className={`nav__swatch nav__swatch--${l.store}`} />}
                    {l.label}
                    {isActive && <motion.span layoutId="nav-dot" className="nav__dot" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="nav__right">
            <NavLink to="/bookings" className="nav__plain">
              <CalendarCheck size={17} />
              <span>My bookings</span>
            </NavLink>
            <NavLink to="/cart" className="nav__book">
              <ShoppingBag size={17} />
              <span>Cart</span>
              {cartCount > 0 && <i>{cartCount}</i>}
            </NavLink>
            <button className="nav__burger" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div className="drawer-menu" initial={{ clipPath: 'circle(0% at 95% 4%)' }} animate={{ clipPath: 'circle(150% at 95% 4%)' }} exit={{ clipPath: 'circle(0% at 95% 4%)' }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <button className="drawer-menu__x" onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={24} />
            </button>
            <Logo height={120} />
            {[...links, { to: '/cart', label: `Cart (${cartCount})` }, { to: '/bookings', label: 'My bookings' }].map((l, i) => (
              <motion.div key={l.to} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.07 }}>
                <Link to={l.to}>{l.label}</Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function Footer() {
  const { stores } = useStore();
  return (
    <footer className="foot">
      <div className="wrap foot__top">
        <div className="foot__brand">
          <div className="foot__logo">
            <Logo height={110} />
          </div>
          <p>Menswear worth dressing up for. Two stores, one brand — reserve online and collect your fit in store.</p>
          <div className="foot__social">
            <a href="#" aria-label="Instagram">
              <Instagram size={18} />
            </a>
            <a href="#" aria-label="Facebook">
              <Facebook size={18} />
            </a>
          </div>
        </div>
        {(['one', 'two'] as const).map((id) => (
          <div key={id} className={`foot__store foot__store--${id}`}>
            <span className="foot__no">Store {stores[id].no}</span>
            <h4>{stores[id].name}</h4>
            <p>
              <MapPin size={15} /> {stores[id].address}
            </p>
            <p>
              <Phone size={15} /> {stores[id].phone}
            </p>
            <Link to={`/store/${id}`} className="foot__enter">
              Enter store →
            </Link>
          </div>
        ))}
      </div>
      <div className="wrap foot__base">
        <span>© 2026 Sundar Brand. All rights reserved.</span>
        <span>Payments secured by Razorpay</span>
      </div>
    </footer>
  );
}

export function Toast() {
  const { toast } = useStore();
  return (
    <AnimatePresence>
      {toast && (
        <motion.div className="toast" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
          <CheckCircle2 size={18} /> {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}
