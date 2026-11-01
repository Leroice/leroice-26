// Gated case-study unlock: the code each visitor entered (kept for the
// browser session) and the shared code-entry dialog (UnlockDialog.astro).
// A locked body ships encrypted (lock-crypto.ts); the right code is the
// one that decrypts it.

import { decryptHtml } from './lock-crypto';

const KEY = 'leroice-unlocked';

function codes(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}') ?? {};
  } catch {
    return {};
  }
}

export function savedCode(slug: string): string | null {
  return codes()[slug] ?? null;
}

function saveCode(slug: string, code: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...codes(), [slug]: code }));
  } catch {
    /* private mode: unlock still holds for this page */
  }
}

/** Decrypts a [data-locked-body] element in place. True when it opened. */
export async function openLockedBody(body: HTMLElement, code: string): Promise<boolean> {
  const payload = body.dataset.lockedBody;
  if (payload === undefined) return true; // already open
  const html = await decryptHtml(payload, code);
  if (html === null) return false;
  body.innerHTML = html;
  delete body.dataset.lockedBody;
  return true;
}

export interface UnlockRequest {
  slug: string;
  title: string;
  /** Resolves true when the code is right (and has opened the content). */
  verify: (code: string) => Promise<boolean>;
}

/**
 * Open the shared UnlockDialog for a locked project. Resolves true when the
 * right code is entered (and records the unlock for the session), false when
 * the visitor dismisses the dialog (Esc, backdrop, or close).
 */
export function promptUnlock({ slug, title, verify }: UnlockRequest): Promise<boolean> {
  const dialog = document.querySelector<HTMLDialogElement>('dialog[data-unlock]');
  if (!dialog) return Promise.resolve(false);

  const form = dialog.querySelector<HTMLFormElement>('[data-unlock-form]')!;
  const input = dialog.querySelector<HTMLInputElement>('[data-unlock-input]')!;
  const error = dialog.querySelector<HTMLElement>('[data-unlock-error]')!;
  const titleEl = dialog.querySelector<HTMLElement>('[data-unlock-title]');
  const request = dialog.querySelector<HTMLAnchorElement>('[data-unlock-request]');
  const closeBtn = dialog.querySelector<HTMLButtonElement>('[data-unlock-close]');

  if (titleEl) titleEl.textContent = title;
  if (request) {
    const subject = encodeURIComponent(`Access code request: ${title}`);
    const body = encodeURIComponent(`Hi Leigh, I'd like to see the ${title} case study.`);
    request.href = `mailto:ls@leroice.com?subject=${subject}&body=${body}`;
  }

  input.value = '';
  error.hidden = true;
  form.classList.remove('is-wrong', 'is-checking');

  return new Promise((resolve) => {
    let settled = false;

    // Soft exit first (fade + blur via .is-closing), then actually close.
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      document.documentElement.style.overflow = '';
      form.removeEventListener('submit', onSubmit);
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('click', onBackdrop);
      closeBtn?.removeEventListener('click', onClose);
      dialog.classList.add('is-closing');
      window.setTimeout(() => {
        dialog.classList.remove('is-closing');
        if (dialog.open) dialog.close();
        resolve(ok);
      }, reduceMotion ? 0 : 180);
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let checking = false;
    const onSubmit = async (e: SubmitEvent) => {
      e.preventDefault();
      if (checking) return;
      checking = true;
      // Deriving the key takes a beat on phones: dim Unlock meanwhile.
      form.classList.add('is-checking');
      const code = input.value.trim();
      const ok = await verify(code);
      form.classList.remove('is-checking');
      checking = false;
      if (ok) {
        saveCode(slug, code);
        settle(true);
      } else {
        // Replay the error on every wrong try, not just the first.
        error.hidden = false;
        form.classList.remove('is-wrong');
        void form.offsetWidth;
        form.classList.add('is-wrong');
        input.select();
      }
    };

    const onCancel = (e: Event) => {
      e.preventDefault();
      settle(false);
    };

    const onBackdrop = (e: MouseEvent) => {
      if (e.target === dialog) settle(false);
    };

    const onClose = () => settle(false);

    form.addEventListener('submit', onSubmit);
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('click', onBackdrop);
    closeBtn?.addEventListener('click', onClose);

    dialog.showModal();
    // Lock the page behind the modal — without this, focus/keyboard
    // events can scroll the list underneath and the reader loses their
    // place. Scrolling stays entirely user-initiated.
    document.documentElement.style.overflow = 'hidden';
    // Auto-focus only where a hardware pointer means no keyboard pops:
    // on touch devices, focusing here summons the keyboard AND scrolls
    // the page underneath the dialog. Let the user tap the field.
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      input.focus({ preventScroll: true });
    } else {
      // showModal focuses the close button, which draws a focus ring on
      // phones. Park focus on the dialog itself instead.
      dialog.focus({ preventScroll: true });
    }
  });
}
