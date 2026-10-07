'use client';

// ================================
// CREW RESET PASSWORD PAGE
// Handles password reset from email link
// ================================

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import {
  recallResetEmail,
  classifyLinkError,
  describeCodeError,
  LINK_PROBLEM_MESSAGES,
  type LinkProblem,
} from '@/lib/passwordReset';
import type { AuthChangeEvent } from '@supabase/supabase-js';

const supabase = getSupabaseBrowserClient();

// checking: working out whether the emailed link gave us a session
// code: the link could not finish here, so ask for the emailed code instead
// password: we have a recovery session, ask for the new password
type Stage = 'checking' | 'code' | 'password' | 'success';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<Stage>('checking');
  const [problem, setProblem] = useState<LinkProblem>('none');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendNote, setResendNote] = useState('');
  // Strict mode runs effects twice in development; the emailed code is single-use, so
  // make sure only one pass ever tries to use it.
  const linkHandled = useRef(false);

  useEffect(() => {
    setEmail(recallResetEmail());

    // The recovery event can arrive from the client's own URL handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStage((current) => (current === 'success' ? current : 'password'));
      }
    });

    const resolveLink = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
      const linkErrorCode = hash.get('error_code') ?? url.searchParams.get('error_code');
      // Keep the one-time code out of the address bar once we have read it
      const cleanUrl = () => window.history.replaceState(null, '', url.pathname);

      // getSession waits for the client to start up. If this browser is the one that asked
      // for the reset, the client has already traded the ?code= for a session by now.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        cleanUrl();
        setStage('password');
        return;
      }

      if (code) {
        // Trade the code ourselves so the real reason for a failure is visible. It fails
        // without any network call when the secret saved by the requesting browser is missing.
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
          cleanUrl();
          setStage('password');
          return;
        }
        console.error(
          '[reset-password] code exchange failed:',
          exchangeError.name,
          exchangeError.code,
          exchangeError.message
        );
        cleanUrl();
        setProblem(classifyLinkError(exchangeError));
      } else if (linkErrorCode) {
        // The email server rejected the link itself (already used, or past its time limit)
        console.error('[reset-password] link rejected:', linkErrorCode, hash.get('error_description'));
        cleanUrl();
        setProblem(linkErrorCode === 'otp_expired' ? 'expired' : 'invalid');
      }

      setStage('code');
    };

    if (!linkHandled.current) {
      linkHandled.current = true;
      resolveLink().catch((err) => {
        console.error('[reset-password] unexpected error while checking the link:', err);
        setProblem('invalid');
        setStage('code');
      });
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // A new email replaces the old one (the old link and code stop working), which is the
  // fix when the link was tapped and used up the code.
  const handleResend = async () => {
    setCodeError('');
    setResendNote('');
    if (!email.trim()) {
      setCodeError('Enter your email address above first, then send the new email.');
      return;
    }
    setIsResending(true);
    try {
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/crew/reset-password`,
      });
      if (sendError) {
        console.error('[reset-password] resend failed:', sendError.name, sendError.code, sendError.message);
        setCodeError(
          sendError.status === 429 || sendError.code === 'over_email_send_rate_limit'
            ? 'You asked for an email a moment ago. Wait a minute, then try again.'
            : 'We could not send the email. Check the address and try again.'
        );
        return;
      }
      setOtp('');
      setResendNote(
        'New email sent. Open it, read the code, and type it above. Do not tap the link in the email. If you do not see it, check your junk folder.'
      );
    } catch (err) {
      console.error('[reset-password] resend failed:', err);
      setCodeError('Something went wrong. Check your connection and try again.');
    } finally {
      setIsResending(false);
    }
  };

  // Finish with the code from the email. This does not depend on which browser or app
  // asked for the reset, so it works from the home-screen app.
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    setIsVerifying(true);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.replace(/\s/g, ''),
        type: 'recovery',
      });

      if (verifyError) {
        console.error('[reset-password] code check failed:', verifyError.name, verifyError.code, verifyError.message);
        setCodeError(describeCodeError(verifyError));
        return;
      }

      setStage('password');
    } catch (err) {
      console.error('[reset-password] code check failed:', err);
      setCodeError('Something went wrong. Check your connection and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;
      
      setStage('success');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.replace('/crew/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (stage === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-600 to-emerald-800">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (stage === 'code') {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-gradient-to-b from-emerald-600 to-emerald-800">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Enter Your Code</h2>
              <p className="text-gray-600 text-sm">{LINK_PROBLEM_MESSAGES[problem]}</p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="resetEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 text-base"
                />
              </div>

              <div>
                <label htmlFor="resetCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Code from the email
                </label>
                <input
                  id="resetCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9 ]*"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter the code"
                  required
                  minLength={6}
                  maxLength={12}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 text-base tracking-widest"
                />
              </div>

              {codeError && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {codeError}
                </div>
              )}

              {resendNote && (
                <div role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm">
                  {resendNote}
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className={`w-full py-4 px-4 rounded-xl font-semibold text-white transition-all text-base ${
                  isVerifying
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-emerald-600 active:bg-emerald-700 hover:bg-emerald-700'
                }`}
              >
                {isVerifying ? 'Checking...' : 'Continue'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="w-full mt-3 py-3 px-4 border border-emerald-600 text-emerald-700 rounded-xl font-medium hover:bg-emerald-50 transition-colors disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Send me a new email'}
            </button>

            <button
              onClick={() => router.replace('/crew/login')}
              className="w-full mt-4 text-sm text-emerald-700 underline"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'success') {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-gradient-to-b from-emerald-600 to-emerald-800">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Reset!</h2>
            <p className="text-gray-600 text-sm mb-4">
              Your password has been successfully reset. Redirecting to sign in...
            </p>
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 sm:px-8 bg-gradient-to-b from-emerald-600 to-emerald-800">
      <div className="w-full max-w-sm sm:max-w-md mx-auto">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg
              className="w-12 h-12 sm:w-14 sm:h-14 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Reset Password</h1>
          <p className="text-emerald-200 text-sm sm:text-base">Create a new password for your account</p>
        </div>

        {/* Reset Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={6}
                className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 text-base"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
                className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 text-base"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 px-4 rounded-xl font-semibold text-white transition-all text-base ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 active:bg-emerald-700 hover:bg-emerald-700'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Resetting...
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-emerald-200 text-sm">
          <button
            onClick={() => router.replace('/crew/login')}
            className="underline hover:text-white"
          >
            Back to Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
