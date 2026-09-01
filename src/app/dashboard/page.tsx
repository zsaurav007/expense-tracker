import { getSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardHome() {
  // 1. Secure Server-Side Authentication
  const session = await getSession();
  if (!session) redirect('/');

  const supabase = getServiceSupabase();

  // 2. Fetch all transactions instantly on the server
  const { data: txs } = await supabase
    .from('transactions')
    .select(`
      *,
      expense_profiles ( name ),
      people_profiles ( name )
    `)
    .eq('user_id', session.userId)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  // 3. Render the interactive Client Component and pass the God Mode flag
  return (
    <DashboardClient 
      sessionName={session.fullName} 
      transactions={txs || []} 
      isGodMode={session.isGodMode} 
    />
  );
}