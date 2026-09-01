import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const { userId, newPassword } = await request.json();
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized missing token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = getServiceSupabase();

    // 1. Verify Master User authorization token via Supabase Auth
    const { data: { user: masterUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !masterUser) {
      return NextResponse.json({ error: 'Unauthorized Master User' }, { status: 401 });
    }

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'User ID and new password are required' }, { status: 400 });
    }

    // 2. Hash the new password securely
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    // 3. Update the sub-user's password in the 'app_users' table
    const { error: updateError } = await supabaseAdmin
      .from('app_users')
      .update({ password_hash, password: newPassword }) // Updates both for backwards compatibility
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('RESET PASSWORD ERROR:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}