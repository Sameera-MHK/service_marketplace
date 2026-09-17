import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Users, Clock, CalendarDays } from 'lucide-react';
import api from '../lib/axios';
import { TIMEZONE, DEFAULT_CURRENCY, DATE_LOCALE } from '../config/site.js';

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(DATE_LOCALE, {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: TIMEZONE,
  });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString(DATE_LOCALE, {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TIMEZONE,
  });
}

export default function WorkerLiveClassesSection({ workerUserId }) {
  const { data: classes = [] } = useQuery({
    queryKey: ['publicLiveClasses', workerUserId],
    queryFn: () =>
      api.get('/live-classes', { params: { hostId: workerUserId, limit: 6 } })
        .then((r) => r.data.data),
    enabled: !!workerUserId,
  });

  if (!classes.length) return null;

  return (
    <section className="rounded-2xl overflow-hidden bg-gradient-to-br from-violet-50 via-white to-pink-50/30 border border-violet-100 shadow-sm">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 border-b border-violet-100/60">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="w-5 h-5 text-violet-600" strokeWidth={1.75} />
          <span className="text-xs uppercase tracking-wider font-semibold text-violet-700">
            Live Classes
          </span>
        </div>
        <h2 className="text-2xl font-black text-stone-900">Upcoming group sessions</h2>
        <p className="text-sm text-stone-500 mt-1">
          Join a scheduled live video class — pay once, learn with a group.
        </p>
      </div>

      {/* Class cards */}
      <div className="p-6 grid gap-3 md:grid-cols-2">
        {classes.map((cls) => {
          const isLive    = cls.status === 'live';
          const enrolled  = cls.seatsEnrolled ?? cls.enrolledStudents?.length ?? 0;
          const seatsLeft = Math.max(0, cls.maxSeats - enrolled);

          return (
            <Link
              key={cls._id}
              to={`/live-classes/${cls._id}`}
              className="group block rounded-xl bg-white border border-stone-200 p-5
                         hover:border-violet-300 hover:shadow-md hover:shadow-violet-100 transition-all"
            >
              {/* Title + live badge */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-bold text-stone-900 group-hover:text-violet-700 line-clamp-2 flex-1">
                  {cls.title}
                </h3>
                {isLive ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold
                                   bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Live now
                  </span>
                ) : (
                  <span className="shrink-0 text-xs bg-violet-100 text-violet-700
                                   px-2 py-0.5 rounded-full font-semibold">
                    {cls.durationMinutes} min
                  </span>
                )}
              </div>

              {/* Date + time */}
              {!isLive && (
                <div className="flex items-center gap-3 text-xs text-stone-500 mb-3">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {fmtDate(cls.scheduledAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {fmtTime(cls.scheduledAt)}
                  </span>
                </div>
              )}

              {/* Price + seats */}
              <div className="flex items-end justify-between mt-auto">
                <div>
                  <p className="text-xs text-stone-400">Per seat</p>
                  <p className="text-xl font-black text-stone-900">
                    {cls.currency || DEFAULT_CURRENCY}{' '}
                    <span className="text-amber-600">
                      {Number(cls.pricePerSeat).toLocaleString()}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="flex items-center gap-1 text-xs text-stone-400">
                    <Users className="w-3.5 h-3.5" />
                    {seatsLeft > 0
                      ? `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} left`
                      : 'Full'}
                  </span>
                  <span className="text-xs font-semibold text-violet-700 group-hover:translate-x-0.5 transition-transform">
                    {isLive ? 'Join now →' : 'View & enroll →'}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer link */}
      <div className="px-6 pb-5 text-center">
        <Link
          to="/live-classes"
          className="text-xs text-stone-400 hover:text-violet-600 transition-colors"
        >
          Browse all live classes →
        </Link>
      </div>
    </section>
  );
}
