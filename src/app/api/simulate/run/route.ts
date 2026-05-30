import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { startSimulation } from '@/lib/simulator'

const Schema = z.object({
  intensity:        z.enum(['tranquilo', 'normal', 'lleno', 'sold_out']),
  duration_minutes: z.number().int().min(1).max(60),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const result = Schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.issues[0]?.message ?? 'Parámetros inválidos' },
      { status: 422 },
    )
  }

  const { intensity, duration_minutes } = result.data
  const outcome = await startSimulation(intensity, duration_minutes)

  if (!outcome.ok) {
    return NextResponse.json({ success: false, error: outcome.error }, { status: 409 })
  }

  return NextResponse.json({ success: true, intensity, duration_minutes })
}
