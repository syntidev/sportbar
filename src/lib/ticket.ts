import { prisma } from './prisma'

export async function generateTicketCode(origin: 'PUB' | 'LOC'): Promise<string> {
  const counter = await prisma.ticketCounter.upsert({
    where: { prefix: origin },
    update: { last: { increment: 1 } },
    create: { prefix: origin, last: 1 },
  })
  return origin + '-' + String(counter.last).padStart(5, '0')
}

