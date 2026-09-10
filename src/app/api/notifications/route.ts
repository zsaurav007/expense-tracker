import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceSupabase();
    
    // --- SMART SAVINGS REMINDER GENERATOR ---
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    // 1. Fetch all savings profiles that have notification settings
    const { data: savingsProfiles } = await supabase
      .from('savings_profiles')
      .select('*')
      .eq('user_id', session.userId)
      .not('installment_day', 'is', null)
      .not('notify_days_before', 'is', null);

    if (savingsProfiles && savingsProfiles.length > 0) {
      const newNotifs = [];
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();

      for (const p of savingsProfiles) {
        const dueDay = p.installment_day;
        const notifyWindowStart = dueDay - p.notify_days_before;

        // If today falls within the notification window
        if (currentDay >= notifyWindowStart && currentDay <= dueDay) {
          
          // Check if we ALREADY generated a reminder for this specific goal this month
          const { data: existing } = await supabase.from('app_notifications')
            .select('id')
            .eq('type', 'SAVINGS_REMINDER')
            .eq('action_url', `/dashboard/savings/${p.id}`)
            .gte('created_at', startOfMonth)
            .limit(1);

          if (!existing || existing.length === 0) {
            newNotifs.push({
              user_id: session.userId,
              type: 'SAVINGS_REMINDER',
              title: 'Savings Installment Due',
              message: `Your installment of ৳${p.monthly_installment} for "${p.name}" is due on the ${dueDay}th.`,
              action_url: `/dashboard/savings/${p.id}`
            });
          }
        }
      }

      // Bulk insert any missing notifications
      if (newNotifs.length > 0) {
        await supabase.from('app_notifications').insert(newNotifs);
      }
    }
    // --- END SMART GENERATOR ---

    // Now fetch the combined list of notifications
    const { data, error } = await supabase
      .from('app_notifications')
      .select('*')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    return NextResponse.json({ notifications: data });
  } catch (error: any) {
    console.error("[NOTIFICATIONS API CRASH]:", error); 
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, markAll } = await request.json();
    const supabase = getServiceSupabase();

    let query = supabase.from('app_notifications').update({ is_read: true }).eq('user_id', session.userId);

    if (!markAll && id) {
      query = query.eq('id', id);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[NOTIFICATIONS PATCH CRASH]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceSupabase();
    
    const { error } = await supabase
      .from('app_notifications')
      .delete()
      .eq('user_id', session.userId)
      .eq('is_read', true); 

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[NOTIFICATIONS DELETE CRASH]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}