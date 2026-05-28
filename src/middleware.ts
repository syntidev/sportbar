import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'cafeball_session'
const PROTECTED = ['/admin', '/pos', '/kds']

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    await jwtVerify(token, getSecret())
    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete(COOKIE_NAME)
    return res
  }
}

export const config = {
  matcher: ['/admin/:path*', '/pos/:path*', '/kds/:path*'],
}
