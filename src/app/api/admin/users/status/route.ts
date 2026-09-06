import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { userId, status } = await request.json();

    if (!userId || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    
    const { error } = await supabase
      .from('app_users')
      .update({ status })
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true, newStatus: status });
  } catch (error: any) {
    console.error("Status Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}