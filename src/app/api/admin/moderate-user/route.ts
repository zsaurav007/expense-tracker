import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'exptracker' }
});

export async function POST(request: Request) {
  try {
    const { userId, action } = await request.json();

    if (!userId || !['ACCEPT', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    if (action === 'ACCEPT') {
      // Update status to ACTIVE
      const { error } = await supabase
        .from('app_users')
        .update({ status: 'ACTIVE' })
        .eq('id', userId);

      if (error) throw error;
      
    } else if (action === 'REJECT') {
      // Delete the pending user so they can re-register if needed
      const { error } = await supabase
        .from('app_users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: `User successfully ${action.toLowerCase()}ed.` }, { status: 200 });

  } catch (error) {
    console.error('Moderation API Error:', error);
    return NextResponse.json({ error: 'Failed to process moderation action' }, { status: 500 });
  }
}