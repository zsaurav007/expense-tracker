import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'exptracker' }
});

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. CRITICAL FIX: Bypass middleware entirely for /master routes.
  // Master uses native Supabase Auth, so we don't want JWT checks interfering.
  if (path.startsWith('/master')) {
    return NextResponse.next();
  }
  
  const publicPaths = ['/', '/register'];
  const isPublicPath = publicPaths.includes(path);
  
  const token = request.cookies.get('auth-token')?.value || request.cookies.get('session')?.value;

  // RULE 1: If NOT logged in and trying to access protected routes -> redirect
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  let isValidSession = false;

  // RULE 2: If logged in, perform a live database check
  if (token) {
    try {
      const sessionPayload = await decrypt(token);

      if (!sessionPayload || !sessionPayload.userId) {
        throw new Error("Invalid token payload");
      }

      const { data: user, error } = await supabaseAdmin
        .from('app_users')
        .select('status')
        .eq('id', sessionPayload.userId) 
        .single();

      if (error || !user || user.status !== 'ACTIVE') {
        throw new Error("User suspended or not found");
      }

      isValidSession = true;
    } catch (err) {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('auth-token');
      response.cookies.delete('session');
      return response;
    }
  }

  // RULE 3: Valid active user trying to access public login/register -> redirect to dashboard
  if (isPublicPath && isValidSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/register',
    '/dashboard/:path*',
    '/master/:path*', 
  ],
};