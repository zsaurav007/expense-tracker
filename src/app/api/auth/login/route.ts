import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/auth'; // 1. Import your encrypt function

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'exptracker' }
});

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // 1. Find user by username or email
    const { data: user, error } = await supabaseAdmin
      .from('app_users')
      .select('*')
      .or(`username.eq.${username.toLowerCase()},email.eq.${username.toLowerCase()}`)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 2. Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 3. ENFORCE STATUS CHECK
    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'PENDING_APPROVAL' }, { status: 403 });
    }

    // 4. Create the encrypted JWT
    // This payload structure MUST match what proxy.ts expects (sessionPayload.userId)
    const sessionToken = await encrypt({ 
      userId: user.id, 
      username: user.username,
      fullName: user.full_name, // Optional: useful for your UI
      isGodMode: false // Optional: match your existing layout logic
    });

    const response = NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
    
    // 5. Save the ENCRYPTED token, not the raw user.id
    response.cookies.set('session', sessionToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days to match your JWT expiration
    });

    // Also set auth-token if you strictly need both, but session is usually enough
    response.cookies.set('auth-token', sessionToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;

  } catch (error) {
    console.error('LOGIN ERROR:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}