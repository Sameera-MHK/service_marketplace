/**
 * WorkerPayoutSection
 *
 * Reusable balance + withdrawal + payout-details UI.
 * Used by both the Consultations page and the Live Classes page,
 * each pointing at their own backend endpoints:
 *
 *   Consultations:
 *     balanceUrl  = '/consultations/me/balance'
 *     requestUrl  = '/consultations/me/payouts/request'
 *     historyUrl  = '/consultations/me/payouts'
 *     queryNs     = 'consultation'
 *
 *   Live Classes:
 *     balanceUrl  = '/live-classes/me/balance'
 *     requestUrl  = '/live-classes/me/payouts/request'
 *     historyUrl  = '/live-classes/me/payouts'
 *     queryNs     = 'live-class'
 *
 * Payout details (bank / wallet) are shared — both point at
 *   '/consultations/me/payout-details'
 */
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

// ── Status badge (shared) ────────────────────────────────────────────────────

export function PayoutStatusBadge({ status }) {
  const meta = {
    pending:    { label: 'Pending',    color: 'bg-amber-100 text-amber-700' },
    processing: { label: 'Processing', color: 'bg-blue-100  text-blue-700'  },
    completed:  { label: 'Paid',       color: 'bg-green-100 text-green-700' },
    rejected:   { label: 'Rejected',   color: 'bg-red-100   text-red-700'   },
    cancelled:  { label: 'Cancelled',  color: 'bg-stone-100 text-stone-600' },
  };
  const m = meta[status] || { label: status, color: 'bg-stone-100 text-stone-600' };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.color}`}>
      {m.label}
    </span>
  );
}

// ── Balance card ─────────────────────────────────────────────────────────────

export function BalanceCard({
  balanceUrl  = '/consultations/me/balance',
  requestUrl  = '/consultations/me/payouts/request',
  historyUrl  = '/consultations/me/payouts',
  queryNs     = 'consultation',
  description = 'Earned from completed sessions. SkillHub holds funds and pays out to your account on request — typically within 2 business days.',
}) {
  const qc = useQueryClient();

  const { data: balance } = useQuery({
    queryKey: [`${queryNs}:balance`],
    queryFn: () => api.get(balanceUrl).then((r) => r.data.data),
  });
  const { data: details } = useQuery({
    queryKey: ['worker:payout-details'],
    queryFn: () => api.get('/consultations/me/payout-details').then((r) => r.data.data),
  });
  const { data: history = [] } = useQuery({
    queryKey: [`${queryNs}:payouts`],
    queryFn: () => api.get(historyUrl).then((r) => r.data.data),
  });

  const [withdrawCur,    setWithdrawCur]    = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [error,          setError]          = useState('');

  const available  = balance?.available || {};
  const pending    = balance?.pending   || {};
  const currencies = Array.from(new Set([...Object.keys(available), ...Object.keys(pending)]));

  async function submitWithdraw() {
    setError('');
    if (!details?.method) {
      setError('Add payout details below before requesting a withdrawal.');
      return;
    }
    try {
      await api.post(requestUrl, {
        amount:   Number(withdrawAmount),
        currency: withdrawCur,
      });
      setWithdrawCur(null);
      setWithdrawAmount('');
      qc.invalidateQueries({ queryKey: [`${queryNs}:balance`] });
      qc.invalidateQueries({ queryKey: [`${queryNs}:payouts`] });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request withdrawal');
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6 mb-5 shadow-sm">
      <h2 className="text-lg font-bold text-stone-900 mb-1">Balance</h2>
      <p className="text-sm text-stone-500 mb-4">{description}</p>

      {currencies.length === 0 ? (
        <p className="text-sm text-stone-400 italic">
          No earnings yet. Completed sessions will show up here.
        </p>
      ) : (
        <div className="space-y-3">
          {currencies.map((cur) => {
            const avail = available[cur] || 0;
            const pend  = pending[cur]   || 0;
            return (
              <div
                key={cur}
                className="flex items-center justify-between p-4 rounded-xl
                           bg-gradient-to-br from-stone-50 to-amber-50/40 border border-stone-200"
              >
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">
                    {cur} balance
                  </p>
                  <p className="text-2xl font-black text-stone-900">
                    {Number(avail).toLocaleString()}
                  </p>
                  {pend > 0 && (
                    <p className="text-xs text-amber-700 mt-1">
                      + {Number(pend).toLocaleString()} {cur} pending withdrawal
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setWithdrawCur(cur); setWithdrawAmount(String(avail)); }}
                  disabled={avail <= 0}
                  className="bg-violet-600 text-white text-sm font-semibold px-4 py-2
                             rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
                >
                  Withdraw
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Withdraw modal */}
      {withdrawCur && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-stone-900 mb-1">
              Withdraw {withdrawCur}
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              Funds will be sent to your saved{' '}
              <span className="font-medium">{details?.method?.replace('_', ' ')}</span> details.
              Available:{' '}
              <span className="font-semibold">
                {(available[withdrawCur] || 0).toLocaleString()} {withdrawCur}
              </span>
            </p>

            <label className="text-xs font-semibold text-stone-600 block mb-1">Amount</label>
            <input
              type="number"
              min="1"
              max={available[withdrawCur] || 0}
              step="100"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm mb-4
                         focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
            />

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={submitWithdraw}
                disabled={!withdrawAmount || Number(withdrawAmount) <= 0}
                className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-lg
                           hover:bg-violet-700 disabled:opacity-50 flex-1 transition-colors"
              >
                Request withdrawal
              </button>
              <button
                onClick={() => { setWithdrawCur(null); setError(''); }}
                className="text-sm text-stone-600 px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout history */}
      {history.length > 0 && (
        <details className="mt-5 pt-4 border-t border-stone-100">
          <summary className="text-sm text-stone-500 cursor-pointer hover:text-stone-700 select-none">
            Withdrawal history ({history.length})
          </summary>
          <div className="mt-3 space-y-2">
            {history.map((p) => (
              <div
                key={p._id}
                className="flex items-center justify-between p-3 bg-stone-50 rounded-lg text-sm"
              >
                <div>
                  <span className="font-semibold">
                    {Number(p.amount).toLocaleString()} {p.currency}
                  </span>
                  <span className="text-stone-400 ml-2">
                    via {p.method?.replace('_', ' ')}
                  </span>
                  <div className="text-xs text-stone-400">
                    {new Date(p.requestedAt).toLocaleDateString()}
                  </div>
                </div>
                <PayoutStatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

// ── Payout details card (shared — same bank/wallet for all withdrawals) ───────

export function PayoutDetailsCard() {
  const qc = useQueryClient();

  const { data: details } = useQuery({
    queryKey: ['worker:payout-details'],
    queryFn: () => api.get('/consultations/me/payout-details').then((r) => r.data.data),
  });

  const [method,        setMethod]        = useState('bank');
  const [bankName,      setBankName]      = useState('');
  const [branch,        setBranch]        = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [walletNumber,  setWalletNumber]  = useState('');
  const [walletHolder,  setWalletHolder]  = useState('');
  const [error,         setError]         = useState('');
  const [savedAt,       setSavedAt]       = useState(null);
  const [hydrated,      setHydrated]      = useState(false);

  useEffect(() => {
    if (!details || hydrated) return;
    setMethod(details.method || 'bank');
    setBankName(details.bankName || '');
    setBranch(details.branch || '');
    setAccountNumber(details.accountNumber || '');
    setAccountHolder(details.accountHolder || '');
    setWalletNumber(details.walletNumber || '');
    setWalletHolder(details.walletHolder || '');
    setHydrated(true);
  }, [details, hydrated]);

  async function save() {
    setError('');
    try {
      await api.put('/consultations/me/payout-details', {
        method, bankName, branch, accountNumber, accountHolder, walletNumber, walletHolder,
      });
      qc.invalidateQueries({ queryKey: ['worker:payout-details'] });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
  }

  const hasDetails = !!details?.method;
  const inputCls   = 'w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200';

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6 mb-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            Payout details
            {hasDetails && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                Saved
              </span>
            )}
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Where should we send your earnings? SkillHub collects payments via Stripe and pays
            you out through your preferred local rail.
          </p>
        </div>
      </div>

      {/* Method selector */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { id: 'bank',           label: 'Bank transfer',  sub: 'Any bank' },
          { id: 'mobile_money',   label: 'Mobile money',   sub: 'Wallet' },
          { id: 'digital_wallet', label: 'Digital wallet', sub: 'Wallet' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={`p-3 rounded-xl border text-left transition-colors ${
              method === m.id
                ? 'border-violet-600 bg-violet-50'
                : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="text-sm font-semibold text-stone-800">{m.label}</div>
            <div className="text-xs text-stone-500">{m.sub}</div>
          </button>
        ))}
      </div>

      {/* Fields */}
      {method === 'bank' ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1">Bank name</label>
            <input value={bankName} onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Example Bank" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1">
              Branch <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <input value={branch} onChange={(e) => setBranch(e.target.value)}
              placeholder="e.g. Main Street" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1">Account number</label>
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1">Account holder name</label>
            <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)}
              className={inputCls} />
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1">
              {method === 'mobile_money' ? 'Mobile money' : 'Digital wallet'} number
            </label>
            <input value={walletNumber} onChange={(e) => setWalletNumber(e.target.value)}
              placeholder="e.g. 077XXXXXXX" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1">Registered name</label>
            <input value={walletHolder} onChange={(e) => setWalletHolder(e.target.value)}
              className={inputCls} />
          </div>
        </div>
      )}

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={save}
          className="bg-violet-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-violet-700 transition-colors"
        >
          Save payout details
        </button>
        {savedAt && Date.now() - savedAt < 4000 && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
      </div>
    </section>
  );
}
