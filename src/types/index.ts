// ── Enums ─────────────────────────────────────────────────────────────────────

export type Role = 'mesero' | 'cocina' | 'bar' | 'despacho' | 'validador' | 'admin';

export type Category = string; // free string — hamburguesas | raciones | bebidas | …

export type Origin = 'PUB' | 'LOC';

export type KitchenStatus = 'NUEVO' | 'PREP' | 'LISTO' | 'ENTREGADO';

export type PaymentStatus = 'PEND' | 'PAID' | 'CREDIT' | 'CANCELLED';

export type Zone = 'Norte' | 'Sur' | 'VIP' | 'Externa';

export type ValidationStatus = 'PENDING' | 'VALIDATED' | 'FLAGGED';

// ── Models ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  code: string;
  name: string;
  lastname: string;
  pin: string;
  role: Role;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price_usd: number;
  category: Category;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  qty: number;
  price_usd: number;
  subtotal: number;
  product?: Product;
}

export interface Order {
  id: number;
  code: string;
  origin: Origin;
  kitchen_status: KitchenStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  receipt_photo: string | null;
  customer_name: string;
  customer_lastname: string;
  customer_id: string | null;
  zone: Zone;
  seat: string | null;
  total_usd: number;
  rate_used: number;
  total_bs: number;
  created_by: number;
  note: string | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
  items?: OrderItem[];
  logs?: OrderLog[];
  validation?: PaymentValidation | null;
  user?: Pick<User, 'id' | 'code' | 'name' | 'lastname'>;
}

export interface OrderLog {
  id: number;
  order_id: number;
  action: string;
  from_state: string | null;
  to_state: string | null;
  actor_code: string;
  note: string | null;
  created_at: Date;
}

export interface PaymentValidation {
  id: number;
  order_id: number;
  photo_path: string | null;
  validated_by: string | null;
  status: ValidationStatus;
  note: string | null;
  validated_at: Date | null;
  created_at: Date;
}

export interface DollarRate {
  id: number;
  rate: number;
  source: string;
  is_active: boolean;
  effective_from: Date;
  effective_until: Date | null;
  created_at: Date;
}

export interface TicketCounter {
  id: number;
  prefix: string;
  last: number;
}

export interface Config {
  id: number;
  key: string;
  value: string;
}

// ── KDS routing helpers ───────────────────────────────────────────────────────

export type KdsStation = 'cocina' | 'bar' | 'despacho';

export interface KdsOrderCard {
  order: Order;
  stations: KdsStation[];
  elapsed_ms: number;
}

// ── API response wrappers ─────────────────────────────────────────────────────

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiOk<T> | ApiError;
