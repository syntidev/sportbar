import { NextResponse } from 'next/server'
import { getStatus } from '@/lib/simulator'

export async function GET() {
  return NextResponse.json({ success: true, ...getStatus() })
}
