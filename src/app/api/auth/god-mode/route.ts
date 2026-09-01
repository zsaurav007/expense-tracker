import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase';
import { encrypt } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { targetUserId } = await request.json();
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized missing token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = getServiceSupabase();
    
    // 1. Verify that the requester is a valid Master User using their token
    const { data: { user: masterUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !masterUser) {
      return NextResponse.json({ error: 'Unauthorized Master User' }, { status: 401 });
    }

    // 2. Fetch the target sub-user's details
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('app_users')
      .select('id, username, full_name')
      .eq('id', targetUserId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'Sub-user not found' }, { status: 404 });
    }

    // 3. Create a JWT session just like standard login
    // We add an 'isGodMode' flag so the frontend can optionally show a warning banner
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await encrypt({ 
      userId: targetUser.id, 
      username: targetUser.username, 
      fullName: targetUser.full_name,
      isGodMode: true 
    });

    // 4. Set the HTTP-only cookie (Fixed for Next.js 15+)
    const cookieStore = await cookies();
    cookieStore.set('session', session, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}