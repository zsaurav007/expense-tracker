import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceSupabase();
    
    // Fetch people (including phone, profile_type, created_at) and all their related transactions
    const { data, error } = await supabase
      .from('people_profiles')
      .select(`
        id, 
        name,
        phone,
        profile_type,
        created_at,
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
      
      let totalLent = 0;
      let totalReceived = 0;
      
      let totalBorrowed = 0;
      let totalRepaid = 0;
      
      let totalCreditPurchased = 0;
      let totalCreditPaid = 0;

      person.transactions.forEach((t: any) => {
        const amt = Number(t.amount);
        
        // Money they owe you (Lending)
        if (t.type === 'LEND') { owesMe += amt; totalLent += amt; }
        if (t.type === 'LEND_REPAYMENT') { owesMe -= amt; totalReceived += amt; }
        
        // Money you owe them (Borrowing)
        if (t.type === 'BORROW') { iOwe += amt; totalBorrowed += amt; }
        if (t.type === 'BORROW_REPAYMENT') { iOwe -= amt; totalRepaid += amt; }
        
        // Money you owe them (Pay Later / Credit)
        if (t.type === 'CREDIT_EXPENSE') { iOwe += amt; totalCreditPurchased += amt; }
        if (t.type === 'CREDIT_REPAYMENT') { iOwe -= amt; totalCreditPaid += amt; }
      });

      const netBalance = owesMe - iOwe;
      
      let total_loan = 0;
      let total_paid = 0;

      // Dynamically determine what "Total Loan" and "Total Paid" means for the UI card
      if (person.profile_type === 'PAY_LATER') {
        total_loan = totalCreditPurchased;
        total_paid = totalCreditPaid;
      } else {
        // For LEND_BORROW, determine if they act mostly as a debtor or creditor to you
        if (netBalance >= 0) {
          total_loan = totalLent;
          total_paid = totalReceived;
        } else {
          total_loan = totalBorrowed;
          total_paid = totalRepaid;
        }
      }

      return {
        id: person.id,
        name: person.name,
        phone: person.phone,
        profile_type: person.profile_type,
        created_at: person.created_at,
        netBalance, 
        total_loan,
        total_paid
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

    const { name, phone, profile_type } = await request.json();
    const supabase = getServiceSupabase();
    
    // Default to LEND_BORROW if nothing is provided
    const pType = profile_type || 'LEND_BORROW';

    const { data, error } = await supabase
      .from('people_profiles')
      .insert([{ 
        user_id: session.userId, 
        name, 
        phone: phone || null,
        profile_type: pType
      }])
      .select('id, name, phone, profile_type, created_at')
      .single();

    if (error) {
      console.error("SUPABASE POST PEOPLE ERROR:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ person: { ...data, netBalance: 0, total_loan: 0, total_paid: 0 } });
  } catch (err: any) {
    console.error("POST PEOPLE API EXCEPTION:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}