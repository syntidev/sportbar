import { prisma } from '@/lib/prisma'

// Retorna venue_destino_id para la zona dada, o null si no hay venue activo asignado.
// Lógica: zona → VenueZone[] → si uno, directo; si varios, balanceo por carga activa.
export async function routeOrder(zoneName: string): Promise<number | null> {
  // 1. Buscar zona por nombre en tabla zones
  const zone = await prisma.zone.findUnique({
    where:  { name: zoneName },
    select: { id: true, is_active: true },
  })

  // 2. No existe o inactiva → null (fallback a venue principal)
  if (!zone || !zone.is_active) return null

  // 3. Buscar VenueZones donde zone_id = zona.id AND venue.is_active = true
  const venueZones = await prisma.venueZone.findMany({
    where: {
      zone_id: zone.id,
      venue:   { is_active: true },
    },
    select: { venue_id: true },
  })

  // 6. Ninguno → null
  if (venueZones.length === 0) return null

  // 4. Uno solo → retorna venue_id directamente
  if (venueZones.length === 1) return venueZones[0].venue_id

  // 5. Múltiples → venue con menor cantidad de órdenes activas
  const venueIds = venueZones.map(vz => vz.venue_id)

  const loads = await Promise.all(
    venueIds.map(venueId =>
      prisma.order.count({
        where: {
          venue_destino_id: venueId,
          payment_status:   { notIn: ['PAID', 'CANCELLED'] },
        },
      })
    )
  )

  const minIdx = loads.indexOf(Math.min(...loads))
  return venueIds[minIdx]
}
