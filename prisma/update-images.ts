/**
 * prisma/update-images.ts
 * Reemplaza image_url de todos los productos con fotos de Pexels (licencia libre).
 * Correr con:  npx tsx prisma/update-images.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const P = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600`

// Cubre las dos variantes que hay en DB: con y sin tildes / nombres alternativos
const IMAGE_MAP: Record<string, string> = {
  // ── Hamburguesas ──────────────────────────────────────────
  'La Clasica':                 P(1639557), // smash burger clásico
  'La Clásica':                 P(1639557), // variante con tilde
  'Pollo Crispy':               P(3753581), // sándwich pollo crujiente
  'La Mini':                    P(1633578), // slider mini burger
  'Adicional carne o pollo':    P(769289),  // carne asada a la parrilla
  'Adicional de Carne o Pollo': P(769289),  // variante nombre completo

  // ── Raciones ──────────────────────────────────────────────
  'Papas Fritas':               P(1893555), // papas fritas doradas
  'Papas con Queso y Tocineta': P(4110014), // papas cargadas queso y bacon
  'Tequenos':                   P(2664917), // tequeños fritos
  'Tequeños':                   P(2664917), // variante con tilde
  '5 Nuggets con Papas':        P(1279330), // nuggets con papas
  '5 Nuggets con Papas Fritas': P(1279330), // variante nombre completo
  'Brownie':                    P(291528),  // brownie de chocolate

  // ── Bebidas ────────────────────────────────────────────────
  'Refresco':        P(2109099), // refresco cola con hielo
  'Agua':            P(416528),  // vaso de agua fría
  'Agua Gasificada': P(1278740), // agua mineral con burbujas
  'Lipton':          P(1638280), // té helado con limón
  'Gatorade':        P(3045282), // bebida deportiva colorida
  'Malta':           P(1353360), // malta oscura en vaso
}

async function main() {
  console.log('Actualizando imágenes → Pexels CDN...\n')

  let ok = 0
  let miss = 0

  for (const [name, image_url] of Object.entries(IMAGE_MAP)) {
    const result = await prisma.product.updateMany({
      where: { name },
      data:  { image_url },
    })

    if (result.count > 0) {
      console.log(`  OK  [${result.count}]  ${name}`)
      ok += result.count
    } else {
      console.log(`  --  ${name} (no encontrado en BD)`)
      miss++
    }
  }

  console.log(`\n${ok} productos actualizados, ${miss} claves no encontradas en BD.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
