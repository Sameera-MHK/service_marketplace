import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import SEO from '../components/SEO';

export default function ResetPassword() {
  const { token }   = useParams();
  const navigate    = useNavigate();

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [status,    setStatus]    = useState('idle'); // idle | loading | success | error
  const [message,   setMessage]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const { data } = await api.post('/auth/reset-password', { token, password });
      setStatus('success');
      setMessage(data.message);
      // Redirect to login after 2.5s
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setStatus('error');
      setMessage(err?.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  /* ── Strength indicator ───────────────────────────────────────── */
  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4
    : 3;

  const strengthLabel = ['', 'Too short', 'Weak', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-green-500'][strength];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-stone-50">
      <SEO title="Reset Password" noindex />
      <div className="card w-full max-w-md">

        {/* Icon */}
        <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-1">Set a new password</h1>
        <p className="text-stone-500 text-sm mb-6">
          Choose a strong password you haven't used before.
        </p>

        {status === 'success' ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="font-semibold text-stone-800 mb-1">Password updated!</p>
            <p className="text-stone-500 text-sm mb-4">Redirecting you to login…</p>
            <Link to="/login" className="text-violet-600 font-medium text-sm hover:underline">
              Go to login now →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* New password */}
            <div>
              <label className="label">New password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10" placeholder="Min. 6 characters" required
                  disabled={status === 'loading'}
                />
                <button
                  type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPw ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-stone-200'}`} />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${['', 'text-red-500', 'text-amber-500', 'text-blue-500', 'text-green-600'][strength]}`}>
                    {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="label">Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className={`input ${confirm && confirm !== password ? 'border-red-300 focus:ring-red-200' : ''}`}
                placeholder="Repeat your password" required
                disabled={status === 'loading'}
              />
              {confirm && confirm !== password && (
                <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
              )}
            </div>

            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || (confirm && confirm !== password)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Updating…
                </>
              ) : 'Update Password'}
            </button>
          </form>
        )}

        <p className="text-sm text-stone-500 text-center mt-5">
          <Link to="/login" className="text-violet-600 font-medium hover:underline">
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
