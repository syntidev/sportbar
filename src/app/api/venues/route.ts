import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const CreateVenueSchema = z.object({
  name:            z.string().trim().min(2).max(100),
  type:            z.enum(['matriz', 'quiosco', 'cocina']),
  capabilities:    z.array(z.string().trim().min(1)).min(1),
  zona_geografica: z.record(z.string(), z.unknown()).optional(),
  is_active:       z.boolean().default(true),
})

export async function GET() {
  try {
    const venues = await prisma.venue.findMany({
      include: {
        _count:     { select: { users: true, venueZones: true } },
        venueZones: { select: { zone_id: true } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ success: true, venues })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener venues' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = CreateVenueSchema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }

    const { zona_geografica, ...rest } = result.data

    const venue = await prisma.venue.create({
      data: {
        ...rest,
        ...(zona_geografica !== undefined && {
          zona_geografica: zona_geografica as Prisma.InputJsonValue,
        }),
      },
      include: { _count: { select: { users: true } } },
    })

    return NextResponse.json({ success: true, venue }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al crear venue' }, { status: 500 })
  }
}
