export type StoreId = 'one' | 'two';
export type Category = 'Suits' | 'Shirts' | 'Trousers' | 'Footwear' | 'Belts' | 'Accessories';

export interface Product {
  id: number;
  name: string;
  category: Category;
  description: string;
  price: number;
  mrp: number;
  stock: number;
  sizes: string[];
  stores: StoreId[];
  image: string;
}

export interface StoreInfo {
  id: StoreId;
  no: string;
  name: string;
  address: string;
  hours: string;
  phone: string;
}

export type OrderStatus = 'Pending payment' | 'Paid' | 'Ready for pick-up' | 'Collected' | 'Cancelled';

export interface Order {
  id: string;
  customer: { name: string; phone: string; email: string; address: string };
  pickupDate: string;
  total: number;
  status: OrderStatus;
  paymentId: string | null;
  paymentMethod: string | null;
  createdAt: string;
  items: { productId: number; storeId: StoreId; name: string; image: string; size: string; qty: number; price: number }[];
}

export type BannerTone = 'gold' | 'blue' | 'sage' | 'cream' | 'ink';

export interface BannerSlide {
  id: number;
  image: string;
  tag: string;
  title: string;
  highlight: string;
  offer: string;
  sub: string;
  cta: string;
  link: string;
  tone: BannerTone;
  sort: number;
  active: boolean;
}

export interface CartItem {
  productId: number;
  storeId: StoreId;
  size: string;
  qty: number;
}

export interface Notification {
  id: number;
  order_id: string;
  subject: string;
  body: string;
  created_at: string;
}

export const CATS: Category[] = ['Suits', 'Shirts', 'Trousers', 'Footwear', 'Belts', 'Accessories'];
export const ORDER_STATUSES: OrderStatus[] = ['Pending payment', 'Paid', 'Ready for pick-up', 'Collected', 'Cancelled'];

export const SIZES: Record<Category, string[]> = {
  Suits: ['36', '38', '40', '42', '44'],
  Shirts: ['S', 'M', 'L', 'XL', 'XXL'],
  Trousers: ['30', '32', '34', '36', '38'],
  Footwear: ['6', '7', '8', '9', '10', '11'],
  Belts: ['30', '32', '34', '36', '38', '40'],
  Accessories: ['Standard'],
};

/** Seed photos served by the backend, used for the home page artwork. */
export const photo = (slug: string) => `/uploads/seed/${slug}.jpg`;

export const STORE_BANNERS: Record<StoreId, string[]> = {
  one: ['brown-brogues', 'green-suit', 'white-shirt'],
  two: ['monk-straps', 'royal-blue-suit', 'sky-blue-shirt'],
};

export const inr = (n: number) => '₹ ' + n.toLocaleString('en-IN');
export const off = (p: Pick<Product, 'price' | 'mrp'>) => (p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0);
export const statusClass = (s: string) => `status status--${s.split(' ')[0].toLowerCase()}`;
