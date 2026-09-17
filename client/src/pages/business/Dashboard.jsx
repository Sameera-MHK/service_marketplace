import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { AvatarWithFallback } from '../../components/Avatar';
import SocialLinksForm from '../../components/SocialLinksForm';
import LiveWorkManager from '../../components/LiveWorkManager';
import { DISTRICTS, CURRENCY_SYMBOL } from '../../config/site.js';

const TYPE_LABELS = {
  salon: 'Salon / Spa', barbershop: 'Barbershop', repair_shop: 'Repair Shop',
  catering: 'Catering', photography_studio: 'Photography Studio',
  cleaning_company: 'Cleaning Company', tutoring_centre: 'Tutoring Centre',
  restaurant: 'Restaurant', agency: 'Agency', other: 'Business',
};

const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_LABEL = { mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun' };


// ── Service row ──────────────────────────────────────────────────────────────
function ServiceRow({ svc, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3 border border-stone-200 rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-stone-800 truncate">{svc.name}</p>
        {svc.description && <p className="text-xs text-stone-500 truncate">{svc.description}</p>}
        {svc.priceMin != null && (
          <p className="text-xs font-bold text-green-700 mt-0.5">
            {CURRENCY_SYMBOL}{svc.priceMin.toLocaleString()}{svc.priceMax ? `–${svc.priceMax.toLocaleString()}` : '+'}
          </p>
        )}
      </div>
      <div className="flex gap-1">
        <button onClick={() => onEdit(svc)} className="p-1.5 text-xs text-stone-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">Edit</button>
        <button onClick={() => onDelete(svc._id)} className="p-1.5 text-xs text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">Delete</button>
      </div>
    </div>
  );
}

// ── Service form ─────────────────────────────────────────────────────────────
function ServiceForm({ initial, onClose, onSaved }) {
  const [name, setName]         = useState(initial?.name || '');
  const [desc, setDesc]         = useState(initial?.description || '');
  const [pMin, setPMin]         = useState(initial?.priceMin || '');
  const [pMax, setPMax]         = useState(initial?.priceMax || '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name required'); return; }
    setSaving(true);
    try {
      const body = { name: name.trim(), description: desc.trim(), priceMin: pMin || undefined, priceMax: pMax || undefined };
      if (initial) await api.put(`/businesses/services/${initial._id}`, body);
      else         await api.post('/businesses/services', body);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4 space-y-3">
      <h4 className="font-semibold text-sm text-stone-800">{initial ? 'Edit Service' : 'Add Service'}</h4>
      {error && <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
      <input value={name} onChange={(e) => setName(e.target.value)} className="input text-sm w-full" placeholder="Service name *" />
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="input text-sm w-full resize-none" placeholder="Description (optional)" />
      <div className="grid grid-cols-2 gap-3">
        <input type="number" value={pMin} onChange={(e) => setPMin(e.target.value)} className="input text-sm" placeholder={`Min price (${CURRENCY_SYMBOL})`} />
        <input type="number" value={pMax} onChange={(e) => setPMax(e.target.value)} className="input text-sm" placeholder={`Max price (${CURRENCY_SYMBOL})`} />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary text-sm py-1.5 px-4">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm py-1.5 px-5">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

// ── Business Subscription Tab ─────────────────────────────────────────────────
const BIZ_PLAN_BADGE = {
  pro:   'bg-violet-100 text-violet-700',
  elite: 'bg-purple-100 text-purple-700',
};

const BIZ_PLANS_DISPLAY = [
  {
    key: 'pro',
    name: 'Pro',
    price: 9,
    features: [
      'Verified badge on your profile',
      'Priority placement in business listings',
      'Up to 20 services in your menu',
      'Gallery — up to 12 photos',
      'Social media links visible to clients',
    ],
  },
  {
    key: 'elite',
    name: 'Elite',
    price: 19,
    features: [
      'Everything in Pro',
      'Featured on landing page',
      'Top of business search results',
      'Elite badge on profile',
      'Dedicated admin support',
    ],
  },
];

function BusinessSubscriptionTab() {
  const [selectedPlan, setSelectedPlan]           = useState(null);
  const [paymentMethod, setPaymentMethod]         = useState('');
  const [paymentReference, setPaymentReference]   = useState('');
  const [success, setSuccess]                     = useState(false);
  const [error, setError]                         = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['businessSubscription'],
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
      qc.invalidateQueries(['businessSubscription']);
    },
    onError: (err) => setError(err.response?.data?.message || 'Submission failed'),
  });

  if (isLoading) return <div className="text-center py-10 text-stone-400">Loading…</div>;

  const { history = [] } = data || {};
  const { paymentMethods = [] } = plansData || {};
  const activeSub  = history.find((h) => h.status === 'active');
  const pendingSub = history.find((h) => h.status === 'pending');
  const currentPlan = activeSub?.plan || 'free';

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!selectedPlan)            return setError('Please select a plan');
    if (!paymentMethod)           return setError('Please select a payment method');
    if (!paymentReference.trim()) return setError('Please enter your payment reference');
    submit.mutate();
  }

  const selectedPM = paymentMethods.find((m) => m.id === paymentMethod);

  return (
    <div className="space-y-6">
      {/* Current plan banner */}
      <div className={`card border py-4 px-5 ${currentPlan !== 'free' ? 'border-violet-200 bg-gradient-to-r from-violet-50 to-pink-50' : 'border-stone-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge font-bold ${BIZ_PLAN_BADGE[currentPlan] || 'bg-stone-100 text-stone-600'}`}>
                  {currentPlan.toUpperCase()} PLAN
                </span>
                {activeSub?.expiresAt && (
                  <span className="text-xs text-stone-500">
                    Expires {new Date(activeSub.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {currentPlan !== 'free' ? 'Enhanced listing & verified badge active' : 'Upgrade to stand out in business listings'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending notice */}
      {pendingSub && (
        <div className="card border-violet-200 bg-violet-50">
          <div className="flex items-center gap-3">
            
            <div>
              <p className="font-semibold text-violet-800">Subscription Request Pending</p>
              <p className="text-sm text-violet-700 mt-0.5">
                Your <strong>{pendingSub.plan?.toUpperCase()}</strong> plan request is under review.
                Admin will activate it within 24 hours after confirming your payment.
              </p>
              <p className="text-xs text-violet-600 mt-1">
                Ref: <span className="font-mono font-medium">{pendingSub.paymentReference}</span>
                {' · '}Submitted {new Date(pendingSub.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="card border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-green-800">Request Submitted!</p>
              <p className="text-sm text-green-700 mt-0.5">Admin will verify your payment and activate your plan within 24 hours.</p>
            </div>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid sm:grid-cols-2 gap-5">
        {BIZ_PLANS_DISPLAY.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          const isSelected = selectedPlan === plan.key;
          return (
            <div
              key={plan.key}
              onClick={() => !isCurrent && !pendingSub && setSelectedPlan(plan.key)}
              className={`relative rounded-2xl border-2 p-6 flex flex-col gap-3 transition-all
                ${isSelected ? 'border-violet-500 shadow-xl shadow-violet-100 scale-[1.01]' : isCurrent ? 'border-violet-300 bg-violet-50/40' : 'border-stone-200 bg-white'}
                ${!isCurrent && !pendingSub ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
            >
              {plan.key === 'pro' && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="flex items-start justify-between mt-1">
                <span className={`badge text-xs font-bold ${BIZ_PLAN_BADGE[plan.key]}`}>{plan.name}</span>
                <div className="text-right">
                  <span className="text-2xl font-black">{CURRENCY_SYMBOL}{plan.price.toLocaleString()}</span>
                  <span className="text-stone-400 text-sm">/mo</span>
                </div>
              </div>
              <ul className="space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-stone-700">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {!isCurrent && !pendingSub && (
                <div className={`mt-2 text-center py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 ${isSelected ? 'bg-gradient-to-br from-violet-600 to-pink-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                  {isSelected ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Selected
                    </>
                  ) : `Upgrade to ${plan.name}`}
                </div>
              )}
              {isCurrent && (
                <div className="mt-2 text-center py-2 text-xs text-stone-400 border border-stone-100 rounded-xl">Your active plan</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment form */}
      {selectedPlan && !pendingSub && (
        <div className="card border-violet-200">
          <h2 className="font-bold text-lg mb-1">Complete Payment</h2>
          <p className="text-stone-500 text-sm mb-5">
            Pay <strong>{CURRENCY_SYMBOL}{BIZ_PLANS_DISPLAY.find((p) => p.key === selectedPlan)?.price.toLocaleString()}</strong> using one of the methods below,
            then enter your transaction reference for admin verification.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Payment Method</label>
              <div className="grid sm:grid-cols-2 gap-3">
                {paymentMethods.map((m) => (
                  <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${paymentMethod === m.id ? 'border-violet-500 bg-violet-50' : 'border-stone-200 hover:border-stone-300'}`}>
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
                  Amount: <strong>{CURRENCY_SYMBOL}{BIZ_PLANS_DISPLAY.find((p) => p.key === selectedPlan)?.price.toLocaleString()}</strong> — include your business name as reference
                </p>
              </div>
            )}
            <div>
              <label className="label">Payment Reference / Transaction ID</label>
              <input className="input" placeholder="e.g. TXN123456, slip number…"
                value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
              <p className="text-xs text-stone-400 mt-1">Enter the reference number from your payment confirmation</p>
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={submit.isPending}>
                {submit.isPending ? 'Submitting…' : `Submit — ${CURRENCY_SYMBOL}${BIZ_PLANS_DISPLAY.find((p) => p.key === selectedPlan)?.price.toLocaleString()}`}
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setSelectedPlan(null); setError(''); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Business Transactions Tab ─────────────────────────────────────────────────
function BusinessTransactionsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['businessSubscription'],
    queryFn: () => api.get('/subscriptions/my').then((r) => r.data.data),
  });

  if (isLoading) return <div className="text-center py-10 text-stone-400">Loading…</div>;

  const { history = [] } = data || {};

  if (!history.length) {
    return (
      <div className="card text-center py-12">
        <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <p className="text-stone-500 text-sm">No payment transactions yet.</p>
        <p className="text-stone-400 text-xs mt-1">Subscription payments will appear here once you upgrade.</p>
      </div>
    );
  }

  const totalPaid = history.filter((h) => ['active', 'expired'].includes(h.status)).reduce((s, h) => s + (h.amountPaid || 0), 0);

  return (
    <div className="space-y-4">
      <div className="card bg-gradient-to-r from-violet-50 to-pink-50 border-violet-200 py-3 px-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wide">Total Subscription Paid</p>
          <p className="text-2xl font-black text-violet-700">{CURRENCY_SYMBOL}{totalPaid.toLocaleString()}</p>
        </div>
        <p className="text-xs text-stone-400">{history.length} transaction{history.length !== 1 ? 's' : ''}</p>
      </div>

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
                  <span className={`badge text-xs ${BIZ_PLAN_BADGE[h.plan] || 'bg-stone-100 text-stone-600'}`}>
                    {h.plan?.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 font-medium">{CURRENCY_SYMBOL}{h.amountPaid?.toLocaleString()}</td>
                <td className="py-3 text-stone-600 capitalize text-xs">{h.paymentMethod?.replace(/_/g, ' ')}</td>
                <td className="py-3 font-mono text-xs text-stone-600">{h.paymentReference}</td>
                <td className="py-3">
                  {h.status === 'active'   && <span className="badge bg-green-100 text-green-700 text-xs">Active</span>}
                  {h.status === 'pending'  && <span className="badge bg-violet-100 text-violet-700 text-xs">Pending</span>}
                  {h.status === 'expired'  && <span className="badge bg-stone-100 text-stone-500 text-xs">Expired</span>}
                  {h.status === 'rejected' && <span className="badge bg-red-100 text-red-700 text-xs" title={h.rejectionReason}>Rejected</span>}
                </td>
                <td className="py-3 text-stone-400 text-xs">{new Date(h.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function BusinessDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab]           = useState('overview');
  const [showSvcForm, setShowSvcForm] = useState(false);
  const [editSvc, setEditSvc]   = useState(null);
  const [saveMsg, setSaveMsg]   = useState('');
  const [saving, setSaving]     = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['businessDashboard'],
    queryFn: () => api.get('/businesses/dashboard/me').then((r) => r.data.data),
  });

  useEffect(() => {
    if (data?.profile && !data.profile.onboardingComplete) {
      navigate('/dashboard/business/onboarding', { replace: true });
    }
  }, [data, navigate]);

  // Edit profile state
  const [form, setForm] = useState(null);
  useEffect(() => {
    if (data?.profile && !form) {
      const p = data.profile;
      setForm({
        description: p.description || '',
        tagline:     p.tagline || '',
        district:    p.district || '',
        address:     p.address || '',
        phone:       p.phone || '',
        whatsapp:    p.whatsapp || '',
        website:     p.website || '',
        hours: p.openingHours || { mon:'', tue:'', wed:'', thu:'', fri:'', sat:'', sun:'' },
      });
    }
  }, [data]);

  async function saveProfile() {
    setSaving(true);
    setSaveMsg('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'hours') fd.append('openingHours', JSON.stringify(v));
        else if (v !== undefined && v !== null) fd.append(k, v);
      });
      await api.put('/businesses/profile/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      qc.invalidateQueries(['businessDashboard']);
      setSaveMsg('saved');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  }

  async function handlePhotoUpload(e, isCover) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    if (isCover) fd.append('coverPhoto', files[0]);
    else files.forEach((f) => fd.append('photos', f));
    try {
      await api.put('/businesses/profile/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      qc.invalidateQueries(['businessDashboard']);
    } catch { /* ignore */ }
    e.target.value = '';
  }

  async function removePhoto(url) {
    if (!window.confirm('Remove this photo?')) return;
    const fd = new FormData();
    fd.append('removePhotos', url);
    await api.put('/businesses/profile/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    qc.invalidateQueries(['businessDashboard']);
  }

  if (isLoading) return <div className="text-center py-20 text-stone-400">Loading…</div>;

  const { profile, user } = data || {};
  const services = profile?.services || [];
  const photos = profile?.photos || [];

  const TABS = ['overview', 'services', 'photos', 'live', 'hours', 'social', 'subscription', 'transactions'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{profile?.businessName}</h1>
          <p className="text-sm text-stone-500">{TYPE_LABELS[profile?.businessType] || 'Business'}</p>
        </div>
        <Link
          to={`/businesses/${user?._id}`}
          target="_blank"
          className="btn-secondary text-sm py-2 flex items-center gap-2"
        >
          View Public Profile
        </Link>
      </div>

      {/* Status banner */}
      {!profile?.isVerified && (
        <div className="card border-amber-200 bg-amber-50 py-3 px-5 flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-800">Pending Verification</p>
            <p className="text-xs text-amber-600">Our team will verify your business within 24 hours. You can still set up your profile.</p>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-stone-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white shadow-sm text-violet-700' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {t === 'overview'      ? 'Overview'
              : t === 'services'   ? `Services (${services.length})`
              : t === 'photos'     ? `Photos (${photos.length})`
              : t === 'live'       ? 'Live Work'
              : t === 'hours'      ? 'Hours'
              : t === 'social'     ? 'Social'
              : t === 'subscription' ? 'Subscription'
              : 'Transactions'}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────── */}
      {tab === 'overview' && form && (
        <div className="card space-y-4">
          <h3 className="font-bold text-stone-800">Profile Info</h3>
          {saveMsg && (
            <p className={`text-sm rounded-lg px-3 py-2 flex items-center gap-1.5 ${saveMsg === 'saved' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
              {saveMsg === 'saved' ? (
                <><svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Saved</>
              ) : saveMsg}
            </p>
          )}

          <div>
            <label className="label text-xs">Tagline</label>
            <input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              className="input text-sm" placeholder="Short catchy phrase" />
          </div>
          <div>
            <label className="label text-xs">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4} className="input text-sm resize-none" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">District</label>
              <select value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} className="input text-sm">
                <option value="">Select…</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Full Address</label>
              <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input text-sm" />
            </div>
            <div>
              <label className="label text-xs">Phone</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input text-sm" />
            </div>
            <div>
              <label className="label text-xs">WhatsApp</label>
              <input value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} className="input text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="label text-xs">Website</label>
              <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className="input text-sm" placeholder="https://" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={saveProfile} disabled={saving} className="btn-primary text-sm py-2 px-6">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── SERVICES ─────────────────────────────────────── */}
      {tab === 'services' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-stone-800">Services / Menu</h3>
            <button onClick={() => { setShowSvcForm(true); setEditSvc(null); }}
              disabled={services.length >= 20}
              className="btn-primary text-sm py-1.5 px-4 disabled:opacity-40">
              + Add
            </button>
          </div>

          {(showSvcForm || editSvc) && (
            <ServiceForm
              initial={editSvc}
              onClose={() => { setShowSvcForm(false); setEditSvc(null); }}
              onSaved={() => { setShowSvcForm(false); setEditSvc(null); qc.invalidateQueries(['businessDashboard']); }}
            />
          )}

          <div className="space-y-2">
            {services.map((s) => (
              <ServiceRow
                key={s._id} svc={s}
                onEdit={(svc) => { setEditSvc(svc); setShowSvcForm(false); }}
                onDelete={async (id) => {
                  if (!window.confirm('Remove this service?')) return;
                  await api.delete(`/businesses/services/${id}`);
                  qc.invalidateQueries(['businessDashboard']);
                }}
              />
            ))}
            {!services.length && (
              <p className="text-center text-sm text-stone-400 py-6">No services yet. Add your offerings so clients know what you do.</p>
            )}
          </div>
        </div>
      )}

      {/* ── PHOTOS ───────────────────────────────────────── */}
      {tab === 'photos' && (
        <div className="card space-y-5">
          {/* Cover photo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-stone-800">Cover Photo</h3>
              <label className="btn-secondary text-xs py-1.5 px-3 cursor-pointer">
                {profile?.coverPhoto ? 'Change' : 'Upload'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => handlePhotoUpload(e, true)} />
              </label>
            </div>
            {profile?.coverPhoto
              ? <img src={profile.coverPhoto} alt="Cover" className="w-full h-40 object-cover rounded-xl" />
              : <div className="w-full h-40 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 text-sm">No cover photo</div>
            }
          </div>

          {/* Gallery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-stone-800">Gallery <span className="text-stone-400 font-normal text-sm">({photos.length}/12)</span></h3>
              <label className={`btn-secondary text-xs py-1.5 px-3 cursor-pointer ${photos.length >= 12 ? 'opacity-40 pointer-events-none' : ''}`}>
                + Add Photos
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                  onChange={(e) => handlePhotoUpload(e, false)} />
              </label>
            </div>
            {photos.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((url) => (
                  <div key={url} className="relative group">
                    <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                    <button onClick={() => removePhoto(url)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-stone-400 py-6">No gallery photos yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ── HOURS ────────────────────────────────────────── */}
      {tab === 'hours' && form && (
        <div className="card space-y-3">
          <h3 className="font-bold text-stone-800 mb-2">Opening Hours</h3>
          {saveMsg && (
            <p className={`text-sm rounded-lg px-3 py-2 flex items-center gap-1.5 ${saveMsg === 'saved' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
              {saveMsg === 'saved' ? (
                <><svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Saved</>
              ) : saveMsg}
            </p>
          )}
          {DAYS.map((d) => (
            <div key={d} className="flex items-center gap-3">
              <span className="w-10 text-sm font-medium text-stone-600">{DAY_LABEL[d]}</span>
              <input
                value={form.hours?.[d] || ''}
                onChange={(e) => setForm((f) => ({ ...f, hours: { ...f.hours, [d]: e.target.value } }))}
                className="input flex-1 text-sm"
                placeholder="e.g. 9am – 6pm or Closed"
              />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button onClick={saveProfile} disabled={saving} className="btn-primary text-sm py-2 px-6">
              {saving ? 'Saving…' : 'Save Hours'}
            </button>
          </div>
        </div>
      )}

      {/* ── LIVE WORK ────────────────────────────────────── */}
      {tab === 'live' && (
        <LiveWorkManager
          role="business"
          activeJobs={[]}
          defaults={{
            category: data?.profile?.businessType,
            district: data?.profile?.district,
          }}
        />
      )}

      {/* ── SOCIAL ───────────────────────────────────────── */}
      {tab === 'social' && (
        <div className="card">
          <h3 className="font-bold text-stone-800 text-lg mb-4">Social Media Links</h3>
          <SocialLinksForm
            initial={user?.socialLinks || {}}
            onSave={(links) =>
              api.put('/users/me', { socialLinks: JSON.stringify(links) })
            }
          />
        </div>
      )}

      {/* ── SUBSCRIPTION ─────────────────────────────────── */}
      {tab === 'subscription' && <BusinessSubscriptionTab />}

      {/* ── TRANSACTIONS ─────────────────────────────────── */}
      {tab === 'transactions' && <BusinessTransactionsTab />}
    </div>
  );
}
