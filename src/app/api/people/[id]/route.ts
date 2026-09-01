import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcrypt';

// --- GET: Fetches the person's details and transactions ---
export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceSupabase();
    
    const { data: person, error: personError } = await supabase
      .from('people_profiles')
      .select('id, name, phone')
      .eq('id', id)
      .eq('user_id', session.userId)
      .single();

    if (personError) return NextResponse.json({ error: 'Person not found' }, { status: 404 });

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('person_id', id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

    let netBalance = 0;
    transactions.forEach(t => {
      const amt = Number(t.amount);
      if (t.type === 'LEND') netBalance += amt;
      if (t.type === 'LEND_REPAYMENT') netBalance -= amt;
      if (t.type === 'BORROW') netBalance -= amt;
      if (t.type === 'BORROW_REPAYMENT') netBalance += amt;
    });

    return NextResponse.json({ person, transactions, netBalance });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// --- PUT: Edits the person's name/phone (Password Protected) ---
export async function PUT(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const { name, phone, password } = await request.json();

    const supabase = getServiceSupabase();
    
    // Verify Password against correct 'app_users' table
    const { data: user, error: userError } = await supabase.from('app_users').select('*').eq('id', session.userId).single();
    if (userError || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    
    const hash = user.password_hash || user.password;
    const isValid = await bcrypt.compare(password, hash);
    if (!isValid) return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });

    // Update Person Profile
    const { error } = await supabase.from('people_profiles')
      .update({ name, phone: phone || null })
      .eq('id', id)
      .eq('user_id', session.userId);
      
    if (error) throw error;

    // Instantly update all their associated transactions so reports reflect the new name
    await supabase.from('transactions')
      .update({ source_or_method: name })
      .eq('person_id', id)
      .eq('user_id', session.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- DELETE: Deletes person & transactions (Password Protected) ---
export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const { password } = await request.json();

    const supabase = getServiceSupabase();
    
    // Verify Password against correct 'app_users' table
    const { data: user, error: userError } = await supabase.from('app_users').select('*').eq('id', session.userId).single();
    if (userError || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    
    const hash = user.password_hash || user.password;
    const isValid = await bcrypt.compare(password, hash);
    if (!isValid) return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });

    // Delete all associated transactions FIRST to clear ghost data
    await supabase.from('transactions').delete().eq('person_id', id).eq('user_id', session.userId);

    // Then delete the person
    const { error } = await supabase.from('people_profiles').delete().eq('id', id).eq('user_id', session.userId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}