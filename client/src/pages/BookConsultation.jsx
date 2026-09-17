import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

// ── date helpers ───────────────────────────────────────────────────────────────
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── CalendarPicker ─────────────────────────────────────────────────────────────
function CalendarPicker({ slotsByDay, selectedDay, setSelectedDay, selectedSlot, setSelectedSlot, onConfirm, confirming }) {
  const availableDays = Object.keys(slotsByDay).sort();

  const [viewDate, setViewDate] = useState(() => {
    const first = availableDays[0];
    return first ? new Date(first + 'T12:00:00') : new Date();
  });

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // 6 × 7 grid anchored at Sunday of the week containing the 1st
  const firstOfMonth = new Date(year, month, 1);
  const startOffset  = firstOfMonth.getDay();
  const cells = Array.from({ length: 42 }, (_, i) =>
    new Date(year, month, 1 - startOffset + i)
  );

  const todayStr   = toLocalDateStr(new Date());
  const monthLabel = firstOfMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // Timezone footer
  const tz     = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

  const selectedDaySlots = selectedDay ? (slotsByDay[selectedDay] || []) : [];
  const selectedDayLabel = selectedDay
    ? new Date(selectedDay + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric',
      })
    : null;

  return (
    <div className="flex flex-col md:flex-row bg-white rounded-2xl shadow-md border border-stone-100 overflow-hidden">

      {/* ── LEFT: month calendar ───────────────────────────────────────────── */}
      <div className="p-6 md:w-[340px] border-b md:border-b-0 md:border-r border-stone-100 flex flex-col">

        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-stone-800">{monthLabel}</h2>
          <div className="flex gap-0.5">
            <button
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded text-stone-400 hover:bg-stone-100 text-lg leading-none"
            >‹</button>
            <button
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded text-stone-400 hover:bg-stone-100 text-lg leading-none"
            >›</button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DOW.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-stone-400 py-1">{d}</div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((date, i) => {
            const dayStr      = toLocalDateStr(date);
            const inMonth     = date.getMonth() === month;
            const isAvailable = inMonth && dayStr >= todayStr && !!slotsByDay[dayStr];
            const isSelected  = selectedDay === dayStr;

            return (
              <button
                key={i}
                onClick={() => {
                  if (!isAvailable) return;
                  setSelectedDay(dayStr);
                  setSelectedSlot(null);
                }}
                disabled={!isAvailable}
                className={[
                  'mx-auto w-9 h-9 flex items-center justify-center text-sm rounded-full transition-all select-none',
                  isSelected
                    ? 'bg-gradient-to-br from-violet-600 to-pink-500 text-white font-bold shadow-sm'
                    : isAvailable
                    ? 'border-2 border-violet-400 text-stone-700 font-medium hover:bg-violet-50 cursor-pointer'
                    : inMonth
                    ? 'text-stone-300 cursor-default'
                    : 'text-stone-200 cursor-default',
                ].join(' ')}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        {/* Timezone */}
        <div className="mt-5 flex items-center gap-1.5 text-xs text-stone-400">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{tz} ({tzTime})</span>
        </div>
      </div>

      {/* ── RIGHT: time slots ──────────────────────────────────────────────── */}
      <div className="flex-1 p-6">
        {selectedDay ? (
          <>
            <h3 className="font-bold text-stone-800 mb-4">{selectedDayLabel}</h3>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {selectedDaySlots.map((iso) => {
                const time       = new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
                const isSelected = selectedSlot === iso;

                if (isSelected) {
                  /* expanded: [time pill] [Confirm button] */
                  return (
                    <div key={iso} className="flex items-center gap-3">
                      <div className="flex-1 text-center font-bold text-stone-800 text-sm border-2 border-violet-400 rounded-full py-2.5 px-4">
                        {time}
                      </div>
                      <button
                        onClick={onConfirm}
                        disabled={confirming}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white font-bold py-2.5 rounded-full transition-all disabled:opacity-60 text-sm shadow-sm"
                      >
                        {confirming ? 'Booking…' : 'Confirm'}
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    key={iso}
                    onClick={() => setSelectedSlot(iso)}
                    className="w-full py-2.5 rounded-full border-2 border-violet-400 text-violet-600 font-medium hover:bg-violet-50 active:bg-violet-100 transition-colors text-sm"
                  >
                    {time}
                  </button>
                );
              })}

              {selectedDaySlots.length === 0 && (
                <p className="text-sm text-stone-400 italic text-center py-4">
                  No available times on this day.
                </p>
              )}
            </div>
          </>
        ) : (
          /* placeholder before a day is chosen */
          <div className="h-full min-h-48 flex flex-col items-center justify-center text-stone-400 gap-3">
            <svg className="w-10 h-10 text-stone-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8"  y1="2" x2="8"  y2="6" />
              <line x1="3"  y1="10" x2="21" y2="10" />
            </svg>
            <p className="text-sm">Select a date to see available times</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BookConsultation (page) ────────────────────────────────────────────────────
export default function BookConsultation() {
  const { workerId, offeringId } = useParams();
  const { user }    = useAuthStore();
  const navigate    = useNavigate();

  const [selectedDay,  setSelectedDay]  = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [clientNotes,  setClientNotes]  = useState('');
  const [booking,      setBooking]      = useState(null); // { booking, clientSecret }
  const [creating,     setCreating]     = useState(false);
  const [error,        setError]        = useState('');

  const { data: offData } = useQuery({
    queryKey: ['publicConsultations', workerId],
    queryFn: () => api.get(`/consultations/workers/${workerId}/offerings`).then((r) => r.data.data),
  });
  const { data: workerData } = useQuery({
    queryKey: ['workerPublic', workerId],
    queryFn: () => api.get(`/workers/${workerId}`).then((r) => r.data.data).catch(() => null),
  });

  const offering = offData?.offerings?.find((o) => o._id === offeringId);

  const { data: slotsData } = useQuery({
    queryKey: ['consultationSlots', workerId, offeringId],
    queryFn:  () => api.get(`/consultations/workers/${workerId}/slots`, { params: { offeringId } }).then((r) => r.data.data),
    enabled:  !!offering,
  });

  // Group slots by LOCAL date so the calendar grid stays in sync
  const slotsByDay = useMemo(() => {
    const map = {};
    (slotsData?.slots || []).forEach((iso) => {
      const day = toLocalDateStr(new Date(iso));
      (map[day] = map[day] || []).push(iso);
    });
    return map;
  }, [slotsData]);

  async function createBooking() {
    if (!selectedSlot) return;
    if (!user) {
      navigate(`/login?redirect=/consultations/book/${workerId}/${offeringId}`);
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/consultations/bookings', {
        workerUserId: workerId,
        offeringId,
        startsAt:     selectedSlot,
        clientNotes,
      });
      setBooking(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setCreating(false);
    }
  }

  if (!offering) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-stone-500">Loading consultation details…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/40 to-pink-50/20">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link to={`/pro/${workerId}`} className="text-sm text-violet-700 hover:underline">← Back to profile</Link>

        {/* Header */}
        <header className="mt-3 mb-8">
          <h1 className="text-3xl font-black text-stone-900">Book a consultation</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-stone-600">
            <span className="font-semibold">{offering.title}</span>
            <span>·</span>
            <span>{offering.durationMinutes} min</span>
            <span>·</span>
            <span className="font-semibold text-amber-700">
              {offering.currency} {Number(offering.price).toLocaleString()}
            </span>
            {workerData?.name && (
              <><span>·</span><span>with {workerData.name}</span></>
            )}
          </div>
        </header>

        {!booking ? (
          <>
            {/* ── Calendar picker ── */}
            <section className="mb-6">
              {Object.keys(slotsByDay).length === 0 && slotsData ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-sm">
                  <p className="text-stone-400 text-sm italic">
                    No available slots — try again later or contact the Pro directly.
                  </p>
                </div>
              ) : (
                <CalendarPicker
                  slotsByDay={slotsByDay}
                  selectedDay={selectedDay}
                  setSelectedDay={setSelectedDay}
                  selectedSlot={selectedSlot}
                  setSelectedSlot={setSelectedSlot}
                  onConfirm={createBooking}
                  confirming={creating}
                />
              )}
            </section>

            {/* ── Notes ── */}
            <section className="bg-white rounded-2xl border border-stone-200 p-6 mb-5 shadow-sm">
              <h2 className="font-bold mb-3 text-stone-800">Notes for the Pro <span className="text-stone-400 font-normal text-sm">(optional)</span></h2>
              <textarea
                rows={3}
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
                placeholder="What would you like help with? Any background they should know…"
              />
            </section>

            {/* SMS reminder notice */}
            <p className="text-xs text-stone-400 flex items-center gap-1.5 mb-4">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3h3m-6 3h.008v.008H7.5V15zm0-3h.008v.008H7.5V12zm0-3h.008v.008H7.5V9z" />
              </svg>
              You'll receive an SMS reminder 10 minutes before your session starts.
            </p>

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            {/* ── CTA — only shows when a slot is selected ── */}
            <button
              onClick={createBooking}
              disabled={!selectedSlot || creating}
              className="w-full bg-gradient-to-br from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-95 disabled:opacity-40 transition-all shadow-md"
            >
              {creating
                ? 'Creating booking…'
                : selectedSlot
                ? `Continue to payment · ${offering.currency} ${Number(offering.price).toLocaleString()}`
                : 'Select a time slot above'}
            </button>
          </>
        ) : (
          stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: booking.clientSecret, appearance: { theme: 'stripe' } }}
            >
              <PaymentStep bookingId={booking.booking._id} offering={offering} startsAt={selectedSlot} />
            </Elements>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              Stripe publishable key not configured. Set <code>VITE_STRIPE_PUBLISHABLE_KEY</code> in the client env.
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── PaymentStep ────────────────────────────────────────────────────────────────
function PaymentStep({ bookingId, offering, startsAt }) {
  const stripe   = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  async function pay(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError('');
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/bookings?paid=${bookingId}`,
      },
      redirect: 'if_required',
    });
    if (result.error) {
      setError(result.error.message);
      setBusy(false);
    } else {
      try {
        await api.post(`/consultations/bookings/${bookingId}/confirm-payment`);
      } catch (_) { /* webhook will catch it if this fails */ }
      navigate(`/dashboard/bookings?paid=${bookingId}`);
    }
  }

  return (
    <form onSubmit={pay} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
      <div>
        <h2 className="font-bold text-stone-900 mb-1">Payment</h2>
        <p className="text-sm text-stone-500">
          {offering.title} · {new Date(startsAt).toLocaleString()}
        </p>
      </div>
      <PaymentElement />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={busy || !stripe}
        className="w-full bg-gradient-to-br from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-95 disabled:opacity-50 shadow-md"
      >
        {busy ? 'Processing…' : `Pay ${offering.currency} ${Number(offering.price).toLocaleString()}`}
      </button>
      <p className="text-xs text-stone-400 text-center">
        Secured by Stripe. Your card is not stored on our servers.
      </p>
    </form>
  );
}
