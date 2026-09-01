import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceSupabase();
    
    // Fetch people (including phone) and all their related transactions
    const { data, error } = await supabase
      .from('people_profiles')
      .select(`
        id, 
        name,
        phone,
        transactions ( type, amount )
      `)
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("SUPABASE GET PEOPLE ERROR:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate balances securely on the backend
    const peopleWithBalances = data.map((person) => {
      let owesMe = 0;
      let iOwe = 0;

      person.transactions.forEach((t: any) => {
        const amt = Number(t.amount);
        if (t.type === 'LEND') owesMe += amt;
        if (t.type === 'LEND_REPAYMENT') owesMe -= amt;
        
        if (t.type === 'BORROW') iOwe += amt;
        if (t.type === 'BORROW_REPAYMENT') iOwe -= amt;
      });

      return {
        id: person.id,
        name: person.name,
        phone: person.phone,
        netBalance: owesMe - iOwe, 
      };
    });

    return NextResponse.json({ people: peopleWithBalances });
  } catch (err: any) {
    console.error("GET PEOPLE API EXCEPTION:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, phone } = await request.json();
    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('people_profiles')
      .insert([{ user_id: session.userId, name, phone: phone || null }])
      .select('id, name, phone')
      .single();

    if (error) {
      console.error("SUPABASE POST PEOPLE ERROR:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ person: { ...data, netBalance: 0 } });
  } catch (err: any) {
    console.error("POST PEOPLE API EXCEPTION:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}