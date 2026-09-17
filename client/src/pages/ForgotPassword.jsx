import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/axios';
import SEO from '../components/SEO';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [status,  setStatus]  = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setMessage('');

    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setStatus('success');
      setMessage(data.message);
    } catch (err) {
      setStatus('error');
      setMessage(err?.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-stone-50">
      <SEO title="Forgot Password" noindex />
      <div className="card w-full max-w-md">

        {/* Icon */}
        <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-1">Forgot your password?</h1>
        <p className="text-stone-500 text-sm mb-6">
          Enter your email or phone number and we'll send you a reset link.
        </p>

        {status === 'success' ? (
          <div className="text-center py-4">
            {/* Success tick */}
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="font-semibold text-stone-800 mb-1">Reset link sent!</p>
            <p className="text-stone-500 text-sm leading-relaxed mb-6">
              If <span className="font-medium text-stone-700">{email}</span> is registered,
              you'll receive a reset link via email or SMS within a minute.
            </p>
            <p className="text-xs text-stone-400">
              Didn't receive it?{' '}
              <button
                onClick={() => { setStatus('idle'); setMessage(''); }}
                className="text-violet-600 font-medium hover:underline"
              >
                Try again
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address or Phone number</label>
              <input
                type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input" placeholder="you@example.com or 0771234567" required
                disabled={status === 'loading'}
                autoComplete="username"
              />
              <p className="text-xs text-stone-400 mt-1.5 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Workers registered with phone will receive an SMS link
              </p>
            </div>

            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit" disabled={status === 'loading'}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Sending…
                </>
              ) : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="text-sm text-stone-500 text-center mt-5">
          Remember it?{' '}
          <Link to="/login" className="text-violet-600 font-medium hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
