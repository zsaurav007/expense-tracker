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
    
    // 1. Get Profile Name
    const { data: profile, error: profileError } = await supabase
      .from('expense_profiles')
      .select('id, name')
      .eq('id', id) 
      .eq('user_id', session.userId)
      .single();

    if (profileError) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // 2. Build Transaction Query
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('expense_profile_id', id) 
      .eq('type', 'EXPENSE')
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
    const total = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

    return NextResponse.json({ profile, transactions, total });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// --- PUT: Edits the Expense Profile name ---
export async function PUT(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const { name } = await request.json();

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const supabase = getServiceSupabase();
    
    // Update Profile Name
    const { error } = await supabase.from('expense_profiles')
      .update({ name })
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