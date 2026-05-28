import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const CreateSchema = z.object({
  name:      z.string().min(1, 'Nombre requerido').max(80),
  type:      z.enum(['cash', 'transfer', 'mobile', 'biometric', 'other']),
  bank_name: z.string().max(100).nullable().optional(),
})

function allMethods() {
  return prisma.paymentMethod.findMany({ orderBy: { sort_order: 'asc' } })
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, methods: await allMethods() })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener métodos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 })
  }

  try {
    const agg = await prisma.paymentMethod.aggregate({ _max: { sort_order: true } })
    await prisma.paymentMethod.create({
      data: {
        name:       parsed.data.name,
        type:       parsed.data.type,
        bank_name:  parsed.data.bank_name ?? null,
        sort_order: (agg._max.sort_order ?? 0) + 1,
      },
    })
    return NextResponse.json({ success: true, methods: await allMethods() })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al crear método' }, { status: 500 })
  }
}
