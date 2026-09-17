import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Search, X, Star, MapPin, ChevronLeft, Briefcase, Paintbrush, Tag, Clock, CheckCircle2, Loader2, Lock, ShoppingBag } from 'lucide-react';
import api from '../../lib/axios';
import StatusBadge from '../../components/StatusBadge';
import { useCategories } from '../../hooks/useCategories';
import { useNotificationStore } from '../../store/notificationStore';
import { TIMEZONE, CURRENCY_SYMBOL, DATE_LOCALE } from '../../config/site.js';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

/* ─── helpers ─────────────────────────────────────────────── */

function Avatar({ name = '', photo, size = 10 }) {
  if (photo) return (
    <img src={photo} alt={name}
      className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />
  );
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-violet-600 to-pink-500
                     flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

/* ─── Step 1: Worker Picker ───────────────────────────────── */

function WorkerPicker({ onSelect, onCancel }) {
  const { t } = useTranslation();
  const { categories } = useCategories();
  const [query, setQuery]       = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch]     = useState('');   // committed on submit
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['workerPick', search, category],
    queryFn: () => {
      const p = new URLSearchParams({ limit: 8, page: 1 });
      if (search)   p.set('q', search);
      if (category) p.set('category', category);
      return api.get(`/workers?${p}`).then((r) => r.data.data || []);
    },
    keepPreviousData: true,
  });

  function handleSearch(e) {
    e.preventDefault();
    setSearch(query.trim());
  }

  function clearSearch() {
    setQuery('');
    setSearch('');
    inputRef.current?.focus();
  }

  return (
    <div className="card mb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onCancel} className="text-stone-400 hover:text-stone-600 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="font-bold text-lg leading-tight">{t('dashboard.client.picker.title')}</h2>
          <p className="text-sm text-stone-500">{t('dashboard.client.picker.subtitle')}</p>
        </div>
      </div>

      {/* Search + category filter */}
      <div className="flex gap-2 mb-4">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('dashboard.client.picker.searchPlaceholder')}
            className="input pl-9 pr-8 py-2 text-sm"
          />
          {query && (
            <button type="button" onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5">
              <X size={13} />
            </button>
          )}
        </form>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setSearch(query.trim()); }}
          className="input w-44 py-2 text-sm"
        >
          <option value="">{t('dashboard.client.picker.allCategories')}</option>
          {categories.map((c) => (
            <option key={c._id} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <button type="button" onClick={handleSearch}
          className="btn-primary text-sm py-2 px-4 whitespace-nowrap">
          {t('dashboard.client.picker.search')}
        </button>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="py-10 text-center text-stone-400 text-sm">{t('dashboard.client.picker.searching')}</div>
      ) : data?.length === 0 ? (
        <div className="py-10 text-center text-stone-400 text-sm">
          <Search className="w-8 h-8 text-stone-300 mx-auto mb-2" strokeWidth={1.5} />
          <p>{t('dashboard.client.picker.noWorkers')}</p>
          <Link to="/professionals" className="text-violet-600 hover:underline text-xs mt-2 inline-block">
            {t('dashboard.client.picker.browseAll')}
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-stone-400 mb-3">
            {isFetching ? t('dashboard.client.picker.updating') : t('dashboard.client.picker.resultsCount', { count: data?.length })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data?.map((w) => {
              const profile = w;
              const user    = w.userId || {};
              const name    = profile.workerName || user.name || 'Worker';
              return (
                <button
                  key={profile._id}
                  onClick={() => onSelect({ workerId: user._id || profile.userId, category: profile.category, workerName: name })}
                  className="text-left p-3 rounded-xl border border-stone-200 hover:border-violet-400
                             hover:shadow-md hover:shadow-violet-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={name} photo={user.profilePhoto} size={10} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-stone-800 truncate group-hover:text-violet-700 transition-colors">
                        {name}
                      </p>
                      <p className="text-xs text-stone-500 capitalize truncate">
                        {profile.category?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    {/* Score pill */}
                    <span className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full
                                     bg-gradient-to-br from-violet-600 to-pink-500 text-white">
                      {profile.skillScore ?? '—'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                    {profile.serviceDistricts?.[0] && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {profile.serviceDistricts[0]}
                      </span>
                    )}
                    {profile.dayRateMin && (
                      <span>{t('dashboard.client.picker.perDay', { min: profile.dayRateMin.toLocaleString(), max: profile.dayRateMax?.toLocaleString() })}</span>
                    )}
                    {profile.averageRating > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star size={11} className="fill-yellow-400 text-yellow-400" />
                        {profile.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-center mt-4">
            <Link to="/professionals" className="text-xs text-stone-400 hover:text-violet-600 transition-colors">
              {t('dashboard.client.picker.directoryHint')}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

/* ─── Step 2: Job Form ────────────────────────────────────── */

function PostJobForm({ workerId, workerName, category: prefillCategory, onBack, onClose }) {
  const { t } = useTranslation();
  const { categories } = useCategories();
  const qc = useQueryClient();
  const { fetchNotifications } = useNotificationStore();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { workerId, category: prefillCategory || '' },
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, v); });
      if (workerId) fd.set('workerId', workerId);
      if (prefillCategory) fd.set('category', prefillCategory);
      return api.post('/jobs', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => { qc.invalidateQueries(['clientJobs']); fetchNotifications(); reset(); onClose?.(); },
  });

  return (
    <div className="card mb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {onBack && (
          <button onClick={onBack} className="text-stone-400 hover:text-stone-600 transition-colors">
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h2 className="font-bold text-lg leading-tight">{t('dashboard.client.form.title')}</h2>
          {workerName && (
            <p className="text-sm text-violet-700 font-medium">{t('dashboard.client.form.booking', { name: workerName })}</p>
          )}
        </div>
      </div>

      {/* Worker badge */}
      {workerName && (
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 mb-4">
          <Avatar name={workerName} size={7} />
          <div className="text-sm">
            <span className="font-medium text-violet-800">{workerName}</span>
            {prefillCategory && (
              <span className="text-violet-600 ml-1">
                · {categories.find((c) => c.slug === prefillCategory)?.name || prefillCategory.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t('dashboard.client.form.jobTitle')} *</label>
            <input
              {...register('title', { required: t('dashboard.client.form.titleRequired') })}
              className="input"
              placeholder={t('dashboard.client.form.jobTitlePlaceholder')}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="label">{t('dashboard.client.form.category')} *</label>
            {prefillCategory ? (
              <>
                <input
                  className="input bg-stone-50 text-stone-500 cursor-not-allowed"
                  value={(() => {
                    const c = categories.find((x) => x.slug === prefillCategory);
                    return c ? c.name : prefillCategory.replace(/_/g, ' ');
                  })()}
                  readOnly
                />
              </>
            ) : (
              <select {...register('category', { required: t('dashboard.client.form.categoryRequired') })} className="input">
                <option value="">{t('dashboard.client.form.selectCategory')}</option>
                {categories.map((c) => (
                  <option key={c._id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            )}
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">{t('dashboard.client.form.description')}</label>
          <textarea
            {...register('description')}
            className="input"
            rows={3}
            placeholder={t('dashboard.client.form.descriptionPlaceholder')}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">{t('dashboard.client.form.district')} *</label>
            <input
              {...register('district', { required: t('dashboard.client.form.districtRequired') })}
              className="input"
              placeholder={t('dashboard.client.form.districtPlaceholder')}
            />
            {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district.message}</p>}
          </div>
          <div>
            <label className="label">{t('dashboard.client.form.agreedRate')}</label>
            <input
              {...register('agreedRate')}
              className="input"
              type="number"
              min="0"
              placeholder="5000"
            />
          </div>
          <div>
            <label className="label">{t('dashboard.client.form.preferredDate')}</label>
            <input {...register('scheduledDate')} className="input" type="date" />
          </div>
        </div>


        <div className="flex gap-3 pt-1">
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? t('dashboard.client.form.sending') : t('dashboard.client.form.send')}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">{t('dashboard.client.form.cancel')}</button>
        </div>

        {mutation.error && (
          <p className="text-red-500 text-sm">
            {mutation.error.response?.data?.message || t('dashboard.client.form.failed')}
          </p>
        )}
      </form>
    </div>
  );
}

/* ─── Job Card ────────────────────────────────────────────── */

function JobCard({ job }) {
  const { t } = useTranslation();
  const [showRate, setShowRate]       = useState(false);
  const [rating, setRating]           = useState(5);
  const [review, setReview]           = useState('');
  const [disputeReason, setDispute]   = useState('');
  const [showDispute, setShowDispute] = useState(false);
  const qc = useQueryClient();

  const worker = job.workerId;

  async function action(endpoint, body = {}) {
    await api.put(`/jobs/${job._id}/${endpoint}`, body);
    qc.invalidateQueries(['clientJobs']);
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          {worker && <Avatar name={worker.name} photo={worker.profilePhoto} size={9} />}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="font-semibold text-stone-800">{job.title}</h3>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-sm text-stone-500">
              {job.category?.replace(/_/g, ' ')} · {job.location?.district}
              {worker && <> · <span className="font-medium text-stone-700">{worker.name}</span></>}
            </p>
            {job.agreedRate && (
              <p className="text-sm text-stone-500 mt-0.5">
                {t('dashboard.client.jobCard.rateTotal', { total: job.agreedRate?.toLocaleString(), deposit: job.depositAmount?.toLocaleString() })}
              </p>
            )}
          </div>
        </div>
        <span className="text-xs text-stone-400 flex-shrink-0">
          {new Date(job.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap mt-3">
        {job.status === 'pending' && (
          <p className="text-xs text-stone-400 italic">{t('dashboard.client.jobCard.waiting')}</p>
        )}
        {job.status === 'accepted' && !job.depositPaid && (
          <button onClick={() => action('deposit-paid')} className="btn-primary text-sm py-1.5">
            {t('dashboard.client.jobCard.payDeposit', { amount: job.depositAmount?.toLocaleString() })}
          </button>
        )}
        {job.status === 'completed' && !job.finalPaid && (
          <button onClick={() => action('confirm-complete')} className="btn-primary text-sm py-1.5">
            {t('dashboard.client.jobCard.confirmRelease')}
          </button>
        )}
        {job.status === 'completed' && job.finalPaid && !job.clientRating && (
          <button onClick={() => setShowRate(true)} className="btn-secondary text-sm py-1.5">
            {t('dashboard.client.jobCard.rateWorker')}
          </button>
        )}
        {['accepted', 'in_progress'].includes(job.status) && !job.disputeReason && (
          <button onClick={() => setShowDispute(true)} className="btn-danger text-sm py-1.5">
            {t('dashboard.client.jobCard.openDispute')}
          </button>
        )}
      </div>

      {showRate && (
        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">{t('dashboard.client.jobCard.rating')}</label>
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="input w-20 py-1">
              {[5,4,3,2,1].map((n) => <option key={n} value={n}>{t('dashboard.client.jobCard.ratingStar', { n })}</option>)}
            </select>
          </div>
          <textarea
            className="input text-sm"
            rows={2}
            placeholder={t('dashboard.client.jobCard.reviewPlaceholder')}
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={() => { action('rate', { rating, review }); setShowRate(false); }}
              className="btn-primary text-sm py-1.5">{t('dashboard.client.jobCard.submitRating')}</button>
            <button onClick={() => setShowRate(false)} className="btn-secondary text-sm py-1.5">{t('dashboard.client.jobCard.cancel')}</button>
          </div>
        </div>
      )}

      {showDispute && (
        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
          <textarea
            className="input text-sm"
            rows={2}
            placeholder={t('dashboard.client.jobCard.disputePlaceholder')}
            value={disputeReason}
            onChange={(e) => setDispute(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={() => { action('dispute', { reason: disputeReason }); setShowDispute(false); }}
              className="btn-danger text-sm py-1.5">{t('dashboard.client.jobCard.submitDispute')}</button>
            <button onClick={() => setShowDispute(false)} className="btn-secondary text-sm py-1.5">{t('dashboard.client.jobCard.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Empty state ─────────────────────────────────────────── */

function EmptyState({ onBook }) {
  const { t } = useTranslation();
  return (
    <div className="card text-center py-14">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-500
                      flex items-center justify-center mx-auto mb-4">
        <Briefcase className="w-8 h-8 text-white" strokeWidth={1.75} />
      </div>
      <h3 className="font-bold text-lg text-plum mb-1">{t('dashboard.client.empty.title')}</h3>
      <p className="text-stone-500 text-sm mb-6 max-w-xs mx-auto">
        {t('dashboard.client.empty.subtitle')}
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={onBook} className="btn-primary">
          {t('dashboard.client.empty.bookPro')}
        </button>
        <Link to="/professionals" className="btn-secondary">
          {t('dashboard.client.empty.browsePros')}
        </Link>
      </div>
    </div>
  );
}

/* ─── Transactions Tab ────────────────────────────────────── */

function TransactionsTab({ jobs }) {
  const entries = [];
  (jobs || []).forEach((j) => {
    if (j.depositPaid && j.depositAmount) {
      entries.push({ job: j, type: 'deposit', amount: j.depositAmount, date: j.updatedAt || j.createdAt });
    }
    if (j.finalPaid && j.remainingAmount) {
      entries.push({ job: j, type: 'final', amount: j.remainingAmount, date: j.updatedAt || j.createdAt });
    }
  });
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!entries.length) {
    return (
      <div className="card text-center py-12">
        <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <p className="text-stone-500 text-sm">No payment transactions yet.</p>
        <p className="text-stone-400 text-xs mt-1">Payments you make for jobs will appear here.</p>
      </div>
    );
  }

  const total = entries.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="card bg-gradient-to-r from-violet-50 to-pink-50 border-violet-200 py-3 px-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wide">Total Paid</p>
          <p className="text-2xl font-black text-violet-700">{CURRENCY_SYMBOL}{total.toLocaleString()}</p>
        </div>
        <p className="text-xs text-stone-400">{entries.length} transaction{entries.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-stone-100 text-stone-500">
              <th className="pb-3 font-semibold">Job</th>
              <th className="pb-3 font-semibold">Type</th>
              <th className="pb-3 font-semibold">Amount</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {entries.map((e, i) => (
              <tr key={i}>
                <td className="py-3 font-medium text-stone-800 max-w-[160px] truncate">{e.job.title}</td>
                <td className="py-3">
                  {e.type === 'deposit'
                    ? <span className="badge bg-blue-100 text-blue-700 text-xs">Deposit</span>
                    : <span className="badge bg-green-100 text-green-700 text-xs">Final Payment</span>}
                </td>
                <td className="py-3 font-semibold text-stone-800">{CURRENCY_SYMBOL}{e.amount.toLocaleString()}</td>
                <td className="py-3"><span className="badge bg-green-100 text-green-700 text-xs">Paid</span></td>
                <td className="py-3 text-stone-400 text-xs">{new Date(e.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Art Requests Tab ────────────────────────────────────── */

const STATUS_META = {
  pending:     { label: 'Pending',     cls: 'bg-amber-100 text-amber-700'   },
  quoted:      { label: 'Quoted',      cls: 'bg-blue-100 text-blue-700'     },
  accepted:    { label: 'Accepted',    cls: 'bg-violet-100 text-violet-700' },
  paid:        { label: 'Paid',        cls: 'bg-indigo-100 text-indigo-700' },
  in_progress: { label: 'In Progress', cls: 'bg-indigo-100 text-indigo-700' },
  completed:   { label: 'Completed',   cls: 'bg-green-100 text-green-700'   },
  declined:    { label: 'Declined',    cls: 'bg-red-100 text-red-600'       },
  cancelled:   { label: 'Cancelled',   cls: 'bg-stone-100 text-stone-500'   },
};

function fmtAmt(n) { return `${CURRENCY_SYMBOL}${Number(n).toLocaleString()}`; }
function fmtD(iso)  { return new Date(iso).toLocaleDateString(DATE_LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIMEZONE }); }

// Stripe inner payment form
function CommissionPayForm({ requestId, price, onSuccess, onCancel }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  async function handlePay(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError('');
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/dashboard/client?artPaid=${requestId}` },
      redirect: 'if_required',
    });
    if (result.error) { setError(result.error.message); setBusy(false); return; }
    try {
      await api.post(`/shop/requests/${requestId}/confirm-payment`, { paymentIntentId: result.paymentIntent?.id });
    } catch (_) { /* webhook fallback */ }
    onSuccess();
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={busy || !stripe}
        className="w-full flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors">
        {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><Lock className="w-3.5 h-3.5" /> Pay {fmtAmt(price)}</>}
      </button>
      <button type="button" onClick={onCancel} className="w-full text-sm text-stone-400 hover:text-stone-600 transition-colors py-1">
        Cancel
      </button>
    </form>
  );
}

function CommissionPayModal({ request, onClose, onPaid }) {
  const qc = useQueryClient();
  const [clientSecret,    setClientSecret]    = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [initiating, setInitiating] = useState(true);
  const [initError,  setInitError]  = useState('');

  useEffect(() => {
    api.post(`/shop/requests/${request._id}/pay`)
      .then((r) => {
        setClientSecret(r.data.clientSecret);
        setPaymentIntentId(r.data.paymentIntentId);
        qc.invalidateQueries({ queryKey: ['myArtRequests'] });
      })
      .catch((err) => setInitError(err.response?.data?.message || 'Failed to start payment'))
      .finally(() => setInitiating(false));
  }, [request._id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <div>
            <h2 className="font-bold text-stone-900">Pay for Custom Work</h2>
            <p className="text-sm text-stone-500 mt-0.5">{request.title}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {initiating && <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-fuchsia-500 animate-spin" /></div>}
          {initError && <p className="text-sm text-red-500">{initError}</p>}
          {clientSecret && stripePromise && (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#a21caf' } } }}>
              <CommissionPayForm
                requestId={request._id}
                price={request.quotedPrice}
                onSuccess={() => { onPaid(); onClose(); }}
                onCancel={onClose}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}

function ArtRequestsTab() {
  const qc = useQueryClient();
  const [payingReq, setPayingReq] = useState(null);
  const [paidIds,   setPaidIds]   = useState([]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['myArtRequests'],
    queryFn: () => api.get('/shop/my-requests').then((r) => r.data.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.put(`/shop/requests/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myArtRequests'] }),
  });

  if (isLoading) return <div className="text-center py-10 text-stone-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  if (requests.length === 0) return (
    <div className="text-center py-16 text-stone-400">
      <Paintbrush className="w-12 h-12 mx-auto mb-3 text-stone-200" strokeWidth={1.5} />
      <p className="font-semibold text-stone-500">No art commission requests yet</p>
      <p className="text-sm mt-1">Browse artists and request custom work from their profiles.</p>
      <Link to="/shop" className="mt-4 inline-flex items-center gap-2 bg-fuchsia-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-fuchsia-700 transition-colors">
        <ShoppingBag className="w-4 h-4" /> Browse Shop
      </Link>
    </div>
  );

  return (
    <div className="space-y-4">
      {requests.map((req) => {
        const badge = STATUS_META[req.status] || { label: req.status, cls: 'bg-stone-100 text-stone-500' };
        const artist = req.workerId;
        const justPaid = paidIds.includes(req._id);

        return (
          <div key={req._id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h3 className="font-bold text-stone-900">{req.title}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                </div>
                <p className="text-xs text-stone-400">
                  To <span className="font-semibold text-stone-600 capitalize">{artist?.name?.toLowerCase() || 'Artist'}</span>
                  {' · '}{fmtD(req.createdAt)}
                </p>
              </div>
            </div>

            <p className="text-sm text-stone-600 line-clamp-2 mb-3">{req.description}</p>

            <div className="flex flex-wrap gap-3 text-xs text-stone-500 mb-4">
              {(req.budgetMin || req.budgetMax) && (
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Budget: {fmtAmt(req.budgetMin ?? 0)} – {fmtAmt(req.budgetMax ?? 0)}
                </span>
              )}
              {req.deadline && (
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> By {fmtD(req.deadline)}</span>
              )}
            </div>

            {/* Quote details */}
            {req.quotedPrice && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-3">
                <p className="text-sm font-bold text-blue-800">
                  Artist quoted: <span className="text-fuchsia-700">{fmtAmt(req.quotedPrice)}</span>
                </p>
                {req.quotedNote && <p className="text-xs text-blue-700 mt-1">{req.quotedNote}</p>}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {req.status === 'pending' && (
                <button
                  onClick={() => cancelMutation.mutate(req._id)}
                  className="text-sm text-stone-400 hover:text-red-500 transition-colors"
                >
                  Cancel Request
                </button>
              )}
              {req.status === 'quoted' && !justPaid && (
                <>
                  <button
                    onClick={() => setPayingReq(req)}
                    className="text-sm font-semibold bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" /> Accept & Pay {fmtAmt(req.quotedPrice)}
                  </button>
                  <button
                    onClick={() => cancelMutation.mutate(req._id)}
                    className="text-sm font-semibold text-stone-500 hover:text-red-500 px-4 py-1.5 rounded-xl border border-stone-200 hover:border-red-200 transition-colors"
                  >
                    Decline Quote
                  </button>
                </>
              )}
              {(justPaid || req.status === 'in_progress' || req.status === 'paid') && (
                <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Paid — artist is working on it
                </p>
              )}
              {req.status === 'completed' && (
                <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                </p>
              )}
              {req.status === 'declined' && (
                <p className="text-xs text-stone-400 italic">This request was declined by the artist.</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Commission pay modal */}
      {payingReq && (
        <CommissionPayModal
          request={payingReq}
          onClose={() => setPayingReq(null)}
          onPaid={() => {
            setPaidIds((ids) => [...ids, payingReq._id]);
            qc.invalidateQueries({ queryKey: ['myArtRequests'] });
          }}
        />
      )}
    </div>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────── */

const DASHBOARD_TABS = ['jobs', 'transactions', 'art_requests'];

// step: null | 'pick' | 'form'
export default function ClientDashboard() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [mainTab, setMainTab] = useState('jobs');

  // Direct booking from worker profile (?newJob=ID&category=SLUG)
  const urlWorkerId  = searchParams.get('newJob');
  const urlCategory  = searchParams.get('category') || '';

  const [step, setStep]               = useState(urlWorkerId ? 'form' : null);
  const [selected, setSelected]       = useState(
    urlWorkerId ? { workerId: urlWorkerId, category: urlCategory, workerName: '' } : null
  );

  // If URL params arrive after mount (navigation)
  useEffect(() => {
    if (urlWorkerId) {
      setSelected({ workerId: urlWorkerId, category: urlCategory, workerName: '' });
      setStep('form');
    }
  }, [urlWorkerId, urlCategory]);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['clientJobs'],
    queryFn: () => api.get('/jobs').then((r) => r.data.data),
  });

  const active = jobs?.filter((j) => !['completed', 'cancelled'].includes(j.status)) || [];
  const past   = jobs?.filter((j) => ['completed', 'cancelled'].includes(j.status)) || [];

  function handleWorkerSelected(worker) {
    setSelected(worker);
    setStep('form');
  }

  function resetFlow() {
    setStep(null);
    setSelected(null);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t('dashboard.client.title')}</h1>
        <div className="flex gap-2 flex-wrap">
          <Link to="/dashboard/bookings" className="btn-secondary text-sm py-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            My consultations
          </Link>
          <Link to="/dashboard/my-classes" className="btn-secondary text-sm py-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0 0H9m3 0h3" />
            </svg>
            My live classes
          </Link>
          {step === null ? (
            <button onClick={() => setStep('pick')} className="btn-primary">
              {t('dashboard.client.bookPro')}
            </button>
          ) : (
            <button onClick={resetFlow} className="btn-secondary">
              {t('dashboard.client.cancel')}
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      {step === null && (
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit mb-6">
          {DASHBOARD_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${mainTab === tab ? 'bg-white shadow-sm text-violet-700' : 'text-stone-500 hover:text-stone-700'}`}
            >
              {tab === 'jobs' ? 'My Jobs' : tab === 'transactions' ? 'Transactions' : 'Art Requests'}
            </button>
          ))}
        </div>
      )}

      {/* Step 1 — Pick a worker */}
      {step === 'pick' && (
        <WorkerPicker
          onSelect={handleWorkerSelected}
          onCancel={resetFlow}
        />
      )}

      {/* Step 2 — Fill in job details */}
      {step === 'form' && selected && (
        <PostJobForm
          workerId={selected.workerId}
          workerName={selected.workerName}
          category={selected.category}
          onBack={urlWorkerId ? undefined : () => setStep('pick')}
          onClose={resetFlow}
        />
      )}

      {/* ── Jobs tab ── */}
      {step === null && mainTab === 'jobs' && (
        isLoading ? (
          <div className="text-center py-10 text-stone-400">{t('dashboard.client.loading')}</div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="mb-8">
                <h2 className="font-semibold text-stone-700 mb-3">
                  {t('dashboard.client.activeJobs')} <span className="text-stone-400 font-normal">({active.length})</span>
                </h2>
                <div className="space-y-3">
                  {active.map((j) => <JobCard key={j._id} job={j} />)}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="font-semibold text-stone-700 mb-3">
                  {t('dashboard.client.pastJobs')} <span className="text-stone-400 font-normal">({past.length})</span>
                </h2>
                <div className="space-y-3">
                  {past.map((j) => <JobCard key={j._id} job={j} />)}
                </div>
              </section>
            )}

            {!jobs?.length && (
              <EmptyState onBook={() => setStep('pick')} />
            )}
          </>
        )
      )}

      {/* ── Transactions tab ── */}
      {step === null && mainTab === 'transactions' && (
        isLoading
          ? <div className="text-center py-10 text-stone-400">Loading…</div>
          : <TransactionsTab jobs={jobs} />
      )}

      {/* ── Art Requests tab ── */}
      {step === null && mainTab === 'art_requests' && <ArtRequestsTab />}
    </div>
  );
}
