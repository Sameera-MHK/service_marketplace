import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Home, Monitor, GraduationCap, HeartPulse, Sparkles,
  Briefcase, Camera, Car, Palette,
} from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { CATEGORY_GROUPS } from '../lib/categoryGroups';
import CategoryIcon from '../components/CategoryIcon';
import SEO from '../components/SEO';
import { SERVICE_AREA } from '../config/site.js';

// ── Skeleton components ────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-gradient-to-br from-stone-200 to-stone-100" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-3.5 bg-stone-200 rounded-lg w-4/5" />
        <div className="h-2.5 bg-stone-200 rounded-lg w-2/5" />
        <div className="h-2.5 bg-stone-200 rounded-lg w-1/3 mt-1" />
      </div>
    </div>
  );
}

function SkeletonSection({ slug }) {
  const meta = GROUP_META[slug];
  const Icon = meta?.Icon;
  return (
    <section style={{ scrollMarginTop: '112px' }}>
      {/* Group header skeleton */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 animate-pulse ${meta?.bg ?? 'bg-stone-200'}`}>
          {Icon && <Icon className={`w-4 h-4 ${meta?.fg ?? 'text-stone-400'} opacity-40`} strokeWidth={1.75} />}
        </div>
        <div className="space-y-1.5 animate-pulse">
          <div className="h-4 bg-stone-200 rounded w-36" />
          <div className="h-2.5 bg-stone-200 rounded w-20" />
        </div>
        <div className="flex-1 h-px bg-stone-100 ml-2" />
      </div>
      {/* 3 skeleton cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    </section>
  );
}

const GROUP_META = {
  home_property:         { Icon: Home,          bg: 'bg-orange-100',  fg: 'text-orange-600'  },
  technology_digital:    { Icon: Monitor,        bg: 'bg-blue-100',    fg: 'text-blue-600'    },
  education_coaching:    { Icon: GraduationCap,  bg: 'bg-indigo-100',  fg: 'text-indigo-600'  },
  health_medical:        { Icon: HeartPulse,     bg: 'bg-red-100',     fg: 'text-red-600'     },
  beauty_wellness:       { Icon: Sparkles,       bg: 'bg-rose-100',    fg: 'text-rose-600'    },
  business_professional: { Icon: Briefcase,      bg: 'bg-violet-100',  fg: 'text-violet-600'  },
  events_creative:       { Icon: Camera,         bg: 'bg-pink-100',    fg: 'text-pink-600'    },
  automotive_transport:  { Icon: Car,            bg: 'bg-slate-100',   fg: 'text-slate-600'   },
  lifestyle_leisure:     { Icon: Palette,        bg: 'bg-fuchsia-100', fg: 'text-fuchsia-600' },
};

const GROUP_GRADIENTS = {
  home_property:         'from-amber-100 via-orange-100 to-rose-100',
  technology_digital:    'from-sky-100 via-indigo-100 to-violet-100',
  education_coaching:    'from-emerald-100 via-teal-100 to-cyan-100',
  health_medical:        'from-sky-100 via-blue-100 to-indigo-100',
  beauty_wellness:       'from-rose-100 via-pink-100 to-fuchsia-100',
  business_professional: 'from-indigo-100 via-violet-100 to-purple-100',
  events_creative:       'from-pink-100 via-fuchsia-100 to-purple-100',
  automotive_transport:  'from-stone-200 via-slate-200 to-zinc-200',
  lifestyle_leisure:     'from-fuchsia-100 via-pink-100 to-rose-100',
};

export default function Browse() {
  const { groupedCategories, categories, isLoading } = useCategories();
  const [query, setQuery] = useState('');
  const groupRefs = useRef({});

  // Random popular chips — reshuffled each time the categories load.
  // Pool: category names short enough to read as a chip (≤ 22 chars).
  const popularChips = useMemo(() => {
    const pool = categories.filter((c) => c.name.length <= 22);
    if (!pool.length) return [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 7);
  }, [categories]); // recalculates once when categories arrive

  // Filtered view when searching
  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groupedCategories;
    const q = query.toLowerCase();
    return groupedCategories
      .map(({ group, categories }) => ({
        group,
        categories: categories.filter((c) => c.name.toLowerCase().includes(q)),
      }))
      .filter((g) => g.categories.length > 0);
  }, [query, groupedCategories]);

  const totalVisible = filteredGroups.reduce((n, g) => n + g.categories.length, 0);

  function scrollToGroup(slug) {
    groupRefs.current[slug]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title="Browse Services"
        description={`Explore ${categories.length}+ services across ${groupedCategories.length} categories — electricians, plumbers, tutors, salons and more in ${SERVICE_AREA}.`}
        url="/services"
      />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-violet-600 via-violet-500 to-pink-500 overflow-hidden">

        {/* Background decoration */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-pink-300/10 rounded-full translate-y-1/2 blur-2xl pointer-events-none" />

        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-14 pb-10 text-center text-white">

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-black mb-3 text-white tracking-tight">
            Browse Services
          </h1>
          <p className="text-violet-100 text-base mb-6">
            {categories.length} services across {groupedCategories.length} categories — find the right professional for any job
          </p>

          {/* Trust stat chips */}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
            {[
              { Icon: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: '2,400+ Pros' },
              { Icon: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: 'All 25 Districts' },
              { Icon: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: 'ID Verified' },
              { Icon: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: 'Free to browse' },
            ].map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
                <s.Icon />{s.label}
              </span>
            ))}
          </div>

          {/* Search bar */}
          <div className="max-w-xl mx-auto">
            <div className="flex items-center bg-white rounded-2xl shadow-xl shadow-violet-900/20 overflow-hidden">
              <svg className="w-5 h-5 text-stone-400 ml-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search e.g. Plumber, Tutor, Photographer…"
                className="flex-1 px-3 py-4 text-stone-900 placeholder:text-stone-400 focus:outline-none text-sm bg-transparent"
              />
              {query ? (
                <button
                  onClick={() => setQuery('')}
                  className="mr-2 w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 text-sm transition-colors"
                >
                  ×
                </button>
              ) : (
                <div className="m-1.5">
                  <div className="bg-gradient-to-br from-violet-600 to-pink-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl whitespace-nowrap">
                    Search
                  </div>
                </div>
              )}
            </div>

            {/* Quick searches — random selection, refreshes every page load */}
            {!query && popularChips.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                <span className="text-violet-200 text-xs">Try:</span>
                {popularChips.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => setQuery(cat.name)}
                    className="text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1 rounded-full transition-all"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Sticky marquee strip — scrolls right-to-left on loop, pauses on hover */}
      {!query && (
        <div
          className="bg-white border-b border-stone-100 sticky top-16 z-30 shadow-sm overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
          }}
        >
          <style>{`
            @keyframes sl-marquee {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .sl-marquee-track {
              animation: sl-marquee 32s linear infinite;
            }
            .sl-marquee-track:hover {
              animation-play-state: paused;
            }
          `}</style>

          {/* Track contains the chip list duplicated twice — the -50% translate lands
              exactly at the start of the second copy, making the loop seamless.     */}
          <div className="sl-marquee-track flex items-center gap-2 py-2.5 w-max px-2">
            {[...groupedCategories, ...groupedCategories].map(({ group }, i) => {
              const meta = GROUP_META[group.slug];
              const Icon = meta?.Icon;
              return (
                <button
                  key={`${group.slug}-${i}`}
                  onClick={() => scrollToGroup(group.slug)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full
                             bg-stone-100 hover:bg-violet-100 hover:text-violet-700 text-stone-600
                             transition-all whitespace-nowrap shrink-0"
                >
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
                  {group.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Category grid ─────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Search result count */}
        {query && (
          <p className="text-sm text-stone-500 mb-6">
            {totalVisible === 0
              ? 'No services match your search.'
              : `${totalVisible} service${totalVisible !== 1 ? 's' : ''} found for "${query}"`}
          </p>
        )}

        {/* ── Skeleton while loading ─────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-12">
            {CATEGORY_GROUPS.map((g) => (
              <SkeletonSection key={g.slug} slug={g.slug} />
            ))}
          </div>
        )}

        {/* ── No search results ──────────────────────────────────────── */}
        {!isLoading && filteredGroups.length === 0 && (
          <div className="text-center py-20">
            <p className="text-stone-600 font-medium">No services found</p>
            <p className="text-stone-400 text-sm mt-1">Try a different keyword</p>
            <button onClick={() => setQuery('')} className="mt-4 btn-primary text-sm py-2 px-5">
              Clear search
            </button>
          </div>
        )}

        {/* ── Real content ───────────────────────────────────────────── */}
        {!isLoading && (
          <div className="space-y-12">
            {filteredGroups.map(({ group, categories }) => {
              const meta = GROUP_META[group.slug];
              const Icon = meta?.Icon;
              return (
                <section
                  key={group.slug}
                  ref={(el) => (groupRefs.current[group.slug] = el)}
                  style={{ scrollMarginTop: '112px' }}
                >
                  {/* Group header */}
                  <div className="flex items-center gap-3 mb-5">
                    {Icon && (
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                        <Icon className={`w-4.5 h-4.5 ${meta.fg}`} strokeWidth={1.75} />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-bold text-plum leading-tight">{group.label}</h2>
                      <p className="text-xs text-stone-400">{categories.length} service{categories.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex-1 h-px bg-stone-200 ml-2" />
                  </div>

                  {/* Category cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {categories.map((cat) => {
                      const gradient = GROUP_GRADIENTS[cat.group] || 'from-violet-100 via-pink-100 to-rose-100';
                      const workers  = cat.workerCount  || 0;
                      const verified = cat.verifiedCount || 0;
                      const isEmpty  = workers === 0;

                      return (
                        <Link
                          key={cat._id}
                          to={`/professionals?category=${cat.slug}`}
                          className="group bg-white rounded-2xl overflow-hidden flex flex-col
                                     border border-stone-200 hover:border-violet-400
                                     hover:shadow-lg hover:shadow-violet-100
                                     hover:-translate-y-0.5 transition-all duration-200"
                        >
                          {/* Cover area */}
                          <div className={`relative aspect-[4/3] bg-gradient-to-br ${gradient} overflow-hidden`}>
                            {cat.coverImage ? (
                              <img
                                src={cat.coverImage}
                                alt={cat.name}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : null}

                            {/* "Be first" badge — subtle amber, only when empty */}
                            {isEmpty && (
                              <span className="absolute top-2 left-2 inline-flex items-center gap-1
                                               bg-amber-400 text-white text-[10px] font-bold
                                               px-2 py-0.5 rounded-full shadow-sm">
                                ✦ Be first!
                              </span>
                            )}

                            {/* Verified badge */}
                            {!isEmpty && verified > 0 && (
                              <span className="absolute top-2 right-2 bg-white/95 backdrop-blur text-violet-700 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                                Verified
                              </span>
                            )}
                          </div>

                          {/* Body */}
                          <div className="p-3.5 flex flex-col gap-1.5 flex-1">
                            <span className="text-sm font-semibold text-stone-800 group-hover:text-violet-700 leading-snug line-clamp-1">
                              {cat.name}
                            </span>
                            {!isEmpty && (
                              <span className="text-xs text-stone-500">
                                {workers} Pro{workers === 1 ? '' : 's'} available
                              </span>
                            )}
                            <span className="text-xs font-medium text-violet-600 group-hover:text-violet-700
                                             mt-auto pt-1 group-hover:translate-x-0.5 transition-transform">
                              {isEmpty ? 'Be the first pro →' : 'Find pros →'}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer CTA ────────────────────────────────────────────────── */}
      {!query && (
        <div className="bg-gradient-to-br from-violet-600 to-pink-500 py-12 px-4 text-center text-white mt-8">
          <h3 className="text-2xl font-bold mb-2 text-white">Can't find what you need?</h3>
          <p className="text-violet-100 text-sm mb-6">Search all Pros directly and filter by district, score and availability</p>
          <Link to="/professionals" className="inline-block bg-white text-violet-700 font-semibold px-8 py-3 rounded-xl hover:bg-violet-50 transition-colors">
            Browse all Pros
          </Link>
        </div>
      )}
    </div>
  );
}
