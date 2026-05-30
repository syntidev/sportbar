import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const zona = req.nextUrl.searchParams.get('zona') ?? 'general'
  const url  = `https://tusport.bar/menu?ref=qr&zona=${encodeURIComponent(zona)}`

  try {
    const svg = await QRCode.toString(url, {
      type:                 'svg',
      color:                { dark: '#2E7D32', light: '#0a0a0a' },
      margin:               1,
      errorCorrectionLevel: 'M',
    })
    return new NextResponse(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Error generando QR' }, { status: 500 })
  }
}
