import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// Prevent Next.js from caching this route so it runs fresh every time
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Authenticate the Cron Job (Vercel standard practice)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
  }

  // Use the service client to bypass RLS since there is no active user session
  const supabase = getServiceSupabase();
  const notificationsToInsert: any[] = [];
  
  // Get today's date and zero out the time for accurate math
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  try {
    // ==========================================
    // CHECK 1: RECURRING EXPENSES (Monthly Bills)
    // ==========================================
    const { data: expenses } = await supabase
      .from('expense_profiles')
      .select('id, user_id, name, billing_day, notify_days_before')
      .not('billing_day', 'is', null);

    if (expenses) {
      for (const exp of expenses) {
        if (!exp.notify_days_before) continue;

        // Calculate actual billing date for this month
        let billingDate = new Date(currentYear, currentMonth, exp.billing_day);
        
        // Handle overflow (e.g., if billing day is 31st, but month is February)
        if (billingDate.getMonth() !== currentMonth) {
          billingDate = new Date(currentYear, currentMonth + 1, 0); // Clamp to last day of month
        }

        // Calculate the exact date the user wants to be reminded
        const reminderDate = new Date(billingDate);
        reminderDate.setDate(billingDate.getDate() - exp.notify_days_before);

        // FIX: Time Window Match -> If today is between the reminder start date and the actual billing date
        if (today.getTime() >= reminderDate.getTime() && today.getTime() <= billingDate.getTime()) {
          const actionUrl = `/dashboard/expense/profiles/${exp.id}`;
          
          // Anti-Spam Check: Verify we haven't already notified them this month
          const { data: existing } = await supabase
            .from('app_notifications')
            .select('id')
            .eq('user_id', exp.user_id)
            .eq('type', 'RECURRING_BILL')
            .eq('action_url', actionUrl)
            .gte('created_at', new Date(currentYear, currentMonth, 1).toISOString())
            .limit(1);

          if (!existing || existing.length === 0) {
            // Calculate dynamic days remaining for the message
            const daysRemaining = Math.ceil((billingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const dayText = daysRemaining === 0 ? 'today' : `in ${daysRemaining} days`;

            notificationsToInsert.push({
              user_id: exp.user_id,
              type: 'RECURRING_BILL',
              title: `Upcoming Bill: ${exp.name}`,
              message: `Your ${exp.name} bill is due ${dayText}.`,
              action_url: actionUrl
            });
          }
        }
      }
    }

    // ==========================================
    // CHECK 2: LEDGER DUE DATES (One-off specific dates)
    // ==========================================
    const { data: ledgers } = await supabase
      .from('people_profiles')
      .select('id, user_id, name, due_date, notify_days_before')
      .not('due_date', 'is', null);

    if (ledgers) {
      for (const person of ledgers) {
        if (!person.notify_days_before) continue;

        const dueDate = new Date(person.due_date);
        dueDate.setHours(0, 0, 0, 0);

        const reminderDate = new Date(dueDate);
        reminderDate.setDate(dueDate.getDate() - person.notify_days_before);

        // FIX: Time Window Match
        if (today.getTime() >= reminderDate.getTime() && today.getTime() <= dueDate.getTime()) {
          const actionUrl = `/dashboard/ledger/${person.id}`;

          // Anti-Spam Check: Verify we haven't already notified them for this specific date
          const { data: existing } = await supabase
            .from('app_notifications')
            .select('id')
            .eq('user_id', person.user_id)
            .eq('type', 'LEDGER_DUE')
            .eq('action_url', actionUrl)
            .gte('created_at', reminderDate.toISOString())
            .limit(1);

          if (!existing || existing.length === 0) {
            notificationsToInsert.push({
              user_id: person.user_id,
              type: 'LEDGER_DUE',
              title: `Ledger Reminder: ${person.name}`,
              message: `Your ledger with ${person.name} is due on ${dueDate.toLocaleDateString()}.`,
              action_url: actionUrl
            });
          }
        }
      }
    }

    // ==========================================
    // CHECK 3: MONTHLY INSTALLMENT REMINDERS
    // ==========================================
    const { data: installments } = await supabase
      .from('people_profiles')
      .select('id, user_id, name, installment_day, notify_days_before')
      .not('installment_day', 'is', null);

    if (installments) {
      for (const person of installments) {
        const notifyDays = person.notify_days_before || 3;

        // Calculate actual installment date for this month
        let installmentDate = new Date(currentYear, currentMonth, person.installment_day);
        
        // Handle overflow (e.g., if installment day is 31st, but month has fewer days)
        if (installmentDate.getMonth() !== currentMonth) {
          installmentDate = new Date(currentYear, currentMonth + 1, 0); 
        }

        const reminderDate = new Date(installmentDate);
        reminderDate.setDate(installmentDate.getDate() - notifyDays);

        // Time window check: If today falls between the reminder window and the installment day
        if (today.getTime() >= reminderDate.getTime() && today.getTime() <= installmentDate.getTime()) {
          const actionUrl = `/dashboard/ledger/${person.id}`;

          // Anti-Spam Check: Ensure we haven't already notified them for this month's installment
          const { data: existing } = await supabase
            .from('app_notifications')
            .select('id')
            .eq('user_id', person.user_id)
            .eq('type', 'INSTALLMENT_DUE')
            .eq('action_url', actionUrl)
            .gte('created_at', new Date(currentYear, currentMonth, 1).toISOString())
            .limit(1);

          if (!existing || existing.length === 0) {
            const daysRemaining = Math.ceil((installmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const dayText = daysRemaining === 0 ? 'today' : `in ${daysRemaining} days`;

            notificationsToInsert.push({
              user_id: person.user_id,
              type: 'INSTALLMENT_DUE',
              title: `Installment Reminder: ${person.name}`,
              message: `Your monthly installment for ${person.name} is due ${dayText} (on the ${person.installment_day}th).`,
              action_url: actionUrl
            });
          }
        }
      }
    }

    // ==========================================
    // EXECUTE NOTIFICATION INSERTS
    // ==========================================
    if (notificationsToInsert.length > 0) {
      const { error } = await supabase.from('app_notifications').insert(notificationsToInsert);
      if (error) throw error;
    }

    return NextResponse.json({ 
      success: true, 
      notifications_generated: notificationsToInsert.length 
    });

  } catch (error: any) {
    console.error("Cron Reminder Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}