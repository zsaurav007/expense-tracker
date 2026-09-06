import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Helper function to handle BOTH Cookie-based sessions and Supabase Native Tokens
async function verifyAdminAuth(request: Request, supabase: any) {
  // 1. Try to validate via custom cookie (auth.ts)
  const session = await getSession();
  if (session) return true;

  // 2. Try to validate via Supabase Native Auth Header (Bearer Token)
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (user && !error) return true;
  }

  // 3. Neither method provided valid credentials
  return false;
}

// GET: Fetch recent broadcasts to display in the Admin UI
export async function GET(request: Request) {
  try {
    const supabase = getServiceSupabase();
    
    // Check Authorization
    const isAuthorized = await verifyAdminAuth(request, supabase);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data, error } = await supabase
      .from('app_notifications')
      .select('id, title, message, created_at, action_url')
      .eq('type', 'ADMIN_MESSAGE')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Deduplicate by title
    const uniqueBroadcasts = Array.from(new Map(data.map(item => [item.title, item])).values());

    return NextResponse.json({ broadcasts: uniqueBroadcasts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Send a new broadcast
export async function POST(request: Request) {
  try {
    const supabase = getServiceSupabase();
    
    // Check Authorization
    const isAuthorized = await verifyAdminAuth(request, supabase);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId, title, message, actionUrl } = await request.json();

    let usersToNotify: any[] = [];

    if (targetUserId === 'ALL') {
      // Use .ilike for case-insensitive matching in case DB stores 'active'
      const { data, error: userError } = await supabase
        .from('app_users')
        .select('id')
        .ilike('status', '%active%'); 
        
      if (userError) throw new Error(`User fetch failed: ${userError.message}`);
      usersToNotify = data || [];
    } else {
      usersToNotify = [{ id: targetUserId }];
    }

    // Catch empty arrays before attempting to insert
    if (usersToNotify.length === 0) {
      return NextResponse.json({ error: 'No active users found to notify' }, { status: 400 });
    }

    const notifications = usersToNotify.map(user => ({
      user_id: user.id,
      type: 'ADMIN_MESSAGE',
      title,
      message,
      action_url: actionUrl || null,
      is_read: false // Explicitly satisfy the schema's bool requirement
    }));

    const { error: insertError } = await supabase.from('app_notifications').insert(notifications);
    if (insertError) throw insertError;

    return NextResponse.json({ success: true, count: notifications.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Retract/Delete a broadcast by its title
export async function DELETE(request: Request) {
  try {
    const supabase = getServiceSupabase();
    
    // Check Authorization
    const isAuthorized = await verifyAdminAuth(request, supabase);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');

    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

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