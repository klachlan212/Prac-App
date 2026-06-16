import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options: CookieOptions }

const PUBLIC_PATHS = ['/sign-in']

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env vars aren't configured yet, pass through rather than crashing.
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Never let a transient Supabase/auth error hard-crash the gate. RLS is the
  // real security boundary; this redirect is only a UX gate, so failing to a
  // null user (which sends protected paths to /sign-in) is the safe direction.
  let user = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    user = null
  }

  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    return NextResponse.redirect(url)
  }

  if (user && path === '/sign-in') {
    const url = request.nextUrl.clone()
    url.pathname = '/reflections'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Run on the Node.js runtime, not Edge. `@supabase/ssr` pulls in the full
  // `@supabase/supabase-js`, which uses Node-only globals (`process.version`,
  // `__dirname`). On the Edge runtime those are undefined and the middleware
  // throws MIDDLEWARE_INVOCATION_FAILED on every request. Node.js middleware is
  // stable as of Next.js 15.5. See CLAUDE.md §6 (runtime-environment quirks).
  runtime: 'nodejs',
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.png|.*\\.svg).*)',
  ],
}
