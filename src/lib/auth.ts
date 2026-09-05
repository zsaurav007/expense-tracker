import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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
  // FIXED: await cookies() is required in Next.js 15+
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  
  if (!session) return null;
  
  // Safely returns the payload if valid, or null if decryption fails
  return await decrypt(session);
}