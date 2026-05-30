import { prisma } from '@/lib/prisma'

interface DolarApiEntry {
  fuente:             string
  nombre:             string
  promedio:           number
  promedioPonderado:  number
  fechaActualizacion: string
  tipo:               string
}

export async function fetchBCVRate(): Promise<{ rate: number; updated_at: string }> {
  const res = await fetch('https://ve.dolarapi.com/v1/dolares', {
    cache:   'no-store',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) throw new Error(`dolarapi HTTP ${res.status}`)

  const data = (await res.json()) as DolarApiEntry[]
  const oficial = data.find((d) => d.tipo === 'oficial')
  if (!oficial) throw new Error('tipo:oficial no encontrado en dolarapi')

  const rate = oficial.promedio
  const now  = new Date()

  await prisma.$transaction([
    prisma.dollarRate.updateMany({
      where: { is_active: true },
      data:  { is_active: false, effective_until: now },
    }),
    prisma.dollarRate.create({
      data: { rate, source: 'bcv', is_active: true, effective_from: now },
    }),
  ])

  return { rate, updated_at: now.toISOString() }
}
