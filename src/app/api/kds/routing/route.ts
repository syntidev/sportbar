import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const ROUTING_KEY = 'kds_routing'

export interface RoutingRule {
  category:    string
  destination: 'cocina' | 'bar' | 'matriz' | 'todos'
}

const DEFAULT_RULES: RoutingRule[] = [
  { category: 'hamburguesas', destination: 'cocina' },
  { category: 'raciones',     destination: 'cocina' },
  { category: 'bebidas',      destination: 'todos'  },
  { category: 'cerveza',      destination: 'todos'  },
]

async function getRules(): Promise<RoutingRule[]> {
  const row = await prisma.config.findUnique({ where: { key: ROUTING_KEY } })
  if (!row) return DEFAULT_RULES
  try {
    return JSON.parse(row.value) as RoutingRule[]
  } catch {
    return DEFAULT_RULES
  }
}

async function saveRules(rules: RoutingRule[]): Promise<void> {
  await prisma.config.upsert({
    where:  { key: ROUTING_KEY },
    create: { key: ROUTING_KEY, value: JSON.stringify(rules) },
    update: { value: JSON.stringify(rules) },
  })
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    return NextResponse.json({ success: true, rules: await getRules() })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al cargar routing' }, { status: 500 })
  }
}

// ── POST — agrega o actualiza una regla ───────────────────────────────────────

const PostSchema = z.object({
  category:    z.string().min(1).max(60).trim(),
  destination: z.enum(['cocina', 'bar', 'matriz', 'todos']),
})

export async function POST(req: NextRequest) {
  try {
    const result = PostSchema.safeParse(await req.json())
    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.issues.map((i) => i.message) },
        { status: 400 },
      )
    }
    const { category, destination } = result.data
    const rules = await getRules()
    const idx   = rules.findIndex((r) => r.category.toLowerCase() === category.toLowerCase())
    if (idx >= 0) {
      rules[idx] = { category, destination }
    } else {
      rules.push({ category, destination })
    }
    await saveRules(rules)
    return NextResponse.json({ success: true, rules })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al guardar routing' }, { status: 500 })
  }
}

// ── DELETE ?category=xxx ──────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const category = new URL(req.url).searchParams.get('category')
    if (!category) {
      return NextResponse.json({ success: false, error: 'Parámetro category requerido' }, { status: 400 })
    }
    const rules    = await getRules()
    const filtered = rules.filter((r) => r.category.toLowerCase() !== category.toLowerCase())
    await saveRules(filtered)
    return NextResponse.json({ success: true, rules: filtered })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al eliminar routing' }, { status: 500 })
  }
}
