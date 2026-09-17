import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { Hammer } from 'lucide-react';
import api from '../../lib/axios';
import { useCategories } from '../../hooks/useCategories';
import ScoreRing from '../../components/ScoreRing';
import ScoreBadge from '../../components/ScoreBadge';
import StatusBadge from '../../components/StatusBadge';
import LiveWorkManager from '../../components/LiveWorkManager';
import { SITE_NAME, CURRENCY_SYMBOL } from '../../config/site.js';

const PLAN_BADGE = {
  free:  'bg-stone-100 text-stone-600',
  pro:   'bg-violet-100 text-violet-700',
  elite: 'bg-purple-100 text-purple-700',
};

function SubscriptionBanner({ profile }) {
  const { t } = useTranslation();
  const plan = profile.subscriptionPlan || 'free';
  const leadsUsed = profile.leadsThisMonth ?? 0;
  const limit = plan === 'free' ? 3 : null; // Infinity for paid

  if (plan !== 'free') {
    return (
      <div className="card flex items-center justify-between bg-gradient-to-r from-violet-50 to-orange-50 border-violet-200 py-3 px-5">
        <div className="flex items-center gap-3">
          <div>
            <span className={`badge font-bold ${PLAN_BADGE[plan]}`}>{plan.toUpperCase()} {t('dashboard.worker.banner.planSuffix')}</span>
            <p className="text-xs text-stone-500 mt-0.5">
              {t('dashboard.worker.banner.unlimitedExpires', { date: profile.subscriptionExpiry ? new Date(profile.subscriptionExpiry).toLocaleDateString() : '—' })}
            </p>
          </div>
        </div>
        <Link to="/dashboard/worker/subscription" className="text-xs text-violet-700 underline hover:no-underline">
          {t('dashboard.worker.banner.manage')}
        </Link>
      </div>
    );
  }

  const pct = Math.min((leadsUsed / limit) * 100, 100);
  const atLimit = leadsUsed >= limit;

  return (
    <div className={`card border py-3 px-5 ${atLimit ? 'border-red-300 bg-red-50' : 'border-stone-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`badge ${PLAN_BADGE.free}`}>{t('dashboard.worker.banner.freePlan')}</span>
          <span className="text-xs text-stone-500">{t('dashboard.worker.banner.leadsUsage', { used: leadsUsed, limit })}</span>
        </div>
        <Link to="/dashboard/worker/subscription" className={`text-xs font-medium underline hover:no-underline ${atLimit ? 'text-red-600' : 'text-violet-600'}`}>
          {atLimit ? t('dashboard.worker.banner.upgradeNow') : t('dashboard.worker.banner.upgradePro')}
        </Link>
      </div>
      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-500' : pct > 66 ? 'bg-violet-500' : 'bg-green-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {atLimit && (
        <p className="text-xs text-red-600 mt-1.5 font-medium">{t('dashboard.worker.banner.limitReached')}</p>
      )}
    </div>
  );
}

function JobRow({ job }) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  async function action(endpoint) {
    const fd = new FormData();
    await api.put(`/jobs/${job._id}/${endpoint}`, fd);
    qc.invalidateQueries(['workerDashboard']);
  }

  const client = job.clientId;

  return (
    <div className="card">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold">{job.title}</h3>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-sm text-stone-500">
            {job.category?.replace('_', ' ')} · {job.location?.district}
            {client && <> · {t('dashboard.worker.jobRow.clientLabel')}: <span className="font-medium text-stone-700">{client.name}</span></>}
          </p>
          {job.agreedRate && (
            <p className="text-sm text-stone-500 mt-0.5">{CURRENCY_SYMBOL}{job.agreedRate?.toLocaleString()}</p>
          )}
        </div>
        <span className="text-xs text-stone-400">{new Date(job.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="flex gap-2 flex-wrap mt-3">
        {job.status === 'pending' && (
          <button onClick={() => action('accept')} className="btn-primary text-sm py-1.5">
            {t('dashboard.worker.jobRow.acceptJob')}
          </button>
        )}
        {job.status === 'in_progress' && (
          <button onClick={() => action('complete')} className="btn-primary text-sm py-1.5">
            {t('dashboard.worker.jobRow.markComplete')}
          </button>
        )}
      </div>
    </div>
  );
}

// Where manual "featured listing" payments are sent. Replace with your own.
const BANK_DETAILS = {
  bank:    'Example Bank',
  account: '0000000000',
  name:    `${SITE_NAME} Ltd`,
  branch:  'Main Street',
};

function GetFeaturedCard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen]               = useState(false);
  const [period, setPeriod]           = useState('2_weeks');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentRef, setPaymentRef]   = useState('');
  const [notes, setNotes]             = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  const PRICING = [
    { period: '1_week',   label: t('dashboard.worker.featured.period1Week'),  price: 500,  popular: false },
    { period: '2_weeks',  label: t('dashboard.worker.featured.period2Weeks'), price: 900,  popular: true  },
    { period: '1_month',  label: t('dashboard.worker.featured.period1Month'), price: 1500, popular: false },
  ];

  const { data } = useQuery({
    queryKey: ['myFeaturedRequest'],
    queryFn: () => api.get('/workers/featured-request/my').then((r) => r.data.data),
  });

  const request      = data?.request;
  const featuredUntil = data?.featuredUntil;
  const isLive        = featuredUntil && new Date(featuredUntil) > new Date();
  const isPending     = request?.status === 'pending';
  const isRejected    = request?.status === 'rejected';

  async function submit() {
    if (!paymentRef.trim()) { setError(t('dashboard.worker.featured.errPaymentRef')); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/workers/featured-request', { period, paymentMethod, paymentRef, notes });
      qc.invalidateQueries(['myFeaturedRequest']);
      setOpen(false);
    } catch (e) {
      setError(e.response?.data?.message || t('dashboard.worker.featured.errSubmit'));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPrice = PRICING.find((p) => p.period === period)?.price || 0;

  // ── Already live ─────────────────────────────────────────────────────────
  if (isLive) {
    return (
      <div className="card bg-gradient-to-r from-violet-50 to-pink-50 border-violet-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-violet-800">{t('dashboard.worker.featured.liveTitle')}</p>
            <p className="text-xs text-stone-500">
              {t('dashboard.worker.featured.liveDesc')}{' '}
              <span className="font-medium">{new Date(featuredUntil).toLocaleDateString()}</span>
            </p>
          </div>
        </div>
        <span className="text-xs bg-violet-600 text-white px-3 py-1 rounded-full font-semibold">{t('dashboard.worker.featured.liveBadge')}</span>
      </div>
    );
  }

  // ── Pending approval ─────────────────────────────────────────────────────
  if (isPending) {
    return (
      <div className="card border-amber-200 bg-amber-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          
          <div>
            <p className="font-semibold text-amber-800">{t('dashboard.worker.featured.pendingTitle')}</p>
            <p className="text-xs text-stone-500">
              {t('dashboard.worker.featured.pendingDesc', { date: new Date(request.requestedAt).toLocaleDateString() })}
            </p>
          </div>
        </div>
        <span className="text-xs bg-amber-500 text-white px-3 py-1 rounded-full font-semibold">{t('dashboard.worker.featured.pendingBadge')}</span>
      </div>
    );
  }

  // ── Rejected state ────────────────────────────────────────────────────────
  const rejectedBanner = isRejected && (
    <div className="mb-3 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-700">
      {t('dashboard.worker.featured.rejected', { reason: request.rejectedReason })}
    </div>
  );

  // ── Request form ─────────────────────────────────────────────────────────
  return (
    <div className="card border-violet-200">
      {rejectedBanner}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-stone-800">{t('dashboard.worker.featured.title')}</p>
            <p className="text-xs text-stone-500">{t('dashboard.worker.featured.subtitle')}</p>
          </div>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="btn-primary text-sm py-2 px-5 shrink-0">
          {open ? t('dashboard.worker.featured.cancel') : t('dashboard.worker.featured.getFeatured')}
        </button>
      </div>

      {open && (
        <div className="mt-5 pt-5 border-t border-stone-100 space-y-5">

          {/* Period picker */}
          <div>
            <label className="label mb-2">{t('dashboard.worker.featured.selectPeriod')}</label>
            <div className="grid grid-cols-3 gap-3">
              {PRICING.map((p) => (
                <button
                  key={p.period}
                  type="button"
                  onClick={() => setPeriod(p.period)}
                  className={`relative border-2 rounded-xl p-3 text-center transition-all ${
                    period === p.period
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {p.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs bg-gradient-to-br from-violet-600 to-pink-500 text-white px-2 py-0.5 rounded-full font-bold">
                      {t('dashboard.worker.featured.popular')}
                    </span>
                  )}
                  <p className="font-bold text-stone-800 mt-1">{CURRENCY_SYMBOL}{p.price.toLocaleString()}</p>
                  <p className="text-xs text-stone-500">{p.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="label mb-2">{t('dashboard.worker.featured.paymentMethod')}</label>
            <div className="flex gap-3">
              {[
                { id: 'bank_transfer', label: t('dashboard.worker.featured.bankTransfer') },
                { id: 'cash', label: t('dashboard.worker.featured.cashAgent') },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`flex-1 border-2 rounded-xl py-2.5 text-sm font-medium transition-all ${
                    paymentMethod === m.id
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bank details */}
          {paymentMethod === 'bank_transfer' && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm space-y-1.5">
              <p className="font-semibold text-stone-700 mb-2">{t('dashboard.worker.featured.transferTo', { amount: selectedPrice.toLocaleString() })}</p>
              {Object.entries(BANK_DETAILS).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-stone-400 capitalize">{k.replace('_', ' ')}</span>
                  <span className="font-medium text-stone-700">{v}</span>
                </div>
              ))}
              <p className="text-xs text-stone-400 mt-2 pt-2 border-t border-stone-200">
                {t('dashboard.worker.featured.transferHint')}
              </p>
            </div>
          )}

          {paymentMethod === 'cash' && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm text-stone-600">
              {t('dashboard.worker.featured.cashHint', { amount: selectedPrice.toLocaleString() })}
            </div>
          )}

          {/* Payment reference */}
          <div>
            <label className="label">
              {paymentMethod === 'bank_transfer' ? t('dashboard.worker.featured.bankRef') : t('dashboard.worker.featured.receiptNum')}
              <span className="text-red-500"> *</span>
            </label>
            <input
              className="input"
              placeholder={paymentMethod === 'bank_transfer' ? t('dashboard.worker.featured.bankRefPlaceholder') : t('dashboard.worker.featured.receiptPlaceholder')}
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
            />
          </div>

          {/* Optional notes */}
          <div>
            <label className="label">{t('dashboard.worker.featured.notes')} <span className="text-stone-400 font-normal">{t('dashboard.worker.featured.notesOptional')}</span></label>
            <input
              className="input"
              placeholder={t('dashboard.worker.featured.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
          )}

          <button
            onClick={submit}
            disabled={submitting}
            className="btn-primary w-full py-3"
          >
            {submitting ? t('dashboard.worker.featured.submitting') : t('dashboard.worker.featured.submit', { amount: selectedPrice.toLocaleString() })}
          </button>

          <p className="text-xs text-stone-400 text-center">
            {t('dashboard.worker.featured.approvalHint')}
          </p>
        </div>
      )}
    </div>
  );
}

// ── My Storefront ─────────────────────────────────────────────────────────────
function MyStorefront({ profile }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const plan = profile?.subscriptionPlan || 'free';
  const paid = plan !== 'free' && (!profile?.subscriptionExpiry || new Date(profile.subscriptionExpiry) > new Date());

  const [tab, setTab] = useState('offers'); // 'offers' | 'portfolio'
  const [showForm, setShowForm] = useState(false);
  const [editOffer, setEditOffer] = useState(null);

  const { data: storefrontData, isLoading } = useQuery({
    queryKey: ['myOffers'],
    queryFn: () => api.get('/workers/offers/my').then((r) => r.data.data),
  });

  const offers = storefrontData?.offers || [];
  const portfolioPhotos = profile?.portfolioPhotos || [];
  const pendingPhotos = profile?.pendingPortfolioPhotos || [];

  const deleteOffer = useMutation({
    mutationFn: (id) => api.delete(`/workers/offers/${id}`),
    onSuccess: () => qc.invalidateQueries(['myOffers']),
  });

  const toggleOffer = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/workers/offers/${id}`, { isActive: String(!isActive) }),
    onSuccess: () => qc.invalidateQueries(['myOffers']),
  });

  // Locked state for free plan
  if (!paid) {
    return (
      <div className="card border-2 border-dashed border-violet-200 bg-violet-50/40">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-stone-800 mb-1">{t('dashboard.worker.storefront.lockedTitle')} <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full ml-1">{t('dashboard.worker.storefront.lockedTag')}</span></h3>
            <p className="text-sm text-stone-500 mb-3">
              {t('dashboard.worker.storefront.lockedDesc')}
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {[
                { title: t('dashboard.worker.storefront.lockedGalleryTitle'), desc: t('dashboard.worker.storefront.lockedGalleryDesc') },
                { title: t('dashboard.worker.storefront.lockedOffersTitle'),   desc: t('dashboard.worker.storefront.lockedOffersDesc') },
              ].map((f) => (
                <div key={f.title} className="bg-white rounded-xl p-3 border border-violet-100 flex items-start gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{f.title}</p>
                    <p className="text-xs text-stone-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/dashboard/worker/subscription" className="inline-flex items-center gap-2 bg-gradient-to-br from-violet-600 to-pink-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:from-violet-700 hover:to-pink-600 transition-all">
              {t('dashboard.worker.storefront.upgrade')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const MAX_OFFERS = plan === 'elite' ? 10 : 5;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-stone-800 text-lg flex items-center gap-2">
          {t('dashboard.worker.storefront.title')}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan === 'elite' ? 'bg-purple-100 text-purple-700' : 'bg-violet-100 text-violet-700'}`}>
            {plan.toUpperCase()}
          </span>
        </h3>
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          {['offers', 'portfolio'].map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${tab === tabKey ? 'bg-white shadow-sm text-violet-700' : 'text-stone-500 hover:text-stone-700'}`}
            >
              {tabKey === 'offers'
                ? t('dashboard.worker.storefront.offersTab', { used: offers.filter(o => o.isActive).length, max: MAX_OFFERS })
                : t('dashboard.worker.storefront.portfolioTab', { count: portfolioPhotos.length })}
            </button>
          ))}
        </div>
      </div>

      {/* ── OFFERS TAB ─────────────────────────────────────────── */}
      {tab === 'offers' && (
        <div>
          {!showForm && !editOffer && (
            <button
              onClick={() => setShowForm(true)}
              disabled={offers.filter(o => o.isActive).length >= MAX_OFFERS}
              className="w-full mb-4 border-2 border-dashed border-violet-200 rounded-xl py-3 text-sm text-violet-600 font-medium hover:border-violet-400 hover:bg-violet-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('dashboard.worker.storefront.addOffer')}
            </button>
          )}

          {(showForm || editOffer) && (
            <OfferForm
              initial={editOffer}
              onClose={() => { setShowForm(false); setEditOffer(null); }}
              onSaved={() => { setShowForm(false); setEditOffer(null); qc.invalidateQueries(['myOffers']); }}
            />
          )}

          {isLoading && <p className="text-sm text-stone-400 text-center py-4">{t('dashboard.worker.storefront.loading')}</p>}

          <div className="space-y-3">
            {offers.map((o) => (
              <div key={o._id} className={`border rounded-xl p-4 flex gap-4 items-start transition-opacity ${o.isActive ? 'border-stone-200' : 'border-stone-100 opacity-50'}`}>
                {o.photos?.[0] && (
                  <img src={o.photos[0]} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-800 truncate">{o.title}</p>
                  {o.description && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{o.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-500">
                    <span className="font-bold text-green-700">{CURRENCY_SYMBOL}{o.priceMin.toLocaleString()}{o.priceMax ? `–${o.priceMax.toLocaleString()}` : '+'}</span>
                    {o.deliveryDays && <span>{o.deliveryDays} {o.deliveryDays > 1 ? t('dashboard.worker.storefront.deliveryDays') : t('dashboard.worker.storefront.deliveryDay')}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditOffer(o)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    title={t('dashboard.worker.storefront.edit')}
                  >Edit</button>
                  <button
                    onClick={() => toggleOffer.mutate({ id: o._id, isActive: o.isActive })}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors text-xs"
                    title={o.isActive ? t('dashboard.worker.storefront.hide') : t('dashboard.worker.storefront.show')}
                  >{o.isActive ? 'Hide' : 'Show'}</button>
                  <button
                    onClick={() => { if (window.confirm(t('dashboard.worker.storefront.deleteConfirm'))) deleteOffer.mutate(o._id); }}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title={t('dashboard.worker.storefront.delete')}
                  >Delete</button>
                </div>
              </div>
            ))}
            {!isLoading && !offers.length && (
              <p className="text-center text-sm text-stone-400 py-6">{t('dashboard.worker.storefront.noOffers')}</p>
            )}
          </div>
        </div>
      )}

      {/* ── PORTFOLIO TAB ──────────────────────────────────────── */}
      {tab === 'portfolio' && (
        <PortfolioManager portfolioPhotos={portfolioPhotos} pendingPhotos={pendingPhotos} />
      )}
    </div>
  );
}

// ── Offer create / edit form ─────────────────────────────────────────────────
function OfferForm({ initial, onClose, onSaved }) {
  const { t } = useTranslation();
  const [title, setTitle]             = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [priceMin, setPriceMin]       = useState(initial?.priceMin || '');
  const [priceMax, setPriceMax]       = useState(initial?.priceMax || '');
  const [deliveryDays, setDelivery]   = useState(initial?.deliveryDays || '');
  const [files, setFiles]             = useState([]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!title.trim() || !priceMin) { setError(t('dashboard.worker.offerForm.errRequired')); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('description', description.trim());
      fd.append('priceMin', priceMin);
      if (priceMax) fd.append('priceMax', priceMax);
      if (deliveryDays) fd.append('deliveryDays', deliveryDays);
      files.forEach((f) => fd.append('photos', f));

      if (initial) {
        await api.put(`/workers/offers/${initial._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/workers/offers', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || t('dashboard.worker.offerForm.errSave'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4 space-y-3">
      <h4 className="font-semibold text-stone-800 text-sm">{initial ? t('dashboard.worker.offerForm.edit') : t('dashboard.worker.offerForm.new')}</h4>
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div>
        <label className="text-xs font-medium text-stone-600 block mb-1">{t('dashboard.worker.offerForm.title')} *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
          className="input text-sm w-full" placeholder={t('dashboard.worker.offerForm.titlePlaceholder')} />
      </div>
      <div>
        <label className="text-xs font-medium text-stone-600 block mb-1">{t('dashboard.worker.offerForm.description')}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500}
          rows={2} className="input text-sm w-full resize-none" placeholder={t('dashboard.worker.offerForm.descriptionPlaceholder')} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-stone-600 block mb-1">{t('dashboard.worker.offerForm.minPrice')} *</label>
          <input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} min={0}
            className="input text-sm w-full" placeholder={t('dashboard.worker.offerForm.minPricePlaceholder')} />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-600 block mb-1">{t('dashboard.worker.offerForm.maxPrice')}</label>
          <input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} min={0}
            className="input text-sm w-full" placeholder={t('dashboard.worker.offerForm.maxPricePlaceholder')} />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-600 block mb-1">{t('dashboard.worker.offerForm.delivery')}</label>
          <input type="number" value={deliveryDays} onChange={(e) => setDelivery(e.target.value)} min={1}
            className="input text-sm w-full" placeholder={t('dashboard.worker.offerForm.deliveryPlaceholder')} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-stone-600 block mb-1">{t('dashboard.worker.offerForm.photos')}</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple
          onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 4))}
          className="text-xs text-stone-500" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary text-sm py-2 px-4">{t('dashboard.worker.offerForm.cancel')}</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm py-2 px-5">
          {saving ? t('dashboard.worker.offerForm.saving') : initial ? t('dashboard.worker.offerForm.update') : t('dashboard.worker.offerForm.create')}
        </button>
      </div>
    </form>
  );
}

// ── Portfolio manager ────────────────────────────────────────────────────────
function PortfolioManager({ portfolioPhotos, pendingPhotos }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setMsg('');
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('photos', f));
      await api.put('/workers/profile/portfolio/paid', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg(t('dashboard.worker.portfolio.submitted'));
      qc.invalidateQueries(['workerDashboard']);
    } catch (err) {
      setMsg(err.response?.data?.message || t('dashboard.worker.portfolio.uploadFailed'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(url, isPending) {
    if (!window.confirm(t('dashboard.worker.portfolio.removeConfirm'))) return;
    try {
      await api.delete('/workers/profile/portfolio', { data: { url, pending: isPending } });
      qc.invalidateQueries(['workerDashboard']);
    } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-stone-500">
          {t('dashboard.worker.portfolio.info')}
        </p>
        <label className={`btn-primary text-sm py-1.5 px-4 cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          {uploading ? t('dashboard.worker.portfolio.uploading') : t('dashboard.worker.portfolio.addPhotos')}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleUpload} />
        </label>
      </div>
      {msg && <p className="text-xs text-violet-700 bg-violet-50 rounded-lg px-3 py-2 mb-3">{msg}</p>}

      {/* Live photos */}
      {portfolioPhotos.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">{t('dashboard.worker.portfolio.liveOnProfile')}</p>
          <div className="grid grid-cols-4 gap-2">
            {portfolioPhotos.map((url) => (
              <div key={url} className="relative group">
                <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                <button
                  onClick={() => handleDelete(url, false)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending photos */}
      {pendingPhotos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">{t('dashboard.worker.portfolio.pendingReview')}</p>
          <div className="grid grid-cols-4 gap-2">
            {pendingPhotos.map((p) => (
              <div key={p.url} className="relative group">
                <img src={p.url} alt="" className="w-full h-20 object-cover rounded-lg opacity-60" />
                <button
                  onClick={() => handleDelete(p.url, true)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!portfolioPhotos.length && !pendingPhotos.length && (
        <p className="text-center text-sm text-stone-400 py-6">{t('dashboard.worker.portfolio.empty')}</p>
      )}
    </div>
  );
}

/* ─── Worker Transactions Tab ─────────────────────────────── */

const SUB_PLAN_BADGE = {
  free:  'bg-stone-100 text-stone-600',
  pro:   'bg-violet-100 text-violet-700',
  elite: 'bg-purple-100 text-purple-700',
};

function WorkerTransactionsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['workerSubscription'],
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
        <p className="text-stone-500 text-sm">No subscription transactions yet.</p>
        <p className="text-stone-400 text-xs mt-1 mb-4">Upgrade your plan to unlock unlimited leads and more features.</p>
        <Link to="/dashboard/worker/subscription" className="btn-primary text-sm">View Plans →</Link>
      </div>
    );
  }

  const totalPaid = history.filter((h) => h.status === 'active' || h.status === 'expired').reduce((s, h) => s + (h.amountPaid || 0), 0);

  return (
    <div className="space-y-4">
      <div className="card bg-gradient-to-r from-violet-50 to-pink-50 border-violet-200 py-3 px-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wide">Total Subscription Paid</p>
          <p className="text-2xl font-black text-violet-700">{CURRENCY_SYMBOL}{totalPaid.toLocaleString()}</p>
        </div>
        <Link to="/dashboard/worker/subscription" className="text-xs text-violet-700 underline hover:no-underline">Manage Plan →</Link>
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
                  <span className={`badge text-xs ${SUB_PLAN_BADGE[h.plan] || 'bg-stone-100 text-stone-600'}`}>
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

const WORKER_MAIN_TABS = ['overview', 'transactions'];

export default function WorkerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState('overview');

  const { data, isLoading } = useQuery({
    queryKey: ['workerDashboard'],
    queryFn: () => api.get('/workers/dashboard').then((r) => r.data.data),
  });

  const { categories: allCategories } = useCategories();


  // Redirect new workers to onboarding wizard
  useEffect(() => {
    if (data?.profile && data.profile.onboardingComplete === false) {
      navigate('/dashboard/worker/onboarding', { replace: true });
    }
  }, [data, navigate]);

  if (isLoading) return <div className="text-center py-20 text-stone-400">{t('dashboard.worker.loading')}</div>;

  const { profile, jobs = [], earnings } = data || {};

  // Per-worker feature access — granted individually by admin
  const canConsult         = profile?.features?.consultations === true;
  const canHostLiveClasses = profile?.features?.liveClasses   === true;
  const canShop            = profile?.features?.shop          === true;

  const breakdown = profile?.scoreBreakdown || {};
  const chartData = [
    { subject: t('dashboard.worker.score.completion'), value: breakdown.completionScore || 0 },
    { subject: t('dashboard.worker.score.rating'), value: breakdown.ratingScore || 0 },
    { subject: t('dashboard.worker.score.response'), value: breakdown.responsivenessScore || 0 },
    { subject: t('dashboard.worker.score.dispute'), value: breakdown.disputeScore || 0 },
    { subject: t('dashboard.worker.score.trust'), value: breakdown.trustScore || 0 },
  ];

  const leads = jobs.filter((j) => j.status === 'pending');
  const activeJobs = jobs.filter((j) => ['accepted', 'in_progress'].includes(j.status));
  const pastJobs = jobs.filter((j) => ['completed', 'cancelled', 'disputed'].includes(j.status));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t('dashboard.worker.title')}</h1>
        <div className="flex gap-2 flex-wrap">
          {canConsult && (
            <Link to="/dashboard/worker/consultations"
              className="text-sm py-2 px-4 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 text-white font-semibold hover:opacity-95">
              Consultations
            </Link>
          )}
          {canHostLiveClasses && (
            <Link to="/dashboard/worker/live-classes"
              className="text-sm py-2 px-4 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 text-white font-semibold hover:opacity-95">
              Live Classes
            </Link>
          )}
          {canShop && (
            <Link to="/dashboard/worker/shop"
              className="text-sm py-2 px-4 rounded-lg bg-gradient-to-br from-fuchsia-600 to-pink-500 text-white font-semibold hover:opacity-95">
              My Shop
            </Link>
          )}
          <Link to="/dashboard/bookings" className="btn-secondary text-sm py-2">
            My bookings
          </Link>
          <Link to="/dashboard/worker/subscription" className="btn-secondary text-sm py-2">
            {t('dashboard.worker.subscription')}
          </Link>
          <Link to="/dashboard/worker/profile" className="btn-secondary text-sm py-2">
            {t('dashboard.worker.editProfile')}
          </Link>
        </div>
      </div>

      {/* Main tab bar */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit">
        {WORKER_MAIN_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${mainTab === tab ? 'bg-white shadow-sm text-violet-700' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {tab === 'overview' ? 'Overview' : 'Transactions'}
          </button>
        ))}
      </div>

      {/* ── Transactions tab ── */}
      {mainTab === 'transactions' && <WorkerTransactionsTab />}

      {/* ── Overview tab ── */}
      {mainTab === 'overview' && (<>

      {/* Subscription status banner */}
      {profile && (
        <SubscriptionBanner profile={profile} />
      )}

      {/* Featured listing */}
      <GetFeaturedCard />

      {/* My Storefront */}
      {profile && <MyStorefront profile={profile} />}

      {/* Live Work — anonymized progress feed */}
      {profile && (
        <LiveWorkManager
          role="worker"
          activeJobs={activeJobs}
          defaults={{
            category: profile.category,
            district: profile.serviceDistricts?.[0],
          }}
        />
      )}

      {/* Score card */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4">{t('dashboard.worker.score.title')}</h2>
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={profile?.skillScore || 0} size={110} />
            <ScoreBadge band={profile?.scoreBand} />
          </div>
          <div className="flex-1 w-full">
            <div className="w-full h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.4} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {chartData.map((item) => (
              <div key={item.subject} className="bg-stone-50 rounded-lg p-3">
                <div className="text-stone-500 text-xs">{item.subject}</div>
                <div className="font-bold text-lg">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings */}
      {earnings && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-black text-green-600">{CURRENCY_SYMBOL}{earnings.totalEarned?.toLocaleString()}</div>
            <div className="text-sm text-stone-500 mt-1">{t('dashboard.worker.earnings.totalEarned')}</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-black text-violet-600">{CURRENCY_SYMBOL}{earnings.pendingEscrow?.toLocaleString()}</div>
            <div className="text-sm text-stone-500 mt-1">{t('dashboard.worker.earnings.pendingEscrow')}</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-black text-stone-800">{profile?.totalJobsCompleted || 0}</div>
            <div className="text-sm text-stone-500 mt-1">{t('dashboard.worker.earnings.jobsCompleted')}</div>
          </div>
        </div>
      )}

      {/* Incoming leads */}
      {leads.length > 0 && (
        <section>
          <h2 className="font-semibold text-stone-700 mb-3">{t('dashboard.worker.leads.incoming', { count: leads.length })}</h2>
          <div className="space-y-3">
            {leads.map((j) => <JobRow key={j._id} job={j} />)}
          </div>
        </section>
      )}

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <section>
          <h2 className="font-semibold text-stone-700 mb-3">{t('dashboard.worker.leads.active', { count: activeJobs.length })}</h2>
          <div className="space-y-3">
            {activeJobs.map((j) => <JobRow key={j._id} job={j} />)}
          </div>
        </section>
      )}

      {/* Past jobs */}
      {pastJobs.length > 0 && (
        <section>
          <h2 className="font-semibold text-stone-700 mb-3">{t('dashboard.worker.leads.past')}</h2>
          <div className="space-y-3">
            {pastJobs.map((j) => <JobRow key={j._id} job={j} />)}
          </div>
        </section>
      )}

      {!jobs.length && (
        <div className="text-center py-12 text-stone-400">
          <Hammer className="w-10 h-10 text-stone-300 mx-auto mb-3" strokeWidth={1.5} />
          <p>{t('dashboard.worker.leads.empty')}</p>
        </div>
      )}
      </>)}
    </div>
  );
}
