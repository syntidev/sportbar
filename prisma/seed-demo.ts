import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const NOMBRES   = ['Alejandro','Beatriz','Carlos','Diana','Eduardo','Fernanda','Gabriel','Helena','Ignacio','Julia','Kevin','Laura','Miguel','Natalia','Orlando']
const APELLIDOS = ['Rodríguez','González','Pérez','López','Martínez','Hernández','García','Díaz','Moreno','Álvarez','Sánchez','Torres','Romero','Castro','Vargas']

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('seed-demo: iniciando...')

  // ── 1. ZONAS ──────────────────────────────────────────────────────────────
  // Zone.name es @unique — upsert seguro
  const zoneData = [
    { name: 'Norte',   color: '#ef4444', capacity: 200 },
    { name: 'Sur',     color: '#3b82f6', capacity: 200 },
    { name: 'VIP',     color: '#f59e0b', capacity: 100 },
    { name: 'General', color: '#22c55e', capacity: 200 },
    { name: 'Externa', color: '#8b5cf6', capacity: 0   },
  ]
  const Z: Record<string, number> = {}
  for (const z of zoneData) {
    const row = await prisma.zone.upsert({
      where:  { name: z.name },
      update: { color: z.color, capacity: z.capacity },
      create: z,
    })
    Z[z.name] = row.id
  }
  console.log('  Zonas: ok', Object.keys(Z))

  // ── 2. VENUES ─────────────────────────────────────────────────────────────
  // VenueType enum: matriz | quiosco | cocina
  // Bar Norte/Sur → quiosco (bar no existe en enum)
  const venueData: Array<{ name: string; type: 'cocina' | 'quiosco' | 'matriz'; caps: string[] }> = [
    { name: 'Cocina Central', type: 'cocina',  caps: ['hamburguesas', 'raciones']        },
    { name: 'Bar Norte',      type: 'quiosco', caps: ['bebidas', 'cerveza']              },
    { name: 'Bar Sur',        type: 'quiosco', caps: ['bebidas', 'cerveza']              },
    { name: 'Quiosco VIP',    type: 'quiosco', caps: ['bebidas', 'hamburguesas']         },
    { name: 'Matriz',         type: 'matriz',  caps: ['all']                             },
  ]
  const V: Record<string, number> = {}
  for (const v of venueData) {
    const ex = await prisma.venue.findFirst({ where: { name: v.name } })
    const row = ex
      ? await prisma.venue.update({
          where: { id: ex.id },
          data:  { type: v.type, capabilities: v.caps, is_active: true },
        })
      : await prisma.venue.create({
          data: { name: v.name, type: v.type, capabilities: v.caps, is_active: true },
        })
    V[v.name] = row.id
  }
  console.log('  Venues: ok', Object.keys(V))

  // ── 3. VENUE_ZONES ────────────────────────────────────────────────────────
  const vzMap: Record<string, string[]> = {
    'Cocina Central': ['Norte', 'Sur', 'General'],
    'Bar Norte':      ['Norte', 'General'],
    'Bar Sur':        ['Sur',   'General'],
    'Quiosco VIP':    ['VIP'],
    'Matriz':         ['VIP',   'Externa'],
  }
  for (const [vn, zns] of Object.entries(vzMap)) {
    for (const zn of zns) {
      await prisma.venueZone.upsert({
        where:  { venue_id_zone_id: { venue_id: V[vn], zone_id: Z[zn] } },
        update: {},
        create: { venue_id: V[vn], zone_id: Z[zn] },
      })
    }
  }
  console.log('  VenueZones: ok')

  // ── 4. USUARIOS DEMO ──────────────────────────────────────────────────────
  // Role enum: mesero | cocina | bar | despacho | validador | admin
  // atencion no existe → mesero
  const demoUsers: Array<{
    code: string; name: string; lastname: string;
    pin: string; role: 'mesero' | 'cocina' | 'bar'; venue: string
  }> = [
    { code: 'MES-002', name: 'Carlos',   lastname: 'Rodríguez', pin: '2222', role: 'mesero', venue: 'Bar Norte'      },
    { code: 'MES-003', name: 'Andreína', lastname: 'Pérez',     pin: '3333', role: 'mesero', venue: 'Bar Sur'        },
    { code: 'COC-001', name: 'José',     lastname: 'Martínez',  pin: '4444', role: 'cocina', venue: 'Cocina Central' },
    { code: 'BAR-001', name: 'Luisa',    lastname: 'García',    pin: '5555', role: 'bar',    venue: 'Bar Norte'      },
  ]
  const U: Record<string, number> = {}
  for (const u of demoUsers) {
    const hash = await bcrypt.hash(u.pin, 10)
    const row  = await prisma.user.upsert({
      where:  { code: u.code },
      update: { name: u.name, lastname: u.lastname, role: u.role, venue_id: V[u.venue] },
      create: { code: u.code, name: u.name, lastname: u.lastname, pin: hash, role: u.role, venue_id: V[u.venue] },
    })
    U[u.code] = row.id
  }
  console.log('  Usuarios demo: ok', Object.keys(U))

  // ── 5. VENUE_USERS ────────────────────────────────────────────────────────
  const vuMap: Record<string, string> = {
    'MES-002': 'Bar Norte',
    'MES-003': 'Bar Sur',
    'COC-001': 'Cocina Central',
    'BAR-001': 'Bar Norte',
  }
  for (const [code, vn] of Object.entries(vuMap)) {
    await prisma.venueUser.upsert({
      where:  { venue_id_user_id: { venue_id: V[vn], user_id: U[code] } },
      update: {},
      create: { venue_id: V[vn], user_id: U[code] },
    })
  }
  console.log('  VenueUsers: ok')

  // ── 6. TICKET COUNTER — reservar rango LOC-00001..LOC-00040 ──────────────
  await prisma.ticketCounter.upsert({
    where:  { prefix: 'LOC' },
    update: { last: 40 },
    create: { prefix: 'LOC', last: 40 },
  })
  await prisma.ticketCounter.upsert({
    where:  { prefix: 'PUB' },
    update: {},
    create: { prefix: 'PUB', last: 0 },
  })

  // ── 7. PRODUCTOS (fetch IDs para armar items) ─────────────────────────────
  const prods = await prisma.product.findMany({ where: { is_active: true } })
  if (!prods.length) {
    console.error('  ERROR: Sin productos. Ejecuta "npx tsx prisma/seed.ts" primero.')
    return
  }
  const hams = prods.filter(p => p.category === 'hamburguesas')
  const racs = prods.filter(p => p.category === 'raciones')
  const bebs = prods.filter(p => p.category === 'bebidas')

  if (!hams.length || !racs.length || !bebs.length) {
    console.error('  ERROR: Faltan categorías. Verifica que seed base esté ejecutado.')
    return
  }

  // Set de PIDs que son "comida" para routing KDS
  const foodPids = new Set([...hams.map(p => p.id), ...racs.map(p => p.id)])

  const h = (i: number) => hams[i % hams.length]
  const r = (i: number) => racs[i % racs.length]
  const b = (i: number) => bebs[i % bebs.length]
  const pr = (p: { price_usd: unknown }) => Number(p.price_usd)

  // ── 8. CONFIG PARTIDOS ────────────────────────────────────────────────────
  const configPartidos = [
    { key: 'partido_1', value: JSON.stringify({ label: 'Guaiqueries vs Cocodrilos', date: '2026-05-10' }) },
    { key: 'partido_2', value: JSON.stringify({ label: 'Guaiqueries vs Marinos',    date: '2026-05-17' }) },
    { key: 'partido_3', value: JSON.stringify({ label: 'Guaiqueries vs Llaneros',   date: '2026-05-30', activo: true }) },
  ]
  for (const c of configPartidos) {
    await prisma.config.upsert({ where: { key: c.key }, update: { value: c.value }, create: c })
  }
  console.log('  Config partidos: ok')

  // ── 9. ÓRDENES DEMO ───────────────────────────────────────────────────────
  const RATE  = 50.00
  const adm   = await prisma.user.findFirst({ where: { code: 'ADM-001' } })
  const sysId = adm?.id ?? 1
  const m2    = U['MES-002']
  const m3    = U['MES-003']

  type Item = { pid: number; qty: number; price: number }

  async function createOrder(spec: {
    code: string
    zone: 'Norte' | 'Sur' | 'VIP' | 'Externa'
    zoneId: number
    seat: string
    customerName: string
    customerLastname: string
    kitchen: 'NUEVO' | 'PREP' | 'LISTO' | 'ENTREGADO'
    payment: 'PEND' | 'PAID'
    userId: number
    venueId: number
    at: Date
    paidAt: Date | null
    items: Item[]
  }): Promise<'created' | 'skipped'> {
    if (await prisma.order.findUnique({ where: { code: spec.code } })) return 'skipped'

    const total_usd = spec.items.reduce((s, it) => s + it.price * it.qty, 0)
    await prisma.order.create({
      data: {
        code:              spec.code,
        origin:            'LOC',
        kitchen_status:    spec.kitchen,
        payment_status:    spec.payment,
        customer_name:     spec.customerName,
        customer_lastname: spec.customerLastname,
        zone:              spec.zone,
        zone_id:           spec.zoneId,
        seat:              spec.seat,
        total_usd,
        rate_used:         RATE,
        total_bs:          total_usd * RATE,
        created_by:        spec.userId,
        venue_destino_id:  spec.venueId,
        created_at:        spec.at,
        paid_at:           spec.paidAt,
        items: {
          create: spec.items.map(it => ({
            product_id: it.pid,
            qty:        it.qty,
            price_usd:  it.price,
            subtotal:   it.price * it.qty,
          })),
        },
        logs: {
          create: { action: 'CREATED', to_state: 'NUEVO', actor_code: 'SEED' },
        },
      },
    })
    return 'created'
  }

  let created = 0
  let skipped = 0

  const tick = async (r: Promise<'created' | 'skipped'>) => {
    const res = await r
    res === 'created' ? created++ : skipped++
  }

  // ── PARTIDO 1 — Guaiqueries vs Cocodrilos — 2026-05-10 — 20 órdenes PAID ─
  const p1 = new Date('2026-05-10T20:00:00Z')
  for (let i = 1; i <= 20; i++) {
    const isNorte = i <= 10
    const zone: 'Norte' | 'Sur' = isNorte ? 'Norte' : 'Sur'
    const zoneId  = isNorte ? Z['Norte'] : Z['Sur']
    const ham = h(i); const bev = b(i); const rac = r(i)
    const hamP = pr(ham); const bevP = pr(bev); const racP = pr(rac)

    let items: Item[]
    if (i % 3 === 0)      items = [{ pid: ham.id, qty: 1, price: hamP }, { pid: rac.id, qty: 1, price: racP }, { pid: bev.id, qty: 2, price: bevP }]
    else if (i % 2 === 0) items = [{ pid: ham.id, qty: 1, price: hamP }, { pid: bev.id, qty: 1, price: bevP }]
    else                   items = [{ pid: rac.id, qty: 1, price: racP }, { pid: bev.id, qty: 2, price: bevP }]

    const hasFood = items.some(it => foodPids.has(it.pid))
    const venueId = hasFood ? V['Cocina Central'] : isNorte ? V['Bar Norte'] : V['Bar Sur']

    const at = new Date(p1.getTime() + i * 4 * 60_000)
    await tick(createOrder({
      code: `LOC-${String(i).padStart(5, '0')}`,
      zone, zoneId,
      seat: `Fila ${String.fromCharCode(64 + Math.ceil(i / 4))} A${(i - 1) % 4 + 1}`,
      customerName: NOMBRES[i % NOMBRES.length],
      customerLastname: APELLIDOS[i % APELLIDOS.length],
      kitchen: 'ENTREGADO', payment: 'PAID',
      userId: isNorte ? m2 : m3,
      venueId, at,
      paidAt: new Date(at.getTime() + 25 * 60_000),
      items,
    }))
  }

  // ── PARTIDO 2 — Guaiqueries vs Marinos — 2026-05-17 — 15 órdenes PAID ────
  const p2 = new Date('2026-05-17T20:00:00Z')
  for (let i = 1; i <= 15; i++) {
    const isVip = i <= 5
    const zone: 'Norte' | 'Sur' | 'VIP' = isVip ? 'VIP' : i % 2 === 0 ? 'Norte' : 'Sur'
    const zoneId = isVip ? Z['VIP'] : i % 2 === 0 ? Z['Norte'] : Z['Sur']
    const ham = h(i + 7); const bev = b(i + 7); const rac = r(i + 7)
    const hamP = pr(ham); const bevP = pr(bev); const racP = pr(rac)

    let items: Item[]
    if (i % 4 === 0)      items = [{ pid: ham.id, qty: 2, price: hamP }, { pid: bev.id, qty: 2, price: bevP }]
    else if (i % 3 === 0) items = [{ pid: rac.id, qty: 2, price: racP }, { pid: bev.id, qty: 1, price: bevP }]
    else                   items = [{ pid: ham.id, qty: 1, price: hamP }, { pid: bev.id, qty: 1, price: bevP }]

    const hasFood = items.some(it => foodPids.has(it.pid))
    const venueId = hasFood
      ? V['Cocina Central']
      : isVip ? V['Quiosco VIP'] : i % 2 === 0 ? V['Bar Norte'] : V['Bar Sur']

    const at = new Date(p2.getTime() + i * 5 * 60_000)
    await tick(createOrder({
      code: `LOC-${String(20 + i).padStart(5, '0')}`,
      zone, zoneId,
      seat: isVip ? `Palco ${i}` : `Fila ${String.fromCharCode(65 + (i % 5))} A${i % 5 + 1}`,
      customerName: NOMBRES[(i + 5) % NOMBRES.length],
      customerLastname: APELLIDOS[(i + 5) % APELLIDOS.length],
      kitchen: 'ENTREGADO', payment: 'PAID',
      userId: isVip ? sysId : i % 2 === 0 ? m2 : m3,
      venueId, at,
      paidAt: new Date(at.getTime() + 20 * 60_000),
      items,
    }))
  }

  // ── PARTIDO 3 — Activo hoy — 5 órdenes en proceso ────────────────────────
  // ZoneCode enum no tiene General → órdenes General usan Norte/Sur + zone_id
  const p3 = new Date('2026-05-30T20:00:00Z')
  const p3Specs: Array<{
    kitchen: 'NUEVO' | 'PREP' | 'LISTO' | 'ENTREGADO'
    zone: 'Norte' | 'Sur' | 'VIP'
    zoneId: number
    seat: string
    uid: number
    vi: number
  }> = [
    { kitchen: 'LISTO',     zone: 'Norte', zoneId: Z['Norte'], seat: 'Mesa 1', uid: m2,    vi: V['Cocina Central'] },
    { kitchen: 'PREP',      zone: 'Sur',   zoneId: Z['Sur'],   seat: 'Mesa 2', uid: m3,    vi: V['Cocina Central'] },
    { kitchen: 'NUEVO',     zone: 'VIP',   zoneId: Z['VIP'],   seat: 'Palco 1',uid: sysId, vi: V['Quiosco VIP']   },
    // Estos dos usan zone_id=General pero zone='Norte'/'Sur' por límite del enum
    { kitchen: 'NUEVO',     zone: 'Norte', zoneId: Z['General'], seat: 'General Fila A A3', uid: m2, vi: V['Bar Norte'] },
    { kitchen: 'ENTREGADO', zone: 'Sur',   zoneId: Z['General'], seat: 'General Fila B A1', uid: m3, vi: V['Bar Sur']   },
  ]
  for (let i = 0; i < p3Specs.length; i++) {
    const sp  = p3Specs[i]
    const ham = h(i + 12); const bev = b(i + 12)
    const items: Item[] = [
      { pid: ham.id, qty: 1, price: pr(ham) },
      { pid: bev.id, qty: 1, price: pr(bev) },
    ]
    await tick(createOrder({
      code: `LOC-${String(36 + i).padStart(5, '0')}`,
      zone: sp.zone, zoneId: sp.zoneId, seat: sp.seat,
      customerName: NOMBRES[(i + 10) % NOMBRES.length],
      customerLastname: APELLIDOS[(i + 10) % APELLIDOS.length],
      kitchen: sp.kitchen, payment: 'PEND',
      userId: sp.uid, venueId: sp.vi,
      at: new Date(p3.getTime() + i * 8 * 60_000),
      paidAt: null,
      items,
    }))
  }

  console.log(`  Órdenes: ${created} creadas, ${skipped} ya existían`)
  console.log('seed-demo completado!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
