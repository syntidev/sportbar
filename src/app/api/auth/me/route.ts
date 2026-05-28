import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('cafeball_session')?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return NextResponse.json({
      success: true,
      user: { id: payload['id'], code: payload['code'], role: payload['role'] },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Sesión inválida' }, { status: 401 })
  }
}
