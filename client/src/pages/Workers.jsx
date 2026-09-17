import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, X, Rocket, Users, Star, ArrowRight, MapPin,
  Home, Monitor, GraduationCap, HeartPulse, Sparkles,
  Briefcase, Camera, Car, Palette, ChevronDown, BadgeCheck,
} from 'lucide-react';
import api from '../lib/axios';
import WorkerCard from '../components/WorkerCard';
import { useCategories } from '../hooks/useCategories';
import ShareButton from '../components/ShareButton';
import SEO from '../components/SEO';
import { DISTRICTS, SERVICE_AREA } from '../config/site.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const SCORE_PRESETS = [
  { label: 'Any',    value: ''   },
  { label: '60+',    value: '60' },
  { label: '80+',    value: '80' },
  { label: '90+',    value: '90' },
];

const GROUP_META = {
  home_property:         { Icon: Home,          label: 'Home & Property'         },
  beauty_wellness:       { Icon: Sparkles,       label: 'Beauty & Wellness'       },
  events_creative:       { Icon: Camera,         label: 'Events & Creative'       },
  technology_digital:    { Icon: Monitor,        label: 'Technology & Digital'    },
  education_coaching:    { Icon: GraduationCap,  label: 'Education & Coaching'    },
  automotive_transport:  { Icon: Car,            label: 'Automotive & Transport'  },
  health_medical:        { Icon: HeartPulse,     label: 'Health & Medical'        },
  business_professional: { Icon: Briefcase,      label: 'Business & Professional' },
  lifestyle_leisure:     { Icon: Palette,        label: 'Lifestyle & Leisure'     },
};

const PAGE_SIZE = 20;

// ── Skeleton ───────────────────────────────────────────────────────────────────
function WorkerCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-stone-100 overflow-hidden bg-white animate-pulse">
      <div className="h-28 bg-gradient-to-br from-stone-200 to-stone-100" />
      <div className="px-3 pb-3 pt-0 flex flex-col gap-2 relative">
        <div className="flex items-end gap-2 -mt-7 mb-1">
          <div className="w-14 h-14 rounded-full border-2 border-white bg-stone-200 shadow-md shrink-0" />
          <div className="ml-auto w-10 h-10 rounded-xl bg-stone-100" />
        </div>
        <div className="h-3.5 bg-stone-200 rounded-lg w-2/3" />
        <div className="h-2.5 bg-stone-200 rounded-lg w-4/5" />
        <div className="space-y-1.5 mt-0.5">
          <div className="h-2.5 bg-stone-200 rounded-lg w-full" />
          <div className="h-2.5 bg-stone-200 rounded-lg w-3/4" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-2">
          <div className="h-2.5 bg-stone-200 rounded-lg w-1/3" />
          <div className="h-2.5 bg-stone-200 rounded-lg w-1/6" />
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function Workers() {
  const { groupedCategories, categories } = useCategories();
  const [searchParams]                   = useSearchParams();
  const { t }                            = useTranslation();

  const [category,     setCategory]     = useState(searchParams.get('category') || '');
  const [activeGroup,  setActiveGroup]  = useState('');   // UI-only — drives sub-chip row
  const [district,     setDistrict]     = useState('');
  const [minScore,     setMinScore]     = useState('');
  const [page,         setPage]         = useState(1);
  const [searchInput,  setSearchInput]  = useState('');
  const [activeQuery,  setActiveQuery]  = useState('');
  const inputRef = useRef(null);

  // Sync activeGroup from URL-seeded category on mount
  useEffect(() => {
    if (category) {
      const grp = groupedCategories.find(({ categories: cats }) =>
        cats.some((c) => c.slug === category)
      );
      if (grp) setActiveGroup(grp.group.slug);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedCategories.length]);

  function selectGroup(slug) {
    if (activeGroup === slug) {
      setActiveGroup('');
      setCategory('');
    } else {
      setActiveGroup(slug);
      setCategory('');
    }
    setPage(1);
  }

  function selectCategory(slug) {
    setCategory(slug === category ? '' : slug);
    setPage(1);
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
    setCategory(''); setActiveGroup(''); setDistrict('');
    setMinScore(''); setSearchInput(''); setActiveQuery(''); setPage(1);
  }

  const { data: result, isLoading, isFetching } = useQuery({
    queryKey: ['workers', category, district, minScore, page, activeQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (activeQuery) params.set('q', activeQuery);
      if (category)    params.set('category', category);
      if (district)    params.set('district', district);
      if (minScore)    params.set('minScore', minScore);
      params.set('page',  page);
      params.set('limit', PAGE_SIZE);
      return api.get(`/workers?${params}`).then((r) => r.data);
    },
    keepPreviousData: true,
  });

  const workers    = result?.data       || [];
  const pagination = result?.pagination || {};

  const [emptyReady, setEmptyReady] = useState(false);
  const emptyTimer = useRef(null);
  useEffect(() => {
    clearTimeout(emptyTimer.current);
    if (!isLoading && !isFetching && workers.length === 0) {
      emptyTimer.current = setTimeout(() => setEmptyReady(true), 900);
    } else {
      setEmptyReady(false);
    }
    return () => clearTimeout(emptyTimer.current);
  }, [isLoading, isFetching, workers.length]);

  // Derived
  const hasFilters    = !!(category || district || minScore || activeQuery);
  const subCategories = activeGroup
    ? (groupedCategories.find((g) => g.group.slug === activeGroup)?.categories || [])
    : [];
  const activeCatName = categories.find((c) => c.slug === category)?.name || '';

  const seoTitle = category
    ? `${activeCatName || category.replace(/_/g, ' ')} Pros${district ? ` in ${district}` : ''}`
    : `Find Skilled Pros${district ? ` in ${district}` : ''}`;

  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title={seoTitle}
        description="Search verified skilled Pros. Filter by category, district and score to find the right professional."
        url="/professionals"
      />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-violet-600 via-violet-500 to-pink-500 overflow-hidden">

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
              <BadgeCheck className="w-3.5 h-3.5" /> Verified Professionals
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-black mb-3 text-white tracking-tight">
            {t('workers.title')}
          </h1>
          <p className="text-white/80 text-base mb-6">
            {pagination.total
              ? `${pagination.total.toLocaleString()} verified Pros in ${SERVICE_AREA}`
              : t('workers.subtitle')}
          </p>

          {/* Trust chips */}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
            {[
              { Icon: Users,      label: '2,400+ Pros'     },
              { Icon: MapPin,     label: 'All 25 Districts' },
              { Icon: BadgeCheck, label: 'ID Verified'     },
              { Icon: Star,       label: 'Rated & Scored'   },
            ].map((s) => (
              <span key={s.label}
                className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
                <s.Icon className="w-3.5 h-3.5" /> {s.label}
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
                placeholder={t('workers.filters.searchPlaceholder')}
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
                    className="bg-gradient-to-br from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600
                               text-white text-xs font-semibold px-4 py-2.5 rounded-xl whitespace-nowrap transition-all">
                    Search
                  </button>
                </div>
              )}
            </div>

            {activeQuery && (
              <p className="text-violet-200 text-xs mt-2 flex items-center justify-center gap-2">
                Results for <strong>"{activeQuery}"</strong>
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

        {/* ── Row 1: group chips — horizontally scrollable, never wraps ── */}
        <div
          className="border-b border-stone-50 overflow-x-auto"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent)',
          }}
        >
          <div className="flex items-center gap-2 px-4 py-2.5 w-max">
            {/* All Pros */}
            <button
              onClick={() => { setActiveGroup(''); setCategory(''); setPage(1); }}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full
                          transition-all whitespace-nowrap shrink-0
                          ${!activeGroup && !category
                            ? 'bg-gradient-to-br from-violet-600 to-pink-500 text-white shadow-sm'
                            : 'bg-stone-100 text-stone-600 hover:bg-violet-50 hover:text-violet-700'}`}
            >
              All Pros
            </button>

            {/* Group chips */}
            {Object.entries(GROUP_META).map(([slug, { Icon, label }]) => (
              <button
                key={slug}
                onClick={() => selectGroup(slug)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full
                            transition-all whitespace-nowrap shrink-0
                            ${activeGroup === slug
                              ? 'bg-gradient-to-br from-violet-600 to-pink-500 text-white shadow-sm'
                              : 'bg-stone-100 text-stone-600 hover:bg-violet-50 hover:text-violet-700'}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Row 2: district + score presets + clear — always fits one line ── */}
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2 flex-wrap">

          {/* District */}
          <div className="relative shrink-0">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
            <select
              value={district}
              onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
              className="appearance-none pl-7 pr-7 py-1.5 text-xs font-semibold rounded-full
                         bg-stone-100 text-stone-600 border-0 focus:outline-none
                         hover:bg-violet-50 hover:text-violet-700 cursor-pointer transition-colors"
            >
              <option value="">All Districts</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-stone-200 shrink-0" />

          {/* Score presets */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-stone-400 mr-1 shrink-0">Score:</span>
            {SCORE_PRESETS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => { setMinScore(value); setPage(1); }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all whitespace-nowrap
                            ${minScore === value
                              ? 'bg-amber-400 text-white shadow-sm'
                              : 'bg-stone-100 text-stone-600 hover:bg-amber-50 hover:text-amber-600'}`}
              >
                {value ? <><Star className="w-3 h-3 inline mr-0.5 mb-0.5" />{label}</> : label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Active filter summary pills */}
          {activeGroup && (
            <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2.5 py-1 rounded-full font-medium shrink-0">
              {GROUP_META[activeGroup]?.label}
              {category && ` › ${activeCatName}`}
            </span>
          )}

          {/* Clear all */}
          {hasFilters && (
            <button onClick={clearAll}
              className="text-xs text-stone-400 hover:text-violet-600 font-medium px-1 transition-colors shrink-0">
              Clear all ×
            </button>
          )}
        </div>

        {/* ── Row 3: sub-category chips — only when a group is selected ── */}
        {activeGroup && subCategories.length > 0 && (
          <div
            className="border-t border-stone-50 overflow-x-auto"
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent)',
            }}
          >
            <div className="flex items-center gap-1.5 px-4 py-2 w-max">
              {subCategories.map((cat) => {
                const isActive = category === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => selectCategory(cat.slug)}
                    className={`text-xs px-3 py-1 rounded-full border transition-all whitespace-nowrap shrink-0
                                ${isActive
                                  ? 'bg-violet-600 text-white border-transparent font-semibold'
                                  : 'bg-white text-stone-500 border-stone-200 hover:border-violet-300 hover:text-violet-600'}`}
                  >
                    {cat.name}
                    {cat.workerCount > 0 && (
                      <span className={`ml-1 text-[10px] ${isActive ? 'text-violet-200' : 'text-stone-400'}`}>
                        {cat.workerCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Active filters summary */}
        {(activeCatName || district) && (
          <p className="text-sm text-stone-500 mb-5">
            {pagination.total !== undefined
              ? `${pagination.total} Pro${pagination.total !== 1 ? 's' : ''}${activeCatName ? ` · ${activeCatName}` : ''}${district ? ` · ${district}` : ''}`
              : null}
          </p>
        )}

        {/* ── Loading skeleton ─────────────────────────────────────────────── */}
        {isLoading || isFetching || (!emptyReady && workers.length === 0) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <WorkerCardSkeleton key={i} />)}
          </div>

        ) : !workers.length ? (
          /* ── Empty state ───────────────────────────────────────────────── */
          (() => {
            const isPureCategoryEmpty = category && !district && !minScore && !activeQuery;

            return (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center shadow-lg shadow-violet-100">
                    <Rocket className="w-11 h-11 text-violet-500" strokeWidth={1.5} />
                  </div>
                  {isPureCategoryEmpty && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      1st
                    </span>
                  )}
                </div>

                {isPureCategoryEmpty ? (
                  <>
                    <h2 className="text-2xl font-black text-stone-800 text-center leading-snug mb-2">
                      Be the first on the scene! 🚀
                    </h2>
                    <p className="text-stone-500 text-sm text-center max-w-sm mb-8 leading-relaxed">
                      The <strong className="text-stone-700">{activeCatName}</strong> category is wide open — nobody's listed yet.
                      Jump in first, grab the spotlight, and score free leads before the competition even knows this exists.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 mb-8">
                      {[
                        { Icon: Star,   text: 'Free forever plan'      },
                        { Icon: Users,  text: 'Direct client leads'     },
                        { Icon: Rocket, text: 'First-mover visibility'  },
                      ].map(({ Icon, text }) => (
                        <span key={text} className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs font-semibold px-3.5 py-2 rounded-full border border-violet-100">
                          <Icon className="w-3.5 h-3.5" strokeWidth={2} /> {text}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-col items-center gap-3 w-full max-w-sm">
                      <Link
                        to="/register?role=worker"
                        className="w-full inline-flex items-center justify-center gap-2
                                   bg-gradient-to-br from-violet-600 to-pink-500 text-white
                                   font-bold px-7 py-3.5 rounded-2xl hover:from-violet-700
                                   hover:to-pink-600 transition-all shadow-lg shadow-violet-200 text-sm"
                      >
                        Join Free — List Your Services
                        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                      </Link>
                      <div className="flex items-center gap-3 w-full">
                        <ShareButton
                          label="Share with a friend"
                          title={`Know a ${activeCatName} professional? Send them this`}
                          text={`There are no ${activeCatName} pros on SkillHub yet — they could be the first! Free to join, direct client leads.`}
                          url={window.location.href}
                        />
                        <div className="flex-1 h-px bg-stone-200" />
                        <Link to="/services"
                          className="text-sm text-stone-400 hover:text-violet-600 font-medium transition-colors whitespace-nowrap">
                          Browse services →
                        </Link>
                      </div>
                    </div>
                    <p className="text-xs text-stone-400 mt-8 text-center">
                      Looking to hire? Check back soon — or{' '}
                      <Link to="/professionals" className="text-violet-500 hover:underline">
                        search all professionals
                      </Link>{' '}across every category.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-black text-stone-800 text-center mb-2">
                      No Pros found
                    </h2>
                    <p className="text-stone-500 text-sm text-center max-w-sm mb-6">
                      {t('workers.noResultsHint')}
                    </p>
                    <button onClick={clearAll}
                      className="inline-flex items-center gap-2 bg-gradient-to-br from-violet-600 to-pink-500
                                 text-white font-semibold px-6 py-2.5 rounded-xl hover:from-violet-700
                                 hover:to-pink-600 transition-all shadow-md text-sm">
                      Clear all filters
                    </button>
                  </>
                )}
              </div>
            );
          })()

        ) : (
          /* ── Pro cards ─────────────────────────────────────────────────── */
          <>
            <p className="text-sm text-stone-500 mb-4">
              {t('workers.results', { count: pagination.total ?? workers.length })}
              {pagination.pages > 1 && ` — page ${pagination.page} of ${pagination.pages}`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {workers.map((profile) => (
                <WorkerCard key={profile._id} profile={profile} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button onClick={() => setPage((p) => p - 1)} disabled={!pagination.hasPrev}
                  className="text-sm font-medium px-4 py-2 rounded-xl bg-white border border-stone-200
                             hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  ← {t('common.back')}
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - page) <= 2)
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
                              ? 'bg-gradient-to-br from-violet-600 to-pink-500 text-white'
                              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                          {p}
                        </button>
                      )
                    )}
                </div>

                <button onClick={() => setPage((p) => p + 1)} disabled={!pagination.hasNext}
                  className="text-sm font-medium px-4 py-2 rounded-xl bg-white border border-stone-200
                             hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {t('common.next')} →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer CTA ────────────────────────────────────────────────────── */}
      {!hasFilters && workers.length > 0 && (
        <div className="bg-gradient-to-br from-violet-600 via-violet-500 to-pink-500 py-12 px-4 text-center text-white mt-8">
          <h3 className="text-2xl font-bold mb-2 text-white">Looking for a business instead?</h3>
          <p className="text-white/80 text-sm mb-6">
            Browse verified salons, studios, repair shops, catering companies and more
          </p>
          <Link to="/businesses"
            className="inline-block bg-white text-violet-700 font-semibold px-8 py-3 rounded-xl hover:bg-violet-50 transition-colors">
            Browse Businesses
          </Link>
        </div>
      )}
    </div>
  );
}
