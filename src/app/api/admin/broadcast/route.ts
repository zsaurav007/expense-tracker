import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Fetch recent broadcasts to display in the Admin UI
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceSupabase();
    
    // Fetch recent admin messages
    const { data, error } = await supabase
      .from('app_notifications')
      .select('id, title, message, created_at, action_url')
      .eq('type', 'ADMIN_MESSAGE')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Deduplicate by title so we don't show 50 identical rows if sent to 50 users
    const uniqueBroadcasts = Array.from(new Map(data.map(item => [item.title, item])).values());

    return NextResponse.json({ broadcasts: uniqueBroadcasts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Send a new broadcast
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetUserId, title, message, actionUrl } = await request.json();
    const supabase = getServiceSupabase();

    let usersToNotify: any[] = [];

    // If targetUserId is 'ALL', fetch all active users
    if (targetUserId === 'ALL') {
      const { data } = await supabase.from('app_users').select('id').eq('status', 'ACTIVE');
      usersToNotify = data || [];
    } else {
      usersToNotify = [{ id: targetUserId }];
    }

    // Prepare the insert array
    const notifications = usersToNotify.map(user => ({
      user_id: user.id,
      type: 'ADMIN_MESSAGE',
      title,
      message,
      action_url: actionUrl || null
    }));

    // Bulk insert notifications
    const { error } = await supabase.from('app_notifications').insert(notifications);
    if (error) throw error;

    return NextResponse.json({ success: true, count: notifications.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Retract/Delete a broadcast by its title
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');

    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const supabase = getServiceSupabase();
    
    // Delete ALL admin messages with this exact title from everyone's inbox
    const { error } = await supabase
      .from('app_notifications')
      .delete()
      .eq('type', 'ADMIN_MESSAGE')
      .eq('title', title);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}