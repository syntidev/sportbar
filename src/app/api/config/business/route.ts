import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// ── Keys gestionados por este endpoint ───────────────────────────────────────

export const BUSINESS_KEYS = [
  'business_name',
  'business_subtitle',
  'business_rif',
  'business_phone',
  'business_address',
  'business_city',
  'business_logo_url',
  'ticket_footer',
  'ticket_show_bs',
  'ticket_width_mm',
  'event_name',
  'event_venue',
] as const

export type BusinessKey = (typeof BUSINESS_KEYS)[number]

const DEFAULTS: Record<BusinessKey, string> = {
  business_name:     'Sport Bar',
  business_subtitle: 'Guaiqueríes de Margarita',
  business_rif:      '',
  business_phone:    '',
  business_address:  '',
  business_city:     'Margarita, Venezuela',
  business_logo_url: '',
  ticket_footer:     'Gracias por su visita',
  ticket_show_bs:    'true',
  ticket_width_mm:   '58',
  event_name:        '',
  event_venue:       '',
}

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
      profile[key] = stored[key] ?? DEFAULTS[key]
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
