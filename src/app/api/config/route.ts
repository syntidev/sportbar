import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const rows = await prisma.config.findMany()
    const config = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    return NextResponse.json({ success: true, config })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener configuración' }, { status: 500 })
  }
}

const PatchSchema = z.object({
  key:   z.string().min(1),
  value: z.string(),
})

export async function PATCH(req: NextRequest) {
  try {
    const body   = await req.json()
    const result = PatchSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.issues.map((i) => i.message) },
        { status: 400 },
      )
    }
    const { key, value } = result.data
    await prisma.config.upsert({
      where:  { key },
      create: { key, value },
      update: { value },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al guardar configuración' }, { status: 500 })
  }
}
