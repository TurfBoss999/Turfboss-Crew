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

export const LINK_PROBLEM_MESSAGES: Record<LinkProblem, string> = {
  none: 'Enter the email address you asked for the reset with, and the code from your reset email.',
  'other-browser':
    'This reset link was opened in a different browser or app than the one you asked for the reset in, so it cannot finish here. No problem: enter the code from the same email below.',
  expired:
    'This reset link has expired or was already used. Enter the newest code from your email below, or go back and ask for a new reset.',
  invalid:
    'We could not use this reset link. Enter the code from your email below, or go back and ask for a new reset.',
};

export function describeCodeError(error: AuthErrorLike): string {
  if (error.status === 429 || error.code === 'over_request_rate_limit') {
    return 'Too many attempts. Wait a minute, then try again.';
  }
  return 'That code is incorrect or has expired. Use the code from the newest reset email, or go back and ask for a new one.';
}
