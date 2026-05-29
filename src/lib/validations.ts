import { z } from 'zod'

// ── ENUMS ────────────────────────────────────────────────────────────────────

export const OriginSchema = z.enum(['PUB', 'LOC'])

export const ZoneSchema = z.enum(['Norte', 'Sur', 'VIP', 'Externa'])

export const CategorySchema = z.enum(['hamburguesas', 'raciones', 'bebidas'])

// ── ORDER ITEM ───────────────────────────────────────────────────────────────

export const CreateOrderItemSchema = z.object({
  product_id: z
    .number({ error: 'product_id es requerido' })
    .int()
    .positive('product_id debe ser un entero positivo'),

  qty: z
    .number({ error: 'qty es requerido' })
    .int()
    .min(1, 'La cantidad minima es 1')
    .max(99, 'La cantidad maxima es 99'),

  price_usd: z.coerce.number().positive('price_usd debe ser un numero positivo'),
})

export type CreateOrderItemInput = z.infer<typeof CreateOrderItemSchema>

// ── ORDER ────────────────────────────────────────────────────────────────────

export const CreateOrderSchema = z.object({
  // Origen de la orden
  origin: OriginSchema,

  // Cliente
  customer_name: z
    .string({ error: 'El nombre del cliente es requerido' })
    .trim()
    .min(1, 'El nombre no puede estar vacio')
    .max(100, 'El nombre no puede superar 100 caracteres'),

  customer_lastname: z
    .string({ error: 'El apellido del cliente es requerido' })
    .trim()
    .min(1, 'El apellido no puede estar vacio')
    .max(100, 'El apellido no puede superar 100 caracteres'),

  customer_id: z
    .string()
    .trim()
    .regex(/^[VEve]?\d{6,8}$/, 'Cedula invalida. Formato: V1234567 o 1234567')
    .optional(),

  // Ubicacion
  zone: ZoneSchema,

  seat: z
    .string()
    .trim()
    .max(50, 'La ubicacion del asiento no puede superar 50 caracteres')
    .optional(),

  // Items (minimo 1)
  items: z
    .array(CreateOrderItemSchema)
    .min(1, 'La orden debe tener al menos un producto'),

  // Mesero que crea la orden
  created_by: z
    .number({ error: 'created_by es requerido' })
    .int()
    .positive('created_by debe ser un entero positivo'),

  // Nota opcional
  note: z
    .string()
    .trim()
    .max(500, 'La nota no puede superar 500 caracteres')
    .optional(),
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
