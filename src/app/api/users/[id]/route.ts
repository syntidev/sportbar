import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const PatchSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('toggle'), is_active: z.boolean() }),
  z.object({ op: z.literal('pin'),    pin: z.string().regex(/^\d{4}$/, 'PIN debe ser 4 dígitos numéricos') }),
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = parseInt(params.id, 10)
  if (isNaN(id)) {
    return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 422 },
    )
  }

  try {
    if (parsed.data.op === 'toggle') {
      const user = await prisma.user.update({
        where:  { id },
        data:   { is_active: parsed.data.is_active },
        select: { id: true, is_active: true },
      })
      return NextResponse.json({ success: true, user })
    }

    // op === 'pin'
    const hashedPin = await bcrypt.hash(parsed.data.pin, 10)
    await prisma.user.update({
      where: { id },
      data:  { pin: hashedPin },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar usuario' }, { status: 500 })
  }
}
