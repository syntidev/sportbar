// src/app/api/orders/[id]/claim/route.ts
// PATCH — Tomar una orden en el KDS. Setea venue_assigned al venue del usuario.
// Sin venue → usa -1 como sentinel (admin sin venue asignado).

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const COOKIE_NAME = 'cafeball_session'

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // 1. Auth
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  let userId: number
  let userCode: string
  try {
    const { payload } = await jwtVerify(token, getSecret())
    userId   = Number(payload['id'])
    userCode = String(payload['code'])
  } catch {
    return NextResponse.json({ success: false, error: 'Sesión inválida' }, { status: 401 })
  }

  // 2. Validar id
  const orderId = parseInt(params.id, 10)
  if (isNaN(orderId) || orderId <= 0) {
    return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  }

  // 3. Obtener venue del usuario
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { venue_id: true },
  })
  // -1 = sentinel para usuarios sin venue (admin)
  const venueId: number = user?.venue_id ?? -1

  // 4. Verificar orden
  const order = await prisma.order.findUnique({
    where:  { id: orderId },
    select: { id: true, kitchen_status: true, venue_assigned: true, code: true },
  })

  if (!order) {
    return NextResponse.json({ success: false, error: 'Orden no encontrada' }, { status: 404 })
  }
  if (order.kitchen_status !== 'NUEVO') {
    return NextResponse.json(
      { success: false, error: 'Solo se pueden tomar órdenes en estado NUEVO' },
      { status: 409 },
    )
  }
  if (order.venue_assigned !== null) {
    return NextResponse.json(
      { success: false, error: 'Orden ya tomada por otra estación' },
      { status: 409 },
    )
  }

  // 5. Claim: setear venue_assigned + log
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data:  { venue_assigned: venueId },
    }),
    prisma.orderLog.create({
      data: {
        order_id:   orderId,
        action:     'CLAIMED',
        actor_code: userCode,
        to_state:   String(venueId),
        note:       `Tomado por ${userCode} — venue ${venueId}`,
      },
    }),
  ])

  return NextResponse.json({ success: true, order_id: orderId, venue_id: venueId })
}
