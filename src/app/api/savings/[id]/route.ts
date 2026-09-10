import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('savings_profiles')
      .select(`*, transactions (*)`)
      .eq('id', resolvedParams.id)
      .eq('user_id', session.userId)
      .single();

    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// UPDATE a Savings Profile
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const { name, target_amount, monthly_installment, installment_day, notify_days_before } = await request.json();
    const supabase = getServiceSupabase();
    
    const { error } = await supabase.from('savings_profiles').update({
      name,
      target_amount: target_amount || null,
      monthly_installment: monthly_installment || null,
      installment_day: installment_day || null,
      notify_days_before: notify_days_before || null
    }).eq('id', resolvedParams.id).eq('user_id', session.userId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a Savings Profile
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const supabase = getServiceSupabase();
    
    const { error } = await supabase.from('savings_profiles').delete()
      .eq('id', resolvedParams.id).eq('user_id', session.userId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}