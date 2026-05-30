import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now     = new Date()
    const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)

    const [visitasHoy, visitas7d, qrScans7d, ordenesPub7d] = await Promise.all([
      prisma.analyticsEvent.count({
        where: { event_type: 'page_view', created_at: { gte: today } },
      }),
      prisma.analyticsEvent.count({
        where: { event_type: 'page_view', created_at: { gte: weekAgo } },
      }),
      prisma.analyticsEvent.count({
        where: { event_type: 'qr_scan', created_at: { gte: weekAgo } },
      }),
      prisma.analyticsEvent.count({
        where: { event_type: 'order_placed', created_at: { gte: weekAgo } },
      }),
    ])

    // Last 7 days per-day counts
    const last7Days = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const dayStart = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
        const dayEnd   = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
        return prisma.analyticsEvent
          .count({ where: { event_type: 'page_view', created_at: { gte: dayStart, lt: dayEnd } } })
          .then(count => ({
            date: dayStart.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric' }),
            visitors: count,
          }))
      }),
    )

    // Zone distribution
    const zoneRaw = await prisma.analyticsEvent.groupBy({
      by:    ['zone'],
      where: { event_type: 'page_view', created_at: { gte: weekAgo }, zone: { not: null } },
      _count: { id: true },
    })
    const zoneData = zoneRaw.map(r => ({ zone: r.zone ?? 'Desconocida', count: r._count.id }))

    return NextResponse.json({
      success: true,
      data: {
        visitas_hoy:    visitasHoy,
        visitas_7d:     visitas7d,
        qr_scans_7d:    qrScans7d,
        ordenes_pub_7d: ordenesPub7d,
        last_7_days:    last7Days,
        zone_data:      zoneData,
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 })
  }
}
