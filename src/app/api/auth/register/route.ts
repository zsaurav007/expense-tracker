import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase and explicitly target the 'exptracker' schema
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'exptracker' }
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Sanitize inputs
    const fullName = (body.fullName || '').trim();
    const username = (body.username || '').trim().toLowerCase();
    const email = (body.email || '').trim().toLowerCase();
    const phone = (body.phone || '').trim();
    const password = body.password;

    // 2. Validate required fields
    if (!fullName || !username || !email || !password) {
      return NextResponse.json({ error: 'All required fields must be filled.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // 3. Check if username or email already exists in exptracker.app_users
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('username, email')
      .or(`username.eq.${username},email.eq.${email}`)
      .single();

    if (existingUser) {
      if (existingUser.username === username) return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
      if (existingUser.email === email) return NextResponse.json({ error: 'Email is already registered.' }, { status: 400 });
    }

    // 4. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Insert new user into exptracker.app_users
    const { error: insertError } = await supabase
      .from('app_users')
      .insert([
        {
          full_name: fullName,
          username: username,
          email: email,
          phone: phone,
          password_hash: hashedPassword,
          status: 'PENDING',
          // created_by remains NULL because they registered themselves
        }
      ]);

    if (insertError) {
      console.error('Insert Error:', insertError);
      return NextResponse.json({ error: 'Failed to create account. Please try again later.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Registration successful' }, { status: 201 });

  } catch (error) {
    console.error('Registration API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}