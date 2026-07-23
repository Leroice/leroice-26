// Gated case-study unlock: session store, code hashing, and the shared
// code-entry dialog (UnlockDialog.astro). A locked project's frontmatter
// carries `lockHash` — the SHA-256 hex of its access code — so codes are
// verified client-side without shipping the code itself. Unlocks last for
// the browser session.

const KEY = 'leroice-unlocked';

function unlockedSet(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function isUnlocked(slug: string): boolean {
  return unlockedSet().has(slug);
}

export function markUnlocked(slug: string): void {
  const set = unlockedSet();
  set.add(slug);
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* private mode — unlock still holds for this page */
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface UnlockRequest {
  slug: string;
  title: string;
  hash: string;
}

/**
 * Open the shared UnlockDialog for a locked project. Resolves true when the
 * right code is entered (and records the unlock for the session), false when
 * the visitor dismisses the dialog (Esc, backdrop, or close).
 */
export function promptUnlock({ slug, title, hash }: UnlockRequest): Promise<boolean> {
  const dialog = document.querySelector<HTMLDialogElement>('dialog[data-unlock]');
  if (!dialog || !hash) return Promise.resolve(false);

  const form = dialog.querySelector<HTMLFormElement>('[data-unlock-form]')!;
  const input = dialog.querySelector<HTMLInputElement>('[data-unlock-input]')!;
  const error = dialog.querySelector<HTMLElement>('[data-unlock-error]')!;
  const titleEl = dialog.querySelector<HTMLElement>('[data-unlock-title]');
  const request = dialog.querySelector<HTMLAnchorElement>('[data-unlock-request]');

  if (titleEl) titleEl.textContent = title;
  if (request) {
    const subject = encodeURIComponent(`Access code request — ${title}`);
    const body = encodeURIComponent(`Hi Leigh — I'd like to view the ${title} case study.`);
    request.href = `mailto:ls@leroice.com?subject=${subject}&body=${body}`;
  }

  input.value = '';
  error.hidden = true;

  return new Promise((resolve) => {
    let settled = false;

    // Soft exit first (fade + blur via .is-closing), then actually close.
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      form.removeEventListener('submit', onSubmit);
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('click', onBackdrop);
      dialog.classList.add('is-closing');
      window.setTimeout(() => {
        dialog.classList.remove('is-closing');
        if (dialog.open) dialog.close();
        resolve(ok);
      }, 240);
    };

    const onSubmit = async (e: SubmitEvent) => {
      e.preventDefault();
      const entered = await sha256Hex(input.value.trim());
      if (entered === hash) {
        markUnlocked(slug);
        settle(true);
      } else {
        error.hidden = false;
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

    form.addEventListener('submit', onSubmit);
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('click', onBackdrop);

    dialog.showModal();
    input.focus();
  });
}
