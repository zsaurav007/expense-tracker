import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase targeting the 'exptracker' schema
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'exptracker' }
});

export async function GET() {
  try {
    const { data: pendingUsers, error } = await supabase
      .from('app_users')
      .select('id, full_name, username, email, phone, created_at')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending users:', error);
      return NextResponse.json({ error: 'Failed to fetch pending users' }, { status: 500 });
    }

    return NextResponse.json({ users: pendingUsers || [] }, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}