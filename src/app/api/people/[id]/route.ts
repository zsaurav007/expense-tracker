import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcrypt';

// Prevents Next.js from aggressively caching this route and serving stale data
export const dynamic = 'force-dynamic'; 

// --- GET: Fetches the person's details, transactions, AND funded assets ---
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
    
    // 1. Fetch Person Details (Now including profile_type)
    const { data: person, error: personError } = await supabase
      .from('people_profiles')
      .select('id, name, phone, profile_type')
      .eq('id', id)
      .eq('user_id', session.userId)
      .single();

    if (personError) return NextResponse.json({ error: 'Person not found' }, { status: 404 });

    // 2. Fetch Direct Transactions (Loans, Repayments, Credit Expenses)
    const { data: directTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('person_id', id)
      .eq('user_id', session.userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

    // 3. BULLETPROOF FETCH: Get Funded Assets bypassing Supabase join cache bugs
    const { data: fundings, error: fundingError } = await supabase
      .from('transaction_fundings')
      .select('*')
      .eq('person_id', id)
      .eq('user_id', session.userId);

    // Strictly typing this array to prevent Next.js build errors
    let mappedFundedAssets: Record<string, unknown>[] = [];

    // If this person has funded assets, fetch the actual transaction details
    if (fundings && fundings.length > 0) {
      const txIds = fundings.map(f => f.transaction_id);
      
      const { data: fundedTxs } = await supabase
        .from('transactions')
        .select('*, expense_profiles(name)')
        .in('id', txIds)
        .eq('user_id', session.userId);

      if (fundedTxs) {
        mappedFundedAssets = fundings.map(f => {
          const tx = fundedTxs.find(t => t.id === f.transaction_id);
          if (!tx) return null;

          const assetName = tx.expense_profiles?.name || tx.source_or_method || 'Unknown Asset';
          const desc = tx.description ? `${assetName} - ${tx.description}` : assetName;

          return {
            id: tx.id, // PERFECT FIX: Pass the raw, unmodified ID so the frontend can find it
            type: 'ASSET_PURCHASE',  // Custom UI flag we set up in the frontend
            amount: f.amount,
            date: tx.date,
            transaction_method: tx.transaction_method,
            description: `Funded Asset: ${desc}`,
            created_at: tx.created_at
          };
        }).filter(Boolean) as Record<string, unknown>[];
      }
    }

    // 4. Combine and Sort the Timeline (Newest first)
    const allTransactions = [...(directTransactions || []), ...mappedFundedAssets].sort((a: any, b: any) => {
      // First sort by date, then by created_at as a fallback
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff === 0 && a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return dateDiff;
    });

    // 5. Calculate Net Balance (STRICTLY using direct transactions, ignoring assets)
    let netBalance = 0;
    (directTransactions || []).forEach(t => {
      const amt = Number(t.amount);
      if (t.type === 'LEND') netBalance += amt;
      if (t.type === 'LEND_REPAYMENT') netBalance -= amt;
      
      // Treat BORROW and CREDIT_EXPENSE both as accumulating debt (you owe them)
      if (t.type === 'BORROW' || t.type === 'CREDIT_EXPENSE') netBalance -= amt;
      
      // Treat BORROW_REPAYMENT and CREDIT_REPAYMENT both as reducing debt
      if (t.type === 'BORROW_REPAYMENT' || t.type === 'CREDIT_REPAYMENT') netBalance += amt;
    });

    return NextResponse.json({ person, transactions: allTransactions, netBalance });
  } catch (error) {
    console.error("GET Ledger Error:", error);
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