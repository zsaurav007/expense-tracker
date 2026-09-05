import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  
  // You must delete both cookies to satisfy both the layout and the proxy
  cookieStore.delete('session');
  cookieStore.delete('auth-token');
  
  return NextResponse.json({ success: true });
}