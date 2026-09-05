import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function PUT(request: Request) {
  try {
    // Extract all fields sent by the updated Master Dashboard frontend
    const { userId, fullName, username, email, phone } = await request.json();
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

    if (!userId || !fullName || !username) {
      return NextResponse.json({ error: 'User ID, full name, and username are required' }, { status: 400 });
    }

    // Optional: Check if the new username or email is already taken by a DIFFERENT user
    const { data: existingUser } = await supabaseAdmin
      .from('app_users')
      .select('id, username, email')
      .or(`username.eq.${username},email.eq.${email}`)
      .neq('id', userId) // Exclude the current user being updated
      .limit(1)
      .single();

    if (existingUser) {
      if (existingUser.username === username) return NextResponse.json({ error: 'Username is already taken by another user.' }, { status: 400 });
      if (existingUser.email === email) return NextResponse.json({ error: 'Email is already registered to another user.' }, { status: 400 });
    }

    // 2. Update all details in the 'app_users' table
    const { error: updateError } = await supabaseAdmin
      .from('app_users')
      .update({ 
        full_name: fullName,
        username: username,
        email: email || null,
        phone: phone || null
      })
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