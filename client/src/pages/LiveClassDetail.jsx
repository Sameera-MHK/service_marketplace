import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  Calendar, Clock, Users, MapPin, CheckCircle2, Video,
  AlertCircle, Tag, ArrowLeft,
} from 'lucide-react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { AvatarWithFallback } from '../components/Avatar';
import { useCategories } from '../hooks/useCategories';
import SEO from '../components/SEO';
import { CURRENCY_SYMBOL } from '../config/site.js';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

// ── helpers ────────────────────────────────────────────────────────────────────

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }) + ' at ' + new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDuration(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${m} min`;
}

function isWithin(iso, ms, now = Date.now()) {
  if (!iso) return false;
  return new Date(iso).getTime() - now <= ms;
}

const isWithin15Min = (iso, now) => isWithin(iso, 15 * 60_000, now);
const isWithin5Min  = (iso, now) => isWithin(iso,  5 * 60_000, now);

/** Ticks every 30 s so time-sensitive buttons update without a page refresh */
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── PaymentModal ───────────────────────────────────────────────────────────────

function PaymentForm({ classId, clientSecret, paymentIntentId, pricePerSeat, onSuccess, onClose }) {
  const stripe   = useStripe();
  const elements = useElements();
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
        return_url: `${window.location.origin}/live-classes/${classId}?paid=true`,
      },
      redirect: 'if_required',
    });

    if (result.error) {
      setError(result.error.message);
      setBusy(false);
      return;
    }

    // Payment succeeded — confirm on server
    try {
      await api.post(`/live-classes/${classId}/confirm-payment`, { paymentIntentId });
    } catch (_) { /* webhook fallback */ }

    onSuccess();
  }

  return (
    <form onSubmit={pay} className="space-y-5">
      <PaymentElement />
      {error && (
        <p className="text-red-600 text-sm flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !stripe}
        className="w-full bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-md"
      >
        {busy ? 'Processing…' : `Pay ${CURRENCY_SYMBOL}${Number(pricePerSeat).toLocaleString()}`}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="w-full text-sm text-stone-500 hover:text-stone-700 transition-colors"
      >
        Cancel
      </button>
      <p className="text-xs text-stone-400 text-center">
        Secured by Stripe. Your card is not stored on our servers.
      </p>
    </form>
  );
}

function PaymentModal({ classId, clientSecret, paymentIntentId, pricePerSeat, onSuccess, onClose }) {
  if (!stripePromise) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
          <p className="text-red-600 text-sm">
            Stripe is not configured. Set <code>VITE_STRIPE_PUBLISHABLE_KEY</code>.
          </p>
          <button onClick={onClose} className="mt-4 text-stone-500 text-sm hover:underline">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-stone-900 text-lg mb-1">Complete Enrollment</h2>
        <p className="text-sm text-stone-500 mb-5">
          {CURRENCY_SYMBOL}{Number(pricePerSeat).toLocaleString()} / seat · secured by Stripe
        </p>
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
          <PaymentForm
            classId={classId}
            clientSecret={clientSecret}
            paymentIntentId={paymentIntentId}
            pricePerSeat={pricePerSeat}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        </Elements>
      </div>
    </div>
  );
}

// ── EnrollmentCard ─────────────────────────────────────────────────────────────

function EnrollmentCard({ cls, user, classId }) {
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const now           = useNow();
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState('');
  const [paymentData, setPaymentData] = useState(null); // { clientSecret, paymentIntentId }
  const [enrolled,    setEnrolled]    = useState(cls.isEnrolled || false);

  const totalSeats    = cls.maxSeats || 0;
  const seatsEnrolled = cls.seatsEnrolled ?? cls.enrolledStudents?.length ?? 0;
  const seatsLeft     = totalSeats - seatsEnrolled;
  const isHost     = user && cls.hostId && (user._id === cls.hostId?._id || user._id === cls.hostId);
  const isOpen     = cls.status === 'open';
  const isLive     = cls.status === 'live';
  const canStart       = isHost && isOpen && isWithin15Min(cls.scheduledAt, now);
  // Students may join 5 min before scheduled time (or when class is already live)
  const studentCanJoin = isLive || (isOpen && isWithin5Min(cls.scheduledAt, now));

  function handleSuccess() {
    setPaymentData(null);
    setEnrolled(true);
    queryClient.invalidateQueries(['liveClass', classId]);
  }

  async function startEnroll() {
    if (!user) {
      navigate(`/login?redirect=/live-classes/${classId}`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api.post(`/live-classes/${classId}/enroll`);
      setPaymentData({
        clientSecret:    res.data.data?.clientSecret ?? res.data.clientSecret,
        paymentIntentId: res.data.data?.paymentIntentId ?? res.data.paymentIntentId,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not initiate enrollment');
    } finally {
      setBusy(false);
    }
  }

  // ── host view ──
  if (isHost) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-stone-900">Your Class</h2>
        <div className="text-sm text-stone-600 space-y-1">
          <p>{seatsEnrolled} student{seatsEnrolled !== 1 ? 's' : ''} enrolled</p>
          {Array.isArray(cls.enrolledStudents) && cls.enrolledStudents.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {cls.enrolledStudents.map((s) => (
                <li key={s._id || s} className="flex items-center gap-2">
                  <AvatarWithFallback name={s.name || 'Student'} photo={s.profilePhoto} size={24} />
                  <span className="text-sm capitalize">{(s.name || 'Student').toLowerCase()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {(isLive || canStart) && (
          <button
            onClick={() => navigate(`/live-classes/${classId}/room`)}
            className="w-full bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Video className="w-4 h-4" strokeWidth={2} />
            {isLive ? 'Rejoin Class' : 'Start Class'}
          </button>
        )}

        {isOpen && !canStart && (
          <p className="text-xs text-stone-400 text-center">
            The "Start Class" button appears 15 minutes before scheduled time.
          </p>
        )}
      </div>
    );
  }

  // ── not logged in ──
  if (!user) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
        <PriceBlock cls={cls} seatsLeft={seatsLeft} />
        <Link
          to={`/login?redirect=/live-classes/${classId}`}
          className="block w-full text-center bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white font-bold py-3 rounded-xl transition-all shadow-md"
        >
          Login to Enroll
        </Link>
      </div>
    );
  }

  // ── worker / admin ──
  if (user.role === 'worker' || user.role === 'admin') {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
        <PriceBlock cls={cls} seatsLeft={seatsLeft} />
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Only clients can enroll in live classes.
        </div>
      </div>
    );
  }

  // ── already enrolled ──
  if (enrolled) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
        <PriceBlock cls={cls} seatsLeft={seatsLeft} />
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          You&apos;re enrolled
        </div>

        {/* Join button — enabled when live OR within 5 min of start */}
        <button
          onClick={() => navigate(`/live-classes/${classId}/room`)}
          disabled={!studentCanJoin}
          title={studentCanJoin ? undefined : 'Join button unlocks 5 minutes before class starts'}
          className="w-full bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <Video className="w-4 h-4" strokeWidth={2} />
          {isLive ? 'Join Class Now' : 'Join Class Room'}
        </button>

        {/* Contextual hint when button is still locked */}
        {!studentCanJoin && isOpen && (
          <p className="text-xs text-stone-400 text-center flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            Join button unlocks 5 minutes before class starts
          </p>
        )}

        {/* Waiting hint — button is enabled but host hasn't started yet */}
        {studentCanJoin && !isLive && (
          <p className="text-xs text-violet-500 text-center">
            Almost time! Waiting for the host to open the room…
          </p>
        )}
      </div>
    );
  }

  // ── class is live but not enrolled ──
  if (isLive) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
        <PriceBlock cls={cls} seatsLeft={seatsLeft} />
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-700">
          <Video className="w-4 h-4 shrink-0 animate-pulse" />
          Class is currently in progress
        </div>
      </div>
    );
  }

  // ── open + seats available ──
  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
        <PriceBlock cls={cls} seatsLeft={seatsLeft} />

        {seatsLeft > 0 ? (
          <>
            <button
              onClick={startEnroll}
              disabled={busy}
              className="w-full bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-60"
            >
              {busy ? 'Preparing…' : `Enroll — ${CURRENCY_SYMBOL}${Number(cls.pricePerSeat).toLocaleString()}`}
            </button>
            {error && (
              <p className="text-red-600 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </p>
            )}
            <p className="text-xs text-stone-400 text-center">Secure payment via Stripe</p>
          </>
        ) : (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            <Users className="w-4 h-4 shrink-0" />
            This class is fully booked.
          </div>
        )}
      </div>

      {/* Payment modal */}
      {paymentData && (
        <PaymentModal
          classId={classId}
          clientSecret={paymentData.clientSecret}
          paymentIntentId={paymentData.paymentIntentId}
          pricePerSeat={cls.pricePerSeat}
          onSuccess={handleSuccess}
          onClose={() => setPaymentData(null)}
        />
      )}
    </>
  );
}

function PriceBlock({ cls, seatsLeft }) {
  const totalSeats = cls.maxSeats || 0;
  return (
    <div className="space-y-2">
      <p className="text-2xl font-black text-stone-900">
        {CURRENCY_SYMBOL}{Number(cls.pricePerSeat).toLocaleString()}
        <span className="text-sm font-normal text-stone-400 ml-1">/ seat</span>
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {seatsLeft > 0 ? `${seatsLeft} of ${totalSeats} seats left` : 'No seats left'}
          </span>
          {seatsLeft > 0 && seatsLeft <= 2 && (
            <span className="text-amber-600 font-semibold">Almost full!</span>
          )}
        </div>
        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              seatsLeft <= 0 ? 'bg-red-400' : seatsLeft <= 2 ? 'bg-amber-400' : 'bg-violet-500'
            }`}
            style={{
              width: totalSeats > 0
                ? `${Math.round(((totalSeats - seatsLeft) / totalSeats) * 100)}%`
                : '0%',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── LiveClassDetail (page) ─────────────────────────────────────────────────────

export default function LiveClassDetail() {
  const { id }   = useParams();
  const { user } = useAuthStore();

  const { data: cls, isLoading, error } = useQuery({
    queryKey: ['liveClass', id],
    queryFn: () =>
      api.get(`/live-classes/${id}`).then((r) => r.data.data ?? r.data),
  });

  // ── All hooks must come before any early returns ──────────────────────────
  const { categories: allCats } = useCategories();
  const catMap = Object.fromEntries([
    ...allCats.map((c) => [c.slug, c.name]),
    ...allCats.map((c) => [String(c._id), c.name]),
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !cls) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-stone-600 font-semibold">Class not found.</p>
        <Link to="/live-classes" className="text-violet-600 underline text-sm">
          Back to Live Classes
        </Link>
      </div>
    );
  }

  const categoryName = catMap[cls.category] ?? null;

  const teacherName  = cls.hostId?.name || 'Unknown';
  const teacherPhoto = cls.hostId?.profilePhoto || null;
  const detailSeatsLeft = (cls.maxSeats || 0) - (cls.seatsEnrolled ?? cls.enrolledStudents?.length ?? 0);

  const seoDescription = cls.description
    ? cls.description.slice(0, 145).trim() + (cls.description.length > 145 ? '…' : '')
    : `Join ${teacherName}'s live ${categoryName ? categoryName + ' ' : ''}class on SkillHub. Book your seat and learn directly from a verified professional.`;

  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title={`${cls.title} — Live Class by ${teacherName}`}
        description={seoDescription}
        url={`/live-classes/${id}`}
        image={teacherPhoto || undefined}
      />
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Back link */}
        <Link
          to="/live-classes"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-violet-700 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2} />
          Live Classes
        </Link>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── LEFT: class info (2/3) ── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Status badge */}
            {cls.status === 'live' && (
              <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Now
              </span>
            )}

            {/* Title + short ref */}
            <div>
              <h1 className="text-3xl font-black text-stone-900 leading-tight">{cls.title}</h1>
              <span className="text-xs font-mono text-stone-400 mt-1 inline-block">
                {'#' + String(cls._id).slice(-6).toUpperCase()}
              </span>
            </div>

            {/* Category */}
            {categoryName && (
              <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-violet-100">
                <Tag className="w-3 h-3" strokeWidth={2} />
                {categoryName}
              </span>
            )}

            {/* Teacher card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-4">
              <AvatarWithFallback name={teacherName} photo={teacherPhoto} size={52} />
              <div>
                <p className="font-bold text-stone-900 capitalize">{teacherName.toLowerCase()}</p>
                {categoryName && (
                  <p className="text-sm text-stone-500">{categoryName}</p>
                )}
                {cls.hostId?.location?.district && (
                  <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" strokeWidth={2} />
                    {cls.hostId.location.district}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            {cls.description && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <h2 className="font-bold text-stone-900 mb-3">About this class</h2>
                <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">
                  {cls.description}
                </p>
              </div>
            )}

            {/* Schedule details */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
              <h2 className="font-bold text-stone-900 mb-4">Schedule</h2>
              <div className="flex items-center gap-3 text-stone-600 text-sm">
                <Calendar className="w-4 h-4 text-violet-500 shrink-0" strokeWidth={2} />
                <span>{formatDateTime(cls.scheduledAt)}</span>
              </div>
              {cls.durationMinutes && (
                <div className="flex items-center gap-3 text-stone-600 text-sm">
                  <Clock className="w-4 h-4 text-violet-500 shrink-0" strokeWidth={2} />
                  <span>{formatDuration(cls.durationMinutes)}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-stone-600 text-sm">
                <Users className="w-4 h-4 text-violet-500 shrink-0" strokeWidth={2} />
                <span>
                  {detailSeatsLeft > 0
                    ? `${detailSeatsLeft} of ${cls.maxSeats} seats remaining`
                    : 'Class is fully booked'}
                </span>
              </div>
            </div>
          </div>

          {/* ── RIGHT: enrollment card (1/3) ── */}
          <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-24">
            <EnrollmentCard cls={cls} user={user} classId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
