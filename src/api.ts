import type { BannerSlide, CartItem, Notification, Order, OrderStatus, Product, StoreId, StoreInfo } from './data';

const TOKEN_KEY = 'sb.adminToken';

export const adminToken = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, admin = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (admin) {
    const t = adminToken.get();
    if (t) headers.set('Authorization', `Bearer ${t}`);
  }
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && admin) adminToken.set(null);
    throw new ApiError(res.status, data.error || 'Request failed');
  }
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  stores: () => request<StoreInfo[]>('/api/stores'),
  banners: () => request<BannerSlide[]>('/api/banners'),
  products: () => request<Product[]>('/api/products'),
  product: (id: number | string) => request<Product>(`/api/products/${id}`),
  createOrder: (body: { customer: Order['customer']; pickupDate: string; items: CartItem[] }) =>
    request<Order>('/api/orders', { method: 'POST', body: json(body) }),
  payOrder: (id: string, method: string) => request<Order>(`/api/orders/${id}/pay`, { method: 'POST', body: json({ method }) }),
  myOrders: (phone: string) => request<Order[]>(`/api/orders?phone=${encodeURIComponent(phone)}`),

  login: (username: string, password: string) => request<{ token: string }>('/api/admin/login', { method: 'POST', body: json({ username, password }) }),
  adminOrders: () => request<Order[]>('/api/admin/orders', {}, true),
  setOrderStatus: (id: string, status: OrderStatus) => request<Order>(`/api/admin/orders/${id}`, { method: 'PATCH', body: json({ status }) }, true),
  saveProduct: (form: FormData, id?: number) =>
    request<Product>(id ? `/api/admin/products/${id}` : '/api/admin/products', { method: id ? 'PUT' : 'POST', body: form }, true),
  deleteProduct: (id: number) => request<{ ok: true }>(`/api/admin/products/${id}`, { method: 'DELETE' }, true),
  saveStore: (id: StoreId, body: Omit<StoreInfo, 'id' | 'no'>) => request<StoreInfo>(`/api/admin/stores/${id}`, { method: 'PUT', body: json(body) }, true),
  adminBanners: () => request<BannerSlide[]>('/api/admin/banners', {}, true),
  saveBanner: (form: FormData, id?: number) =>
    request<BannerSlide>(id ? `/api/admin/banners/${id}` : '/api/admin/banners', { method: id ? 'PUT' : 'POST', body: form }, true),
  moveBanner: (id: number, direction: 'up' | 'down') =>
    request<BannerSlide[]>(`/api/admin/banners/${id}/move`, { method: 'POST', body: json({ direction }) }, true),
  deleteBanner: (id: number) => request<{ ok: true }>(`/api/admin/banners/${id}`, { method: 'DELETE' }, true),
  notifications: () => request<Notification[]>('/api/admin/notifications', {}, true),
};
