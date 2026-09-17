import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Users } from 'lucide-react';
import api from '../lib/axios';
import { AvatarWithFallback } from '../components/Avatar';
import { useCategories } from '../hooks/useCategories';
import SEO from '../components/SEO';
import { CURRENCY_SYMBOL } from '../config/site.js';

// ── helpers ────────────────────────────────────────────────────────────────────

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDuration(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${m} min`;
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 animate-pulse space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-stone-200" />
        <div className="h-3.5 w-28 bg-stone-200 rounded-full" />
      </div>
      <div className="h-4 w-3/4 bg-stone-200 rounded-full" />
      <div className="h-3 w-1/3 bg-stone-100 rounded-full" />
      <div className="h-3 w-1/2 bg-stone-100 rounded-full" />
      <div className="h-3 w-2/5 bg-stone-100 rounded-full" />
      <div className="h-9 w-full bg-stone-100 rounded-xl mt-2" />
    </div>
  );
}

// ── ClassCard ──────────────────────────────────────────────────────────────────

function ClassCard({ cls, catMap = {} }) {
  const totalSeats    = cls.maxSeats || 0;
  const enrolled      = cls.seatsEnrolled ?? cls.enrolledStudents?.length ?? 0;
  const seatsLeft     = totalSeats - enrolled;
  const fillPct       = totalSeats > 0 ? Math.round((enrolled / totalSeats) * 100) : 0;
  const almostFull    = seatsLeft <= 2 && seatsLeft > 0;
  const full          = seatsLeft <= 0;

  const teacherName   = cls.hostId?.name || 'Unknown';
  const teacherPhoto  = cls.hostId?.profilePhoto || null;
  const categoryName  = catMap[cls.category] ?? null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-3">

      {/* Teacher row */}
      <div className="flex items-center gap-2">
        <AvatarWithFallback name={teacherName} photo={teacherPhoto} size={36} />
        <span className="text-sm font-medium text-stone-700 capitalize truncate">
          {teacherName.toLowerCase()}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-bold text-stone-900 leading-snug line-clamp-2">{cls.title}</h3>

      {/* Category badge */}
      {categoryName && (
        <span className="inline-flex w-fit items-center bg-violet-50 text-violet-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-violet-100">
          {categoryName}
        </span>
      )}

      {/* Schedule */}
      <div className="flex flex-col gap-1.5 text-sm text-stone-500">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-violet-400 shrink-0" strokeWidth={2} />
          {formatDateTime(cls.scheduledAt)}
        </span>
        {cls.durationMinutes && (
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-violet-400 shrink-0" strokeWidth={2} />
            {formatDuration(cls.durationMinutes)}
          </span>
        )}
      </div>

      {/* Price */}
      <p className="font-bold text-stone-800">
        {CURRENCY_SYMBOL}{Number(cls.pricePerSeat).toLocaleString()}
        <span className="text-xs font-normal text-stone-400 ml-1">/ seat</span>
      </p>

      {/* Seats indicator */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-stone-500">
            <Users className="w-3 h-3" strokeWidth={2} />
            {full
              ? 'No seats left'
              : `${seatsLeft} of ${totalSeats} seat${totalSeats !== 1 ? 's' : ''} left`}
          </span>
          {almostFull && !full && (
            <span className="text-amber-600 font-semibold">Almost full!</span>
          )}
          {full && (
            <span className="text-red-500 font-semibold">Full</span>
          )}
        </div>
        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              full ? 'bg-red-400' : almostFull ? 'bg-amber-400' : 'bg-violet-500'
            }`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* CTA */}
      <Link
        to={`/live-classes/${cls._id}`}
        className="mt-auto w-full text-center bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-sm"
      >
        View &amp; Enroll
      </Link>
    </div>
  );
}

// ── LiveClassBrowse (page) ─────────────────────────────────────────────────────

const ALL_FILTER = '__all__';

export default function LiveClassBrowse() {
  const [category, setCategory]   = useState(ALL_FILTER);
  const [timeFilter, setTimeFilter] = useState('upcoming'); // 'upcoming' | 'all'

  const { categories: allCats } = useCategories();

  // Build a lookup keyed by both slug and _id so we resolve legacy ObjectId values too
  const catMap = Object.fromEntries([
    ...allCats.map((c) => [c.slug, c.name]),
    ...allCats.map((c) => [String(c._id), c.name]),
  ]);

  const { data = [], isLoading } = useQuery({
    queryKey: ['liveClasses', category],
    queryFn: () =>
      api
        .get('/live-classes', {
          params: {
            ...(category !== ALL_FILTER ? { category } : {}),
            when: timeFilter,
          },
        })
        .then((r) => r.data.data ?? r.data),
  });

  // Unique category values from results that have a resolvable name (hides legacy ObjectIds)
  const categoryValues = [...new Set((data || []).map((c) => c.category).filter(Boolean))];
  const knownCategories = categoryValues.filter((v) => catMap[v]);

  const filtered = category === ALL_FILTER ? data : data.filter((c) => c.category === category);

  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title="Live Classes & Online Learning"
        description="Browse live online classes. Book directly and learn from verified professionals — tutoring, workshops, skills training and more."
        url="/live-classes"
      />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-violet-600 via-violet-500 to-pink-500 overflow-hidden">

        {/* decorations */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-pink-300/10 rounded-full translate-y-1/2 blur-2xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-14 pb-10 text-center text-white">
          <h1 className="text-4xl sm:text-5xl text-white font-black mb-3 tracking-tight">Live Classes</h1>
          <p className="text-violet-100 text-base">
            Join expert-led online sessions — learn from verified professionals
          </p>
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-stone-100 shadow-sm sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 overflow-x-auto">

          {/* Upcoming / All toggle */}
          <div className="flex items-center bg-stone-100 rounded-full p-1 shrink-0">
            {['upcoming', 'all'].map((t) => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all capitalize ${
                  timeFilter === t
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {t === 'upcoming' ? 'Upcoming' : 'All'}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-stone-200 shrink-0" />

          {/* Category pills */}
          <button
            onClick={() => setCategory(ALL_FILTER)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap shrink-0 ${
              category === ALL_FILTER
                ? 'bg-violet-100 text-violet-700'
                : 'bg-stone-100 text-stone-600 hover:bg-violet-50 hover:text-violet-600'
            }`}
          >
            All Categories
          </button>
          {knownCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap shrink-0 ${
                category === cat
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-stone-100 text-stone-600 hover:bg-violet-50 hover:text-violet-600'
              }`}
            >
              {catMap[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-stone-400">
            <Calendar className="w-14 h-14 text-stone-200" strokeWidth={1} />
            <p className="text-lg font-semibold text-stone-500">No classes scheduled yet</p>
            <p className="text-sm">Check back soon — new sessions are added regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((cls) => (
              <ClassCard key={cls._id} cls={cls} catMap={catMap} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
