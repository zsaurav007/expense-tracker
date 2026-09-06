import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// 🛑 FORCE DYNAMIC: Prevents Next.js from caching a previous 500 error
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceSupabase();
    
    const { data, error } = await supabase
      .from('app_notifications')
      .select('*')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error("[NOTIFICATIONS SUPABASE ERROR]:", error);
      throw error;
    }

    return NextResponse.json({ notifications: data });
  } catch (error: any) {
    // THIS will now print the exact issue in your terminal
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