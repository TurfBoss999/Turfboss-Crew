// ================================
// PASSWORD RESET HELPERS
// Shared by the login page (requests the reset) and the reset page (finishes it)
// ================================

// The reset email address is remembered for this tab only, so the code-entry step can
// prefill it. Storage can be blocked or empty (private mode, a different app), so every
// access is wrapped and the page works without it.
const RESET_EMAIL_KEY = 'crew-reset-email';

export function rememberResetEmail(email: string) {
  try {
    window.sessionStorage.setItem(RESET_EMAIL_KEY, email);
  } catch {
    // ignore: the reset page just asks for the address again
  }
}

export function recallResetEmail(): string {
  try {
    return window.sessionStorage.getItem(RESET_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

// Why the emailed link could not finish on this device.
export type LinkProblem = 'none' | 'other-browser' | 'expired' | 'invalid';

type AuthErrorLike = { name?: string; code?: string; message?: string; status?: number };

// The link flow (PKCE) needs a secret that was saved in the browser that requested the
// reset. A link opened in another browser, an email app's own browser or the home-screen
// app cannot finish, and the library says so with this specific error.
export function classifyLinkError(error: AuthErrorLike | null | undefined): LinkProblem {
  if (!error) return 'invalid';
  if (error.code === 'pkce_code_verifier_not_found' || error.name === 'AuthPKCECodeVerifierMissingError') {
    return 'other-browser';
  }
  const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  if (text.includes('expired') || text.includes('already') || text.includes('not found')) return 'expired';
  return 'invalid';
}

// The emailed link and the emailed code are the same one-time key: using either one
// cancels the other, and asking for a new email cancels the old one. So once the link has
// been opened, the code in that same email no longer works, and the fix is a new email.
export const LINK_PROBLEM_MESSAGES: Record<LinkProblem, string> = {
  none: 'Open your reset email and type the code from it here. Do not tap the link in the email: opening the link uses up the code.',
  'other-browser':
    'This reset link cannot finish in this browser or app, and opening it used up the code in that email. Send yourself a new email below, then type the new code here. Do not tap the link in the new email.',
  expired:
    'This reset link has expired or was already used, and the code in that email stopped working with it. Send yourself a new email below, then type the new code here. Do not tap the link in the new email.',
  invalid:
    'We could not use this reset link, and the code in that email may no longer work. Send yourself a new email below, then type the new code here. Do not tap the link in the new email.',
};

export const CODE_ERROR_HINT =
  'That code is incorrect or has expired. If you tapped the link in that email, or asked for another email since, the code no longer works. Send yourself a new email, then type the newest code without tapping the link.';

export function describeCodeError(error: AuthErrorLike): string {
  if (error.status === 429 || error.code === 'over_request_rate_limit') {
    return 'Too many attempts. Wait a minute, then try again.';
  }
  return CODE_ERROR_HINT;
}
