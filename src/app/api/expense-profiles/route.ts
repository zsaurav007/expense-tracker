import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('expense_profiles')
    .select('id, name, billing_day, notify_days_before')
    .eq('user_id', session.userId)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data || [] });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const supabase = getServiceSupabase();
  
  const { data, error } = await supabase
    .from('expense_profiles')
    .insert([{ 
      user_id: session.userId, 
      name: body.name,
      billing_day: body.billing_day || null,
      notify_days_before: body.notify_days_before || null
    }])
    .select('id, name, billing_day, notify_days_before')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}