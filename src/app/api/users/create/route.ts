import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { fullName, username, password, masterUserId } = await request.json();

    if (!fullName || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Hash the password (Cost factor 10 is standard/secure)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const supabaseAdmin = getServiceSupabase();

    // Insert into your custom schema
    const { data, error } = await supabaseAdmin
      .from('app_users')
      .insert([
        {
          full_name: fullName,
          username: username,
          password_hash: passwordHash,
          created_by: masterUserId, // The Supabase Auth ID of the Master User
        },
      ])
      .select('id, full_name, username')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}