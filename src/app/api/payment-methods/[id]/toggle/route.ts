import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function allMethods() {
  return prisma.paymentMethod.findMany({ orderBy: { sort_order: 'asc' } })
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })

  try {
    const current = await prisma.paymentMethod.findUnique({
      where:  { id },
      select: { is_active: true },
    })
    if (!current) {
      return NextResponse.json({ success: false, error: 'Método no encontrado' }, { status: 404 })
    }
    await prisma.paymentMethod.update({
      where: { id },
      data:  { is_active: !current.is_active },
    })
    return NextResponse.json({ success: true, methods: await allMethods() })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al cambiar estado' }, { status: 500 })
  }
}
