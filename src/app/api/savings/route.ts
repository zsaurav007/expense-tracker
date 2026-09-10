import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceSupabase();
    
    // Fetch profiles along with their transactions
    const { data, error } = await supabase
      .from('savings_profiles')
      .select(`
        *,
        transactions ( id, amount, date, transaction_method, description, type )
      `)
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ profiles: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, target_amount, monthly_installment, installment_day, notify_days_before } = await request.json();
    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('savings_profiles')
      .insert([{
        user_id: session.userId,
        name,
        target_amount: target_amount || null,
        monthly_installment: monthly_installment || null,
        installment_day: installment_day || null,
        notify_days_before: notify_days_before || null
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}