import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const zona = req.nextUrl.searchParams.get('zona') ?? 'general'
  const url  = `https://tusport.bar/menu?ref=qr&zona=${encodeURIComponent(zona)}`

  try {
    const buf = await QRCode.toBuffer(url, {
      type:                 'png',
      width:                400,
      margin:               2,
      color:                { dark: '#2E7D32', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        'Content-Type':        'image/png',
        'Content-Disposition': `attachment; filename="qr-sportbar-${zona}.png"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Error generando QR' }, { status: 500 })
  }
}
