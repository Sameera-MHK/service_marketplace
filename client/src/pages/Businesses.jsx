import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search, X, Store, ArrowRight, Users, BadgeCheck, MapPin,
  Scissors, Wrench, UtensilsCrossed, Camera, Sparkles, BookOpen,
  Building2, ChevronDown,
} from 'lucide-react';
import api from '../lib/axios';
import BusinessCard from '../components/BusinessCard';
import SEO from '../components/SEO';
import { DISTRICTS, SERVICE_AREA } from '../config/site.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { value: 'salon',              label: 'Salon / Spa',         Icon: Scissors        },
  { value: 'barbershop',         label: 'Barbershop',          Icon: Scissors        },
  { value: 'repair_shop',        label: 'Repair Shop',         Icon: Wrench          },
  { value: 'catering',           label: 'Catering',            Icon: UtensilsCrossed },
  { value: 'photography_studio', label: 'Photography Studio',  Icon: Camera          },
  { value: 'cleaning_company',   label: 'Cleaning Company',    Icon: Sparkles        },
  { value: 'tutoring_centre',    label: 'Tutoring Centre',     Icon: BookOpen        },
  { value: 'restaurant',         label: 'Restaurant',          Icon: UtensilsCrossed },
  { value: 'agency',             label: 'Agency',              Icon: Building2       },
  { value: 'other',              label: 'Other',               Icon: Store           },
];

const PAGE_SIZE = 20;

// ── Skeleton ───────────────────────────────────────────────────────────────────
function BusinessCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-stone-100 overflow-hidden bg-white animate-pulse">
      <div className="h-44 bg-gradient-to-br from-stone-200 to-stone-100" />
      <div className="p-3 space-y-2.5">
        <div className="h-3.5 bg-stone-200 rounded-lg w-2/3" />
        <div className="h-2.5 bg-stone-200 rounded-lg w-2/5" />
        <div className="h-2.5 bg-stone-200 rounded-lg w-4/5" />
        <div className="h-2.5 bg-stone-200 rounded-lg w-3/5" />
        <div className="h-px bg-stone-100 my-1" />
        <div className="flex justify-between">
          <div className="h-2.5 bg-stone-200 rounded-lg w-1/4" />
          <div className="h-2.5 bg-stone-200 rounded-lg w-1/6" />
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function BusinessesPage() {
  const [type,        setType]        = useState('');
  const [district,    setDistrict]    = useState('');
  const [featured,    setFeatured]    = useState(false);
  const [page,        setPage]        = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const inputRef = useRef(null);

  function applyType(val) { setType(val); setPage(1); }
  function applyFilter(key, val) {
    setPage(1);
    if (key === 'district') setDistrict(val);
    if (key === 'featured') setFeatured(val);
  }
  function commitSearch(e) {
    e.preventDefault();
    setActiveQuery(searchInput.trim());
    setPage(1);
  }
  function clearSearch() {
    setSearchInput(''); setActiveQuery(''); setPage(1);
    inputRef.current?.focus();
  }
  function clearAll() {
    setType(''); setDistrict(''); setFeatured(false);
    setSearchInput(''); setActiveQuery(''); setPage(1);
  }

  const { data: result, isLoading, isFetching } = useQuery({
    queryKey: ['businesses', type, district, featured, page, activeQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (type)        params.set('type', type);
      if (district)    params.set('district', district);
      if (featured)    params.set('featured', '1');
      if (activeQuery) params.set('search', activeQuery);
      params.set('page',  page);
      params.set('limit', PAGE_SIZE);
      return api.get(`/businesses?${params}`).then((r) => r.data);
    },
    keepPreviousData: true,
  });

  const businesses = result?.data?.businesses || [];
  const total      = result?.data?.total      || 0;
  const pages      = result?.data?.pages      || 1;

  // Delay empty-state reveal to avoid flash
  const [emptyReady, setEmptyReady] = useState(false);
  const emptyTimer = useRef(null);
  useEffect(() => {
    clearTimeout(emptyTimer.current);
    if (!isLoading && !isFetching && businesses.length === 0) {
      emptyTimer.current = setTimeout(() => setEmptyReady(true), 900);
    } else {
      setEmptyReady(false);
    }
    return () => clearTimeout(emptyTimer.current);
  }, [isLoading, isFetching, businesses.length]);

  const hasFilters = !!(type || district || featured || activeQuery);
  const activeTypeMeta = BUSINESS_TYPES.find((t) => t.value === type);

  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title={`Find Businesses${district ? ` in ${district}` : ''}`}
        description="Discover verified local businesses — salons, repair shops, catering, photography studios and more."
        url="/businesses"
      />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-teal-600 via-violet-600 to-pink-500 overflow-hidden">

        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-pink-300/10 rounded-full translate-y-1/2 blur-2xl pointer-events-none" />

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-14 pb-10 text-center text-white">

          {/* Eyebrow */}
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20
                             text-white text-xs font-semibold px-4 py-1.5 rounded-full tracking-widest uppercase">
              <Store className="w-3.5 h-3.5" /> Verified Businesses
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-black mb-3 text-white tracking-tight">
            Find Businesses
          </h1>
          <p className="text-white/80 text-base mb-6">
            {total > 0
              ? `${total} verified business${total !== 1 ? 'es' : ''} in ${SERVICE_AREA}`
              : `Salons, caterers, studios and more in ${SERVICE_AREA}`}
          </p>

          {/* Trust chips */}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
            {[
              { Icon: Store,      label: '800+ Businesses' },
              { Icon: MapPin,     label: 'All 25 Districts' },
              { Icon: BadgeCheck, label: 'ID Verified' },
              { Icon: () => (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ), label: 'Free to browse' },
            ].map((s) => (
              <span key={s.label}
                className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
                <s.Icon className="w-3.5 h-3.5" />{s.label}
              </span>
            ))}
          </div>

          {/* Search bar */}
          <form onSubmit={commitSearch} className="max-w-xl mx-auto">
            <div className="flex items-center bg-white rounded-2xl shadow-xl shadow-violet-900/20 overflow-hidden">
              <Search className="w-5 h-5 text-stone-400 ml-4 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by business name…"
                className="flex-1 px-3 py-4 text-stone-900 placeholder:text-stone-400 focus:outline-none text-sm bg-transparent"
              />
              {searchInput ? (
                <button type="button" onClick={clearSearch}
                  className="mr-2 w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="m-1.5">
                  <button type="submit"
                    className="bg-gradient-to-br from-teal-500 to-violet-600 hover:from-teal-600 hover:to-violet-700
                               text-white text-xs font-semibold px-4 py-2.5 rounded-xl whitespace-nowrap transition-all">
                    Search
                  </button>
                </div>
              )}
            </div>

            {activeQuery && (
              <p className="text-violet-200 text-xs mt-2 flex items-center justify-center gap-2">
                Showing results for <strong>"{activeQuery}"</strong>
                <button type="button" onClick={clearSearch}
                  className="text-white/70 hover:text-white underline">
                  Clear
                </button>
              </p>
            )}
          </form>
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-stone-100 shadow-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">

          {/* "All" chip */}
          <button
            onClick={() => applyType('')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full
                        border transition-all whitespace-nowrap shrink-0
                        ${!type
                          ? 'bg-gradient-to-br from-teal-500 to-violet-600 text-white border-transparent shadow-sm'
                          : 'bg-stone-100 text-stone-600 border-transparent hover:bg-violet-50 hover:text-violet-700'}`}
          >
            <Store className="w-3.5 h-3.5 shrink-0" />
            All Businesses
          </button>

          {/* Type chips */}
          {BUSINESS_TYPES.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => applyType(value === type ? '' : value)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full
                          border transition-all whitespace-nowrap shrink-0
                          ${type === value
                            ? 'bg-gradient-to-br from-teal-500 to-violet-600 text-white border-transparent shadow-sm'
                            : 'bg-stone-100 text-stone-600 border-transparent hover:bg-violet-50 hover:text-violet-700'}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </button>
          ))}

          {/* Spacer */}
          <div className="flex-1" />

          {/* District select */}
          <div className="relative shrink-0">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
            <select
              value={district}
              onChange={(e) => applyFilter('district', e.target.value)}
              className="appearance-none pl-7 pr-7 py-1.5 text-xs font-semibold rounded-full
                         bg-stone-100 text-stone-600 border-0 focus:outline-none
                         hover:bg-violet-50 hover:text-violet-700 cursor-pointer transition-colors"
            >
              <option value="">All Districts</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
          </div>

          {/* Featured toggle */}
          <button
            onClick={() => applyFilter('featured', !featured)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full
                        transition-all whitespace-nowrap shrink-0
                        ${featured
                          ? 'bg-amber-400 text-white shadow-sm'
                          : 'bg-stone-100 text-stone-600 hover:bg-amber-50 hover:text-amber-600'}`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill={featured ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            Featured
          </button>

          {/* Clear all — only if something is active */}
          {hasFilters && (
            <button onClick={clearAll}
              className="text-xs text-stone-400 hover:text-violet-600 font-medium px-2 transition-colors">
              Clear all ×
            </button>
          )}
        </div>
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Active type label */}
        {(type || district) && (
          <p className="text-sm text-stone-500 mb-5">
            {total > 0
              ? `${total} business${total !== 1 ? 'es' : ''}${activeTypeMeta ? ` in ${activeTypeMeta.label}` : ''}${district ? ` · ${district}` : ''}`
              : null}
          </p>
        )}

        {/* ── Loading skeleton ────────────────────────────────────────────── */}
        {(isLoading || isFetching || (!emptyReady && businesses.length === 0)) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <BusinessCardSkeleton key={i} />)}
          </div>
        ) : !businesses.length ? (

          /* ── Empty state ──────────────────────────────────────────────── */
          (() => {
            // "Be the first" when only the type chip is active (no district / featured / search)
            const isPureTypeEmpty = type && !district && !featured && !activeQuery;
            const showFirstMover  = isPureTypeEmpty || !hasFilters;

            return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-100 to-violet-100 flex items-center justify-center shadow-lg shadow-violet-100">
                <Store className="w-11 h-11 text-violet-500" strokeWidth={1.5} />
              </div>
              {showFirstMover && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  1st
                </span>
              )}
            </div>

            {showFirstMover ? (
              /* "Be the first" — pure type filter or totally empty */
              <>
                <h2 className="text-2xl font-black text-stone-800 text-center leading-snug mb-2">
                  Be the first on the scene! 🚀
                </h2>
                <p className="text-stone-500 text-sm text-center max-w-sm mb-8 leading-relaxed">
                  {activeTypeMeta
                    ? <>The <strong className="text-stone-700">{activeTypeMeta.label}</strong> category is wide open — nobody's listed yet. Jump in first, grab the spotlight, and score free leads before the competition even knows this exists.</>
                    : <>No businesses are listed yet. Be the first — join free, get direct client leads, and grow your business on SkillHub.</>
                  }
                </p>
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  {[
                    { Icon: Store,      text: 'Free business profile'   },
                    { Icon: Users,      text: 'Direct client enquiries' },
                    { Icon: BadgeCheck, text: 'Verified badge'          },
                  ].map(({ Icon, text }) => (
                    <span key={text} className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs font-semibold px-3.5 py-2 rounded-full border border-violet-100">
                      <Icon className="w-3.5 h-3.5" strokeWidth={2} /> {text}
                    </span>
                  ))}
                </div>
                <Link
                  to="/register?role=business"
                  className="inline-flex items-center justify-center gap-2
                             bg-gradient-to-br from-teal-500 to-violet-600 text-white
                             font-bold px-8 py-3.5 rounded-2xl hover:from-teal-600
                             hover:to-violet-700 transition-all shadow-lg shadow-violet-200 text-sm mb-3"
                >
                  List Your Business Free
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </Link>
                <p className="text-xs text-stone-400 mt-4 text-center">
                  Looking to hire?{' '}
                  <Link to="/professionals" className="text-violet-500 hover:underline">
                    Browse all professionals
                  </Link>{' '}instead.
                </p>
              </>
            ) : (
              /* Multiple filters active but no match — just clear filters */
              <>
                <h2 className="text-xl font-black text-stone-800 text-center mb-2">
                  No businesses found
                </h2>
                <p className="text-stone-500 text-sm text-center max-w-sm mb-6">
                  Try removing some filters or searching a different district.
                </p>
                <button onClick={clearAll}
                  className="inline-flex items-center gap-2 bg-gradient-to-br from-teal-500 to-violet-600
                             text-white font-semibold px-6 py-2.5 rounded-xl hover:from-teal-600
                             hover:to-violet-700 transition-all shadow-md text-sm">
                  Clear all filters
                </button>
              </>
            )}
            </div>
            );
          })()
        ) : (

          /* ── Business cards ─────────────────────────────────────────── */
          <>
            <p className="text-sm text-stone-500 mb-4">
              {total} business{total !== 1 ? 'es' : ''} found
              {pages > 1 && ` — page ${page} of ${pages}`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {businesses.map((b) => (
                <BusinessCard key={b._id} business={b} />
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                  className="text-sm font-medium px-4 py-2 rounded-xl bg-white border border-stone-200
                             hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  ← Back
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: pages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 2)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === '…' ? (
                        <span key={`e-${idx}`} className="px-2 py-1 text-stone-400 text-sm">…</span>
                      ) : (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors
                            ${p === page
                              ? 'bg-gradient-to-br from-teal-500 to-violet-600 text-white'
                              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}>
                          {p}
                        </button>
                      )
                    )}
                </div>

                <button onClick={() => setPage((p) => p + 1)} disabled={page === pages}
                  className="text-sm font-medium px-4 py-2 rounded-xl bg-white border border-stone-200
                             hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer CTA ────────────────────────────────────────────────────── */}
      {!hasFilters && businesses.length > 0 && (
        <div className="bg-gradient-to-br from-teal-600 via-violet-600 to-pink-500 py-12 px-4 text-center text-white mt-8">
          <h3 className="text-2xl font-bold mb-2 text-white">Looking for individual Pros?</h3>
          <p className="text-white/80 text-sm mb-6">Browse 2,400+ verified skilled workers — electricians, plumbers, tutors, photographers and more</p>
          <Link to="/professionals"
            className="inline-block bg-white text-violet-700 font-semibold px-8 py-3 rounded-xl hover:bg-violet-50 transition-colors">
            Browse all Professionals
          </Link>
        </div>
      )}
    </div>
  );
}
