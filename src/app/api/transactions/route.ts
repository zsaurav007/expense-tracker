import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type');
    const supabase = getServiceSupabase();
    
    let query = supabase.from('transactions')
      .select('*, expense_profiles(name), people_profiles(name)')
      .eq('user_id', session.userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (typeParam) query = query.in('type', typeParam.split(','));

    const { data: txData, error: txError } = await query;
    if (txError) throw txError;

    // Manually fetch fundings to bypass Supabase cache bugs
    const { data: fundings, error: fundingsError } = await supabase
      .from('transaction_fundings')
      .select('*')
      .eq('user_id', session.userId);
      
    if (fundingsError) console.error("SUPABASE GET FUNDINGS ERROR:", fundingsError.message);

    // Stitch the data together so Dashboard math never fails
    const mappedTransactions = (txData || []).map((tx) => {
      const txFundings = (fundings || []).filter(f => f.transaction_id === tx.id);
      return {
        ...tx,
        transaction_fundings: txFundings.length > 0 
          ? txFundings.map(f => ({ person_id: f.person_id, amount: Number(f.amount) })) 
          : [],
        fundingSources: txFundings.length > 0 
          ? txFundings.map(f => ({ personId: f.person_id, amount: Number(f.amount) })) 
          : []
      };
    });
    
    return NextResponse.json({ transactions: mappedTransactions });
  } catch (error: any) {
    console.error("GET TRANSACTIONS API ERROR:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const supabase = getServiceSupabase();

    const { data: newTx, error: txError } = await supabase.from('transactions').insert([{
      user_id: session.userId,
      type: body.type,
      amount: Number(body.amount),
      source_or_method: body.source || 'Ledger', 
      transaction_method: body.method,
      date: body.date,
      description: body.description,
      expense_profile_id: body.profileId || null,
      person_id: body.personId || null,
    }]).select('id').single();

    if (txError || !newTx) throw txError;

    if (body.fundingSources && Array.isArray(body.fundingSources) && body.fundingSources.length > 0) {
      const fundingsPayload = body.fundingSources.map((funding: any) => ({
        id: crypto.randomUUID(), 
        user_id: session.userId,
        transaction_id: newTx.id,
        person_id: funding.personId || funding.person_id,
        amount: Number(funding.amount)
      }));

      const { error: fundingError } = await supabase.from('transaction_fundings').insert(fundingsPayload);
      
      if (fundingError) {
        await supabase.from('transactions').delete().eq('id', newTx.id);
        console.error("FUNDING SPLIT ERROR:", fundingError.message);
        return NextResponse.json({ error: `Database Permission Error: ${fundingError.message}` }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true, id: newTx.id });
  } catch (error: any) {
    console.error("POST TRANSACTION API ERROR:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}