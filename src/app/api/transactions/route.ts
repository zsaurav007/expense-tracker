import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type');

    const supabase = getServiceSupabase();
    
    // Enhanced: Also fetching people_profiles just in case it is needed globally
    let query = supabase.from('transactions')
      .select('*, expense_profiles(name), people_profiles(name)')
      .eq('user_id', session.userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    // FIX: Split the type parameter by comma so we can fetch multiple types at once
    // (e.g., fetching 'INCOME', 'BORROW', and 'LEND_REPAYMENT' simultaneously)
    if (typeParam) {
      const types = typeParam.split(',');
      query = query.in('type', types);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error("SUPABASE GET TRANSACTIONS ERROR:", error.message);
      throw error;
    }
    
    return NextResponse.json({ transactions: data });
  } catch (error: any) {
    console.error("GET TRANSACTIONS API ERROR:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = getServiceSupabase();

    const { error } = await supabase.from('transactions').insert([{
      user_id: session.userId,
      type: body.type,
      amount: body.amount,
      source_or_method: body.source || 'Ledger', 
      transaction_method: body.method,
      date: body.date,
      description: body.description,
      expense_profile_id: body.profileId || null,
      person_id: body.personId || null,
    }]);

    if (error) {
      console.error("SUPABASE POST TRANSACTION ERROR:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST TRANSACTION API ERROR:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}