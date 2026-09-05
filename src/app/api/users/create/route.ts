import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { fullName, username, email, phone, password, masterUserId } = await request.json();

    if (!fullName || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Hash the password (Cost factor 10 is standard/secure)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const supabaseAdmin = getServiceSupabase();

    // Check if username or email already exists to prevent duplicate errors
    const { data: existingUser } = await supabaseAdmin
      .from('app_users')
      .select('username, email')
      .or(`username.eq.${username},email.eq.${email}`)
      .single();

    if (existingUser) {
      if (existingUser.username === username) return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
      if (existingUser.email === email) return NextResponse.json({ error: 'Email is already registered.' }, { status: 400 });
    }

    // Insert into your custom schema
    const { data, error } = await supabaseAdmin
      .from('app_users')
      .insert([
        {
          full_name: fullName,
          username: username,
          email: email || null,
          phone: phone || null,
          password_hash: passwordHash,
          created_by: masterUserId, // The Supabase Auth ID of the Master User
          status: 'PENDING' // Ensures users created by the Master Admin still need approval
        },
      ])
      .select('id, full_name, username')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    console.error('CREATE USER ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}