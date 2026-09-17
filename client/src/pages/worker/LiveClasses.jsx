import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Video,
  CalendarX,
  Plus,
  X,
  Users,
  Clock,
  BadgeCheck,
  Pencil,
  TrendingUp,
  AlertCircle,
  Link2,
  Check,
} from 'lucide-react';
import api from '../../lib/axios';
import DashSubPageWrapper from '../../components/DashSubPageWrapper';
import { useCategories } from '../../hooks/useCategories';
import { BalanceCard, PayoutDetailsCard } from '../../components/WorkerPayoutSection';
import { CURRENCY_SYMBOL, DATE_LOCALE } from '../../config/site.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(DATE_LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString(DATE_LOCALE, { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr${h > 1 ? 's' : ''}`;
}

function fmtPrice(amount) {
  if (amount == null) return '—';
  return `${CURRENCY_SYMBOL}${Number(amount).toLocaleString()}`;
}

/** Ticks every `ms` so time-sensitive buttons update automatically */
function useNow(ms = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Human-readable "X h Y m" until a future timestamp; null if already past */
function countdownLabel(isoTime, now) {
  const diff = new Date(isoTime).getTime() - now;
  if (diff <= 0) return null;
  const totalMin = Math.floor(diff / 60_000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} h ${m} m` : `${h} h`;
}

/** Returns a short ref like "#B188B2" from any MongoDB ObjectId string */
function shortRef(id) {
  return '#' + String(id).slice(-6).toUpperCase();
}

/** One-click copy hook — shows a checkmark for 2 s after copying */
function useCopyLink(id) {
  const [copied, setCopied] = useState(false);
  function copy(e) {
    e.stopPropagation();
    const url = `${window.location.origin}/live-classes/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return { copied, copy };
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const meta = {
    open:      { label: 'Open',      cls: 'bg-green-100 text-green-700' },
    live:      { label: 'Live',      cls: 'bg-violet-100 text-violet-700', pulse: true },
    completed: { label: 'Completed', cls: 'bg-stone-100 text-stone-600' },
    cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-600' },
  };
  const m = meta[status] || { label: status, cls: 'bg-stone-100 text-stone-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${m.cls}`}>
      {m.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600" />
        </span>
      )}
      {m.label}
    </span>
  );
}

// ── Seats progress bar ────────────────────────────────────────────────────────

function SeatsBar({ enrolled, max }) {
  const pct = max > 0 ? Math.min((enrolled / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-stone-500 tabular-nums whitespace-nowrap">
        {enrolled} / {max} seats
      </span>
    </div>
  );
}

// ── Class card ────────────────────────────────────────────────────────────────

function ClassCard({ cls, onCancel, onEdit }) {
  const navigate = useNavigate();
  const now      = useNow();
  const enrolled = cls.seatsEnrolled ?? cls.enrolledStudents?.length ?? 0;
  const max      = cls.maxSeats ?? 0;
  const { copied, copy } = useCopyLink(cls._id);

  const msUntilStart = new Date(cls.scheduledAt).getTime() - now;
  // Host may start class within the 10-minute window
  const canStart  = cls.status === 'open' && msUntilStart <= 10 * 60_000;
  const countdown = cls.status === 'open' && msUntilStart > 0 ? countdownLabel(cls.scheduledAt, now) : null;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex flex-col gap-4">
      {/* Top row: title + badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-stone-900 leading-snug">{cls.title}</h3>
          {cls.description && (
            <p className="text-sm text-stone-500 mt-1 line-clamp-2">{cls.description}</p>
          )}
          {/* Short reference + copy link */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-mono text-stone-400">{shortRef(cls._id)}</span>
            <button
              onClick={copy}
              title="Copy class link"
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-violet-600 transition-colors"
            >
              {copied
                ? <><Check className="w-3 h-3 text-green-500" /><span className="text-green-500">Copied!</span></>
                : <><Link2 className="w-3 h-3" /><span>Copy link</span></>
              }
            </button>
          </div>
        </div>
        <StatusBadge status={cls.status} />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-stone-600">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-stone-400" />
          {fmtDateTime(cls.scheduledAt)}
        </span>
        <span className="flex items-center gap-1.5">
          <BadgeCheck className="w-3.5 h-3.5 text-stone-400" />
          {fmtDuration(cls.durationMinutes)}
        </span>
        <span className="font-semibold text-stone-700">
          {fmtPrice(cls.pricePerSeat)} / seat
        </span>
      </div>

      {/* Seats bar */}
      <SeatsBar enrolled={enrolled} max={max} />

      {/* Completed: earnings breakdown */}
      {cls.status === 'completed' && (
        <div className="bg-stone-50 rounded-xl px-4 py-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-xs text-stone-400 mb-0.5">Gross revenue</p>
            <p className="font-bold text-stone-800">{fmtPrice(cls.totalRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400 mb-0.5">Commission ({cls.commissionPercent ?? 0}%)</p>
            <p className="font-bold text-red-500">−{fmtPrice(cls.commissionAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400 mb-0.5">Your payout</p>
            <p className="font-bold text-green-600">{fmtPrice(cls.hostPayout)}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">

        {/* ── Open class ── */}
        {cls.status === 'open' && (
          <>
            <button
              onClick={() => navigate(`/live-classes/${cls._id}/room`)}
              disabled={!canStart}
              title={
                canStart
                  ? 'Start the class room'
                  : `Unlocks 10 min before class${countdown ? ` · in ${countdown}` : ''}`
              }
              className="btn-primary text-sm px-4 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start Class
            </button>

            {/* countdown hint */}
            {!canStart && countdown && (
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                in {countdown}
              </span>
            )}

            <button
              onClick={() => onEdit(cls)}
              className="btn-secondary text-sm px-4 py-1.5 flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>

            <button
              onClick={() => onCancel(cls._id)}
              className="text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {/* ── Live class ── */}
        {cls.status === 'live' && (
          <button
            onClick={() => navigate(`/live-classes/${cls._id}/room`)}
            className="bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white text-sm font-semibold px-5 py-1.5 rounded-lg transition-all"
          >
            Rejoin Room
          </button>
        )}

        {/* ── Cancelled ── */}
        {cls.status === 'cancelled' && (
          <span className="text-xs text-red-400 font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Cancelled · enrolled students were refunded
          </span>
        )}
      </div>
    </div>
  );
}

// ── Unified Create / Edit form ────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { label: '30 minutes', value: 30 },
  { label: '1 hour',     value: 60 },
  { label: '1.5 hours',  value: 90 },
  { label: '2 hours',    value: 120 },
  { label: '3 hours',    value: 180 },
];

function blankForm(cls) {
  if (!cls) return { title: '', description: '', category: '', date: '', time: '', durationMinutes: 60, pricePerSeat: '', maxSeats: 10 };
  const d = new Date(cls.scheduledAt);
  const date = d.toISOString().split('T')[0];
  const time = d.toTimeString().slice(0, 5);
  return {
    title:           cls.title || '',
    description:     cls.description || '',
    category:        cls.category || '',
    date,
    time,
    durationMinutes: cls.durationMinutes || 60,
    pricePerSeat:    cls.pricePerSeat ?? '',
    maxSeats:        cls.maxSeats ?? 10,
  };
}

function ClassForm({ initialClass, onClose }) {
  const qc    = useQueryClient();
  const isEdit = !!initialClass;
  const { categories, groupedCategories } = useCategories();
  const [form,  setForm]  = useState(() => blankForm(initialClass));
  const [error, setError] = useState('');

  // Resolve legacy ObjectId category → slug when editing an older class
  useEffect(() => {
    if (!form.category || !categories.length) return;
    const matchBySlug = categories.find((c) => c.slug === form.category);
    if (!matchBySlug) {
      const matchById = categories.find((c) => String(c._id) === form.category);
      if (matchById) setForm((p) => ({ ...p, category: matchById.slug }));
    }
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/live-classes', payload).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myLiveClasses'] }); onClose(); },
    onError:   (err) => setError(err.response?.data?.message || 'Failed to create class.'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`/live-classes/${initialClass._id}`, payload).then((r) => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myLiveClasses'] }); onClose(); },
    onError:   (err) => setError(err.response?.data?.message || 'Failed to update class.'),
  });

  const mutation = isEdit ? updateMutation : createMutation;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim())                      { setError('Title is required.');             return; }
    if (!form.date)                              { setError('Date is required.');              return; }
    if (!form.time)                              { setError('Time is required.');              return; }
    if (!form.pricePerSeat)                      { setError('Price per seat is required.');    return; }
    if (!form.maxSeats || form.maxSeats < 1)     { setError('Max seats must be at least 1.'); return; }

    const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
    mutation.mutate({
      title:           form.title.trim(),
      description:     form.description.trim(),
      category:        form.category || undefined,
      scheduledAt,
      durationMinutes: Number(form.durationMinutes),
      pricePerSeat:    Number(form.pricePerSeat),
      maxSeats:        Number(form.maxSeats),
    });
  }

  const inputCls = 'w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-colors';
  const labelCls = 'block text-xs font-semibold text-stone-600 mb-1';

  return (
    <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-stone-900">
          {isEdit ? 'Edit Class' : 'Schedule a Live Class'}
        </h2>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Title <span className="text-red-500">*</span></label>
          <input type="text" className={inputCls} placeholder="e.g. Advanced Python for Beginners"
            value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />
        </div>

        <div>
          <label className={labelCls}>Description <span className="text-stone-400 font-normal">(optional)</span></label>
          <textarea className={inputCls} placeholder="What will students learn in this session?" rows={3}
            value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div>
          <label className={labelCls}>Category</label>
          <select className={`${inputCls} bg-white`} value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">— Select a category —</option>
            {groupedCategories.length > 0
              ? groupedCategories.map(({ group, categories: cats }) => (
                  <optgroup key={group.slug} label={group.label}>
                    {cats.map((c) => <option key={c._id} value={c.slug}>{c.name}</option>)}
                  </optgroup>
                ))
              : categories.map((c) => <option key={c._id} value={c.slug}>{c.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Date <span className="text-red-500">*</span></label>
            <input type="date" className={inputCls} value={form.date}
              min={new Date().toISOString().split('T')[0]} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Time <span className="text-red-500">*</span></label>
            <input type="time" className={inputCls} value={form.time} onChange={(e) => set('time', e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Duration <span className="text-red-500">*</span></label>
          <select className={`${inputCls} bg-white`} value={form.durationMinutes}
            onChange={(e) => set('durationMinutes', Number(e.target.value))}>
            {DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Price per seat ({CURRENCY_SYMBOL}) <span className="text-red-500">*</span></label>
            <input type="number" className={inputCls} placeholder="e.g. 1000" min={0} step={100}
              value={form.pricePerSeat} onChange={(e) => set('pricePerSeat', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Max seats <span className="text-red-500">*</span></label>
            <input type="number" className={inputCls} placeholder="e.g. 10" min={1} max={100}
              value={form.maxSeats} onChange={(e) => set('maxSeats', e.target.value)} />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={mutation.isPending} className="btn-primary disabled:opacity-60">
            {mutation.isPending ? (isEdit ? 'Saving…' : 'Scheduling…') : (isEdit ? 'Save Changes' : 'Schedule Class')}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onSchedule }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mb-4">
        <CalendarX className="w-8 h-8 text-violet-400" />
      </div>
      <h3 className="text-lg font-bold text-stone-800 mb-1">No live classes yet</h3>
      <p className="text-sm text-stone-500 max-w-xs mb-6">
        Create your first class to start teaching groups of students via video.
      </p>
      <button onClick={onSchedule} className="btn-primary flex items-center gap-2">
        <Plus className="w-4 h-4" /> Schedule a Class
      </button>
    </div>
  );
}

// ── Earnings summary ──────────────────────────────────────────────────────────

function EarningsSummary({ classes, commissionRate }) {
  const completed = classes.filter((c) => c.status === 'completed');
  if (!completed.length) return null;

  const totalRevenue    = completed.reduce((s, c) => s + (c.totalRevenue    || 0), 0);
  const totalCommission = completed.reduce((s, c) => s + (c.commissionAmount || 0), 0);
  const totalPayout     = completed.reduce((s, c) => s + (c.hostPayout      || 0), 0);

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" /> Earnings from Live Classes
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-stone-100 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-xs text-stone-400 mb-1">Total gross</p>
          <p className="text-lg font-black text-stone-800">{fmtPrice(totalRevenue)}</p>
          <p className="text-xs text-stone-400 mt-0.5">{completed.length} session{completed.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white border border-stone-100 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-xs text-stone-400 mb-1">Commission paid</p>
          <p className="text-lg font-black text-red-500">{fmtPrice(totalCommission)}</p>
          <p className="text-xs text-stone-400 mt-0.5">avg {commissionRate}% platform fee</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-xs text-green-500 mb-1">Your net payout</p>
          <p className="text-lg font-black text-green-700">{fmtPrice(totalPayout)}</p>
          <p className="text-xs text-green-400 mt-0.5">after commission</p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LiveClasses() {
  const qc = useQueryClient();
  const [showForm,  setShowForm]  = useState(false);
  const [editClass, setEditClass] = useState(null); // class being edited

  const { data: classes = [], isLoading, isError } = useQuery({
    queryKey: ['myLiveClasses'],
    queryFn: () => api.get('/live-classes/mine').then((r) => r.data.data),
  });

  const { data: dashData } = useQuery({
    queryKey: ['workerDashboard'],
    queryFn: () => api.get('/workers/dashboard').then((r) => r.data.data),
  });

  // Fetch the worker's own effective commission rate (respects admin overrides)
  const { data: rateData } = useQuery({
    queryKey: ['myLiveClassRate'],
    queryFn: () => api.get('/live-classes/my-rate').then((r) => r.data.data),
    enabled: !!dashData, // only fetch after we know they're a worker
  });

  const plan           = dashData?.profile?.subscriptionPlan || 'free';
  const isPaid         = plan === 'pro' || plan === 'elite';
  const commissionRate = rateData?.percent ?? 12;
  const rateSource     = rateData?.source ?? 'platform_default'; // 'live_class_override' | 'pro_override' | 'category_default' | 'platform_default'

  const cancelMutation = useMutation({
    mutationFn: (id) => api.delete(`/live-classes/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myLiveClasses'] }),
  });

  function handleCancel(id) {
    if (!window.confirm('Cancel this class? Enrolled students will be automatically refunded.')) return;
    cancelMutation.mutate(id);
  }

  function openEdit(cls) {
    setShowForm(false);
    setEditClass(cls);
  }

  function closeForm() {
    setShowForm(false);
    setEditClass(null);
  }

  const upcoming = classes.filter((c) => c.status === 'open' || c.status === 'live');
  const past     = classes.filter((c) => c.status === 'completed' || c.status === 'cancelled');

  return (
    <DashSubPageWrapper
      title="Live Classes"
      subtitle="Host paid group video sessions for your students"
      icon={<Video className="w-5 h-5 text-white" strokeWidth={2} />}
      backTo="/dashboard/worker"
    >
      {/* Free plan upgrade gate */}
      {!isPaid && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="text-2xl">🔒</div>
          <div className="flex-1">
            <p className="font-bold text-amber-900 mb-1">Pro or Elite plan required</p>
            <p className="text-sm text-amber-700 mb-3">
              Live classes are available to Pro and Elite subscribers. Upgrade to start hosting paid group sessions.
            </p>
            <a href="/dashboard/worker/subscription" className="btn-primary text-sm py-1.5">View Plans</a>
          </div>
        </div>
      )}

      {/* Commission rate banner */}
      {isPaid && (
        <div className="mb-6 bg-violet-50 border border-violet-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold text-violet-900">
                Your commission rate: <span className="text-violet-600">{commissionRate}%</span>
              </p>
              {/* Show a badge when admin has set a custom rate */}
              {(rateSource === 'live_class_override' || rateSource === 'pro_override') && (
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  Custom rate
                </span>
              )}
              {rateSource === 'category_default' && (
                <span className="text-xs font-medium text-violet-400">category rate</span>
              )}
            </div>
            <p className="text-xs text-violet-500">
              Deducted from total revenue when you end a session. You keep{' '}
              <span className="font-semibold">{100 - commissionRate}%</span>.
            </p>
          </div>
          <div className="text-xs text-violet-400 bg-white/70 rounded-xl px-3 py-2 border border-violet-100 whitespace-nowrap">
            e.g. 5 seats × {CURRENCY_SYMBOL}1,000 → you earn{' '}
            <span className="font-bold text-violet-700">
              {CURRENCY_SYMBOL}{((1 - commissionRate / 100) * 5000).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Earnings summary (only when there are completed classes) */}
      {isPaid && <EarningsSummary classes={classes} commissionRate={commissionRate} />}

      {/* Balance + withdrawal — shown as soon as there's a completed class */}
      {isPaid && classes.some((c) => c.status === 'completed') && (
        <>
          <BalanceCard
            balanceUrl="live-classes/me/balance"
            requestUrl="live-classes/me/payouts/request"
            historyUrl="live-classes/me/payouts"
            queryNs="live-class"
            description="Earnings from your completed live classes. Withdraw to your saved bank or wallet — typically processed within 2 business days."
          />
          <PayoutDetailsCard />
        </>
      )}

      {/* Top action bar */}
      <div className="flex justify-end mb-5">
        {!showForm && !editClass && isPaid && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Schedule a Class
          </button>
        )}
      </div>

      {/* Create / Edit form */}
      {(showForm || editClass) && (
        <ClassForm initialClass={editClass || null} onClose={closeForm} />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-4">
          Failed to load your live classes. Please refresh and try again.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && classes.length === 0 && (
        <EmptyState onSchedule={() => setShowForm(true)} />
      )}

      {/* Upcoming / Open classes */}
      {!isLoading && !isError && upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Upcoming &amp; Live
          </h2>
          <div className="space-y-4">
            {upcoming.map((cls) => (
              <ClassCard key={cls._id} cls={cls} onCancel={handleCancel} onEdit={openEdit} />
            ))}
          </div>
        </section>
      )}

      {/* Past classes */}
      {!isLoading && !isError && past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Past Classes
          </h2>
          <div className="space-y-4">
            {past.map((cls) => (
              <ClassCard key={cls._id} cls={cls} onCancel={handleCancel} onEdit={openEdit} />
            ))}
          </div>
        </section>
      )}
    </DashSubPageWrapper>
  );
}
