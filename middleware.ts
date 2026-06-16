import { NextResponse, type NextRequest } from 'next/server'

// Paths reachable without a session.
const PUBLIC_PATHS = ['/sign-in']

// Lightweight, Edge-safe auth gate.
//
// We deliberately do NOT import `@supabase/ssr` / `@supabase/supabase-js` here.
// Those drag Node-only globals (`process.version`, `__dirname`) into the bundle,
// which crash on Next.js's default Edge runtime (MIDDLEWARE_INVOCATION_FAILED).
// Switching the middleware to the Node.js runtime swapped that for a different
// Vercel failure — the function is emitted as CommonJS `middleware.js` but holds
// ESM `import`s ("Cannot use import statement outside a module"). So we avoid the
// heavy client entirely and gate purely on the presence of Supabase's auth
// cookie. This is only a UX redirect; the real security boundary is Postgres RLS
// plus the server-side Supabase client used by pages/route handlers, which
// validate the session for real. See CLAUDE.md §6 (runtime-environment quirks).
export function middleware(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))

  // Supabase stores the session in cookies named `sb-<ref>-auth-token`
  // (optionally chunked: `…-auth-token.0`, `.1`). Match those exactly — but NOT
  // the transient `…-auth-token-code-verifier` cookie set mid-sign-in, which
  // would otherwise bounce a user out of the sign-in flow.
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && /-auth-token(\.\d+)?$/.test(c.name))

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    return NextResponse.redirect(url)
  }

  if (hasSession && path === '/sign-in') {
    const url = request.nextUrl.clone()
    url.pathname = '/reflections'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.png|.*\\.svg).*)',
  ],
}
