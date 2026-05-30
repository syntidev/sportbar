import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const Schema = z.object({
  event_type:  z.enum(['page_view', 'qr_scan', 'order_placed']),
  zone:        z.string().max(20).optional(),
  device_type: z.string().max(20).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json() as unknown
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ success: false }, { status: 422 })

    await prisma.analyticsEvent.create({
      data: {
        event_type:  parsed.data.event_type,
        zone:        parsed.data.zone        ?? null,
        device_type: parsed.data.device_type ?? null,
      },
    })
    return NextResponse.json({ success: true })
  } catch {
    // Silently succeed — tracking must never break UX
    return NextResponse.json({ success: true })
  }
}
