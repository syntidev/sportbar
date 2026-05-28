import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  try {
    const body  = await req.json()
    const value = JSON.stringify(body)
    await prisma.config.upsert({
      where:  { key: 'payment_data' },
      create: { key: 'payment_data', value },
      update: { value },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al guardar datos de cobro' }, { status: 500 })
  }
}
