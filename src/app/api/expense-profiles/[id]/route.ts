import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// --- GET: Fetches the specific expense profile and its filtered transactions ---
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'month';

    const supabase = getServiceSupabase();
    
    // 1. Get Profile Name & Reminder Settings
    // FIX: Added billing_day and notify_days_before so the edit modal can pre-fill the form
    const { data: profile, error: profileError } = await supabase
      .from('expense_profiles')
      .select('id, name, billing_day, notify_days_before')
      .eq('id', id) 
      .eq('user_id', session.userId)
      .single();

    if (profileError) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 2. Build Transaction Query
    // Fetch both EXPENSE and CREDIT_EXPENSE types, and include the person's name for credit purchases
    let query = supabase
      .from('transactions')
      .select('*, people_profiles(name), transaction_fundings(person_id, amount)')
      .eq('expense_profile_id', id) 
      .in('type', ['EXPENSE', 'CREDIT_EXPENSE'])
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    // 3. Apply Date Filters
    const now = new Date();
    let startDate: string | null = null;

    if (filter === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start of week
      startDate = startOfWeek.toISOString().split('T')[0];
    } else if (filter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (filter === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    }

    if (startDate && filter !== 'all') {
      query = query.gte('date', startDate);
    }

    const { data: transactions, error: txError } = await query;
    if (txError) throw txError;

    // 4. Calculate total for the filtered period
    // Explicitly ignore CREDIT_EXPENSE when calculating the total spent out of pocket
    const total = transactions.reduce((sum, tx) => {
      if (tx.type === 'CREDIT_EXPENSE') return sum;
      return sum + Number(tx.amount);
    }, 0);

    return NextResponse.json({ profile, transactions, total });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// --- PUT: Edits the Expense Profile name & reminder settings ---
export async function PUT(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    // FIX: Get the entire body to access the new reminder fields
    const body = await request.json();

    if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const supabase = getServiceSupabase();
    
    // Update Profile Name and Reminder fields
    const { error } = await supabase.from('expense_profiles')
      .update({ 
        name: body.name,
        billing_day: body.billing_day || null,
        notify_days_before: body.notify_days_before || null
      })
      .eq('id', id)
      .eq('user_id', session.userId);
      
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- DELETE: Deletes the Expense Profile and its transactions ---
export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams.id;

    const supabase = getServiceSupabase();
    
    // First delete associated expense transactions
    await supabase.from('transactions')
      .delete()
      .eq('expense_profile_id', id)
      .eq('user_id', session.userId);

    // Then delete the profile
    const { error } = await supabase.from('expense_profiles')
      .delete()
      .eq('id', id)
      .eq('user_id', session.userId);
      
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}