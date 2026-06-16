import { type NextRequest } from 'next/server'
import { updateSession } from '@/src/auth/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Run on all routes except Next internals and static assets.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.png|.*\\.svg).*)',
  ],
}
