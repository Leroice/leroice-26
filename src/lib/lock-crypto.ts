// Locked case studies ship their body encrypted: AES-GCM with a key derived
// from the access code (PBKDF2, SHA-256). The code itself never ships, and a
// wrong code fails the GCM check, so decrypting is also the code check.
// Runs at build (Node) and in the browser: both have WebCrypto.

const ITERATIONS = 210_000;
const enc = new TextEncoder();

const toB64 = (u: Uint8Array) => {
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
};
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function keyFor(code: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(code.trim()), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** salt.iv.ciphertext, each base64. */
export async function encryptHtml(html: string, code: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(code, salt), enc.encode(html));
  return [salt, iv, new Uint8Array(ct)].map(toB64).join('.');
}

/** The HTML, or null when the code is wrong or the payload is malformed. */
export async function decryptHtml(payload: string, code: string): Promise<string | null> {
  try {
    const [salt, iv, ct] = payload.split('.').map(fromB64);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await keyFor(code, salt), ct);
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}
