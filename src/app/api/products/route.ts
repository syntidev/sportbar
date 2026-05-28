import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const all      = req.nextUrl.searchParams.get('all') === 'true'
    const products = await prisma.product.findMany({
      where:   all ? undefined : { is_active: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id:          true,
        name:        true,
        description: true,
        price_usd:   true,
        category:    true,
        image_url:   true,
        is_active:   true,
      },
    })

    return NextResponse.json({ success: true, products })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al obtener productos' },
      { status: 500 },
    )
  }
}
