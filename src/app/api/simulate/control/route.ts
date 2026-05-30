import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pauseSimulation, resumeSimulation, resetSimulation, getStatus } from '@/lib/simulator'

const Schema = z.object({
  action: z.enum(['pause', 'resume', 'reset']),
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
  switch (result.data.action) {
    case 'pause':  pauseSimulation();  break
    case 'resume': resumeSimulation(); break
    case 'reset':  resetSimulation();  break
  }
  return NextResponse.json({ success: true, status: getStatus() })
}
