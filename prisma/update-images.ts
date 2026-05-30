/**
 * prisma/update-images.ts
 * Actualiza image_url de todos los productos con fotos de Unsplash.
 * Correr con:  npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/update-images.ts
 * O bien:      npx tsx prisma/update-images.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Unsplash CDN: https://images.unsplash.com/photo-{id}?w=600&q=80&auto=format&fit=crop
const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&q=80&auto=format&fit=crop`

const IMAGE_MAP: Record<string, string> = {
  // ── Hamburguesas ──────────────────────────────────────────
  'La Clasica':              U('1568901346733-f422b5d81dcc'), // classic smash burger
  'Pollo Crispy':            U('1607013251379-e2e5b9af07e9'), // crispy chicken sandwich
  'La Mini':                 U('1553979459-d63b31b0e7e0'),   // mini slider
  'Adicional carne o pollo': U('1432139555190-58524dae6a55'), // grilled beef patty

  // ── Raciones ──────────────────────────────────────────────
  'Papas Fritas':              U('1573080496219-bb080dd4f877'), // golden fries
  'Papas con Queso y Tocineta': U('1548869258-03e27f45ff57'), // loaded fries cheese bacon
  'Tequenos':                  U('1589570399747-bb3ab65f9dc5'), // fried cheese rolls
  '5 Nuggets con Papas':       U('1562802378-b4abf27d0e6a'), // nuggets
  'Brownie':                   U('1606313564200-e75d5e094f29'), // chocolate brownie

  // ── Bebidas ────────────────────────────────────────────────
  'Refresco':        U('1554631222-56c8b5c4ef20'), // cola with ice
  'Agua':            U('1548343605-dd0a4a94e9b6'), // clear water glass
  'Agua Gasificada': U('1523362628-0d8f9b46a627'), // sparkling water bubbles
  'Lipton':          U('1556679343-c7306c1979ad'), // iced tea lemon
  'Gatorade':        U('1579952363873-27d3bfad9c88'), // colorful sports drink
  'Malta':           U('1518099978-13fd96f66014'), // dark malt beverage
}

async function main() {
  console.log('Actualizando imagenes de productos...\n')

  let ok = 0
  let miss = 0

  for (const [name, image_url] of Object.entries(IMAGE_MAP)) {
    const result = await prisma.product.updateMany({
      where: { name },
      data:  { image_url },
    })

    if (result.count > 0) {
      console.log(`  OK  ${name}`)
      ok++
    } else {
      console.log(`  --  ${name} (no encontrado en BD)`)
      miss++
    }
  }

  console.log(`\n${ok} actualizados, ${miss} no encontrados.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
