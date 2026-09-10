import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const { amount, date, method, description } = await request.json();
    
    if (!amount || !date || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase.from('transactions').insert([{
      user_id: session.userId,
      savings_profile_id: resolvedParams.id,
      type: 'SAVING',
      amount,
      date,
      transaction_method: method,
      description,
      source_or_method: 'Savings Deposit'
    }]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("SAVINGS DEPOSIT ERROR:", error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}