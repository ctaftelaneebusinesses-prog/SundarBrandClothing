import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, ApiError } from '../api';
import { useStore } from '../store';
import { CATS, type BannerSlide, type BannerTone } from '../data';
import { SlideContent } from '../components/Banner';

const TONES: { id: BannerTone; label: string }[] = [
  { id: 'gold', label: 'Honey gold' },
  { id: 'blue', label: 'Sapphire blue' },
  { id: 'sage', label: 'Emerald green' },
  { id: 'cream', label: 'Cream' },
  { id: 'ink', label: 'Dark' },
];

const LINKS = [
  { to: '/', label: 'Home page' },
  { to: '/store/one', label: 'Store 01 — all' },
  { to: '/store/two', label: 'Store 02 — all' },
  ...CATS.flatMap((c) => [
    { to: `/store/one?cat=${c}`, label: `Store 01 — ${c}` },
    { to: `/store/two?cat=${c}`, label: `Store 02 — ${c}` },
  ]),
];

export function BannersTab({ onError }: { onError: (e: unknown) => void }) {
  const { refresh, notify } = useStore();
  const [items, setItems] = useState<BannerSlide[] | null>(null);
  const [editing, setEditing] = useState<BannerSlide | 'new' | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api.adminBanners());
    } catch (e) {
      onError(e);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const after = async (msg: string) => {
    await Promise.all([load(), refresh()]);
    notify(msg);
  };

  const move = async (b: BannerSlide, direction: 'up' | 'down') => {
    try {
      setItems(await api.moveBanner(b.id, direction));
      await refresh();
    } catch (e) {
      onError(e);
    }
  };

  const toggle = async (b: BannerSlide) => {
    const form = new FormData();
    form.append('active', String(!b.active));
    try {
      await api.saveBanner(form, b.id);
      await after(b.active ? 'Banner hidden from the website' : 'Banner is live on the website');
    } catch (e) {
      onError(e);
    }
  };

  const remove = async (b: BannerSlide) => {
    if (!window.confirm(`Delete the banner "${b.title}"?`)) return;
    try {
      await api.deleteBanner(b.id);
      await after('Banner deleted');
    } catch (e) {
      onError(e);
    }
  };

  if (!items) return <p className="muted">Loading…</p>;
  const live = items.filter((b) => b.active).length;

  return (
    <div className="card">
      <div className="card__head">
        <h3>
          {items.length} banners · {live} live
        </h3>
        <button className="btn btn--gold" onClick={() => setEditing('new')}>
          <Plus size={17} /> Add banner
        </button>
      </div>
      <p className="muted">Live banners slide automatically on the home page in this order. Hidden banners stay saved for later.</p>
      <div className="blist">
        {items.map((b, i) => (
          <div key={b.id} className={`brow ${b.active ? '' : 'is-off'}`}>
            <span className="brow__no">{i + 1}</span>
            <img src={b.image} alt="" />
            <div className="brow__txt">
              <b>
                {b.title} <em>{b.highlight}</em>
              </b>
              <small>{[b.offer, b.tag].filter(Boolean).join(' · ')}</small>
              <span className={`brow__tone brow__tone--${b.tone}`}>{TONES.find((t) => t.id === b.tone)?.label}</span>
            </div>
            <span className={`status ${b.active ? 'status--collected' : 'status--pending'}`}>{b.active ? 'Live' : 'Hidden'}</span>
            <div className="brow__act">
              <button className="ibtn" title="Move up" disabled={i === 0} onClick={() => void move(b, 'up')}>
                <ArrowUp size={16} />
              </button>
              <button className="ibtn" title="Move down" disabled={i === items.length - 1} onClick={() => void move(b, 'down')}>
                <ArrowDown size={16} />
              </button>
              <button className="ibtn ibtn--edit" title={b.active ? 'Hide' : 'Show'} onClick={() => void toggle(b)}>
                {b.active ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button className="ibtn ibtn--edit" title="Edit" onClick={() => setEditing(b)}>
                <Pencil size={16} />
              </button>
              <button className="ibtn" title="Delete" onClick={() => void remove(b)}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="muted">No banners yet. Add your first one.</p>}
      </div>
      <AnimatePresence>
        {editing && (
          <BannerForm
            key={editing === 'new' ? 'new' : editing.id}
            banner={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={(msg) => {
              setEditing(null);
              void after(msg);
            }}
            onError={onError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BannerForm({ banner, onClose, onSaved, onError }: { banner: BannerSlide | null; onClose: () => void; onSaved: (msg: string) => void; onError: (e: unknown) => void }) {
  const [f, setF] = useState({
    tag: banner?.tag ?? '',
    title: banner?.title ?? '',
    highlight: banner?.highlight ?? '',
    offer: banner?.offer ?? '',
    sub: banner?.sub ?? '',
    cta: banner?.cta ?? 'Shop now',
    link: banner?.link ?? '/store/one',
    tone: (banner?.tone ?? 'gold') as BannerTone,
    active: banner?.active ?? true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(banner?.image ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!banner && !file) return setError('Please upload a banner photo');
    if (!f.title.trim()) return setError('Please enter a heading');
    const form = new FormData();
    for (const [k, v] of Object.entries(f)) form.append(k, String(v));
    if (file) form.append('image', file);
    setBusy(true);
    try {
      await api.saveBanner(form, banner?.id);
      onSaved(banner ? 'Banner updated on the website' : f.active ? 'New banner is live on the home page' : 'Banner saved (hidden)');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onError(err);
      else setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const linkKnown = LINKS.some((l) => l.to === f.link);

  return (
    <motion.div className="overlay overlay--center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form className="pform pform--wide" onSubmit={submit} onClick={(e) => e.stopPropagation()} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
        <div className="pform__head">
          <h3>{banner ? 'Edit banner' : 'Add a banner'}</h3>
          <button type="button" className="ibtn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="bprev">
          <small>Live preview</small>
          <div className="bprev__view">
            <div className="bnr__slide">
              <SlideContent s={{ ...f, image: preview }} animate={false} />
            </div>
          </div>
        </div>

        <div className="bform">
          <div className="bform__photo">
            <span className="bform__lbl">Banner photo</span>
            <button type="button" className={`drop drop--wide ${preview ? 'has' : ''}`} onClick={() => fileRef.current?.click()}>
              {preview ? (
                <img src={preview} alt="" />
              ) : (
                <div>
                  <ImagePlus size={28} />
                  <b>Upload photo</b>
                  <small>JPG, PNG or WebP · up to 8 MB</small>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {preview && (
              <button type="button" className="btn btn--line btn--sm btn--block" onClick={() => fileRef.current?.click()}>
                <ImagePlus size={15} /> Change photo
              </button>
            )}
          </div>
          <div className="addform">
            <label>
              Small label (optional)
              <input className="fld" value={f.tag} onChange={(e) => set('tag', e.target.value)} placeholder="e.g. Diwali Festive Sale" />
            </label>
            <div className="fields__2">
              <label>
                Heading
                <input className="fld" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Light up" />
              </label>
              <label>
                Heading — gold line
                <input className="fld" value={f.highlight} onChange={(e) => set('highlight', e.target.value)} placeholder="e.g. this Diwali." />
              </label>
            </div>
            <label>
              Offer (big text)
              <input className="fld" value={f.offer} onChange={(e) => set('offer', e.target.value)} placeholder="e.g. Flat 60% off on suits" />
            </label>
            <label>
              Description (optional)
              <textarea className="fld" rows={2} value={f.sub} onChange={(e) => set('sub', e.target.value)} placeholder="One short line about the offer" />
            </label>
            <div className="fields__2">
              <label>
                Button text
                <input className="fld" value={f.cta} onChange={(e) => set('cta', e.target.value)} />
              </label>
              <label>
                Button opens
                <select className="fld" value={linkKnown ? f.link : '__custom'} onChange={(e) => set('link', e.target.value === '__custom' ? '/' : e.target.value)}>
                  {LINKS.map((l) => (
                    <option key={l.to} value={l.to}>
                      {l.label}
                    </option>
                  ))}
                  {!linkKnown && <option value="__custom">Custom: {f.link}</option>}
                </select>
              </label>
            </div>
            <div className="avail">
              <span>Colour</span>
              {TONES.map((t) => (
                <label key={t.id} className={`tog tone-pick tone-pick--${t.id} ${f.tone === t.id ? 'is-on' : ''}`}>
                  <input type="radio" name="tone" checked={f.tone === t.id} onChange={() => set('tone', t.id)} />
                  {t.label}
                </label>
              ))}
            </div>
            <div className="avail">
              <span>Show on website</span>
              <label className={`tog ${f.active ? 'is-on' : ''}`}>
                <input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} />
                {f.active ? 'Live' : 'Hidden'}
              </label>
            </div>
          </div>
        </div>
        {error && <p className="hint pform__err">{error}</p>}
        <div className="pform__foot">
          <button type="button" className="btn btn--line" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--gold" disabled={busy}>
            {busy && <Loader2 size={16} className="spin" />} {banner ? 'Save banner' : 'Publish banner'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
