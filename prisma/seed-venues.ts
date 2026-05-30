import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const VENUES = [
  { name: 'SportBar Matriz', type: 'matriz'  as const },
  { name: 'Cocina',          type: 'cocina'  as const },
  { name: 'Quiosco 1',       type: 'quiosco' as const },
  { name: 'Quiosco 2',       type: 'quiosco' as const },
]

async function main() {
  console.log('Sincronizando venues (capabilities vacías — Daniel las configura en /admin/estructura):\n')

  for (const v of VENUES) {
    const existing = await prisma.venue.findFirst({ where: { name: v.name } })

    if (existing) {
      await prisma.venue.update({
        where: { id: existing.id },
        data:  { name: v.name, type: v.type, capabilities: [] },
      })
      console.log(`  UPD   id=${existing.id}  "${v.name}"  capabilities: []`)
    } else {
      const created = await prisma.venue.create({
        data: { name: v.name, type: v.type, capabilities: [], is_active: true },
      })
      console.log(`  NEW   id=${created.id}  "${v.name}"  capabilities: []`)
    }
  }

  console.log('\nListo.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
