import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding CafeBall...')

  await prisma.ticketCounter.upsert({ where: { prefix: 'PUB' }, update: {}, create: { prefix: 'PUB', last: 0 } })
  await prisma.ticketCounter.upsert({ where: { prefix: 'LOC' }, update: {}, create: { prefix: 'LOC', last: 0 } })
  console.log('OK Ticket counters')

  await prisma.user.upsert({
    where: { code: 'ADM-001' },
    update: {},
    create: {
      code: 'ADM-001',
      name: 'Daniel',
      lastname: 'Cheein',
      pin: await bcrypt.hash('1234', 10),
      role: 'admin',
    },
  })
  console.log('OK Admin Daniel')

  await prisma.user.upsert({
    where: { code: 'USR-001' },
    update: {},
    create: {
      code: 'USR-001',
      name: 'Demo',
      lastname: 'Mesero',
      pin: await bcrypt.hash('1234', 10),
      role: 'mesero',
    },
  })
  console.log('OK Mesero demo')

  const products = [
    { name: 'La Clasica', description: '120g carne, queso, tocineta, rucula, tomate, salsa', price_usd: 7.00, category: 'hamburguesas' },
    { name: 'Pollo Crispy', description: '60g pollo, queso, tocineta, rucula, tomate, salsa', price_usd: 7.00, category: 'hamburguesas' },
    { name: 'La Mini', description: '80g carne, queso, tocineta y salsa', price_usd: 3.00, category: 'hamburguesas' },
    { name: 'Adicional carne o pollo', description: 'Extra de carne o pollo', price_usd: 3.00, category: 'hamburguesas' },
    { name: 'Papas Fritas', description: 'Porcion estandar', price_usd: 3.50, category: 'raciones' },
    { name: 'Papas con Queso y Tocineta', description: 'Papas fritas con queso fundido y tocineta', price_usd: 7.00, category: 'raciones' },
    { name: 'Tequenos', description: 'Recien fritos, queso derretido', price_usd: 5.00, category: 'raciones' },
    { name: '5 Nuggets con Papas', description: 'Nuggets de pollo con papas fritas', price_usd: 5.00, category: 'raciones' },
    { name: 'Brownie', description: 'Postre de chocolate', price_usd: 5.00, category: 'raciones' },
    { name: 'Refresco', description: 'Pepsi, Seven Up u otra', price_usd: 1.50, category: 'bebidas' },
    { name: 'Agua', description: '500ml', price_usd: 1.00, category: 'bebidas' },
    { name: 'Agua Gasificada', description: 'Con gas', price_usd: 2.00, category: 'bebidas' },
    { name: 'Lipton', description: 'Te helado', price_usd: 2.00, category: 'bebidas' },
    { name: 'Gatorade', description: 'Hidratante deportivo', price_usd: 3.00, category: 'bebidas' },
    { name: 'Malta', description: 'Malta Polar', price_usd: 1.00, category: 'bebidas' },
  ]

  for (const p of products) {
    await prisma.product.create({ data: p as any }).catch(() => {})
  }
  console.log('OK 15 productos del menu')

  await prisma.dollarRate.create({
    data: { rate: 50.00, source: 'manual-inicial', is_active: true },
  }).catch(() => {})
  console.log('OK Tasa BCV inicial')

  console.log('Seed completado!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())