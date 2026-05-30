#!/usr/bin/env node
// src/lib/certify.ts — CafeBall certification suite
// Usage: npx tsx src/lib/certify.ts [--base=http://localhost:3000]

const BASE         = process.argv.find((a: string) => a.startsWith('--base='))?.split('=')[1] ?? 'http://localhost:3000'
const ADMIN_CODE   = process.env.CERTIFY_CODE ?? 'ADM-001'
const ADMIN_PIN    = process.env.CERTIFY_PIN  ?? '1234'

// ── ANSI ──────────────────────────────────────────────────────────────────────
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', B = '\x1b[1m'
const D = '\x1b[2m', X = '\x1b[0m'

// ── State shared across tests ─────────────────────────────────────────────────
let cookie       = ''
let adminId      = 0
let adminCode    = ADMIN_CODE
let prodId       = 0          // created test product
let pubOrderId   = 0
let locOrderId   = 0

// ── Runner ────────────────────────────────────────────────────────────────────
interface Result { module: string; name: string; passed: boolean; ms: number; detail?: string }
const results: Result[] = []

async function t(
  mod: string,
  name: string,
  fn: () => Promise<{ ok: boolean; detail?: string }>,
) {
  const t0 = Date.now()
  try {
    const { ok, detail } = await fn()
    const ms = Date.now() - t0
    results.push({ module: mod, name, passed: ok, ms, detail })
    const tag = ok ? `${G}PASS${X}` : `${R}FAIL${X}`
    console.log(`  ${tag}  ${name} ${D}${ms}ms${X}${detail && !ok ? `\n       ${R}↳ ${detail}${X}` : ''}`)
  } catch (e: unknown) {
    const ms = Date.now() - t0
    const detail = e instanceof Error ? e.message : String(e)
    results.push({ module: mod, name, passed: false, ms, detail })
    console.log(`  ${R}FAIL${X}  ${name} ${D}${ms}ms${X}\n       ${R}↳ ${detail}${X}`)
  }
}

function section(label: string) {
  console.log(`\n${B}${label}${X}`)
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function api(
  method: string,
  path: string,
  body?: unknown,
  extraCookie?: string,
): Promise<{ status: number; data: Record<string, unknown>; rawCookie: string }> {
  const headers: Record<string, string> = {}
  const c = extraCookie ?? cookie
  if (c) headers['Cookie'] = c
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data: Record<string, unknown> = {}
  try { data = await res.json() as Record<string, unknown> } catch { /* not JSON */ }

  return { status: res.status, data, rawCookie: res.headers.get('set-cookie') ?? '' }
}

function ok(status: number, data: Record<string, unknown>, expectedStatus = 200): { ok: boolean; detail?: string } {
  if (status !== expectedStatus) return { ok: false, detail: `HTTP ${status} · ${JSON.stringify(data)}` }
  if (!data.success) return { ok: false, detail: (data.error ?? data.errors ?? JSON.stringify(data)) as string }
  return { ok: true }
}

// ── 1. AUTH ───────────────────────────────────────────────────────────────────

async function testAuth() {
  section('1. AUTH')

  await t('Auth', `Login PIN válido (${ADMIN_CODE})`, async () => {
    const { status, data, rawCookie } = await api('POST', '/api/auth/session', {
      code: ADMIN_CODE,
      pin:  ADMIN_PIN,
    })
    if (status !== 200 || !data.success) return { ok: false, detail: `HTTP ${status} · ${JSON.stringify(data)}` }
    const match = rawCookie.match(/cafeball_session=[^;]+/)
    if (!match) return { ok: false, detail: 'Set-Cookie no contiene cafeball_session' }
    cookie     = match[0]
    const user = data.user as { id?: number; code?: string } | undefined
    adminId    = user?.id   ?? 0
    adminCode  = user?.code ?? ADMIN_CODE
    return { ok: true }
  })

  await t('Auth', 'Login PIN inválido → 401', async () => {
    const { status, data } = await api('POST', '/api/auth/session', { code: ADMIN_CODE, pin: '0000' }, '')
    return { ok: status === 401 && data.success === false }
  })

  await t('Auth', 'GET /api/auth/me con sesión activa', async () => {
    const { status, data } = await api('GET', '/api/auth/me')
    return ok(status, data)
  })

  await t('Auth', 'GET /api/auth/me sin cookie → 401', async () => {
    const { status } = await api('GET', '/api/auth/me', undefined, '')
    return { ok: status === 401 }
  })
}

// ── 2. PRODUCTS ───────────────────────────────────────────────────────────────

async function testProducts() {
  section('2. PRODUCTS')

  await t('Products', 'GET /api/products', async () => {
    const { status, data } = await api('GET', '/api/products')
    if (status !== 200 || !Array.isArray(data.products)) return { ok: false, detail: JSON.stringify(data) }
    return { ok: true, detail: `${(data.products as unknown[]).length} productos` }
  })

  await t('Products', 'POST /api/products — crear', async () => {
    const { status, data } = await api('POST', '/api/products', {
      name:        '_CERTIFY_TEST_',
      description: 'Producto de certificación — borrar',
      price_usd:   1.00,
      category:    'hamburguesas',
      is_active:   true,
    })
    const p = data.product as { id?: number } | undefined
    if (p?.id) prodId = p.id
    return ok(status, data, 201)
  })

  await t('Products', 'GET /api/products/{id}', async () => {
    if (!prodId) return { ok: false, detail: 'Sin producto de prueba' }
    const { status, data } = await api('GET', `/api/products/${prodId}`)
    return ok(status, data)
  })

  await t('Products', 'PUT /api/products/{id} — editar', async () => {
    if (!prodId) return { ok: false, detail: 'Sin producto de prueba' }
    const { status, data } = await api('PUT', `/api/products/${prodId}`, {
      name:      '_CERTIFY_EDITED_',
      price_usd: 2.50,
      category:  'raciones',
      is_active: true,
    })
    return ok(status, data)
  })

  await t('Products', 'PATCH /api/products/{id} — toggle is_active=false', async () => {
    if (!prodId) return { ok: false, detail: 'Sin producto de prueba' }
    const { status, data } = await api('PATCH', `/api/products/${prodId}`, { is_active: false })
    return ok(status, data)
  })

  await t('Products', 'PATCH /api/products/{id} — toggle is_active=true', async () => {
    if (!prodId) return { ok: false, detail: 'Sin producto de prueba' }
    const { status, data } = await api('PATCH', `/api/products/${prodId}`, { is_active: true })
    return ok(status, data)
  })
}

// ── 3. ORDERS ─────────────────────────────────────────────────────────────────

async function testOrders() {
  section('3. ORDERS')

  // Resolve a valid product ID for order items
  let itemProductId = prodId
  if (!itemProductId) {
    const { data } = await api('GET', '/api/products')
    const prods = data.products as Array<{ id: number; is_active: boolean }> | undefined
    itemProductId = prods?.find(p => p.is_active)?.id ?? 0
  }

  await t('Orders', 'GET /api/orders', async () => {
    const { status, data } = await api('GET', '/api/orders?limit=10')
    if (status !== 200 || !Array.isArray(data.orders)) return { ok: false, detail: JSON.stringify(data) }
    return { ok: true, detail: `${(data.orders as unknown[]).length} órdenes` }
  })

  await t('Orders', 'POST /api/orders — crear PUB', async () => {
    if (!itemProductId) return { ok: false, detail: 'Sin producto activo' }
    const { status, data } = await api('POST', '/api/orders', {
      origin:            'PUB',
      customer_name:     'Certify',
      customer_lastname: 'Test',
      zone:              'Norte',
      items: [{ product_id: itemProductId, qty: 1, price_usd: 1.00 }],
    })
    const order = data.order as { id?: number } | undefined
    if (order?.id) pubOrderId = order.id
    return ok(status, data, 201)
  })

  await t('Orders', 'POST /api/orders — crear LOC', async () => {
    if (!itemProductId) return { ok: false, detail: 'Sin producto activo' }
    const { status, data } = await api('POST', '/api/orders', {
      origin:            'LOC',
      created_by:        adminId || undefined,
      customer_name:     'Certify',
      customer_lastname: 'LOC',
      zone:              'Sur',
      items: [{ product_id: itemProductId, qty: 2, price_usd: 1.00 }],
    })
    const order = data.order as { id?: number } | undefined
    if (order?.id) locOrderId = order.id
    return ok(status, data, 201)
  })

  await t('Orders', 'POST /api/kds/bump — NUEVO → PREP (PUB)', async () => {
    if (!pubOrderId) return { ok: false, detail: 'Sin orden PUB' }
    const { status, data } = await api('POST', '/api/kds/bump', {
      order_id:   pubOrderId,
      actor_code: adminCode,
    })
    return ok(status, data)
  })

  await t('Orders', 'POST /api/kds/bump — PREP → LISTO (PUB)', async () => {
    if (!pubOrderId) return { ok: false, detail: 'Sin orden PUB' }
    const { status, data } = await api('POST', '/api/kds/bump', {
      order_id:   pubOrderId,
      actor_code: adminCode,
    })
    return ok(status, data)
  })

  await t('Orders', 'PATCH /api/orders/{id}/claim (LOC en NUEVO)', async () => {
    if (!locOrderId) return { ok: false, detail: 'Sin orden LOC' }
    const { status, data } = await api('PATCH', `/api/orders/${locOrderId}/claim`)
    return ok(status, data)
  })

  await t('Orders', 'POST /api/orders/{id}/cancel con CancellationLog', async () => {
    if (!pubOrderId) return { ok: false, detail: 'Sin orden PUB' }
    const { status, data } = await api('POST', `/api/orders/${pubOrderId}/cancel`, {
      reason: 'Cancelado por suite de certificación automática',
    })
    return ok(status, data)
  })
}

// ── 4. TURNO ──────────────────────────────────────────────────────────────────

async function testTurno() {
  section('4. TURNO')

  let wasActive = false

  await t('Turno', 'GET /api/turno — estado actual', async () => {
    const { status, data } = await api('GET', '/api/turno')
    wasActive = (data.turno as { is_active?: boolean } | undefined)?.is_active ?? false
    return { ...ok(status, data), detail: `is_active=${wasActive}` }
  })

  if (wasActive) {
    await t('Turno', 'DELETE /api/turno — cerrar activo', async () => {
      const { status, data } = await api('DELETE', '/api/turno')
      return ok(status, data)
    })
  }

  await t('Turno', 'POST /api/turno — abrir', async () => {
    const { status, data } = await api('POST', '/api/turno', {
      partido_nombre:  'Certify FC vs Test United',
      opened_by:       adminCode,
      meseros_activos: [adminCode],
    })
    return ok(status, data)
  })

  await t('Turno', 'GET /api/turno — confirmar is_active=true', async () => {
    const { status, data } = await api('GET', '/api/turno')
    const turno = data.turno as { is_active?: boolean } | undefined
    if (status !== 200 || !turno?.is_active) return { ok: false, detail: `is_active=${turno?.is_active}` }
    return { ok: true }
  })

  await t('Turno', 'DELETE /api/turno — cerrar (limpieza)', async () => {
    const { status, data } = await api('DELETE', '/api/turno')
    return ok(status, data)
  })
}

// ── 5. CURRENCY ───────────────────────────────────────────────────────────────

async function testCurrency() {
  section('5. CURRENCY')

  await t('Currency', 'GET /api/currency — tasa activa / fallback', async () => {
    const { status, data } = await api('GET', '/api/currency')
    if (status !== 200 || typeof data.rate !== 'number') return { ok: false, detail: JSON.stringify(data) }
    return { ok: true, detail: `rate=${data.rate} source=${data.source ?? '?'}` }
  })

  await t('Currency', 'POST /api/currency/manual — override admin', async () => {
    const { status, data } = await api('POST', '/api/currency/manual', { rate: 50.0, currency: 'USD' })
    return ok(status, data)
  })

  await t('Currency', 'POST /api/currency/manual sin auth → 401', async () => {
    const { status } = await api('POST', '/api/currency/manual', { rate: 50.0 }, '')
    return { ok: status === 401 }
  })
}

// ── 6. VENUES ─────────────────────────────────────────────────────────────────

async function testVenues() {
  section('6. VENUES')

  let venueId = 0

  await t('Venues', 'GET /api/venues', async () => {
    const { status, data } = await api('GET', '/api/venues')
    if (status !== 200 || !Array.isArray(data.venues)) return { ok: false, detail: JSON.stringify(data) }
    return { ok: true, detail: `${(data.venues as unknown[]).length} venues` }
  })

  await t('Venues', 'POST /api/venues — crear', async () => {
    const { status, data } = await api('POST', '/api/venues', {
      name:         '_CERTIFY_VENUE_',
      type:         'quiosco',
      capabilities: ['cocina'],
    })
    const v = data.venue as { id?: number } | undefined
    if (v?.id) venueId = v.id
    return ok(status, data, 201)
  })

  await t('Venues', 'GET /api/venues/{id}', async () => {
    if (!venueId) return { ok: false, detail: 'Sin venue de prueba' }
    const { status, data } = await api('GET', `/api/venues/${venueId}`)
    return ok(status, data)
  })

  await t('Venues', 'PUT /api/venues/{id} — editar capabilities', async () => {
    if (!venueId) return { ok: false, detail: 'Sin venue de prueba' }
    const { status, data } = await api('PUT', `/api/venues/${venueId}`, {
      name:         '_CERTIFY_VENUE_EDITED_',
      type:         'quiosco',
      capabilities: ['cocina', 'bar'],
    })
    return ok(status, data)
  })

  await t('Venues', 'DELETE /api/venues/{id} — limpiar', async () => {
    if (!venueId) return { ok: false, detail: 'Sin venue de prueba' }
    const { status, data } = await api('DELETE', `/api/venues/${venueId}`)
    return ok(status, data)
  })
}

// ── 7. USERS ──────────────────────────────────────────────────────────────────

async function testUsers() {
  section('7. USERS')

  let userId = 0

  await t('Users', 'GET /api/users', async () => {
    const { status, data } = await api('GET', '/api/users')
    if (status !== 200 || !Array.isArray(data.users)) return { ok: false, detail: JSON.stringify(data) }
    return { ok: true, detail: `${(data.users as unknown[]).length} usuarios` }
  })

  await t('Users', 'POST /api/users — crear', async () => {
    const { status, data } = await api('POST', '/api/users', {
      code:     'CERT-001',
      name:     'Certify',
      lastname: 'Test',
      pin:      '9999',
      role:     'mesero',
    })
    const u = data.user as { id?: number } | undefined
    if (u?.id) userId = u.id
    return ok(status, data, 201)
  })

  await t('Users', 'GET /api/users/{id}', async () => {
    if (!userId) return { ok: false, detail: 'Sin usuario de prueba' }
    const { status, data } = await api('GET', `/api/users/${userId}`)
    return ok(status, data)
  })

  await t('Users', 'PUT /api/users/{id} — editar', async () => {
    if (!userId) return { ok: false, detail: 'Sin usuario de prueba' }
    const { status, data } = await api('PUT', `/api/users/${userId}`, {
      name:     'Certify',
      lastname: 'Edited',
      role:     'mesero',
      is_active: true,
    })
    return ok(status, data)
  })

  await t('Users', 'DELETE /api/users/{id} — limpiar', async () => {
    if (!userId) return { ok: false, detail: 'Sin usuario de prueba' }
    const { status, data } = await api('DELETE', `/api/users/${userId}`)
    return ok(status, data)
  })
}

// ── 8. INVENTORY ──────────────────────────────────────────────────────────────

async function testInventory() {
  section('8. INVENTORY')

  await t('Inventory', 'GET /api/inventory', async () => {
    const { status, data } = await api('GET', '/api/inventory')
    if (status !== 200 || !Array.isArray(data.items)) return { ok: false, detail: JSON.stringify(data) }
    return { ok: true, detail: `${(data.items as unknown[]).length} items` }
  })

  await t('Inventory', 'PATCH /api/inventory — upsert stock', async () => {
    if (!prodId) return { ok: false, detail: 'Sin producto de prueba (crear producto primero)' }
    const { status, data } = await api('PATCH', '/api/inventory', {
      product_id: prodId,
      quantity:   10,
      unit:       'unid',
      min_stock:  3,
    })
    return ok(status, data)
  })

  await t('Inventory', 'PATCH /api/inventory — alerta mínimo (qty < min_stock)', async () => {
    if (!prodId) return { ok: false, detail: 'Sin producto de prueba' }
    const { status, data } = await api('PATCH', '/api/inventory', {
      product_id: prodId,
      quantity:   1,
      unit:       'unid',
      min_stock:  5,
    })
    // Server acepta qty < min_stock; la alerta es responsabilidad del cliente
    const item = data.item as { quantity?: number; min_stock?: number } | undefined
    const alertFlag = (item?.quantity ?? 0) < (item?.min_stock ?? 0)
    return { ...ok(status, data), detail: alertFlag ? 'qty < min_stock — alerta activa' : undefined }
  })
}

// ── 9. ANALYTICS ──────────────────────────────────────────────────────────────

async function testAnalytics() {
  section('9. ANALYTICS')

  await t('Analytics', 'POST /api/analytics/track — page_view', async () => {
    const { status, data } = await api('POST', '/api/analytics/track', {
      event_type:  'page_view',
      zone:        'Norte',
      device_type: 'mobile',
    })
    return ok(status, data)
  })

  await t('Analytics', 'POST /api/analytics/track — qr_scan', async () => {
    const { status, data } = await api('POST', '/api/analytics/track', { event_type: 'qr_scan' })
    return ok(status, data)
  })

  await t('Analytics', 'POST /api/analytics/track — order_placed', async () => {
    const { status, data } = await api('POST', '/api/analytics/track', {
      event_type:  'order_placed',
      zone:        'VIP',
      device_type: 'desktop',
    })
    return ok(status, data)
  })

  await t('Analytics', 'GET /api/analytics/data — dashboard', async () => {
    const { status, data } = await api('GET', '/api/analytics/data')
    if (status !== 200 || !data.success) return { ok: false, detail: JSON.stringify(data) }
    const d = data.data as Record<string, unknown> | undefined
    return {
      ok:     true,
      detail: `visitas_hoy=${d?.visitas_hoy ?? '?'} qr_7d=${d?.qr_scans_7d ?? '?'}`,
    }
  })
}

// ── CLEANUP ───────────────────────────────────────────────────────────────────

async function cleanup() {
  if (prodId) {
    await api('DELETE', `/api/products/${prodId}`).catch(() => {})
  }
}

// ── SUMMARY ───────────────────────────────────────────────────────────────────

function summary() {
  const passed  = results.filter(r => r.passed).length
  const total   = results.length
  const failed  = total - passed
  const totalMs = results.reduce((s, r) => s + r.ms, 0)

  console.log(`\n${'─'.repeat(52)}`)
  const badge = failed === 0 ? `${G}${B}ALL PASS${X}` : `${R}${B}${failed} FAILED${X}`
  console.log(`${B}Resultado${X}  ${badge}  ${passed}/${total} tests  ${D}${totalMs}ms total${X}`)

  if (failed > 0) {
    console.log(`\n${R}${B}Tests fallidos:${X}`)
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  ${R}✗${X} [${r.module}] ${r.name}`)
      if (r.detail) console.log(`    ${D}${r.detail}${X}`)
    }
  }

  console.log(`\n${B}Por módulo:${X}`)
  const mods = Array.from(new Set(results.map(r => r.module)))
  for (const mod of mods) {
    const mr  = results.filter(r => r.module === mod)
    const mp  = mr.filter(r => r.passed).length
    const avg = Math.round(mr.reduce((s, r) => s + r.ms, 0) / mr.length)
    const dot = mp === mr.length ? `${G}●${X}` : `${R}●${X}`
    console.log(`  ${dot} ${mod.padEnd(12)} ${mp}/${mr.length}  ${D}~${avg}ms avg${X}`)
  }
  console.log()
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${B}CafeBall — Suite de Certificación${X}`)
  console.log(`${D}Base: ${BASE}  Admin: ${ADMIN_CODE}${X}`)

  // Ping
  try {
    const r = await fetch(`${BASE}/api/currency`)
    if (!r.ok && r.status !== 200) throw new Error(`HTTP ${r.status}`)
  } catch (e) {
    console.log(`\n${R}${B}Servidor no disponible en ${BASE}${X}`)
    console.log(`${D}Levanta el servidor con: npm run dev${X}\n`)
    process.exit(2)
  }

  await testAuth()
  await testProducts()
  await testOrders()
  await testTurno()
  await testCurrency()
  await testVenues()
  await testUsers()
  await testInventory()
  await testAnalytics()

  await cleanup()
  summary()

  process.exit(results.some(r => !r.passed) ? 1 : 0)
}

main().catch(e => {
  console.error(`${R}Error fatal:${X}`, e)
  process.exit(1)
})
