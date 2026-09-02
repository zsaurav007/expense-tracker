import { getSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardHome() {
  // 1. Secure Server-Side Authentication
  const session = await getSession();
  if (!session) redirect('/');

  const supabase = getServiceSupabase();

  // 2. Fetch all transactions instantly on the server
  const { data: txs, error: txError } = await supabase
    .from('transactions')
    .select(`
      *,
      expense_profiles ( name ),
      people_profiles ( name )
    `)
    .eq('user_id', session.userId)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (txError) {
    console.error("Dashboard Server Fetch Error:", txError.message);
  }

  // 3. BULLETPROOF FETCH: Manually fetch fundings to attach to transactions
  const { data: fundings, error: fundingsError } = await supabase
    .from('transaction_fundings')
    .select('transaction_id, person_id, amount')
    .eq('user_id', session.userId);

  if (fundingsError) {
    console.error("Dashboard Server Funding Fetch Error:", fundingsError.message);
  }

  // 4. Stitch fundings into transactions so dashboard math works instantly
  const mappedTxs = (txs || []).map((tx) => {
    const txFundings = (fundings || []).filter(f => f.transaction_id === tx.id);
    return {
      ...tx,
      transaction_fundings: txFundings.length > 0 
        ? txFundings.map(f => ({ person_id: f.person_id, amount: Number(f.amount) })) 
        : []
    };
  });

  // 5. Render the interactive Client Component and pass the God Mode flag
  return (
    <DashboardClient 
      sessionName={session.fullName} 
      transactions={mappedTxs} 
      isGodMode={session.isGodMode} 
    />
  );
}