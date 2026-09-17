import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCircle2, CreditCard } from 'lucide-react';
import api from '../../lib/axios';
import DashSubPageWrapper from '../../components/DashSubPageWrapper';
import { CURRENCY_SYMBOL } from '../../config/site.js';

const PLAN_STYLE = {
  free:  { ring: 'border-stone-200',  badge: 'bg-stone-100 text-stone-600',   glow: '' },
  pro:   { ring: 'border-violet-400', badge: 'bg-violet-100 text-violet-700',  glow: 'shadow-lg shadow-violet-100' },
  elite: { ring: 'border-purple-400', badge: 'bg-purple-100 text-purple-700', glow: 'shadow-lg shadow-purple-100' },
};

// Feature comparison rows — shown in the table
const COMPARISON = [
  { label: 'Leads per month',         free: '3',               pro: 'Unlimited',       elite: 'Unlimited' },
  { label: 'Public profile',           free: true,              pro: true,              elite: true },
  { label: 'SkillHub Score & badge', free: true,              pro: true,              elite: true },
  { label: 'Priority in search',       free: '—',               pro: true,              elite: 'Top' },
  { label: 'Portfolio gallery',         free: '—',               pro: 'Up to 12 photos', elite: 'Up to 12 photos' },
  { label: 'Service offer cards',      free: '—',               pro: 'Up to 5',         elite: 'Up to 10' },
  { label: 'Storefront on profile',    free: '—',               pro: true,              elite: true },
  { label: 'Social media links',       free: '—',               pro: true,              elite: true },
  { label: 'Featured on landing page', free: '—',               pro: '—',               elite: true },
  { label: 'Elite / Pro badge',        free: '—',               pro: 'Pro',             elite: 'Elite' },
  { label: 'Dedicated support',        free: '—',               pro: '—',               elite: true },
];

function CellVal({ val, green }) {
  if (val === true) return <Check className={`w-4 h-4 mx-auto ${green ? 'text-green-500' : 'text-violet-500'}`} strokeWidth={2.5} />;
  return <span>{val}</span>;
}

function PlanCard({ planKey, plan, current, selected, onSelect }) {
  const style = PLAN_STYLE[planKey];
  const isCurrent = current === planKey;
  const isSelectable = planKey !== 'free' && !isCurrent;
  const isSelected = selected === planKey;

  return (
    <div
      onClick={() => isSelectable && onSelect(planKey)}
      className={`relative rounded-2xl border-2 p-6 flex flex-col gap-3 transition-all
        ${isSelected ? 'border-violet-500 shadow-xl shadow-violet-100 scale-[1.02]' : style.ring + ' ' + style.glow}
        ${isSelectable ? 'cursor-pointer hover:-translate-y-0.5' : ''}
        ${isCurrent ? 'bg-gradient-to-b from-violet-50/60 to-white' : 'bg-white'}`}
    >
      {planKey === 'pro' && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <span className="bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
            Most Popular
          </span>
        </div>
      )}
      {(planKey === 'pro' || planKey === 'elite') && !isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            🔒 Launch price
          </span>
        </div>
      )}

      <div className="flex items-start justify-between mt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge text-xs font-bold ${style.badge}`}>{plan.name}</span>
          {isCurrent && <span className="badge bg-green-100 text-green-700 text-xs">Current</span>}
        </div>
        <div className="text-right">
          {plan.price === 0
            ? <span className="text-2xl font-black text-stone-400">Free</span>
            : <><span className="text-2xl font-black">{CURRENCY_SYMBOL}{plan.price.toLocaleString()}</span><span className="text-stone-400 text-sm">/mo</span></>
          }
        </div>
      </div>

      {/* Included features */}
      <ul className="space-y-1.5 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-stone-700">
            <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" strokeWidth={2.5} />{f}
          </li>
        ))}
      </ul>

      {/* Locked features */}
      {plan.locked?.length > 0 && (
        <ul className="space-y-1 border-t border-stone-100 pt-3">
          {plan.locked.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-stone-400">
              <span className="shrink-0 mt-1 w-2 h-2 rounded-full border border-stone-300 inline-block" />
              {f}
            </li>
          ))}
        </ul>
      )}

      {isSelectable && (
        <div className={`mt-2 text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
          isSelected
            ? 'bg-gradient-to-br from-violet-600 to-pink-500 text-white'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        }`}>
          {isSelected ? (
            <span className="flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" strokeWidth={2.5} />Selected
            </span>
          ) : `Upgrade to ${plan.name}`}
        </div>
      )}
      {isCurrent && planKey !== 'free' && (
        <div className="mt-2 text-center py-2 text-xs text-stone-400 border border-stone-100 rounded-xl">
          Your active plan
        </div>
      )}
    </div>
  );
}

export default function WorkerSubscription() {
  const qc = useQueryClient();
  const [selectedPlan, setSelectedPlan]       = useState(null);
  const [paymentMethod, setPaymentMethod]     = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [showComparison, setShowComparison]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['workerSubscription'],
    queryFn: () => api.get('/subscriptions/my').then((r) => r.data.data),
  });

  const { data: plansData } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: () => api.get('/subscriptions/plans').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const submit = useMutation({
    mutationFn: () => api.post('/subscriptions/request', { plan: selectedPlan, paymentMethod, paymentReference }),
    onSuccess: () => {
      setSuccess(true);
      setSelectedPlan(null);
      setPaymentMethod('');
      setPaymentReference('');
      qc.invalidateQueries(['workerSubscription']);
    },
    onError: (err) => setError(err.response?.data?.message || 'Submission failed'),
  });

  if (isLoading) return <div className="text-center py-20 text-stone-400">Loading…</div>;

  const { profile, history = [] } = data || {};
  const { plans = {}, paymentMethods = [] } = plansData || {};
  const currentPlan   = profile?.subscriptionPlan || 'free';
  const leadsUsed     = profile?.leadsThisMonth ?? 0;
  const leadLimit     = plans[currentPlan]?.leadLimit;
  const pendingRequest = history.find((h) => h.status === 'pending');
  const selectedPM    = paymentMethods.find((m) => m.id === paymentMethod);
  const isPaid        = currentPlan !== 'free';

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!selectedPlan)          return setError('Please select a plan');
    if (!paymentMethod)         return setError('Please select a payment method');
    if (!paymentReference.trim()) return setError('Please enter your payment reference');
    submit.mutate();
  }

  return (
    <DashSubPageWrapper
      title="Subscription"
      subtitle="Unlock your full storefront — portfolio, offers, social links & more"
      icon={<CreditCard className="w-5 h-5 text-white" strokeWidth={2} />}
      backTo="/dashboard/worker"
    >
    <div className="space-y-8">

      {/* Current plan banner */}
      <div className={`card border py-4 px-5 ${isPaid ? 'border-violet-200 bg-gradient-to-r from-violet-50 to-pink-50' : 'border-stone-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge font-bold ${PLAN_STYLE[currentPlan]?.badge}`}>
                  {plans[currentPlan]?.name || 'Free'} Plan
                </span>
                {profile?.subscriptionExpiry && (
                  <span className="text-xs text-stone-500">
                    Expires {new Date(profile.subscriptionExpiry).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {isPaid ? 'Portfolio, offers & storefront unlocked' : 'Upgrade to unlock your storefront'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-400 mb-0.5">Leads this month</p>
            <p className="text-xl font-black">
              {leadsUsed}
              {leadLimit !== Infinity
                ? <span className="text-stone-400 font-normal text-base"> / {leadLimit}</span>
                : <span className="text-green-500 font-normal text-sm ml-1"> unlimited</span>
              }
            </p>
          </div>
        </div>

        {currentPlan === 'free' && leadLimit !== Infinity && (
          <div className="mt-3">
            <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${leadsUsed >= leadLimit ? 'bg-red-500' : 'bg-violet-500'}`}
                style={{ width: `${Math.min((leadsUsed / leadLimit) * 100, 100)}%` }}
              />
            </div>
            {leadsUsed >= leadLimit && (
              <p className="text-xs text-red-600 mt-1 font-medium">Lead limit reached — upgrade to keep receiving job requests</p>
            )}
          </div>
        )}
      </div>

      {/* What you're missing — only for free plan */}
      {currentPlan === 'free' && (
        <div className="card border border-amber-200 bg-amber-50">
          <h3 className="font-bold text-amber-900 mb-3">Locked on Free Plan</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { title: 'Portfolio Gallery',     desc: 'Upload up to 12 work photos shown on your public profile' },
              { title: 'Service Offer Cards',   desc: 'List your services with prices — clients see exactly what you offer' },
              { title: 'Social Media Links',    desc: 'Show your Facebook, Instagram, TikTok to build trust with clients' },
              { title: 'Priority Search Rank',  desc: 'Appear higher in search results — get found before free workers' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 bg-white/70 rounded-xl p-3">
                <div>
                  <p className="text-sm font-semibold text-stone-800">{f.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending notice */}
      {pendingRequest && (
        <div className="card border-violet-200 bg-violet-50">
          <div className="flex items-center gap-3">
            
            <div>
              <p className="font-semibold text-violet-800">Subscription Request Pending</p>
              <p className="text-sm text-violet-700 mt-0.5">
                Your <strong>{plans[pendingRequest.plan]?.name}</strong> plan request is under review.
                Admin will activate it within 24 hours after confirming your payment.
              </p>
              <p className="text-xs text-violet-600 mt-1">
                Ref: <span className="font-mono font-medium">{pendingRequest.paymentReference}</span>
                {' · '}Submitted {new Date(pendingRequest.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="card border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" strokeWidth={2} />
            </div>
            <div>
              <p className="font-semibold text-green-800">Request Submitted!</p>
              <p className="text-sm text-green-700 mt-0.5">Admin will verify your payment and activate your plan within 24 hours.</p>
            </div>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <section>
        <h2 className="font-bold text-lg mb-4">Choose Your Plan</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {Object.entries(plans).map(([key, plan]) => (
            <PlanCard
              key={key} planKey={key} plan={plan}
              current={currentPlan} selected={selectedPlan}
              onSelect={setSelectedPlan}
            />
          ))}
        </div>

        {/* Toggle comparison table */}
        <button
          onClick={() => setShowComparison((v) => !v)}
          className="mt-5 text-sm text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1 mx-auto transition-colors"
        >
          {showComparison ? '▲ Hide' : '▼ Show'} full feature comparison
        </button>

        {showComparison && (
          <div className="mt-4 card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-stone-100">
                  <th className="pb-3 text-stone-500 font-medium w-1/2">Feature</th>
                  <th className="pb-3 text-stone-500 font-medium text-center">Free</th>
                  <th className="pb-3 text-violet-700 font-bold text-center">Pro</th>
                  <th className="pb-3 text-purple-700 font-bold text-center">Elite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {COMPARISON.map((row) => (
                  <tr key={row.label}>
                    <td className="py-2.5 text-stone-700">{row.label}</td>
                    <td className={`py-2.5 text-center text-xs ${row.free === '—' ? 'text-stone-300' : 'text-stone-600 font-medium'}`}><CellVal val={row.free} /></td>
                    <td className={`py-2.5 text-center text-xs ${row.pro === '—' ? 'text-stone-300' : 'text-violet-700 font-semibold'}`}><CellVal val={row.pro} /></td>
                    <td className={`py-2.5 text-center text-xs ${row.elite === '—' ? 'text-stone-300' : 'text-purple-700 font-semibold'}`}><CellVal val={row.elite} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Payment form */}
      {selectedPlan && !pendingRequest && (
        <section className="card border-violet-200">
          <h2 className="font-bold text-lg mb-1">Complete Payment</h2>
          <p className="text-stone-500 text-sm mb-5">
            Pay <strong>{CURRENCY_SYMBOL}{plans[selectedPlan]?.price.toLocaleString()}</strong> using one of the methods below,
            then enter your transaction reference for admin verification.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Payment Method</label>
              <div className="grid sm:grid-cols-2 gap-3">
                {paymentMethods.map((m) => (
                  <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      paymentMethod === m.id ? 'border-violet-500 bg-violet-50' : 'border-stone-200 hover:border-stone-300'
                    }`}>
                    <p className="font-semibold text-sm">{m.label}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{m.detail}</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedPM && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-1">How to pay via {selectedPM.label}</p>
                <p className="text-sm text-blue-700">{selectedPM.detail}</p>
                <p className="text-xs text-blue-600 mt-2">
                  Amount: <strong>{CURRENCY_SYMBOL}{plans[selectedPlan]?.price.toLocaleString()}</strong> — include your registered name as payment reference
                </p>
              </div>
            )}

            <div>
              <label className="label">Payment Reference / Transaction ID</label>
              <input
                className="input"
                placeholder="e.g. TXN123456, slip number…"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
              <p className="text-xs text-stone-400 mt-1">Enter the reference number from your payment confirmation</p>
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={submit.isPending}>
                {submit.isPending ? 'Submitting…' : `Submit — ${CURRENCY_SYMBOL}${plans[selectedPlan]?.price.toLocaleString()}`}
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setSelectedPlan(null); setError(''); }}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Subscription history */}
      {history.length > 0 && (
        <section>
          <h2 className="font-bold text-lg mb-4">Payment History</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-stone-100 text-stone-500">
                  <th className="pb-3 font-semibold">Plan</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Method</th>
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {history.map((h) => (
                  <tr key={h._id}>
                    <td className="py-3">
                      <span className={`badge text-xs ${PLAN_STYLE[h.plan]?.badge}`}>
                        {plans[h.plan]?.name || h.plan}
                      </span>
                    </td>
                    <td className="py-3 font-medium">{CURRENCY_SYMBOL}{h.amountPaid?.toLocaleString()}</td>
                    <td className="py-3 text-stone-600 capitalize">{h.paymentMethod?.replace('_', ' ')}</td>
                    <td className="py-3 font-mono text-xs text-stone-600">{h.paymentReference}</td>
                    <td className="py-3">
                      {h.status === 'active'   && <span className="badge bg-green-100 text-green-700">Active</span>}
                      {h.status === 'pending'  && <span className="badge bg-violet-100 text-violet-700">Pending</span>}
                      {h.status === 'expired'  && <span className="badge bg-stone-100 text-stone-500">Expired</span>}
                      {h.status === 'rejected' && <span className="badge bg-red-100 text-red-700" title={h.rejectionReason}>Rejected</span>}
                    </td>
                    <td className="py-3 text-stone-400 text-xs">{new Date(h.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
    </DashSubPageWrapper>
  );
}
