// Invite-link + clipboard helpers for private poker rooms.
// Non-React so they stay importable from tests.

/** Invitation link friends open: <origin>/#/poker/join/<CODE>. */
export function pokerJoinUrl(code: string): string {
  return `${window.location.origin}/#/poker/join/${code.toUpperCase()}`;
}

/** Copy text; falls back to the execCommand path where the async clipboard
 *  API is unavailable (older mobile browsers, non-secure contexts). */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
