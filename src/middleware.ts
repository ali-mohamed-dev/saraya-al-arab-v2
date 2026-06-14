import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/api/auth',
  '/api/ping',
  '/api/web-users/check',
  '/api/web-users/login',
  '/api/addresses',
  '/api/web-users',
  '/api/staff',
]

const PUBLIC_GET_PATHS = [
  '/api/meals',
  '/api/promotions',
  '/api/tables',
  '/api/categories',
]

const PUBLIC_POST_PATHS = [
  '/api/orders',
  '/api/upload',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Let public paths through
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Let public GET paths through
  if (method === 'GET' && PUBLIC_GET_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Let public POST paths through
  if (method === 'POST' && PUBLIC_POST_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Allow public order tracking by phone
  if (method === 'GET' && pathname === '/api/orders' && (request.nextUrl.searchParams.has('phone') || request.nextUrl.searchParams.has('customerPhone'))) {
    return NextResponse.next()
  }

  const authCookie = request.cookies.get('saraya-staff-auth')
  if (authCookie?.value !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
