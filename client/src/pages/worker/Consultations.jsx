import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Video as VideoIcon } from 'lucide-react';
import api from '../../lib/axios';
import DashSubPageWrapper from '../../components/DashSubPageWrapper';
import { BalanceCard, PayoutDetailsCard, PayoutStatusBadge } from '../../components/WorkerPayoutSection';
import { DEFAULT_CURRENCY, CURRENCIES } from '../../config/site.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WorkerConsultations() {
  return (
    <DashSubPageWrapper
      title="Private Consultations"
      subtitle="Offer paid 1-on-1 video sessions to clients — local and international."
      icon={<VideoIcon className="w-5 h-5 text-white" strokeWidth={2} />}
      backTo="/dashboard/worker"
    >
      <EnableCard />
      <CommissionCard />
      <BalanceCard />
      <PayoutDetailsCard />
      <OfferingsCard />
      <ScheduleCard />
    </DashSubPageWrapper>
  );
}

// ── Enable toggle ─────────────────────────────────────────────────────────
function EnableCard() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['workerDashboard'],
    queryFn: () => api.get('/workers/dashboard').then((r) => r.data.data),
  });
  const enabled = data?.profile?.consultationsEnabled;

  async function toggle() {
    await api.put('/consultations/me/enable', { enabled: !enabled });
    qc.invalidateQueries(['workerDashboard']);
  }

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6 mb-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900">{enabled ? 'Consultations are live' : 'Get started'}</h2>
          <p className="text-sm text-stone-500 mt-1">
            {enabled
              ? 'Clients can see and book your sessions on your public profile.'
              : 'Add a payout method, at least one offering, and a weekly schedule. Then flip this on.'}
          </p>
        </div>
        <button
          onClick={toggle}
          className={`relative w-14 h-8 rounded-full transition-colors ${enabled ? 'bg-violet-600' : 'bg-stone-300'}`}
        >
          <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : ''}`} />
        </button>
      </div>
    </section>
  );
}

// ── Effective commission preview ─────────────────────────────────────────
function CommissionCard() {
  const { data } = useQuery({
    queryKey: ['consultations:commission'],
    queryFn: () => api.get('/consultations/me/commission').then((r) => r.data.data),
  });
  if (!data) return null;
  const labels = {
    pro_override:     'Custom rate set by admin',
    volume_tier:      'Volume tier reward',
    category_default: 'Category baseline',
    platform_default: 'Platform default',
  };
  return (
    <section className="bg-gradient-to-br from-violet-600 to-pink-500 text-white rounded-2xl p-6 mb-5 shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider opacity-70">Your commission rate</p>
          <p className="text-4xl font-black mt-1">{data.percent}%</p>
          <p className="text-sm mt-1 opacity-80">{labels[data.source] || data.source}</p>
          {data.detail?.note && <p className="text-xs italic opacity-70 mt-2">{data.detail.note}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider opacity-70">You keep</p>
          <p className="text-4xl font-black mt-1 text-amber-300">{(100 - data.percent).toFixed(1)}%</p>
          <p className="text-xs opacity-80 mt-1">of each session</p>
        </div>
      </div>
    </section>
  );
}

// ── Offerings (session types) ────────────────────────────────────────────
function OfferingsCard() {
  const qc = useQueryClient();
  const { data: offerings = [] } = useQuery({
    queryKey: ['consultations:offerings'],
    queryFn: () => api.get('/consultations/me/offerings').then((r) => r.data.data),
  });

  const [editing, setEditing] = useState(null);
  const blank = { title: '', description: '', durationMinutes: 30, price: '', currency: DEFAULT_CURRENCY, isActive: true };
  const [form, setForm] = useState(blank);

  function startEdit(o) { setEditing(o._id); setForm({ ...o }); }
  function cancel()     { setEditing(null); setForm(blank); }

  async function save() {
    if (!form.title || !form.durationMinutes || !form.price) return;
    if (editing && editing !== 'new') {
      await api.put(`/consultations/me/offerings/${editing}`, form);
    } else {
      await api.post('/consultations/me/offerings', form);
    }
    qc.invalidateQueries(['consultations:offerings']);
    cancel();
  }

  async function remove(id) {
    if (!confirm('Delete this session type?')) return;
    await api.delete(`/consultations/me/offerings/${id}`);
    qc.invalidateQueries(['consultations:offerings']);
  }

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6 mb-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900">Session types</h2>
        {!editing && (
          <button onClick={() => { setEditing('new'); setForm(blank); }} className="text-sm text-violet-700 font-semibold hover:underline">
            + Add session type
          </button>
        )}
      </div>

      {offerings.length === 0 && !editing && (
        <p className="text-sm text-stone-400 italic">No session types yet. Add one to start accepting bookings.</p>
      )}

      <div className="space-y-3">
        {offerings.map((o) => editing === o._id ? (
          <OfferingForm key={o._id} form={form} setForm={setForm} onSave={save} onCancel={cancel} />
        ) : (
          <div key={o._id} className={`flex items-center gap-3 p-4 rounded-lg border ${o.isActive ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-100 opacity-60'}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-stone-800">{o.title}</span>
                <span className="text-xs text-stone-500">{o.durationMinutes} min</span>
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                  {o.currency} {Number(o.price).toLocaleString()}
                </span>
                {!o.isActive && <span className="text-xs text-stone-400">Inactive</span>}
              </div>
              {o.description && <p className="text-xs text-stone-500 mt-1">{o.description}</p>}
            </div>
            <button onClick={() => startEdit(o)} className="text-xs text-violet-600 underline hover:no-underline">Edit</button>
            <button onClick={() => remove(o._id)} className="text-xs text-red-500 underline hover:no-underline">Delete</button>
          </div>
        ))}
        {editing === 'new' && <OfferingForm form={form} setForm={setForm} onSave={save} onCancel={cancel} isNew />}
      </div>
    </section>
  );
}

function OfferingForm({ form, setForm, onSave, onCancel, isNew }) {
  function set(k, v) { setForm({ ...form, [k]: v }); }
  return (
    <div className="p-4 rounded-lg border border-violet-200 bg-violet-50/30 space-y-3">
      <div>
        <label className="text-xs font-semibold text-stone-600 block mb-1">Title</label>
        <input className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-violet-400" placeholder="e.g. Initial Consultation"
          value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />
      </div>
      <div>
        <label className="text-xs font-semibold text-stone-600 block mb-1">Description (optional)</label>
        <textarea className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-violet-400" placeholder="Short description shown to clients"
          rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-stone-600 block mb-1">Duration (min)</label>
          <input type="number" min="5" max="240" step="5" className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
            value={form.durationMinutes} onChange={(e) => set('durationMinutes', Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-600 block mb-1">Price</label>
          <input type="number" min="0" step="50" className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
            value={form.price} onChange={(e) => set('price', Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-600 block mb-1">Currency</label>
          <select className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
            value={form.currency} onChange={(e) => set('currency', e.target.value)}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      {!isNew && (
        <label className="flex items-center gap-2 text-xs text-stone-600">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
          Active (uncheck to hide from clients without deleting)
        </label>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-700">Save</button>
        <button onClick={onCancel} className="text-sm text-stone-600 px-4 py-2 rounded-lg hover:bg-stone-100">Cancel</button>
      </div>
    </div>
  );
}

// ── Weekly schedule ──────────────────────────────────────────────────────
function ScheduleCard() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['consultations:schedule'],
    queryFn: () => api.get('/consultations/me/schedule').then((r) => r.data.data),
  });

  const [weeklySlots, setWeeklySlots]         = useState([]);
  const [bufferMinutes, setBufferMinutes]     = useState(15);
  const [advanceNoticeHours, setAdvanceNoticeHours] = useState(4);
  const [bookingWindowDays, setBookingWindowDays]   = useState(30);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!data || hydrated) return;
    setWeeklySlots(data.weeklySlots || []);
    setBufferMinutes(data.bufferMinutes ?? 15);
    setAdvanceNoticeHours(data.advanceNoticeHours ?? 4);
    setBookingWindowDays(data.bookingWindowDays ?? 30);
    setHydrated(true);
  }, [data, hydrated]);

  function addSlotFor(dayOfWeek) {
    setWeeklySlots([...weeklySlots, { dayOfWeek, startTime: '09:00', endTime: '17:00' }]);
  }
  function updateSlot(idx, field, value) {
    setWeeklySlots(weeklySlots.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }
  function removeSlot(idx) {
    setWeeklySlots(weeklySlots.filter((_, i) => i !== idx));
  }

  async function save() {
    await api.put('/consultations/me/schedule', {
      weeklySlots, bufferMinutes, advanceNoticeHours, bookingWindowDays,
    });
    qc.invalidateQueries(['consultations:schedule']);
  }

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6 mb-5 shadow-sm">
      <h2 className="text-lg font-bold text-stone-900 mb-1">Weekly availability</h2>
      <p className="text-sm text-stone-500 mb-4">Define the hours you're available each week. Clients only see slots within these windows.</p>

      <div className="space-y-2 mb-5">
        {DAYS.map((day, dow) => {
          const daySlots = weeklySlots.map((s, i) => ({ ...s, idx: i })).filter((s) => s.dayOfWeek === dow);
          return (
            <div key={day} className="flex items-start gap-3 py-2">
              <div className="w-12 text-sm font-semibold text-stone-700 pt-2">{day}</div>
              <div className="flex-1 space-y-2">
                {daySlots.length === 0 && (
                  <p className="text-xs text-stone-400 italic pt-2">Unavailable</p>
                )}
                {daySlots.map((s) => (
                  <div key={s.idx} className="flex items-center gap-2">
                    <input type="time" value={s.startTime}
                      onChange={(e) => updateSlot(s.idx, 'startTime', e.target.value)}
                      className="px-2 py-1.5 border border-stone-300 rounded text-sm" />
                    <span className="text-stone-400">–</span>
                    <input type="time" value={s.endTime}
                      onChange={(e) => updateSlot(s.idx, 'endTime', e.target.value)}
                      className="px-2 py-1.5 border border-stone-300 rounded text-sm" />
                    <button onClick={() => removeSlot(s.idx)} className="text-xs text-red-500 underline hover:no-underline ml-1">remove</button>
                  </div>
                ))}
              </div>
              <button onClick={() => addSlotFor(dow)} className="text-xs text-violet-700 hover:underline pt-2">+ add</button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5 pt-4 border-t border-stone-100">
        <div>
          <label className="text-xs font-semibold text-stone-600 block mb-1">Buffer between sessions (min)</label>
          <input type="number" min="0" max="60" step="5" value={bufferMinutes}
            onChange={(e) => setBufferMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-600 block mb-1">Min advance notice (hrs)</label>
          <input type="number" min="0" max="168" value={advanceNoticeHours}
            onChange={(e) => setAdvanceNoticeHours(Number(e.target.value))}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-600 block mb-1">Booking window (days ahead)</label>
          <input type="number" min="1" max="180" value={bookingWindowDays}
            onChange={(e) => setBookingWindowDays(Number(e.target.value))}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
        </div>
      </div>

      <button onClick={save} className="bg-violet-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-violet-700">
        Save schedule
      </button>
    </section>
  );
}
