import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PRODUCTS = [
  // ── Licores ──────────────────────────────────────────
  { name: 'Old Parr Botella',       category: 'licores',  price_usd: 0 },
  { name: 'Buchanan Botella',       category: 'licores',  price_usd: 0 },
  { name: 'Etiqueta Negra Botella', category: 'licores',  price_usd: 0 },
  { name: 'Black and White',        category: 'licores',  price_usd: 0 },
  { name: 'Buchanan 18 Años',       category: 'licores',  price_usd: 0 },
  { name: 'Ron 1796',               category: 'licores',  price_usd: 0 },

  // ── Cerveza ───────────────────────────────────────────
  { name: 'Cerveza',                category: 'cerveza',  price_usd: 1.25 },
  { name: 'Caroreña Lata',          category: 'cerveza',  price_usd: 0 },

  // ── Bebidas nuevas ────────────────────────────────────
  { name: 'Agua 1.5L',              category: 'bebidas',  price_usd: 0 },
  { name: 'Gatorade',               category: 'bebidas',  price_usd: 0 },
  { name: 'Té Lipton',              category: 'bebidas',  price_usd: 0 },
  { name: 'Sparkling',              category: 'bebidas',  price_usd: 0 },
]

async function main() {
  console.log('Insertando productos de Daniel...\n')

  let inserted = 0
  let skipped  = 0

  for (const p of PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { name: p.name },
      select: { id: true, name: true },
    })

    if (existing) {
      console.log(`  SKIP  "${p.name}"  (ya existe id=${existing.id})`)
      skipped++
      continue
    }

    const created = await prisma.product.create({
      data: {
        name:      p.name,
        category:  p.category,
        price_usd: p.price_usd,
        is_active: true,
      },
    })
    console.log(`  OK    id=${created.id}  [${p.category}]  "${p.name}"  REF ${p.price_usd.toFixed(2)}`)
    inserted++
  }

  console.log(`\n${inserted} insertados, ${skipped} omitidos.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
