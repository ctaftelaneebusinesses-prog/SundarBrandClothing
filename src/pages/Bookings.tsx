import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Loader2, Search } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../api';
import { inr, statusClass, type Order } from '../data';
import { Eyebrow } from '../components/Layout';

const savedPhone = () => {
  try {
    return localStorage.getItem('sb.phone') || '';
  } catch {
    return '';
  }
};

export default function Bookings() {
  const { stores } = useStore();
  const [phone, setPhone] = useState(savedPhone);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const lookup = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      setOrders(await api.myOrders(phone));
    } catch (err) {
      setError((err as Error).message);
      setOrders(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (savedPhone()) void lookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="wrap bookings">
      <div className="bookings__head">
        <Eyebrow>Your bookings</Eyebrow>
        <h1>
          My <em>bookings.</em>
        </h1>
        <p>Enter the mobile number you booked with to see your orders.</p>
      </div>
      <form className="lookup" onSubmit={lookup}>
        <input className="fld" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" />
        <button className="btn btn--ink" disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" /> : <Search size={16} />} Find bookings
        </button>
      </form>
      {error && <p className="hint">{error}</p>}

      {orders && orders.length === 0 && (
        <div className="bookings__empty">
          <p>No bookings found for this number.</p>
          <Link to="/store/one" className="btn btn--gold">
            Start shopping <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="tickets">
          {orders.map((o, i) => (
            <motion.article key={o.id} className="bticket" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <img src={o.items[0]?.image} alt="" />
              <div className="bticket__main">
                <small>{o.id}</small>
                <h3>{o.items.length === 1 ? o.items[0].name : `${o.items[0].name} + ${o.items.length - 1} more`}</h3>
                <p>{o.items.map((it) => `${it.name} (${it.size}) × ${it.qty} — Store ${stores[it.storeId]?.no}`).join(' · ')}</p>
                <div className="bticket__meta">
                  {[...new Set(o.items.map((it) => it.storeId))].map((s) => (
                    <span key={s} className={`stag stag--${s}`}>
                      Store {stores[s]?.no}
                    </span>
                  ))}
                  <span>
                    <CalendarDays size={14} /> Pick-up {o.pickupDate}
                  </span>
                </div>
              </div>
              <div className="bticket__stub">
                <b>{inr(o.total)}</b>
                <i className={statusClass(o.status)}>{o.status}</i>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}
