import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Video, CalendarDays } from 'lucide-react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import DashSubPageWrapper from '../components/DashSubPageWrapper';

const STATUS_META = {
  pending_payment: { label: 'Awaiting payment', color: 'bg-amber-100 text-amber-700' },
  confirmed:       { label: 'Confirmed',        color: 'bg-green-100 text-green-700' },
  in_progress:     { label: 'In progress',      color: 'bg-violet-100 text-violet-700' },
  completed:       { label: 'Completed',        color: 'bg-stone-100 text-stone-600' },
  cancelled:       { label: 'Cancelled',        color: 'bg-red-100 text-red-700' },
  no_show:         { label: 'No-show',          color: 'bg-red-100 text-red-700' },
  refunded:        { label: 'Refunded',         color: 'bg-stone-100 text-stone-600' },
};

export default function Bookings() {
  const { user } = useAuthStore();
  const [role, setRole] = useState(user?.role === 'worker' ? 'worker' : 'client');
  const [when, setWhen] = useState('upcoming');

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['bookings', role, when],
    queryFn: () => api.get('/consultations/bookings/mine', { params: { role, when } }).then((r) => r.data.data),
  });

  return (
    <DashSubPageWrapper
      title="Consultation Bookings"
      subtitle="Manage your upcoming and past video sessions"
      icon={<CalendarDays className="w-5 h-5 text-white" strokeWidth={2} />}
      maxWidth="max-w-3xl"
    >

        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {user?.role === 'worker' && (
            <>
              <FilterPill active={role === 'worker'} onClick={() => setRole('worker')}>As Pro</FilterPill>
              <FilterPill active={role === 'client'} onClick={() => setRole('client')}>As Client</FilterPill>
              <span className="w-px h-5 bg-stone-200 mx-1 self-center" />
            </>
          )}
          <FilterPill active={when === 'upcoming'} onClick={() => setWhen('upcoming')}>Upcoming</FilterPill>
          <FilterPill active={when === 'past'} onClick={() => setWhen('past')}>Past</FilterPill>
        </div>

        {/* Content */}
        {isLoading ? (
          <p className="text-stone-400 text-sm">Loading…</p>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-stone-100 flex items-center justify-center">
              <CalendarDays className="w-7 h-7 text-stone-400" strokeWidth={1.5} />
            </div>
            <p className="font-semibold text-stone-700 mb-1">No bookings yet</p>
            <p className="text-sm text-stone-400">
              {when === 'upcoming' ? 'No upcoming sessions scheduled.' : 'No past sessions found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => <BookingCard key={b._id} booking={b} role={role} onChange={refetch} />)}
          </div>
        )}
    </DashSubPageWrapper>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
        active
          ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow-sm'
          : 'bg-white border border-stone-200 text-stone-500 hover:border-violet-300 hover:text-violet-700'
      }`}
    >
      {children}
    </button>
  );
}

function BookingCard({ booking, role, onChange }) {
  const meta  = STATUS_META[booking.status] || { label: booking.status, color: 'bg-stone-100 text-stone-600' };
  const other = role === 'worker' ? booking.clientId : booking.workerId;
  const date  = new Date(booking.startsAt);
  const isJoinable = ['confirmed', 'in_progress'].includes(booking.status) &&
                     date.getTime() - Date.now() < 5 * 60 * 1000 + 60 * 60 * 1000 &&
                     date.getTime() > Date.now() - 60 * 60 * 1000;

  async function cancel() {
    if (!confirm('Cancel this booking? A refund will be issued if already paid.')) return;
    await api.put(`/consultations/bookings/${booking._id}/cancel`, {});
    onChange?.();
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-stone-900 truncate">{booking.offering?.title}</h3>
          <p className="text-sm text-stone-500 mt-0.5">
            {date.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            <span className="mx-1.5 text-stone-300">·</span>
            {booking.offering?.durationMinutes} min
            <span className="mx-1.5 text-stone-300">·</span>
            with <span className="font-medium text-stone-700">{other?.name || (role === 'worker' ? 'Client' : 'Pro')}</span>
          </p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>
          {meta.label}
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-stone-100">
        <div className="text-sm">
          <span className="text-stone-400">Price: </span>
          <span className="font-bold text-stone-900">{booking.currency} {Number(booking.clientPaid).toLocaleString()}</span>
          {role === 'worker' && (
            <span className="text-xs text-stone-400 ml-2">
              (you receive {booking.currency} {Number(booking.proPayout).toLocaleString()} after {booking.commissionPercent}% fee)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isJoinable && (
            <Link
              to={`/consultations/${booking._id}/room`}
              className="bg-gradient-to-r from-violet-600 to-pink-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity shadow-sm"
            >
              Join call →
            </Link>
          )}
          {['pending_payment', 'confirmed'].includes(booking.status) && (
            <button onClick={cancel} className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
              Cancel
            </button>
          )}
        </div>
      </div>

      {booking.liveKitRecordingUrl && (
        <a
          href={booking.liveKitRecordingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-violet-700 hover:underline mt-3"
        >
          <Video className="w-3.5 h-3.5" />
          Watch recording
        </a>
      )}
    </div>
  );
}
