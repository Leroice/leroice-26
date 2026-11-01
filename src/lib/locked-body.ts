// Build-time: encrypts a locked case study's rendered body with its access
// code, read from the LOCK_CODE_<SLUG> env var (e.g. LOCK_CODE_WU_AU_WALLET).
// No code set means no body ships at all, never the plain text.
import { encryptHtml } from './lock-crypto';

export async function lockedBody(slug: string, html: string): Promise<string> {
  const name = `LOCK_CODE_${slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  const code = process.env[name];
  if (!code) {
    console.warn(`[lock] ${name} is not set: ${slug} ships with an empty body.`);
    return '';
  }
  return encryptHtml(html, code);
}
