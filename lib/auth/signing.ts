// HMAC-SHA256 signing for session cookies.
// Uses Web Crypto so it works in both Node and Edge runtimes (proxy).

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured');
  return secret;
}

export async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Returns true when `sig` is the valid signature of `payload`. Never throws. */
export async function verifySignature(payload: string, sig: string): Promise<boolean> {
  try {
    return safeEqual(sig, await sign(payload));
  } catch {
    return false;
  }
}
