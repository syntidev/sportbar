# CafeBall M1 - Setup archivos base
# Ejecutar desde C:\laragon\www\cafeball\

Write-Host "CafeBall M1 -- Creando archivos..." -ForegroundColor Cyan

Set-Content -Path 'src\lib\prisma.ts' -Value @'
import { PrismaClient } from ''@/generated/prisma''

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === ''development'' ? [''error'', ''warn''] : [''error''],
  })

if (process.env.NODE_ENV !== ''production'') globalForPrisma.prisma = prisma

'@ -Encoding UTF8
Write-Host 'OK src\lib\prisma.ts' -ForegroundColor Green

Set-Content -Path 'src\lib\currency.ts' -Value @'
import { prisma } from ''./prisma''

export async function getCurrentRate(): Promise<number> {
  try {
    const rate = await prisma.dollarRate.findFirst({
      where: { is_active: true },
      orderBy: { effective_from: ''desc'' },
    })
    return rate ? Number(rate.rate) : 40.0
  } catch {
    return 40.0
  }
}

export function calcBs(priceUsd: number, rate: number): number {
  return Math.round(priceUsd * rate * 100) / 100
}

export function formatRef(amount: number): string {
  return ''REF '' + amount.toFixed(2)
}

export function formatBs(amount: number): string {
  return ''Bs. '' + amount.toFixed(2)
}

'@ -Encoding UTF8
Write-Host 'OK src\lib\currency.ts' -ForegroundColor Green

Set-Content -Path 'src\lib\ticket.ts' -Value @'
import { prisma } from ''./prisma''

export async function generateTicketCode(origin: ''PUB'' | ''LOC''): Promise<string> {
  const counter = await prisma.ticketCounter.upsert({
    where: { prefix: origin },
    update: { last: { increment: 1 } },
    create: { prefix: origin, last: 1 },
  })
  return origin + ''-'' + String(counter.last).padStart(5, ''0'')
}

'@ -Encoding UTF8
Write-Host 'OK src\lib\ticket.ts' -ForegroundColor Green

Set-Content -Path 'src\lib\kds-router.ts' -Value @'
export type KdsDestination = ''cocina'' | ''bar'' | ''both''

export function getKdsDestination(categories: string[]): KdsDestination {
  const hasFood = categories.some(c => c === ''hamburguesas'' || c === ''raciones'')
  const hasDrinks = categories.some(c => c === ''bebidas'')
  if (hasFood && hasDrinks) return ''both''
  if (hasFood) return ''cocina''
  return ''bar''
}

'@ -Encoding UTF8
Write-Host 'OK src\lib\kds-router.ts' -ForegroundColor Green

Set-Content -Path 'src\lib\supabase.ts' -Value @'
import { createClient } from ''@supabase/supabase-js''

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

'@ -Encoding UTF8
Write-Host 'OK src\lib\supabase.ts' -ForegroundColor Green

Set-Content -Path 'src\app\api\orders\route.ts' -Value @'
import { NextRequest, NextResponse } from ''next/server''
import { prisma } from ''@/lib/prisma''
import { getCurrentRate, calcBs } from ''@/lib/currency''
import { generateTicketCode } from ''@/lib/ticket''

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get(''status'')
    const zone = searchParams.get(''zone'')

    const orders = await prisma.order.findMany({
      where: {
        ...(status && { kitchen_status: status as any }),
        ...(zone && { zone: zone as any }),
      },
      include: {
        items: { include: { product: true } },
        user: { select: { code: true, name: true } },
        validation: true,
      },
      orderBy: { created_at: ''desc'' },
      take: 100,
    })

    return NextResponse.json({ success: true, orders })
  } catch (error) {
    return NextResponse.json({ success: false, error: ''Error al obtener ordenes'' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      origin, created_by, customer_name, customer_lastname,
      customer_id, zone, seat, note, items,
    } = body

    if (!origin || !created_by || !customer_name || !zone || !items?.length) {
      return NextResponse.json({ success: false, error: ''Campos requeridos faltantes'' }, { status: 400 })
    }

    const rate = await getCurrentRate()
    const code = await generateTicketCode(origin)
    const total_usd = items.reduce((sum: number, item: any) => sum + item.price_usd * item.qty, 0)
    const total_bs = calcBs(total_usd, rate)

    const order = await prisma.order.create({
      data: {
        code, origin, zone, seat, customer_name, customer_lastname,
        customer_id, note, total_usd, rate_used: rate, total_bs,
        created_by,
        items: {
          create: items.map((item: any) => ({
            product_id: item.product_id,
            qty: item.qty,
            price_usd: item.price_usd,
            subtotal: item.price_usd * item.qty,
          })),
        },
        logs: {
          create: {
            action: ''CREATED'',
            to_state: ''NUEVO'',
            actor_code: ''USR-'' + String(created_by).padStart(3, ''0''),
          },
        },
      },
      include: { items: { include: { product: true } } },
    })

    return NextResponse.json({ success: true, order }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: ''Error al crear orden'' }, { status: 500 })
  }
}

'@ -Encoding UTF8
Write-Host 'OK src\app\api\orders\route.ts' -ForegroundColor Green

Set-Content -Path 'src\app\api\auth\pin\route.ts' -Value @'
import { NextRequest, NextResponse } from ''next/server''
import { prisma } from ''@/lib/prisma''
import bcrypt from ''bcryptjs''

export async function POST(req: NextRequest) {
  try {
    const { code, pin } = await req.json()

    if (!code || !pin) {
      return NextResponse.json({ success: false, error: ''Codigo y PIN requeridos'' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { code, is_active: true } })

    if (!user) {
      return NextResponse.json({ success: false, error: ''Usuario no encontrado'' }, { status: 404 })
    }

    const valid = await bcrypt.compare(pin, user.pin)

    if (!valid) {
      return NextResponse.json({ success: false, error: ''PIN incorrecto'' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, code: user.code, name: user.name, lastname: user.lastname, role: user.role },
    })
  } catch {
    return NextResponse.json({ success: false, error: ''Error del servidor'' }, { status: 500 })
  }
}

'@ -Encoding UTF8
Write-Host 'OK src\app\api\auth\pin\route.ts' -ForegroundColor Green

Set-Content -Path 'src\app\api\currency\route.ts' -Value @'
import { NextResponse } from ''next/server''
import { getCurrentRate } from ''@/lib/currency''

export async function GET() {
  try {
    const rate = await getCurrentRate()
    return NextResponse.json({ success: true, rate })
  } catch {
    return NextResponse.json({ success: false, rate: 40.0 })
  }
}

'@ -Encoding UTF8
Write-Host 'OK src\app\api\currency\route.ts' -ForegroundColor Green

Set-Content -Path 'src\app\api\kds\bump\route.ts' -Value @'
import { NextRequest, NextResponse } from ''next/server''
import { prisma } from ''@/lib/prisma''

const STATUS_FLOW: Record<string, string> = {
  NUEVO: ''PREP'',
  PREP: ''LISTO'',
  LISTO: ''ENTREGADO'',
}

export async function POST(req: NextRequest) {
  try {
    const { order_id, actor_code } = await req.json()

    if (!order_id || !actor_code) {
      return NextResponse.json({ success: false, error: ''order_id y actor_code requeridos'' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { id: order_id } })

    if (!order) {
      return NextResponse.json({ success: false, error: ''Orden no encontrada'' }, { status: 404 })
    }

    const next = STATUS_FLOW[order.kitchen_status]
    if (!next) {
      return NextResponse.json({ success: false, error: ''Orden ya entregada'' }, { status: 400 })
    }

    const updated = await prisma.order.update({
      where: { id: order_id },
      data: {
        kitchen_status: next as any,
        logs: {
          create: {
            action: ''STATUS_CHANGE'',
            from_state: order.kitchen_status,
            to_state: next,
            actor_code,
          },
        },
      },
    })

    return NextResponse.json({ success: true, order: updated })
  } catch {
    return NextResponse.json({ success: false, error: ''Error al actualizar estado'' }, { status: 500 })
  }
}

'@ -Encoding UTF8
Write-Host 'OK src\app\api\kds\bump\route.ts' -ForegroundColor Green

Set-Content -Path 'src\styles\tokens.css' -Value @'
:root {
  --color-primary: #2E7D32;
  --color-primary-light: #4CAF50;
  --color-accent: #C62828;
  --color-brand: #F5A623;
  --color-brand-warm: #8B6914;
  --color-bg: #0a0a0a;
  --color-surface: #111411;
  --color-surface-2: #1a1f1a;
  --color-surface-3: #222822;
  --color-border: rgba(46, 125, 50, 0.25);
  --color-border-strong: rgba(46, 125, 50, 0.5);
  --color-text: #f0f5f0;
  --color-text-muted: rgba(240, 245, 240, 0.5);
  --color-text-subtle: rgba(240, 245, 240, 0.3);
  --color-nuevo: #F5A623;
  --color-prep: #2E7D32;
  --color-listo: #4CAF50;
  --color-entregado: rgba(240, 245, 240, 0.2);
  --color-pagado: #4CAF50;
  --color-credito: #7C4DFF;
  --color-pendiente: #F5A623;
  --color-cancelado: #C62828;
  --font-sans: ''Inter'', system-ui, sans-serif;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 20px;
  --radius-full: 9999px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.5);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.6);
  --shadow-glow: 0 0 20px rgba(46,125,50,0.3);
  --touch-min: 44px;
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;
}

'@ -Encoding UTF8
Write-Host 'OK src\styles\tokens.css' -ForegroundColor Green

Set-Content -Path 'prisma\seed.ts' -Value @'
import { PrismaClient } from ''../src/generated/prisma''
import bcrypt from ''bcryptjs''

const prisma = new PrismaClient()

async function main() {
  console.log(''Seeding CafeBall...'')

  await prisma.ticketCounter.upsert({ where: { prefix: ''PUB'' }, update: {}, create: { prefix: ''PUB'', last: 0 } })
  await prisma.ticketCounter.upsert({ where: { prefix: ''LOC'' }, update: {}, create: { prefix: ''LOC'', last: 0 } })
  console.log(''OK Ticket counters'')

  await prisma.user.upsert({
    where: { code: ''ADM-001'' },
    update: {},
    create: { code: ''ADM-001'', name: ''Daniel'', lastname: ''Cheein'', pin: await bcrypt.hash(''1234'', 10), role: ''admin'' },
  })
  console.log(''OK Admin Daniel'')

  await prisma.user.upsert({
    where: { code: ''USR-001'' },
    update: {},
    create: { code: ''USR-001'', name: ''Demo'', lastname: ''Mesero'', pin: await bcrypt.hash(''1234'', 10), role: ''mesero'' },
  })
  console.log(''OK Mesero demo'')

  const products = [
    { name: ''La Clasica'', description: ''120g carne, queso, tocineta, rucula, tomate, salsa'', price_usd: 7.00, category: ''hamburguesas'' },
    { name: ''Pollo Crispy'', description: ''60g pollo, queso, tocineta, rucula, tomate, salsa'', price_usd: 7.00, category: ''hamburguesas'' },
    { name: ''La Mini'', description: ''80g carne, queso, tocineta y salsa'', price_usd: 3.00, category: ''hamburguesas'' },
    { name: ''Adicional carne o pollo'', description: ''Extra de carne o pollo'', price_usd: 3.00, category: ''hamburguesas'' },
    { name: ''Papas Fritas'', description: ''Porcion estandar'', price_usd: 3.50, category: ''raciones'' },
    { name: ''Papas con Queso y Tocineta'', description: ''Papas fritas con queso fundido y tocineta'', price_usd: 7.00, category: ''raciones'' },
    { name: ''Tequenos'', description: ''Recien fritos, queso derretido'', price_usd: 5.00, category: ''raciones'' },
    { name: ''5 Nuggets con Papas'', description: ''Nuggets de pollo con papas fritas'', price_usd: 5.00, category: ''raciones'' },
    { name: ''Brownie'', description: ''Postre de chocolate'', price_usd: 5.00, category: ''raciones'' },
    { name: ''Refresco'', description: ''Pepsi, Seven Up u otra'', price_usd: 1.50, category: ''bebidas'' },
    { name: ''Agua'', description: ''500ml'', price_usd: 1.00, category: ''bebidas'' },
    { name: ''Agua Gasificada'', description: ''Con gas'', price_usd: 2.00, category: ''bebidas'' },
    { name: ''Lipton'', description: ''Te helado'', price_usd: 2.00, category: ''bebidas'' },
    { name: ''Gatorade'', description: ''Hidratante deportivo'', price_usd: 3.00, category: ''bebidas'' },
    { name: ''Malta'', description: ''Malta Polar'', price_usd: 1.00, category: ''bebidas'' },
  ]

  for (const p of products) {
    await prisma.product.create({ data: p as any }).catch(() => {})
  }
  console.log(''OK 15 productos del menu'')

  await prisma.dollarRate.create({
    data: { rate: 50.00, source: ''manual-inicial'', is_active: true },
  }).catch(() => {})
  console.log(''OK Tasa BCV inicial'')

  console.log(''Seed completado!'')
}

main().catch(console.error).finally(() => prisma.$disconnect())

'@ -Encoding UTF8
Write-Host 'OK prisma\seed.ts' -ForegroundColor Green


# Agregar seed config a package.json
$pkgPath = 'package.json'
$pkg = Get-Content $pkgPath -Raw
if ($pkg -notmatch '"prisma"') {
    $pkg = $pkg -replace '("scripts")', '"prisma": { "seed": "ts-node prisma/seed.ts" },`n  $1'
    Set-Content $pkgPath $pkg -Encoding UTF8
    Write-Host 'OK package.json actualizado' -ForegroundColor Green
}


Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CafeBall M1 completado!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROXIMO PASO:" -ForegroundColor Yellow
Write-Host "  npm install -D ts-node" -ForegroundColor White
Write-Host "  npx prisma db seed" -ForegroundColor White