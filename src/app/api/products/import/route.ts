import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const RowSchema = z.object({
  name:        z.string({ error: 'name es requerido' }).min(1, 'name no puede estar vacío').trim(),
  price_usd:   z.coerce.number({ error: 'price_usd inválido' }).positive('price_usd debe ser mayor a 0'),
  category:    z.enum(['hamburguesas', 'raciones', 'bebidas'], { error: 'category debe ser hamburguesas | raciones | bebidas' }),
  description: z.string().trim().optional(),
})

type ValidRow = z.infer<typeof RowSchema>

interface RowError {
  row:    number
  input:  unknown
  issues: string[]
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body JSON inválido' }, { status: 400 })
  }

  if (!Array.isArray(body)) {
    return NextResponse.json({ success: false, error: 'Se esperaba un array de filas' }, { status: 400 })
  }

  if (body.length === 0) {
    return NextResponse.json({ success: true, imported: 0, skipped: 0, errors: [] })
  }

  if (body.length > 500) {
    return NextResponse.json({ success: false, error: 'Máximo 500 filas por importación' }, { status: 400 })
  }

  // Validar cada fila
  const validRows: ValidRow[]  = []
  const rowErrors: RowError[]  = []

  for (let i = 0; i < body.length; i++) {
    const result = RowSchema.safeParse(body[i])
    if (result.success) {
      validRows.push(result.data)
    } else {
      rowErrors.push({
        row:    i + 1,
        input:  body[i],
        issues: result.error.issues.map((iss) => iss.message),
      })
    }
  }

  if (validRows.length === 0) {
    return NextResponse.json({ success: true, imported: 0, skipped: 0, errors: rowErrors })
  }

  // Pre-check nombres existentes para detectar duplicados semánticos
  const incomingNames = validRows.map((r) => r.name.toLowerCase())
  const existing = await prisma.product.findMany({
    where: { name: { in: validRows.map((r) => r.name) } },
    select: { name: true },
  })
  const existingNamesLower = new Set(existing.map((p) => p.name.toLowerCase()))

  const toInsert   = validRows.filter((r) => !existingNamesLower.has(r.name.toLowerCase()))
  const skippedAmt = validRows.length - toInsert.length

  if (toInsert.length === 0) {
    return NextResponse.json({ success: true, imported: 0, skipped: skippedAmt, errors: rowErrors })
  }

  const { count } = await prisma.product.createMany({
    data: toInsert.map((r) => ({
      name:        r.name,
      price_usd:   r.price_usd,
      category:    r.category,
      description: r.description ?? null,
    })),
    skipDuplicates: true,
  })

  return NextResponse.json({
    success:  true,
    imported: count,
    skipped:  skippedAmt + (toInsert.length - count), // skipped por nombre + skipped por BD
    errors:   rowErrors,
  })
}
