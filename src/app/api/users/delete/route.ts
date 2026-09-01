import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function DELETE(request: Request) {
  try {
    const { userId, masterPassword } = await request.json();
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized missing token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = getServiceSupabase();

    // 1. Verify Master User authorization token via Supabase Auth
    const { data: { user: masterUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    // Safety check to ensure we have the master user's email
    if (authError || !masterUser || !masterUser.email) {
      return NextResponse.json({ error: 'Unauthorized Master User' }, { status: 401 });
    }

    if (!userId || !masterPassword) {
      return NextResponse.json({ error: 'User ID and master password are required' }, { status: 400 });
    }

    // 2. Extra Security: Verify the Master User's Password
    // We do this by attempting a sign-in with the master's email and the provided password
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: masterUser.email,
      password: masterPassword,
    });

    if (signInError) {
      return NextResponse.json({ error: 'Incorrect master password' }, { status: 403 });
    }

    // 3. Clear out the sub-user's data to avoid Foreign Key Constraint errors
    await supabaseAdmin.from('transactions').delete().eq('user_id', userId);
    await supabaseAdmin.from('expense_profiles').delete().eq('user_id', userId);
    await supabaseAdmin.from('people_profiles').delete().eq('user_id', userId);

    // 4. Finally, delete the sub-user account itself
    const { error: deleteError } = await supabaseAdmin
      .from('app_users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE USER ERROR:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}