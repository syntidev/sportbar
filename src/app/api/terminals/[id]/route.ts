import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const UpdateSchema = z.object({
  method:            z.enum(['pos_debit', 'pos_credit', 'biopago']),
  bank_name:         z.string().min(1, 'Banco requerido').max(100),
  serial:            z.string().max(50).optional(),
  commercial_number: z.string().max(50).optional(),
  is_active:         z.boolean().optional(),
})

function allTerminals() {
  return prisma.terminal.findMany({ orderBy: { id: 'asc' } })
}

function parseId(raw: string) {
  const id = parseInt(raw, 10)
  return isNaN(id) ? null : id
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = parseId(params.id)
  if (!id) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 })
  }

  try {
    await prisma.terminal.update({
      where: { id },
      data: {
        method:            parsed.data.method,
        bank_name:         parsed.data.bank_name,
        serial:            parsed.data.serial            ?? null,
        commercial_number: parsed.data.commercial_number ?? null,
        is_active:         parsed.data.is_active         ?? true,
      },
    })
    return NextResponse.json({ success: true, terminals: await allTerminals() })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar terminal' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = parseId(params.id)
  if (!id) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })

  try {
    await prisma.terminal.delete({ where: { id } })
    return NextResponse.json({ success: true, terminals: await allTerminals() })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al eliminar terminal' }, { status: 500 })
  }
}
