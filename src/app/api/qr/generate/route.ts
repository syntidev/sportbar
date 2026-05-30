import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export const runtime = 'nodejs'

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export async function GET(req: NextRequest) {
  const zona  = req.nextUrl.searchParams.get('zona')  ?? 'general'
  const raw   = req.nextUrl.searchParams.get('color') ?? '#F5A623'
  const dark  = HEX_RE.test(raw) ? raw : '#F5A623'
  // White swatch → invert: white modules on SportBar green. Otherwise blend with canvas bg.
  const light = dark === '#FFFFFF' ? '#2E7D32' : '#f8fafc'

  const url = `https://tusport.bar/menu?ref=qr&zona=${encodeURIComponent(zona)}`

  try {
    const svg = await QRCode.toString(url, {
      type:                 'svg',
      color:                { dark, light },
      margin:               1,
      errorCorrectionLevel: 'M',
    })
    return new NextResponse(svg, {
      headers: {
        'Content-Type':  'image/svg+xml',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Error generando QR' }, { status: 500 })
  }
}
