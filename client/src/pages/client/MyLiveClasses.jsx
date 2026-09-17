import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, CalendarDays, Users, Clock, ArrowRight } from 'lucide-react';
import api from '../../lib/axios';
import DashSubPageWrapper from '../../components/DashSubPageWrapper';
import { TIMEZONE, DATE_LOCALE } from '../../config/site.js';

// ── helpers ─────────────────────────────────────────────────────────────────

function useNow(ms = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(DATE_LOCALE, {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', timeZone: TIMEZONE,
  });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString(DATE_LOCALE, {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TIMEZONE,
  });
}

function msUntil(iso) {
  return new Date(iso).getTime() - Date.now();
}

function countdownLabel(iso, now) {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return null;
  const totalMins = Math.ceil(diff / 60_000);
  if (totalMins < 60)  return `Starts in ${totalMins} min`;
  const hours = Math.floor(totalMins / 60);
  const mins  = totalMins % 60;
  if (hours < 24) return `Starts in ${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  const days = Math.floor(hours / 24);
  return `Starts in ${days} day${days !== 1 ? 's' : ''}`;
}

const STATUS_META = {
  open:      { label: 'Upcoming',   color: 'bg-green-100 text-green-700'   },
  live:      { label: '🔴 Live Now', color: 'bg-red-100 text-red-700'       },
  completed: { label: 'Completed',  color: 'bg-stone-100 text-stone-600'   },
  cancelled: { label: 'Cancelled',  color: 'bg-red-50 text-red-500'        },
};

// ── ClassCard ────────────────────────────────────────────────────────────────

function ClassCard({ cls, now }) {
  const meta = STATUS_META[cls.status] || { label: cls.status, color: 'bg-stone-100 text-stone-600' };

  const isLive        = cls.status === 'live';
  const isOpen        = cls.status === 'open';
  const isCancelled   = cls.status === 'cancelled';
  const isCompleted   = cls.status === 'completed';

  const ms5Before = msUntil(cls.scheduledAt) - 5 * 60_000;
  const canJoin   = isLive || (isOpen && ms5Before <= 0);

  const countdown = !isLive && !isCancelled && !isCompleted
    ? countdownLabel(cls.scheduledAt, now)
    : null;

  const enrolledAt = cls.myEnrollment?.enrolledAt
    ? new Date(cls.myEnrollment.enrolledAt).toLocaleDateString(DATE_LOCALE, {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : null;

  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${isCancelled ? 'opacity-60' : ''}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <Link
            to={`/live-classes/${cls._id}`}
            className="font-bold text-stone-900 hover:text-violet-700 transition-colors truncate block"
          >
            {cls.title}
          </Link>
          <p className="text-sm text-stone-500 mt-0.5">
            Hosted by <span className="font-medium text-stone-700">{cls.hostId?.name || 'Host'}</span>
          </p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>
          {meta.label}
        </span>
      </div>

      {/* Details row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500 mb-4">
        <span className="flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" />
          {fmtDate(cls.scheduledAt)} · {fmtTime(cls.scheduledAt)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {cls.durationMinutes} min
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {cls.seatsEnrolled ?? cls.enrolledStudents?.length ?? 0} / {cls.maxSeats} seats
        </span>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-3 border-t border-stone-100">
        <div className="text-xs text-stone-400">
          {enrolledAt && `Enrolled ${enrolledAt}`}
          {countdown && (
            <span className="ml-2 font-semibold text-violet-600">{countdown}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isCancelled && (
            <span className="text-xs text-red-500 font-medium">Refund issued</span>
          )}
          {isCompleted && (
            <Link
              to={`/live-classes/${cls._id}`}
              className="text-xs text-stone-500 hover:text-violet-700 transition-colors font-medium"
            >
              View details →
            </Link>
          )}
          {(isOpen || isLive) && !canJoin && (
            <Link
              to={`/live-classes/${cls._id}`}
              className="text-xs text-stone-500 hover:text-violet-700 transition-colors font-medium"
            >
              View →
            </Link>
          )}
          {canJoin && (
            <Link
              to={`/live-classes/${cls._id}/room`}
              className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-pink-500
                         text-white text-sm font-semibold px-4 py-1.5 rounded-full
                         hover:opacity-90 transition-opacity shadow-sm"
            >
              {isLive ? '🔴 Join Now' : 'Enter Class'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MyLiveClasses() {
  const now = useNow();
  const [filter, setFilter] = useState('upcoming');

  const { data: allClasses = [], isLoading } = useQuery({
    queryKey: ['my-live-class-enrollments'],
    queryFn: () => api.get('/live-classes/my-enrollments').then(r => r.data.data),
  });

  const filtered = allClasses.filter(cls => {
    if (filter === 'upcoming') {
      return ['open', 'live'].includes(cls.status) ||
             (cls.status === 'open' && new Date(cls.scheduledAt) > new Date());
    }
    if (filter === 'past') {
      return ['completed', 'cancelled'].includes(cls.status) ||
             (cls.status === 'open' && new Date(cls.scheduledAt) < new Date());
    }
    return true;
  });

  // Count live classes for badge
  const liveCount = allClasses.filter(c => c.status === 'live').length;

  return (
    <DashSubPageWrapper
      title="My Live Classes"
      subtitle="Classes you're enrolled in"
      icon={<GraduationCap className="w-5 h-5 text-white" strokeWidth={2} />}
      backTo="/dashboard/client"
      maxWidth="max-w-3xl"
    >

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <FilterPill active={filter === 'upcoming'} onClick={() => setFilter('upcoming')}>
          Upcoming
          {liveCount > 0 && (
            <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
              {liveCount} live
            </span>
          )}
        </FilterPill>
        <FilterPill active={filter === 'past'} onClick={() => setFilter('past')}>Past</FilterPill>
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterPill>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center gap-3 text-stone-400 text-sm py-8">
          <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          Loading your classes…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-stone-100 flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-stone-400" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-stone-700 mb-1">
            {filter === 'upcoming' ? 'No upcoming classes' : 'No past classes'}
          </p>
          <p className="text-sm text-stone-400 mb-4">
            {filter === 'upcoming'
              ? "You haven't enrolled in any upcoming live classes yet."
              : "You haven't attended any live classes yet."}
          </p>
          <Link
            to="/live-classes"
            className="inline-block bg-gradient-to-r from-violet-600 to-pink-500 text-white text-sm font-semibold px-5 py-2 rounded-full hover:opacity-90 transition-opacity"
          >
            Browse live classes →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(cls => (
            <ClassCard key={cls._id} cls={cls} now={now} />
          ))}
        </div>
      )}
    </DashSubPageWrapper>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
        active
          ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow-sm'
          : 'bg-white border border-stone-200 text-stone-500 hover:border-violet-300 hover:text-violet-700'
      }`}
    >
      {children}
    </button>
  );
}
