import { NextResponse } from 'next/server'
import { getStatus } from '@/lib/simulator'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ success: true, ...getStatus() })
}
