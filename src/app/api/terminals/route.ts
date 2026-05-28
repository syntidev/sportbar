import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const CreateTerminalSchema = z.object({
  method:            z.enum(['pos_debit', 'pos_credit', 'biopago']),
  bank_name:         z.string().trim().min(1).max(100),
  serial:            z.string().trim().max(50).optional(),
  commercial_number: z.string().trim().max(50).optional(),
  is_active:         z.boolean().optional(),
})

export async function GET() {
  try {
    const terminals = await prisma.terminal.findMany({
      orderBy: { bank_name: 'asc' },
    })
    return NextResponse.json({ success: true, terminals })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al obtener terminales' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = CreateTerminalSchema.safeParse(body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    return NextResponse.json({ success: false, errors }, { status: 422 })
  }

  try {
    const terminal = await prisma.terminal.create({ data: parsed.data })
    return NextResponse.json({ success: true, terminal }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al crear terminal' }, { status: 500 })
  }
}
