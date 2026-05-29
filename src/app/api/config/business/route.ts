import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { BUSINESS_KEYS, BUSINESS_DEFAULTS, type BusinessKey } from '@/lib/business-config'

// ── GET — devuelve todos los keys del perfil ─────────────────────────────────

export async function GET() {
  try {
    const rows = await prisma.config.findMany({
      where: { key: { in: [...BUSINESS_KEYS] } },
    })

    const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]))

    // Merge con defaults para keys no guardados aún
    const profile: Record<string, string> = {}
    for (const key of BUSINESS_KEYS) {
      profile[key] = stored[key] ?? BUSINESS_DEFAULTS[key]
    }

    return NextResponse.json({ success: true, profile })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al obtener perfil del negocio' },
      { status: 500 },
    )
  }
}

// ── PATCH — actualiza uno o varios keys ──────────────────────────────────────

const PatchSchema = z.record(z.string(), z.string()).refine(
  (obj) => Object.keys(obj).every((k) => (BUSINESS_KEYS as readonly string[]).includes(k)),
  { message: 'Key no permitida en este endpoint' },
)

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const result = PatchSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.issues.map((i) => i.message) },
        { status: 400 },
      )
    }

    const entries = Object.entries(result.data) as [BusinessKey, string][]

    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.config.upsert({
          where:  { key },
          create: { key, value },
          update: { value },
        }),
      ),
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al guardar perfil del negocio' },
      { status: 500 },
    )
  }
}
