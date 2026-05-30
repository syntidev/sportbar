import { NextResponse } from 'next/server'
import { stopSimulation, getStatus } from '@/lib/simulator'

export async function POST() {
  stopSimulation()
  return NextResponse.json({ success: true, final: getStatus() })
}
