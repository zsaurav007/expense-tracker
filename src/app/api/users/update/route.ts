import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function PUT(request: Request) {
  try {
    const { userId, fullName } = await request.json();
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

    if (!userId || !fullName) {
      return NextResponse.json({ error: 'User ID and full name are required' }, { status: 400 });
    }

    // 2. Update the sub-user's full name in the 'app_users' table
    const { error: updateError } = await supabaseAdmin
      .from('app_users')
      .update({ full_name: fullName })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('UPDATE USER ERROR:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}