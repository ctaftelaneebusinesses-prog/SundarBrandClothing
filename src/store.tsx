import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import type { BannerSlide, CartItem, Product, StoreId, StoreInfo } from './data';

const FALLBACK_STORES: Record<StoreId, StoreInfo> = {
  one: { id: 'one', no: '01', name: 'Store 01', address: '', hours: '', phone: '' },
  two: { id: 'two', no: '02', name: 'Store 02', address: '', hours: '', phone: '' },
};

interface StoreValue {
  products: Product[];
  banners: BannerSlide[];
  stores: Record<StoreId, StoreInfo>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  productById: (id: number) => Product | undefined;
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: CartItem) => void;
  setQty: (item: CartItem, qty: number) => void;
  clearCart: () => void;
  toast: string | null;
  notify: (msg: string) => void;
}

const Ctx = createContext<StoreValue | null>(null);

function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

const sameLine = (a: CartItem, b: CartItem) => a.productId === b.productId && a.size === b.size && a.storeId === b.storeId;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [stores, setStores] = useState<Record<StoreId, StoreInfo>>(FALLBACK_STORES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = usePersisted<CartItem[]>('sb.cart', []);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Retry a few times so a backend that is still starting up doesn't leave the shop empty.
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const [p, s, bn] = await Promise.all([api.products(), api.stores(), api.banners()]);
        setProducts(p);
        setBanners(bn);
        setStores(Object.fromEntries(s.map((x) => [x.id, x])) as Record<StoreId, StoreInfo>);
        setError(null);
        setLoading(false);
        return;
      } catch (e) {
        if (attempt === 5) {
          setError('Could not load products. Please check the server is running and try again.');
          setLoading(false);
          console.error(e);
        } else await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Drop cart lines whose product was deleted by the admin.
  useEffect(() => {
    if (!loading && !error && products.length) setCart((c) => c.filter((i) => products.some((p) => p.id === i.productId)));
  }, [loading, error, products, setCart]);

  const value = useMemo<StoreValue>(
    () => ({
      products,
      banners,
      stores,
      loading,
      error,
      refresh,
      productById: (id) => products.find((p) => p.id === id),
      cart,
      cartCount: cart.reduce((s, i) => s + i.qty, 0),
      addToCart: (item) =>
        setCart((c) => {
          const found = c.find((i) => sameLine(i, item));
          return found ? c.map((i) => (i === found ? { ...i, qty: i.qty + item.qty } : i)) : [...c, item];
        }),
      setQty: (item, qty) => setCart((c) => (qty <= 0 ? c.filter((i) => !sameLine(i, item)) : c.map((i) => (sameLine(i, item) ? { ...i, qty } : i)))),
      clearCart: () => setCart([]),
      toast,
      notify: setToast,
    }),
    [products, banners, stores, loading, error, refresh, cart, setCart, toast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
