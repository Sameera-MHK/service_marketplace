import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';

/**
 * Anonymous "live work" widget shown on Worker / Business public profiles.
 * Never reveals client identity. Shows aggregate counters + a strip of
 * recent progress photos (each tagged only with category, district, time).
 */
function timeAgo(date) {
  const d = new Date(date);
  const sec = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60)        return `${sec}s ago`;
  if (sec < 3600)      return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400)     return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`;
  if (sec < 86400 * 30) return `${Math.floor(sec / 86400 / 7)}w ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function LivePulse({ type, slug }) {
  const [lightbox, setLightbox] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['livePulse', type, slug],
    queryFn: () => api.get(`/progress-posts/pulse/${type}/${slug}`).then((r) => r.data.data),
    enabled: !!slug,
    staleTime: 60_000,
  });

  if (isLoading || isError || !data) return null;

  const { counters, posts } = data;

  // No data and no posts → don't render the widget at all
  const isWorker = type === 'worker';
  const hasCounters = isWorker
    ? (counters.completedLast30 > 0 || counters.inProgressNow > 0 || counters.totalLifetime > 0)
    : (counters.postsLast30 > 0 || counters.postsLast7 > 0);

  if (!hasCounters && (!posts || posts.length === 0)) return null;

  return (
    <div className="card mb-6 relative overflow-hidden">
      {/* Subtle live-pulse glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-violet-200 to-pink-200 rounded-full opacity-30 blur-2xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <h2 className="font-bold text-lg">Live Work</h2>
          <span className="text-xs text-stone-400">— anonymized, no client info shown</span>
        </div>

        {/* Counter row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {isWorker ? (
            <>
              <Counter label="In progress" value={counters.inProgressNow} accent="violet" />
              <Counter label="Completed (30d)" value={counters.completedLast30} accent="emerald" />
              <Counter label="Lifetime jobs" value={counters.totalLifetime} accent="stone" />
            </>
          ) : (
            <>
              <Counter label="This week" value={counters.postsLast7} accent="violet" />
              <Counter label="Last 30 days" value={counters.postsLast30} accent="emerald" />
              <Counter label="Total inquiries" value={counters.totalInquiries} accent="stone" />
            </>
          )}
        </div>

        {/* Active districts */}
        {counters.activeDistricts?.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              Active recently in
            </p>
            <div className="flex flex-wrap gap-1.5">
              {counters.activeDistricts.map((d) => (
                <span key={d}
                      className="text-xs font-medium bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full border border-violet-100">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Photo strip */}
        {posts?.length > 0 ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              Recent work
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {posts.slice(0, 8).map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => setLightbox(p)}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-stone-100"
                >
                  <img
                    src={p.photos[0]}
                    alt={`${p.category} in ${p.district}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {p.photos.length > 1 && (
                    <span className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                      +{p.photos.length - 1}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white text-[11px] leading-tight">
                    <div className="font-semibold truncate">{p.category}</div>
                    <div className="opacity-80 truncate">{p.district} · {timeAgo(p.createdAt)}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-stone-400 italic">No recent posts yet.</p>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-3xl w-full bg-stone-900 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-stone-900 max-h-[70vh] overflow-y-auto">
              {lightbox.photos.map((url, i) => (
                <img key={i} src={url} alt="" className="w-full object-contain" />
              ))}
            </div>
            <div className="px-5 py-4 bg-stone-800 text-stone-100 text-sm flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold">{lightbox.category}</div>
                <div className="text-stone-400 text-xs">
                  {lightbox.district} · {timeAgo(lightbox.createdAt)}
                </div>
                {lightbox.caption && (
                  <p className="mt-2 text-stone-200 text-sm leading-snug max-w-md">{lightbox.caption}</p>
                )}
              </div>
              <button
                onClick={() => setLightbox(null)}
                className="text-stone-300 hover:text-white text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Counter({ label, value, accent }) {
  const colors = {
    violet:  'text-violet-700 bg-violet-50 border-violet-100',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    stone:   'text-stone-700 bg-stone-50 border-stone-200',
  }[accent] || 'text-stone-700 bg-stone-50 border-stone-200';

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${colors}`}>
      <div className="text-2xl font-black leading-tight">{value ?? 0}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}
