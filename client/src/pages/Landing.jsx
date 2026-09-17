import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import {
  HardHat, Monitor, GraduationCap, Camera, Sparkles,
  Home, HeartPulse, Car, Briefcase, Truck, Plane, Palette,
  ChevronRight, Award, ShieldCheck, Store, Lock,
  User, Hammer, Search, ClipboardList, CheckCircle,
  Rocket, Megaphone, DollarSign, Check,
} from 'lucide-react';
import SEO from '../components/SEO';
import { useCategories } from '../hooks/useCategories';
import { CATEGORY_GROUPS } from '../lib/categoryGroups';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ScoreRing from '../components/ScoreRing';
import WorkerCard from '../components/WorkerCard';
import api from '../lib/axios';
import bg from '../img/backg.jpg';
import bgWebp from '../img/backg.webp';
import bgtwo from "../img/img.jpg";
import imgClient from '../img/client.png';    // woman on laptop — clients tab
import imgPros   from '../img/pro.jpg';     // ← replace with your pros image
import { DISTRICTS, SERVICE_AREA, SITE_NAME, CONTACT_EMAIL, HERO_VIDEO_URL, CURRENCY_SYMBOL } from '../config/site.js';

// Lucide icon + badge colour for each category group
const GROUP_META = {
  home_property:         { Icon: Home,          bg: 'bg-orange-100',  fg: 'text-orange-600',  cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=75&auto=format&fit=crop' },
  technology_digital:    { Icon: Monitor,        bg: 'bg-blue-100',    fg: 'text-blue-600',    cover: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&q=75&auto=format&fit=crop' },
  education_coaching:    { Icon: GraduationCap,  bg: 'bg-indigo-100',  fg: 'text-indigo-600',  cover: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=75&auto=format&fit=crop' },
  health_medical:        { Icon: HeartPulse,     bg: 'bg-red-100',     fg: 'text-red-600',     cover: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=75&auto=format&fit=crop' },
  beauty_wellness:       { Icon: Sparkles,       bg: 'bg-rose-100',    fg: 'text-rose-600',    cover: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=75&auto=format&fit=crop' },
  business_professional: { Icon: Briefcase,      bg: 'bg-violet-100',  fg: 'text-violet-600',  cover: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=75&auto=format&fit=crop' },
  events_creative:       { Icon: Camera,         bg: 'bg-pink-100',    fg: 'text-pink-600',    cover: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=75&auto=format&fit=crop' },
  automotive_transport:  { Icon: Car,            bg: 'bg-slate-100',   fg: 'text-slate-600',   cover: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=600&q=75&auto=format&fit=crop' },
  lifestyle_leisure:     { Icon: Palette,        bg: 'bg-fuchsia-100', fg: 'text-fuchsia-600', cover: 'https://images.unsplash.com/photo-1452827073306-6e6e661baf57?w=600&q=75&auto=format&fit=crop' },
};

const FAQ_KEYS = ['clients', 'workers', 'businesses'];

const TOPIC_KEYS = ['general', 'subscription', 'dispute', 'partnership', 'other'];

function ContactForm() {
  const { t } = useTranslation();
  const [form, setForm]     = useState({ name: '', email: '', topic: 'general', message: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errMsg, setErrMsg] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrMsg('');
    try {
      await api.post('/contact', form);
      setStatus('success');
      setForm({ name: '', email: '', topic: 'general', message: '' });
    } catch (err) {
      setErrMsg(err?.response?.data?.message || t('landing.contact.errorGeneric'));
      setStatus('error');
    }
  };

  return (
    <div className="mt-12 bg-stone-50 rounded-2xl px-6 py-8 border border-stone-100">
      <div className="text-center mb-6">
        <p className="text-stone-500 text-sm mb-1">{t('landing.contact.eyebrow')}</p>
        <p className="font-bold text-stone-800 text-lg">{t('landing.contact.title')}</p>
        <p className="text-stone-400 text-xs mt-1">{t('landing.contact.subtitle')}</p>
      </div>

      {status === 'success' ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="font-bold text-stone-800 mb-1">{t('landing.contact.successTitle')}</p>
          <p className="text-stone-500 text-sm">{t('landing.contact.successDesc')}</p>
          <button
            onClick={() => setStatus('idle')}
            className="mt-4 text-xs text-violet-600 hover:underline"
          >
            {t('landing.contact.sendAnother')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">{t('landing.contact.nameLabel')}</label>
              <input
                type="text" value={form.name} onChange={set('name')} required
                placeholder={t('landing.contact.namePlaceholder')}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">{t('landing.contact.emailLabel')}</label>
              <input
                type="email" value={form.email} onChange={set('email')} required
                placeholder={t('landing.contact.emailPlaceholder')}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">{t('landing.contact.topicLabel')}</label>
            <select
              value={form.topic} onChange={set('topic')}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition bg-white text-stone-700"
            >
              {TOPIC_KEYS.map((k) => <option key={k} value={k}>{t(`landing.contact.topics.${k}`)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">{t('landing.contact.messageLabel')}</label>
            <textarea
              value={form.message} onChange={set('message')} required
              rows={4} placeholder={t('landing.contact.messagePlaceholder')}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition bg-white resize-none"
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-xl">{errMsg}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit" disabled={status === 'loading'}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-violet-600 to-pink-500
                         hover:from-violet-700 hover:to-pink-600 disabled:opacity-60
                         text-white font-semibold px-7 py-2.5 rounded-xl text-sm transition-all
                         shadow-md shadow-violet-200 hover:scale-[1.02]"
            >
              {status === 'loading' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  {t('landing.contact.sending')}
                </>
              ) : t('landing.contact.send')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ── Accordion item ──────────────────────────────────────────────── */
function AccordionItem({ item, isOpen, onToggle }) {
  return (
    <div className={`border rounded-2xl transition-all duration-200 ${isOpen ? 'border-violet-200 shadow-sm shadow-violet-100' : 'border-stone-200 hover:border-stone-300'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className={`font-semibold text-sm leading-snug transition-colors ${isOpen ? 'text-violet-700' : 'text-stone-800'}`}>
          {item.q}
        </span>
        <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${isOpen ? 'bg-violet-600 text-white rotate-45' : 'bg-stone-100 text-stone-500'}`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="px-5 pb-4 text-sm text-stone-500 leading-relaxed">{item.a}</p>
      </div>
    </div>
  );
}


// ── Rotating hero words ────────────────────────────────────────────────────────
const HERO_WORDS = [
  'Photographer',
  'Electrician',
  'Plumber',
  'Yoga Teacher',
  'Web Designer',
  'Tutor',
  'Makeup Artist',
  'Caterer',
  'Handyman',
  'Massage Therapist',
  'Event Planner',
  'Graphic Designer',
  'DJ',
  'Hair Stylist',
  'Life Coach',
];

export default function Landing() {
  const { groupedCategories } = useCategories();
  const { t } = useTranslation();
  const [faqTab, setFaqTab]   = useState('clients');
  const [openFaq, setOpenFaq] = useState(null);

  // Rotating hero word
  const [wordIdx,  setWordIdx]  = useState(0);
  const [wordShow, setWordShow] = useState(true); // controls fade in/out

  useEffect(() => {
    const timer = setInterval(() => {
      // 1. fade out
      setWordShow(false);
      // 2. after half the transition, swap the word and fade back in
      setTimeout(() => {
        setWordIdx((i) => (i + 1) % HERO_WORDS.length);
        setWordShow(true);
      }, 380);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Hero background video — optional (set VITE_HERO_VIDEO_URL), and only
  // loaded on desktop to spare mobile data.
  const [showHeroVideo, setShowHeroVideo] = useState(false);
  useEffect(() => {
    if (!HERO_VIDEO_URL) return;
    const mq = window.matchMedia('(min-width: 640px) and (prefers-reduced-motion: no-preference)');
    setShowHeroVideo(mq.matches);
    const onChange = (e) => setShowHeroVideo(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handleFaqTab = (key) => { setFaqTab(key); setOpenFaq(null); };
  const handleFaqItem = (idx) => setOpenFaq(openFaq === idx ? null : idx);

  const FAQ_GROUPS = useMemo(
    () =>
      FAQ_KEYS.map((key) => {
        const items = t(`landing.faq.groups.${key}.items`, { returnObjects: true });
        return {
          key,
          label: t(`landing.faq.groups.${key}.label`),
          items: Array.isArray(items) ? items : [],
        };
      }),
    [t],
  );

  const { data: featured = [] } = useQuery({
    queryKey: ['featuredWorkers'],
    queryFn: () => api.get('/workers/featured').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const plans = [
    {
      key: 'free',
      name: 'Free',
      price: null,
      badge: 'bg-stone-100 text-stone-600',
      ring: 'border-stone-200',
      glow: '',
      features: [
        'Listed on platform',
        'Up to 3 leads / month',
        'Basic public profile (name, bio, score)',
        'SkillHub Score & badge',
      ],
      locked: [
        'Portfolio photo gallery',
        'Service offer cards',
        'Storefront on public profile',
        'Social media links on profile',
        'Priority in search results',
      ],
      cta: 'Get Started Free',
      ctaStyle: 'bg-stone-100 hover:bg-stone-200 text-stone-700',
      to: '/register',
      highlight: false,
    },
    {
      key: 'pro',
      name: 'Pro',
      price: 9,
      badge: 'bg-violet-100 text-violet-700',
      ring: 'border-violet-400',
      glow: 'shadow-lg shadow-violet-100',
      features: [
        'Unlimited leads',
        'Priority in search results',
        'Pro badge on profile',
        'Portfolio gallery — up to 12 photos',
        'Service offer cards — up to 5 offers',
        'Full storefront on public profile',
        'Social media links visible to clients',
        'Score boost visibility',
      ],
      locked: [
        'Featured on landing page',
        'Top of search results',
        'Up to 10 service offers',
      ],
      cta: 'Upgrade to Pro',
      ctaStyle: 'bg-gradient-to-br from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white',
      to: '/register',
      highlight: true,
    },
    {
      key: 'elite',
      name: 'Elite',
      price: 19,
      badge: 'bg-purple-100 text-purple-700',
      ring: 'border-purple-400',
      glow: 'shadow-lg shadow-purple-100',
      features: [
        'Everything in Pro',
        'Featured on landing page (advertising)',
        'Top of search results',
        'Elite badge on profile',
        'Up to 10 service offer cards',
        'Dedicated admin support',
        'Priority dispute resolution',
      ],
      locked: [],
      cta: 'Upgrade to Elite',
      ctaStyle: 'bg-stone-100 hover:bg-stone-200 text-stone-700',
      to: '/register',
      highlight: false,
    },
  ];

  const landingSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    'name': 'SkillHub Service Marketplace',
    'description': `Connect with verified local Pros and businesses across ${DISTRICTS.length} districts.`,
    'provider': { '@type': 'Organization', 'name': 'SkillHub', 'url': 'https://skillhub.example.com' },
    'areaServed': { '@type': 'AdministrativeArea', 'name': SERVICE_AREA },
    'serviceType': 'Home Services, Trade Work, Business Services',
  };

  return (
    <div>
      <SEO
        url="/"
        description="Find and hire verified local Pros and businesses — electricians, plumbers, salons, caterers, tutors and 49+ categories. Secure escrow payments."
        schema={landingSchema}
      />
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: "clamp(600px, 92vh, 960px)", display: "flex", alignItems: "center" }}
      >
        {/* Background image — <picture> so the preloader discovers it early.
            Also acts as the poster / fallback if the video can't play. */}
        <picture>
          <source srcSet={bgWebp} type="image/webp" />
          <img
            src={bg}
            alt=""
            aria-hidden="true"
            fetchpriority="high"
            decoding="async"
            className="absolute inset-0 z-0 w-full h-full object-cover"
          />
        </picture>

        {/* Background video — desktop only, never loaded on mobile or
            when the user prefers reduced motion (see showHeroVideo above). */}
        {showHeroVideo && (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={bg}
            aria-hidden="true"
            className="absolute inset-0 z-0 w-full h-full object-cover"
          >
            <source src={HERO_VIDEO_URL} type="video/mp4" />
          </video>
        )}

        {/* Gradient overlay — darker at bottom for card contrast */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/60 via-black/50 to-black/80" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-24">
          {/* Eyebrow */}
          <div className="flex justify-center mb-5">
            <span
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20
                             text-white text-xs font-semibold px-4 py-1.5 rounded-full tracking-widest uppercase"
            >
              {t('landing.hero.tagline')}
            </span>
          </div>

          {/* Headline — three-line with rotating script word */}
          <h1 className="text-center text-white drop-shadow-xl mb-5 leading-tight">

            {/* Line 1 — static */}
            <span className="block text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
              Find the perfect
            </span>

            {/* Line 2 — rotating script word */}
            <span className="block my-1 sm:my-2" aria-live="polite" aria-atomic="true">
              <span
                style={{
                  fontFamily: "'Dancing Script', cursive",
                  transition: 'opacity 0.38s ease, transform 0.38s ease',
                  opacity:    wordShow ? 1 : 0,
                  transform:  wordShow ? 'translateY(0px)' : 'translateY(-14px)',
                  display:    'inline-block',
                  background: 'linear-gradient(90deg, #a78bfa, #f472b6, #60a5fa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
                className="text-6xl sm:text-7xl lg:text-8xl font-bold"
              >
                {HERO_WORDS[wordIdx]}
              </span>
            </span>

            {/* Line 3 — static */}
            <span className="block text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
              on SkillHub.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-center text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow">
            {t('landing.hero.subtitle')}
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-wrap gap-3 justify-center mb-14">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 bg-gradient-to-br from-violet-600 to-pink-500
                         hover:from-violet-700 hover:to-pink-600 text-white font-bold
                         px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-violet-900/40
                         hover:scale-[1.02] text-base"
            >
              {t('landing.hero.ctaFind')}
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white/90 hover:bg-white
                         text-stone-800 font-bold px-8 py-3.5 rounded-xl transition-all
                         shadow-lg hover:scale-[1.02] text-base"
            >
              {t('landing.hero.ctaJoin')}
            </Link>
          </div>

          {/* Who is this for — slim pill row */}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {[
              {
                Icon: User,
                label: t('landing.hero.pillClientsLabel'),
                to: "/services",
                cta: t('landing.hero.pillClientsCta'),
              },
              {
                Icon: Hammer,
                label: t('landing.hero.pillProsLabel'),
                to: "/register",
                cta: t('landing.hero.pillProsCta'),
              },
              {
                Icon: Store,
                label: t('landing.hero.pillBusinessesLabel'),
                to: "/register",
                cta: t('landing.hero.pillBusinessesCta'),
              },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="group flex items-center gap-2.5 bg-white/10 hover:bg-white/20
                           backdrop-blur-sm border border-white/20 hover:border-white/40
                           rounded-full px-5 py-2.5 transition-all"
              >
                <item.Icon className="w-4 h-4 text-white/80" strokeWidth={1.75} />
                <span className="text-white/70 text-xs font-medium">
                  {item.label}
                </span>
                <span className="text-white text-xs font-bold group-hover:text-violet-300 transition-colors">
                  {item.cta} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <HowItWorksSection t={t} />

      {/* Featured Professionals */}
      {featured.length > 0 && (
        <section className="py-20 px-4 bg-gradient-to-b from-white to-stone-50">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-4">
                {t('landing.featured.eyebrow')}
              </span>
              <h2 className="text-3xl font-black text-plum mb-2">
                {t('landing.featured.title')}
              </h2>
              <p className="text-stone-500 text-sm max-w-md mx-auto">
                {t('landing.featured.subtitle')}
              </p>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((p) => (
                <WorkerCard key={p._id} profile={p} />
              ))}
            </div>

            {/* Footer link */}
            <div className="text-center mt-10">
              <Link
                to="/professionals"
                className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600
                           hover:text-violet-800 transition-colors group"
              >
                {t('landing.featured.viewAll')}
                <span className="group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Grow your business CTA ─────────────────────────────────────── */}
      <section className="relative bg-[#0a0a0a] overflow-hidden">
        {/* Decorative diagonal gradient strips */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-10 right-[38%] w-10 h-full rotate-12
                          bg-gradient-to-b from-violet-600 via-pink-500 to-transparent opacity-80"
          />
          <div
            className="absolute -top-10 right-[42%] w-6 h-full rotate-12
                          bg-gradient-to-b from-pink-500 via-violet-600 to-transparent opacity-50"
          />
          <div
            className="absolute -top-10 right-[34%] w-4 h-full rotate-12
                          bg-gradient-to-b from-blue-500 via-violet-600 to-transparent opacity-40"
          />
        </div>

        <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left — text */}
          <div>
            <span
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80
                             text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6"
            >
              {t('landing.grow.eyebrow')}
            </span>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight text-white mb-5">
              {t('landing.grow.titleLine1')}<br />
              <span className="bg-gradient-to-r from-pink-500 to-violet-400 bg-clip-text text-transparent">
                {t('landing.grow.titleLine2')}
              </span>
            </h2>
            <p className="text-stone-400 text-base leading-relaxed mb-8 max-w-md">
              {t('landing.grow.subtitle')}
            </p>

            {/* Stats row */}
            <div className="flex gap-8 mb-8">
              {[
                { value: "1,200+", label: t('landing.grow.statProsLabel') },
                { value: "49", label: t('landing.grow.statCategoriesLabel') },
                { value: "25", label: t('landing.grow.statDistrictsLabel') },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-gradient-to-br from-violet-600 to-pink-500
                           hover:from-violet-700 hover:to-pink-600 text-white font-semibold
                           px-6 py-3 rounded-xl transition-all shadow-lg shadow-violet-900/40
                           hover:shadow-violet-900/60 hover:scale-[1.02] text-sm"
              >
                {t('landing.grow.ctaJoinPro')}
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20
                           text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm"
              >
                {t('landing.grow.ctaJoinBusiness')}
              </Link>
            </div>
          </div>

          {/* Right — image with gradient frame */}
          <div className="relative hidden md:block">
            {/* Gradient border frame */}
            <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 opacity-70" />
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={bgtwo}
                alt="Professional at work"
                className="w-full h-80 object-cover object-center"
              />
              {/* Gradient overlay on image */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-transparent" />
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-white">
                <Check className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-800">
                  {t('landing.grow.badgeTitle')}
                </p>
                <p className="text-xs text-stone-400">
                  {t('landing.grow.badgeSubtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="py-20 px-4 bg-gradient-to-b from-stone-50 to-white">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-50 px-4 py-1.5 rounded-full mb-4">
              All Categories
            </span>
            <h2 className="text-4xl font-black text-stone-900 mb-3">
              {t("landing.browse.title")}
            </h2>
            <p className="text-stone-500 max-w-md mx-auto text-sm leading-relaxed">
              {t("landing.browse.subtitle")}
            </p>
          </div>

          {/* Group cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {groupedCategories.map(({ group, categories }) => {
              const meta = GROUP_META[group.slug];
              const Icon = meta?.Icon;
              return (
                <Link
                  key={group.slug}
                  to={`/services#${group.slug}`}
                  className="group bg-white border border-stone-200 rounded-2xl overflow-hidden
                             flex flex-col hover:border-violet-300 hover:shadow-xl
                             hover:shadow-violet-100/60 hover:-translate-y-1 transition-all duration-200"
                >
                  {/* Cover image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                    {meta?.cover ? (
                      <img
                        src={meta.cover}
                        alt={group.label}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className={`w-full h-full ${meta?.bg ?? 'bg-stone-100'}`} />
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
                    {/* Icon badge — sits on the image */}
                    {Icon && (
                      <div className={`absolute bottom-3 left-3 w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${meta?.bg ?? 'bg-white/80'} backdrop-blur-sm`}>
                        <Icon className={`w-4.5 h-4.5 ${meta?.fg ?? 'text-stone-500'}`} strokeWidth={1.75} />
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-stone-800 group-hover:text-violet-700 transition-colors leading-snug text-sm">
                      {group.label}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1">
                      {t('landing.browse.services', { count: categories.length })}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-medium text-stone-300 group-hover:text-violet-500 transition-colors mt-auto pt-3">
                      <span>Explore</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 bg-gradient-to-br from-violet-600 to-pink-500
                         text-white font-bold px-8 py-3.5 rounded-2xl hover:from-violet-700
                         hover:to-pink-600 transition-all shadow-lg shadow-violet-200 text-sm"
            >
              {t('landing.browse.viewAllSvc', { count: groupedCategories.reduce((n, g) => n + g.categories.length, 0) })}
            </Link>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-stone-900">
              {t('landing.trust.title')}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {[
              {
                Icon: Award,
                bg: 'bg-amber-100',
                fg: 'text-amber-600',
                title: t('landing.trust.scoreTitle'),
                desc: t('landing.trust.scoreDesc'),
              },
              {
                Icon: ShieldCheck,
                bg: 'bg-teal-100',
                fg: 'text-teal-600',
                title: t('landing.trust.idTitle'),
                desc: t('landing.trust.idDesc'),
              },
              {
                Icon: Store,
                bg: 'bg-violet-100',
                fg: 'text-violet-600',
                title: t('landing.trust.businessesTitle'),
                desc: t('landing.trust.businessesDesc'),
              },
              {
                Icon: Lock,
                bg: 'bg-stone-100',
                fg: 'text-stone-600',
                title: t('landing.trust.paymentsTitle'),
                desc: t('landing.trust.paymentsDesc'),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-stone-50 rounded-2xl p-5 text-center hover:shadow-md transition-shadow"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${item.bg}`}>
                  <item.Icon className={`w-7 h-7 ${item.fg}`} strokeWidth={1.75} />
                </div>
                <h3 className="font-bold mb-1 text-stone-800">{item.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Provider CTA Banner ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0d0d14] py-10 px-6 sm:px-12">
        {/* Ambient glow blob */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-40"
            style={{
              background:
                "radial-gradient(ellipse at center, #7c3aed 0%, #be185d 40%, transparent 75%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto flex items-center justify-between gap-6 flex-wrap">
          {/* Left */}
          <div>
            <p className="text-stone-400 text-sm font-medium mb-1 tracking-wide">
              {t('landing.providerCta.eyebrow')}
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {t('landing.providerCta.titleLine1')}{" "}
              <span className="bg-gradient-to-r from-pink-500 to-blue-400 bg-clip-text text-transparent">
                {t('landing.providerCta.titleLine2')}
              </span>
            </h2>
          </div>

          {/* Decorative dot */}
          <div className="hidden md:block w-4 h-4 rounded-full bg-gradient-to-br from-pink-600 to-violet-600 shadow-lg shadow-pink-700/50 mx-auto" />

          {/* Right — CTA */}
          <Link
            to="/register"
            className="flex items-center gap-2.5 bg-gradient-to-r from-pink-500 to-blue-500
                       hover:from-pink-600 hover:to-blue-600
                       text-white font-bold px-7 py-3 rounded-xl transition-all
                       shadow-lg shadow-pink-700/30 hover:shadow-pink-700/50
                       hover:scale-[1.03] shrink-0 text-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
            {t('landing.providerCta.cta')}
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 bg-stone-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-stone-900 mb-2">
            {t("landing.pricing.title")}
          </h2>
          <p className="text-center text-stone-500 mb-10">
            {t("landing.pricing.subtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className={`relative rounded-2xl border-2 p-6 flex flex-col gap-3 bg-white transition-all ${plan.ring} ${plan.glow}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                      Most Popular
                    </span>
                  </div>
                )}
                {plan.price !== null && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                      🔒 Launch price
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between mt-1">
                  <span className={`badge text-xs font-bold ${plan.badge}`}>{plan.name}</span>
                  <div className="text-right">
                    {plan.price === null
                      ? <span className="text-2xl font-black text-stone-400">Free</span>
                      : <>
                          <span className="text-2xl font-black text-stone-900">{CURRENCY_SYMBOL}{plan.price.toLocaleString()}</span>
                          <span className="text-stone-400 text-sm">/mo</span>
                        </>
                    }
                  </div>
                </div>

                {/* Included features */}
                <ul className="space-y-1.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-stone-700">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" strokeWidth={2.5} />{f}
                    </li>
                  ))}
                </ul>

                {/* Locked features */}
                {plan.locked.length > 0 && (
                  <ul className="space-y-1 border-t border-stone-100 pt-3">
                    {plan.locked.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-stone-400">
                        <span className="shrink-0 mt-1 w-2 h-2 rounded-full border border-stone-300 inline-block" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  to={plan.to}
                  className={`text-center py-2.5 rounded-xl font-semibold text-sm transition-colors block mt-1 ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-stone-400 mt-6">
            {t('landing.faq.paymentInfo')}
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-50 px-4 py-1.5 rounded-full mb-4">
              {t('landing.faq.eyebrow')}
            </span>
            <h2 className="text-3xl font-black text-stone-900 mb-3">
              {t('landing.faq.title')}
            </h2>
            <p className="text-stone-500 text-sm max-w-md mx-auto">
              {t('landing.faq.subtitle')}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 justify-center mb-8 flex-wrap">
            {FAQ_GROUPS.map((g) => (
              <button
                key={g.key}
                onClick={() => handleFaqTab(g.key)}
                className={`text-sm font-semibold px-5 py-2 rounded-full transition-all duration-200 ${
                  faqTab === g.key
                    ? "bg-gradient-to-br from-violet-600 to-pink-500 text-white shadow-md shadow-violet-200"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Accordion */}
          <div className="space-y-3">
            {FAQ_GROUPS.find((g) => g.key === faqTab)?.items.map(
              (item, idx) => (
                <AccordionItem
                  key={idx}
                  item={item}
                  isOpen={openFaq === idx}
                  onToggle={() => handleFaqItem(idx)}
                />
              ),
            )}
          </div>

          {/* Contact form */}
          <ContactForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-10 px-4 text-center text-sm">
        {/* Language switcher */}
        <div className="flex justify-center mb-5">
          <LanguageSwitcher compact dark />
        </div> 

        <p className="mb-3">{t("landing.footer.copy")}</p>
        <div className="flex items-center justify-center gap-5 text-xs text-stone-500">
          <Link to="/terms" className="hover:text-violet-400 transition-colors">
            {t("landing.footer.terms")}
          </Link>
          <span>·</span>
          <Link
            to="/privacy"
            className="hover:text-violet-400 transition-colors"
          >
            {t("landing.footer.privacy")}
          </Link>
          <span>·</span>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="hover:text-violet-400 transition-colors"
          >
            {t("landing.footer.contact")}
          </a>
        </div>
      </footer>
    </div>
  );
}

// ── How It Works — split image + tab layout ──────────────────────────────────
function HowItWorksSection({ t }) {
  const [tab, setTab] = useState('clients');

  const clientSteps = [
    { Icon: Search,        iconBg: 'bg-violet-100',  iconFg: 'text-violet-600', title: t('landing.howSkillHubWorks.client1Title'), desc: t('landing.howSkillHubWorks.client1Desc') },
    { Icon: ClipboardList, iconBg: 'bg-blue-100',    iconFg: 'text-blue-600',   title: t('landing.howSkillHubWorks.client2Title'), desc: t('landing.howSkillHubWorks.client2Desc') },
    { Icon: CheckCircle,   iconBg: 'bg-green-100',   iconFg: 'text-green-600',  title: t('landing.howSkillHubWorks.client3Title'), desc: t('landing.howSkillHubWorks.client3Desc') },
    { Icon: ShieldCheck,   iconBg: 'bg-amber-100',   iconFg: 'text-amber-600',  title: 'Verified Pros Only',                          desc: 'Every Pro is ID-verified and scored by real clients before they appear in search.' },
  ];

  const proSteps = [
    { Icon: Rocket,      iconBg: 'bg-violet-100', iconFg: 'text-violet-600', title: t('landing.howSkillHubWorks.pro1Title'), desc: t('landing.howSkillHubWorks.pro1Desc') },
    { Icon: Megaphone,   iconBg: 'bg-pink-100',   iconFg: 'text-pink-600',   title: t('landing.howSkillHubWorks.pro2Title'), desc: t('landing.howSkillHubWorks.pro2Desc') },
    { Icon: DollarSign,  iconBg: 'bg-green-100',  iconFg: 'text-green-600',  title: t('landing.howSkillHubWorks.pro3Title'), desc: t('landing.howSkillHubWorks.pro3Desc') },
    { Icon: Award,       iconBg: 'bg-amber-100',  iconFg: 'text-amber-600',  title: 'Build Your Reputation',                   desc: 'Earn reviews, grow your SkillHub Score and unlock featured placement over time.' },
  ];

  const steps = tab === 'clients' ? clientSteps : proSteps;

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-stone-50 to-white overflow-hidden">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-100 px-4 py-1.5 rounded-full mb-4">
            {t('landing.howSkillHubWorks.eyebrow')}
          </span>
          <h2 className="text-4xl font-black text-stone-900 mb-3">
            {t('landing.howSkillHubWorks.title')}
          </h2>
          <p className="text-stone-400 text-sm max-w-xs mx-auto">Two sides, one platform — simple for everyone.</p>
        </div>

        {/* Tab toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-stone-100 rounded-full p-1 gap-1">
            <button
              onClick={() => setTab('clients')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                tab === 'clients'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {t('landing.howSkillHubWorks.forClients')}
            </button>
            <button
              onClick={() => setTab('pros')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                tab === 'pros'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {t('landing.howSkillHubWorks.forProsBusinesses')}
            </button>
          </div>
        </div>

        {/* Split layout: image left + grid right */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">

          {/* Left — image (switches with tab) */}
          <div className="lg:w-[38%] shrink-0">
            <div className="relative h-64 lg:h-full min-h-[360px] rounded-3xl overflow-hidden shadow-xl">
              <img
                src={tab === 'clients' ? imgClient : imgPros}
                alt={tab === 'clients' ? 'For clients' : 'For pros'}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-stone-900/20 to-transparent" />
              {/* Badge on image */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
                  tab === 'clients'
                    ? 'bg-violet-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}>
                  {tab === 'clients'
                    ? <><User className="w-3 h-3" strokeWidth={2.5} /> For Clients</>
                    : <><Rocket className="w-3 h-3" strokeWidth={2.5} /> For Pros & Businesses</>
                  }
                </div>
                <p className="text-white/80 text-sm leading-snug">
                  {tab === 'clients'
                    ? 'Find trusted, verified Pros near you in minutes.'
                    : 'Grow your business — get discovered by thousands of clients.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Right — 2×2 feature grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {steps.map((item, i) => (
              <div
                key={i}
                className="relative bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden"
              >
                {/* Big transparent step number — watermark */}
                <span className="absolute -bottom-3 -right-2 text-[6rem] font-black text-stone-100 group-hover:text-violet-50 leading-none select-none transition-colors duration-300 pointer-events-none">
                  0{i + 1}
                </span>

                {/* Gradient icon */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center mb-4 shadow-md shadow-violet-200/50 group-hover:scale-110 transition-transform duration-200">
                  <item.Icon className="w-5 h-5 text-white" strokeWidth={1.75} />
                </div>

                <h3 className="font-bold text-stone-900 mb-1.5 text-sm relative z-10">{item.title}</h3>
                <p className="text-stone-500 text-xs leading-relaxed relative z-10">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
