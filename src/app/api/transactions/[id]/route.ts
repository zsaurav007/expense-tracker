import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();
    const supabase = getServiceSupabase();
    
    let desc = body.description || '';
    if (!desc.includes('(Edited)')) desc = desc ? `${desc} (Edited)` : '(Edited)';

    const { error: txError } = await supabase.from('transactions').update({
      type: body.type,
      amount: Number(body.amount),
      transaction_method: body.method,
      date: body.date,
      description: desc,
    }).eq('id', id).eq('user_id', session.userId); 

    if (txError) throw txError;

    if (body.fundingSources !== undefined && Array.isArray(body.fundingSources)) {
      await supabase.from('transaction_fundings').delete().eq('transaction_id', id);
      
      if (body.fundingSources.length > 0) {
        const fundingsPayload = body.fundingSources.map((funding: any) => ({
          id: crypto.randomUUID(), // FIX: Manually generate the missing Primary Key ID
          user_id: session.userId,
          transaction_id: id,
          person_id: funding.personId || funding.person_id,
          amount: Number(funding.amount)
        }));
        
        await supabase.from('transaction_fundings').insert(fundingsPayload);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;
    const supabase = getServiceSupabase();
    const { error } = await supabase.from('transactions').delete().eq('id', resolvedParams.id).eq('user_id', session.userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}