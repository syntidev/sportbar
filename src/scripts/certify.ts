/**
 * CafeBall — Suite de Certificación de API
 * Ejecutar: npx ts-node src/scripts/certify.ts
 * Opcional: CERTIFY_URL=http://localhost:3001 npx ts-node src/scripts/certify.ts
 */

// Make this file a module (required by isolatedModules default behavior)
export {}

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL: string = (process.env.CERTIFY_URL ?? 'http://localhost:3000').replace(/\/$/, '')

// ── ANSI colors ───────────────────────────────────────────────────────────────

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
}

function green(s: string)  { return `${C.green}${s}${C.reset}` }
function red(s: string)    { return `${C.red}${s}${C.reset}` }
function dim(s: string)    { return `${C.dim}${s}${C.reset}` }
function bold(s: string)   { return `${C.bold}${s}${C.reset}` }
function cyan(s: string)   { return `${C.cyan}${s}${C.reset}` }
function gray(s: string)   { return `${C.gray}${s}${C.reset}` }

function hr() { return '─'.repeat(52) }

// ── Mutable state shared across tests ────────────────────────────────────────

const S = {
  cookie:    '' as string,   // cafeball_session cookie from test 1
  userId:    0  as number,   // admin user id
  productId: 0  as number,   // first active product id
  orderId:   0  as number,   // order created in test 3, bumped in test 5
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?:   unknown
  cookie?: boolean   // attach session cookie (default true)
}

async function api(path: string, opts: ApiOptions = {}): Promise<Response> {
  const { method = 'GET', body, cookie = true } = opts
  const headers: Record<string, string> = {}

  if (body !== undefined)         headers['Content-Type'] = 'application/json'
  if (cookie && S.cookie)         headers['Cookie']       = S.cookie

  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

function extractCookie(res: Response): string {
  // Node's fetch exposes set-cookie as a single combined header in some versions
  const raw = res.headers.get('set-cookie') ?? ''
  const m   = raw.match(/cafeball_session=[^;]+/)
  return m ? m[0] : ''
}

// ── Test runner ───────────────────────────────────────────────────────────────

interface TestResult {
  id:       number
  desc:     string
  expected: string
  actual:   string
  pass:     boolean
  errMsg?:  string
}

const RESULTS: TestResult[] = []

async function runTest(
  id:          number,
  desc:        string,
  expected:    string,
  fn:          () => Promise<{ pass: boolean; actual: string }>,
): Promise<boolean> {
  const prefix = `  ${dim(`TEST ${id}/8`)}  `
  process.stdout.write(`\n${prefix}${bold(desc)}\n`)
  process.stdout.write(`  ${gray('├── Esperado:  ')}${dim(expected)}\n`)

  let pass    = false
  let actual  = ''
  let errMsg: string | undefined

  try {
    const r = await fn()
    pass   = r.pass
    actual = r.actual
  } catch (e: unknown) {
    pass   = false
    actual = 'Error de conexión al servidor'
    errMsg = e instanceof Error ? e.message : String(e)
  }

  const mark   = pass ? green('✓ PASS') : red('✗ FAIL')
  const actStr = pass ? green(actual)   : red(actual)

  process.stdout.write(`  ${gray('├── Resultado: ')}${actStr}\n`)
  if (errMsg) process.stdout.write(`  ${gray('│             ')}${red(`↳ ${errMsg}`)}\n`)
  process.stdout.write(`  ${gray('└── ')}${mark}\n`)

  RESULTS.push({ id, desc, expected, actual, pass, errMsg })
  return pass
}

// ── Setup: resolve IDs from seed data ────────────────────────────────────────

async function setup(): Promise<void> {
  // Resolve a valid product ID
  try {
    const res  = await api('/api/products', { cookie: false })
    if (res.ok) {
      const d = await res.json() as { success?: boolean; products?: Array<{ id: number; price_usd: number }> }
      if (d.success && d.products?.length) {
        S.productId = d.products[0].id
      }
    }
  } catch { /* setup is best-effort; fallback = 1 */ }

  // Resolve a valid user ID (try admin user)
  try {
    const res = await api('/api/users', { cookie: false })
    if (res.ok) {
      const d = await res.json() as { success?: boolean; users?: Array<{ id: number; role: string }> }
      if (d.success && d.users?.length) {
        const admin = d.users.find((u) => u.role === 'admin') ?? d.users[0]
        S.userId = admin.id
      }
    }
  } catch { /* fallback = 1 */ }
}

// ── Test implementations ──────────────────────────────────────────────────────

// TEST 1 — Auth: PIN correcto → 200 + cookie ──────────────────────────────────

async function t1_authOk(): Promise<{ pass: boolean; actual: string }> {
  const res  = await api('/api/auth/session', {
    method: 'POST',
    body:   { code: 'ADM-001', pin: '1234' },
    cookie: false,
  })
  const data = await res.json() as { success?: boolean; user?: { id?: number } }

  const cookie    = extractCookie(res)
  const hasCookie = cookie.includes('cafeball_session=')

  if (hasCookie)       S.cookie = cookie
  if (data.user?.id)   S.userId = data.user.id

  const pass = res.status === 200 && data.success === true && hasCookie
  return {
    pass,
    actual: `HTTP ${res.status}  success=${data.success}  cookie=${hasCookie}`,
  }
}

// TEST 2 — Auth: PIN incorrecto → 401 ─────────────────────────────────────────

async function t2_authFail(): Promise<{ pass: boolean; actual: string }> {
  const res  = await api('/api/auth/session', {
    method: 'POST',
    body:   { code: 'ADM-001', pin: '0000' },
    cookie: false,
  })
  const data = await res.json() as { success?: boolean }

  const pass = res.status === 401 && data.success === false
  return {
    pass,
    actual: `HTTP ${res.status}  success=${data.success}`,
  }
}

// TEST 3 — Orders: POST payload válido → 201 + código LOC/PUB ─────────────────

async function t3_orderCreate(): Promise<{ pass: boolean; actual: string }> {
  const productId = S.productId || 1
  const createdBy = S.userId    || 1

  const res = await api('/api/orders', {
    method: 'POST',
    body: {
      origin:            'LOC',
      created_by:        createdBy,
      customer_name:     'Certify',
      customer_lastname: 'Test',
      customer_id:       '99999999',
      zone:              'Norte',
      seat:              'CERT-1',
      items: [
        { product_id: productId, qty: 1, price_usd: 7.00 },
      ],
    },
  })
  const data = await res.json() as { success?: boolean; order?: { id?: number; code?: string } }

  if (data.order?.id) S.orderId = data.order.id

  const code      = data.order?.code ?? ''
  const validCode = /^(LOC|PUB)-\d+$/.test(code)
  const pass      = res.status === 201 && data.success === true && validCode

  return {
    pass,
    actual: `HTTP ${res.status}  code=${code || '(missing)'}`,
  }
}

// TEST 4 — Orders: POST sin items → 400 ───────────────────────────────────────

async function t4_orderNoItems(): Promise<{ pass: boolean; actual: string }> {
  const res = await api('/api/orders', {
    method: 'POST',
    body: {
      origin:            'LOC',
      created_by:        S.userId || 1,
      customer_name:     'Test',
      customer_lastname: 'NoItems',
      zone:              'Norte',
      items:             [],          // violates min(1) validation
    },
  })
  const data = await res.json() as { success?: boolean }

  const pass = res.status === 400 && data.success === false
  return {
    pass,
    actual: `HTTP ${res.status}  success=${data.success}`,
  }
}

// TEST 5 — KDS: Bump avanza kitchen_status ────────────────────────────────────

async function t5_kdsBump(): Promise<{ pass: boolean; actual: string }> {
  if (!S.orderId) {
    return { pass: false, actual: 'sin order_id (test 3 falló)' }
  }

  const res  = await api('/api/kds/bump', {
    method: 'POST',
    body:   { order_id: S.orderId, actor_code: 'ADM-001' },
  })
  const data = await res.json() as { success?: boolean; order?: { kitchen_status?: string } }

  const newStatus = data.order?.kitchen_status ?? ''
  const advanced  = ['PREP', 'LISTO', 'ENTREGADO'].includes(newStatus)
  const pass      = res.status === 200 && data.success === true && advanced

  return {
    pass,
    actual: `HTTP ${res.status}  kitchen_status=${newStatus || '(missing)'}`,
  }
}

// TEST 6 — Currency: GET /api/currency → 200 + rate number ────────────────────

async function t6_currency(): Promise<{ pass: boolean; actual: string }> {
  const res  = await api('/api/currency')
  const data = await res.json() as { success?: boolean; rate?: unknown; source?: string }

  const rateOk = typeof data.rate === 'number' && data.rate > 0
  const pass   = res.status === 200 && rateOk

  return {
    pass,
    actual: `HTTP ${res.status}  rate=${rateOk ? data.rate : `(${typeof data.rate})`}  source=${data.source ?? '?'}`,
  }
}

// TEST 7 — Venues: GET /api/venues → 200 + array ──────────────────────────────

async function t7_venues(): Promise<{ pass: boolean; actual: string }> {
  const res  = await api('/api/venues')
  const data = await res.json() as { success?: boolean; venues?: unknown[] }

  const isArray = Array.isArray(data.venues)
  const count   = isArray ? data.venues!.length : -1
  const pass    = res.status === 200 && data.success === true && isArray

  return {
    pass,
    actual: `HTTP ${res.status}  venues=${isArray ? `[${count}]` : `(${typeof data.venues})`}`,
  }
}

// TEST 8 — Turno: GET /api/turno → 200 + is_active boolean ───────────────────

async function t8_turno(): Promise<{ pass: boolean; actual: string }> {
  const res  = await api('/api/turno')
  const data = await res.json() as { success?: boolean; turno?: { is_active?: unknown } }

  const isBool = typeof data.turno?.is_active === 'boolean'
  const pass   = res.status === 200 && data.success === true && isBool

  return {
    pass,
    actual: `HTTP ${res.status}  is_active=${isBool ? data.turno!.is_active : `(${typeof data.turno?.is_active})`}`,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const separator = hr()

  // ── Header ─────────────────────────────────────────────────────────────────
  console.log(`\n  ${cyan(separator)}`)
  console.log(`  ${bold('CafeBall API · Suite de Certificación')}`)
  console.log(`  ${dim(BASE_URL)}`)
  console.log(`  ${cyan(separator)}`)

  // ── Setup ──────────────────────────────────────────────────────────────────
  process.stdout.write(`\n  ${dim('Preparando fixtures…')}`)
  await setup()
  console.log(` ${gray(`userId=${S.userId}  productId=${S.productId}`)}`)

  // ── Run 8 tests ────────────────────────────────────────────────────────────
  await runTest(1, 'Auth · PIN correcto',          '200 + cookie cafeball_session',    t1_authOk)
  await runTest(2, 'Auth · PIN incorrecto',         '401 + success: false',             t2_authFail)
  await runTest(3, 'Orders · POST payload válido',  '201 + code LOC-XXXXX',             t3_orderCreate)
  await runTest(4, 'Orders · POST sin items',       '400 + success: false',             t4_orderNoItems)
  await runTest(5, 'KDS · Bump estado avanza',      '200 + kitchen_status=PREP',        t5_kdsBump)
  await runTest(6, 'Currency · Tasa BCV',           '200 + rate (number > 0)',          t6_currency)
  await runTest(7, 'Venues · GET lista',            '200 + venues (array)',             t7_venues)
  await runTest(8, 'Turno · Estado del turno',      '200 + is_active (boolean)',        t8_turno)

  // ── Summary ────────────────────────────────────────────────────────────────
  const passed  = RESULTS.filter((r) => r.pass).length
  const total   = RESULTS.length
  const allPass = passed === total

  console.log(`\n  ${cyan(separator)}`)

  if (allPass) {
    console.log(`  ${green(`✓ ${passed}/${total} tests pasaron`)}`)
  } else {
    console.log(`  ${red(`✗ ${passed}/${total} tests pasaron · ${total - passed} fallaron`)}`)
    console.log()
    for (const r of RESULTS.filter((x) => !x.pass)) {
      console.log(`  ${red(`✗ TEST ${r.id}`)}  ${dim(r.desc)}`)
      console.log(`    ${gray('Esperado: ')}${dim(r.expected)}`)
      console.log(`    ${gray('Obtenido: ')}${red(r.actual)}`)
      if (r.errMsg) console.log(`    ${red(r.errMsg)}`)
    }
  }

  console.log(`  ${cyan(separator)}\n`)
  process.exit(allPass ? 0 : 1)
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e)
  // Friendly message when the server isn't running
  if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
    console.error(`\n  ${red('Error: El servidor no está en ejecución')}`)
    console.error(`  ${dim(`Asegúrate de correr: npm run dev  (${BASE_URL})`)}`)
  } else {
    console.error(`\n  ${red(`Error fatal: ${msg}`)}`)
  }
  console.error()
  process.exit(1)
})
