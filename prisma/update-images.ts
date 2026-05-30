/**
 * prisma/update-images.ts
 * Reemplaza image_url de todos los productos con fotos de Pexels (licencia libre).
 * Correr con:  npx tsx prisma/update-images.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Pexels CDN — sin autenticación, sin bloqueos de VPS
const P = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600`

// IDs verificados desde pexels.com/search — mapeado por product.id para evitar
// problemas con variantes de nombre (tildes, mayúsculas, nombres alternativos)
const IMAGE_MAP: Record<number, string> = {
  // ── Hamburguesas ──────────────────────────────────────────────────────────
  1:  P(27988502),  // La Clasica                — hamburguesa clásica
  2:  P(12339109),  // Pollo Crispy              — sándwich pollo crujiente
  3:  P(2128536),   // La Mini                   — mini burger / slider
  4:  P(3764353),   // Adicional carne o pollo   — carne a la plancha
  16: P(18354206),  // La Clásica (con acento)   — burger frontal
  17: P(3764353),   // Adicional de Carne o Pollo

  // ── Raciones ──────────────────────────────────────────────────────────────
  5:  P(5836772),   // Papas Fritas
  6:  P(37121075),  // Papas con Queso y Tocineta — loaded fries
  7:  P(9650081),   // Tequenos                   — palitos de queso fritos
  8:  P(11710531),  // 5 Nuggets con Papas
  9:  P(4597835),   // Brownie
  18: P(9650081),   // Tequeños (con ñ)
  19: P(11710531),  // 5 Nuggets con Papas Fritas

  // ── Bebidas ───────────────────────────────────────────────────────────────
  10: P(14373170),  // Refresco        — cola con hielo
  11: P(10482146),  // Agua            — vaso de agua
  12: P(4612341),   // Agua Gasificada — burbujas agua con gas
  13: P(31373642),  // Lipton          — té frío con limón
  14: P(19585370),  // Gatorade        — bebida deportiva
  15: P(5659492),   // Malta           — bebida oscura
}

async function main() {
  console.log('Actualizando imágenes → Pexels CDN...\n')

  let ok   = 0
  let miss = 0

  for (const [rawId, image_url] of Object.entries(IMAGE_MAP)) {
    const id = Number(rawId)
    const result = await prisma.product.updateMany({
      where: { id },
      data:  { image_url },
    })

    if (result.count > 0) {
      console.log(`  OK  id=${id}`)
      ok++
    } else {
      console.log(`  --  id=${id} (no encontrado)`)
      miss++
    }
  }

  console.log(`\n${ok} productos actualizados, ${miss} no encontrados.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
