import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getServiceSupabase } from '@/lib/supabase';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const supabaseAdmin = getServiceSupabase();

    const { data: user, error } = await supabaseAdmin
      .from('app_users')
      .select('id, full_name, username, password_hash')
      .eq('username', username)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await encrypt({ 
      userId: user.id, 
      username: user.username, 
      fullName: user.full_name 
    });

    // FIXED: await cookies()
    const cookieStore = await cookies();
    cookieStore.set('session', session, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({ success: true, user: { id: user.id, name: user.full_name } });
  } catch (error: any) {
    console.error("LOGIN ERROR:", error); // Logs exact error to your terminal
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}