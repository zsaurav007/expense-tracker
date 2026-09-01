import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { password } = await request.json();
    const supabase = getServiceSupabase();

    // 1. Fetch from the correct table: 'app_users'
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', session.userId)
      .single();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found in app_users table' }, { status: 404 });
    }

    // 2. Verify the password securely using bcrypt
    const hash = user.password_hash || user.password;
    if (!hash) return NextResponse.json({ error: 'No password set for this user' }, { status: 400 });

    const isValid = await bcrypt.compare(password, hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
    }

    // --- PASSWORD VERIFIED: PROCEED WITH EXTREME DELETION ---

    // Wipe all Lend/Borrow Transactions entirely
    await supabase.from('transactions')
      .delete()
      .in('type', ['LEND', 'BORROW', 'LEND_REPAYMENT', 'BORROW_REPAYMENT'])
      .eq('user_id', session.userId);

    // Wipe all People Profiles entirely
    await supabase.from('people_profiles')
      .delete()
      .eq('user_id', session.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}