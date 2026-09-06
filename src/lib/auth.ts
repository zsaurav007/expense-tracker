import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase'; // IMPORT ADDED

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
  // 1. Guard against empty inputs before attempting to verify
  if (!input) return null;

  try {
    // 2. Wrap the verification in a try/catch
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // 3. Catch errors (like Invalid Compact JWS, expired tokens) and return null
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  
  // CRITICAL FIX: Check BOTH 'session' and 'auth-token' to perfectly match proxy.ts
  const sessionToken = cookieStore.get('session')?.value || cookieStore.get('auth-token')?.value;
  
  if (!sessionToken) return null;
  
  // Decrypt the token payload
  const payload = await decrypt(sessionToken);
  if (!payload) return null;

  // Extract user ID (handling both payload structures just in case)
  const uid = payload.userId || payload.id;
  if (!uid) return null;

  // 🛑 STRICT DATABASE SUSPENSION CHECK 🛑
  // We query the DB to ensure they haven't been suspended since the token was issued.
  const supabase = getServiceSupabase();
  const { data: user, error } = await supabase
    .from('app_users')
    .select('status')
    .eq('id', uid)
    .single();

  // If there is an error, the user was deleted, or their status is SUSPENDED, instantly deny access.
  if (error || !user || user.status === 'SUSPENDED') {
    return null; 
  }

  // Safely return the payload if everything is valid
  return payload;
}