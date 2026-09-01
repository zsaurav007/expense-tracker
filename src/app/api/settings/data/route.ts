import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcrypt';

// Helper function to verify username and password
async function verifyCredentials(supabase: any, userId: string, username: string, password: string) {
  const { data: user, error } = await supabase.from('app_users').select('*').eq('id', userId).single();
  if (error || !user) return false;
  if (user.username !== username) return false;
  
  const hash = user.password_hash || user.password;
  return await bcrypt.compare(password, hash);
}

// 1. POST: Verify and generate Backup Data
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { username, password } = await request.json();
    const supabase = getServiceSupabase();

    const isValid = await verifyCredentials(supabase, session.userId, username, password);
    if (!isValid) return NextResponse.json({ error: 'Invalid username or password' }, { status: 403 });

    // Fetch all user data
    const [txs, people, expenses] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', session.userId),
      supabase.from('people_profiles').select('*').eq('user_id', session.userId),
      supabase.from('expense_profiles').select('*').eq('user_id', session.userId)
    ]);

    return NextResponse.json({
      backup: {
        transactions: txs.data || [],
        people_profiles: people.data || [],
        expense_profiles: expenses.data || []
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. DELETE: Verify and Wipe All Data
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { username, password } = await request.json();
    const supabase = getServiceSupabase();

    const isValid = await verifyCredentials(supabase, session.userId, username, password);
    if (!isValid) return NextResponse.json({ error: 'Invalid username or password' }, { status: 403 });

    // Delete in correct order to respect foreign keys (Transactions first)
    await supabase.from('transactions').delete().eq('user_id', session.userId);
    await supabase.from('people_profiles').delete().eq('user_id', session.userId);
    await supabase.from('expense_profiles').delete().eq('user_id', session.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 3. PUT: Verify, Wipe, and Restore Data from JSON
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { username, password, payload } = await request.json();
    const supabase = getServiceSupabase();

    const isValid = await verifyCredentials(supabase, session.userId, username, password);
    if (!isValid) return NextResponse.json({ error: 'Invalid username or password' }, { status: 403 });

    if (!payload || !payload.transactions || !payload.people_profiles || !payload.expense_profiles) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    // Force all restored data to belong to the current user (Security measure against ID spoofing)
    const cleanPeople = payload.people_profiles.map((p: any) => ({ ...p, user_id: session.userId }));
    const cleanExpenses = payload.expense_profiles.map((p: any) => ({ ...p, user_id: session.userId }));
    const cleanTxs = payload.transactions.map((t: any) => ({ ...t, user_id: session.userId }));

    // 1. Wipe existing data to prevent ID conflicts
    await supabase.from('transactions').delete().eq('user_id', session.userId);
    await supabase.from('people_profiles').delete().eq('user_id', session.userId);
    await supabase.from('expense_profiles').delete().eq('user_id', session.userId);

    // 2. Insert Profiles (Parents) first
    if (cleanPeople.length > 0) await supabase.from('people_profiles').insert(cleanPeople);
    if (cleanExpenses.length > 0) await supabase.from('expense_profiles').insert(cleanExpenses);
    
    // 3. Insert Transactions (Children) last
    if (cleanTxs.length > 0) await supabase.from('transactions').insert(cleanTxs);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}