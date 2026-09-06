import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase';

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function decrypt(input: string | undefined): Promise<any> {
  if (!input) return null;

  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  
  // Check BOTH 'session' and 'auth-token'
  const sessionToken = cookieStore.get('session')?.value || cookieStore.get('auth-token')?.value;
  
  if (!sessionToken) return null;
  
  // Decrypt the token payload
  const payload = await decrypt(sessionToken);
  if (!payload) return null;

  // 🛑 GOD MODE & ADMIN BYPASS 🛑
  // If explicitly flagged as God Mode or Admin, skip the DB check entirely
  if (payload.isGodMode || payload.role === 'admin' || payload.isAdmin) {
    return payload;
  }

  // Extract standard user ID
  const uid = payload.userId || payload.id;
  
  // If there is no standard user ID, it's likely a special/admin token. Let it through.
  if (!uid) {
    return payload;
  }

  // 🛑 STRICT DATABASE SUSPENSION CHECK 🛑
  const supabase = getServiceSupabase();
  const { data: user, error } = await supabase
    .from('app_users')
    .select('status')
    .eq('id', uid)
    .single();

  // If the user is found and their status is exactly 'SUSPENDED', deny access.
  if (user && user.status === 'SUSPENDED') {
    return null; 
  }

  // If there is an error (e.g., they are not found in app_users because they are an Admin),
  // we let them through just like your original code did before we added this check.
  
  return payload;
}